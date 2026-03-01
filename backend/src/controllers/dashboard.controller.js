import prisma from '../utils/prisma.js';

export const getDashboardSummary = async (req, res) => {
    try {
        const userId = req.user.id; // from auth middleware

        // 1. Bank Balance (Wallets and Banks)
        const wallets = await prisma.wallet.findMany({ where: { user_id: userId } });
        const totalWalletBalance = wallets.reduce((sum, w) => sum + Number(w.balance), 0);

        const banks = await prisma.bank.findMany({ where: { user_id: userId } });
        const totalBankBalance = banks.reduce((sum, b) => sum + Number(b.current_balance), 0);

        // 2. PSX Stock Value (from snapshots + trading cash fallback)
        let stockCurrentValue = 0;
        let psxTradingCash = 0;

        const latestPsx = await prisma.psxSnapshot.findFirst({
            where: { user_id: userId },
            orderBy: { snapshot_date: 'desc' }
        });

        if (latestPsx) {
            stockCurrentValue = Number(latestPsx.total_custody);
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
        const latestMfSnapshot = await prisma.portfolioSnapshot.findFirst({
            where: { user_id: userId },
            orderBy: { upload_date: 'desc' }
        });

        if (latestMfSnapshot) {
            mfCurrentValue = Number(latestMfSnapshot.total_value);
        } else {
            const mutualFunds = await prisma.mutualFund.findMany({ where: { user_id: userId } });
            mutualFunds.forEach(fund => mfCurrentValue += Number(fund.current_value || 0));
        }

        const totalInvestments = mfCurrentValue + stockCurrentValue + psxTradingCash;

        // 4. Ledger Dues
        const dues = await prisma.duesTransaction.findMany({ where: { user_id: userId } });
        let totalReceivable = 0;
        let totalPayable = 0;
        dues.forEach(due => {
            if (due.transaction_type === 'receivable') totalReceivable += Number(due.amount);
            if (due.transaction_type === 'payable') totalPayable += Number(due.amount);
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

        // Net Worth formula = Liquid Cash + Assets + Receivables - Payables
        const netWorth = totalBankBalance + totalWalletBalance + totalInvestments + totalReceivable - totalPayable;

        res.json({
            metrics: {
                netWorth,
                totalBankBalance,
                totalWalletBalance,
                totalInvestments,
                mutualFundValue: mfCurrentValue,
                stockValue: stockCurrentValue,
                totalReceivable,
                totalPayable,
                totalExpenses,
                currentMonthExpenses
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
                    { name: 'Ledger Dues', value: totalReceivable } // Only positive assets
                ].filter(i => i.value > 0)
            }
        });

    } catch (error) {
        console.error('Dashboard Summary Error:', error);
        res.status(500).json({ message: 'Server error generating dashboard summary' });
    }
};
