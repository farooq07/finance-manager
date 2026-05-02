import prisma from '../utils/prisma.js';
import { sendSummaryEmail } from '../utils/email.js';

export const fetchDashboardData = async (userId) => {
    // 1. Bank Balance (Wallets and Banks)
    const wallets = await prisma.wallet.findMany({ where: { user_id: userId } });
        const totalWalletBalance = wallets.reduce((sum, w) => sum + (Number(w.balance) * Number(w.exchange_rate || 1)), 0);

        const banks = await prisma.bank.findMany({ where: { user_id: userId } });
        const totalBankBalance = banks.reduce((sum, b) => sum + (Number(b.current_balance) * Number(b.exchange_rate || 1)), 0);

        // 2. PSX Stock Value (from snapshots + trading cash fallback)
        let stockCurrentValue = 0;
        let stockCost = 0;
        let psxTradingCash = 0;

        const latestPsx = await prisma.psxSnapshot.findFirst({
            where: { user_id: userId },
            orderBy: { snapshot_date: 'desc' }
        });

        if (latestPsx) {
            stockCurrentValue = Number(latestPsx.total_custody);

            // Calculate total cost from holdings
            if (latestPsx.holdings_data && Array.isArray(latestPsx.holdings_data)) {
                stockCost = latestPsx.holdings_data.reduce((sum, h) => {
                    const hld = Number(h.holding || 0);
                    const costPerUnit = Number(h.cost_per_unit || 0);
                    const tCost = Number(h.total_cost || (hld * costPerUnit));
                    return sum + tCost;
                }, 0);
            }

            // Include trading cash from the new summary feature if available
            if (latestPsx.summary_data && latestPsx.summary_data.trading_cash) {
                psxTradingCash = Number(latestPsx.summary_data.trading_cash);
            }
        } else {
            // Fallback to manual entry if they haven't uploaded a CSV
            const stocks = await prisma.stock.findMany({
                where: { user_id: userId },
                include: { transactions: true }
            });
            stocks.forEach(stock => {
                let totalQty = 0;
                stock.transactions.forEach(tx => totalQty += tx.quantity);
                stockCurrentValue += totalQty * Number(stock.current_market_price || 0);
            });
        }

        // 3. Mutual Fund Value (from snapshots or fallback)
        let mfCurrentValue = 0;
        let mfCost = 0;
        const latestMfSnapshot = await prisma.portfolioSnapshot.findFirst({
            where: { user_id: userId },
            orderBy: { upload_date: 'desc' }
        });

        if (latestMfSnapshot) {
            mfCurrentValue = Number(latestMfSnapshot.total_value);
            // Best effort to get MF cost if available in holding data
            if (latestMfSnapshot.holdings_data && Array.isArray(latestMfSnapshot.holdings_data)) {
                mfCost = latestMfSnapshot.holdings_data.reduce((sum, h) => {
                    const price = Number(h.price || 0);
                    const units = Number(h.units || 0);
                    return sum + (price * units); // assuming total cost isn't explicitly stored, but this is a rough estimate or we can look for total_cost. Usually it's in original investments
                }, 0);

                // If it's 0 (meaning maybe we didn't have price info), let's fall back to total_invested if that column existed, but it doesn't.
                // We will rely on mutualFund original investments.
            }
        } else {
            const mutualFunds = await prisma.mutualFund.findMany({ where: { user_id: userId } });
            mutualFunds.forEach(fund => mfCurrentValue += Number(fund.current_value || 0));
        }

        // Let's get actual invested amount for MF to be accurate:
        const mfInvested = await prisma.mutualFund.findMany({ where: { user_id: userId } });
        let actualMfCost = 0;
        mfInvested.forEach(fund => actualMfCost += Number(fund.total_invested || 0));
        if (actualMfCost > 0) mfCost = actualMfCost;

        const totalInvestments = mfCurrentValue + stockCurrentValue + psxTradingCash;

        // 4. Ledger Dues (Net balance per person)
        const people = await prisma.person.findMany({
            where: { user_id: userId },
            include: { transactions: true }
        });

        let totalReceivable = 0;
        let totalPayable = 0;

        people.forEach(person => {
            let netBalance = 0;
            person.transactions.forEach(t => {
                if (t.transaction_type === 'receivable') {
                    netBalance += Number(t.amount);
                } else if (t.transaction_type === 'payable') {
                    netBalance -= Number(t.amount);
                }
            });

            if (netBalance > 0) {
                totalReceivable += netBalance;
            } else if (netBalance < 0) {
                totalPayable += Math.abs(netBalance);
            }
        });

        // 5. Monthly Expenses (Current Year)
        const expenses = await prisma.expense.findMany({ where: { user_id: userId } });
        const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();
        const monthlyExpenses = Array(12).fill(0);
        let currentMonthExpenses = 0;

        expenses.forEach(exp => {
            const date = new Date(exp.expense_date);
            if (date.getFullYear() === currentYear) {
                const monthIdx = date.getMonth();
                monthlyExpenses[monthIdx] += Number(exp.amount);
                if (monthIdx === currentMonth) {
                    currentMonthExpenses += Number(exp.amount);
                }
            }
        });

        const chartData = monthlyExpenses.map((amount, index) => ({
            month: new Date(0, index).toLocaleString('default', { month: 'short' }),
            amount
        }));

        // 6. Rent Entries
        const rentEntries = await prisma.rentEntry.findMany({ where: { user_id: userId } });
        const totalRentBalance = rentEntries.reduce((sum, rent) => sum + Number(rent.amount), 0);

        // 7. Assets
        const assets = await prisma.asset.findMany({ where: { user_id: userId } });
        const totalAssetValue = assets.reduce((sum, asset) => sum + Number(asset.value), 0);

    // Net Worth formula = Liquid Cash + Assets/Investments + Receivables - Payables - Expenses + Rent Balance (Physical Assets excluded from Comprehensive Net Worth)
    const netWorth = totalBankBalance + totalWalletBalance + totalInvestments + totalReceivable - totalPayable - totalExpenses + totalRentBalance;

    return {
        metrics: {
            netWorth,
            totalBankBalance,
            totalWalletBalance,
            totalInvestments,
            mutualFundValue: mfCurrentValue,
            mutualFundCost: mfCost,
            stockValue: stockCurrentValue,
            stockCost,
            totalReceivable,
            totalPayable,
            totalExpenses,
            currentMonthExpenses,
            totalAssetValue,
            totalRentBalance
        },
        charts: {
            monthlyExpenses: chartData,
            investmentDistribution: [
                { name: 'Mutual Funds', value: mfCurrentValue },
                { name: 'Stocks', value: stockCurrentValue }
            ].filter(i => i.value > 0),
            assetAllocation: [
                { name: 'Banks', value: totalBankBalance },
                { name: 'Wallets', value: totalWalletBalance },
                { name: 'Mutual Funds', value: mfCurrentValue },
                { name: 'Stocks', value: stockCurrentValue },
                { name: 'Physical Assets', value: totalAssetValue },
                { name: 'Ledger Dues', value: totalReceivable } // Only positive assets
            ].filter(i => i.value > 0)
        }
    };
};

export const getDashboardSummary = async (req, res) => {
    try {
        const userId = req.user.id;
        const data = await fetchDashboardData(userId);
        res.json(data);
    } catch (error) {
        console.error('Dashboard Summary Error:', error);
        res.status(500).json({ message: 'Server error generating dashboard summary' });
    }
};

export const sendManualSummaryEmail = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Fetch user info
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, email: true }
        });

        const targetEmail = user?.email;
        const targetName = user?.name || 'User';

        const data = await fetchDashboardData(userId);

        await sendSummaryEmail(targetEmail, targetName, data.metrics);

        res.json({ message: `Summary email sent successfully to ${targetEmail}` });
    } catch (error) {
        console.error('Manual Summary Email Error:', error);
        res.status(500).json({ message: 'Server error sending summary email' });
    }
};

