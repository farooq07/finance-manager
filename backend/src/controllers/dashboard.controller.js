import prisma from '../utils/prisma.js';

export const getDashboardSummary = async (req, res) => {
    try {
        const userId = req.user.id; // from auth middleware

        // 1. Get Expenses
        const expenses = await prisma.expense.findMany({
            where: { user_id: userId }
        });
        const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

        // 2. Get Mutual Funds
        const mutualFunds = await prisma.mutualFund.findMany({
            where: { user_id: userId }
        });
        let mfInvested = 0;
        let mfCurrentValue = 0;
        mutualFunds.forEach(fund => {
            mfInvested += Number(fund.invested_amount);
            mfCurrentValue += Number(fund.units_purchased) * Number(fund.current_nav);
        });

        // 3. Get Stocks & Transactions
        const stocks = await prisma.stock.findMany({
            where: { user_id: userId },
            include: { transactions: true }
        });

        let stockInvested = 0;
        let stockCurrentValue = 0;

        stocks.forEach(stock => {
            let totalQty = 0;
            let totalCost = 0;
            stock.transactions.forEach(tx => {
                totalQty += tx.quantity;
                totalCost += Number(tx.buy_price) * tx.quantity + Number(tx.brokerage_fee || 0);
            });
            stockInvested += totalCost;
            stockCurrentValue += totalQty * Number(stock.current_market_price || 0);
        });

        const totalInvestments = mfInvested + stockInvested;
        const currentPortfolioValue = mfCurrentValue + stockCurrentValue;
        const profitLoss = currentPortfolioValue - totalInvestments;

        // 4. Get Dues / Ledger
        const dues = await prisma.duesTransaction.findMany({
            where: { user_id: userId }
        });

        let totalReceivable = 0;
        let totalPayable = 0;
        dues.forEach(due => {
            if (due.transaction_type === 'receivable') totalReceivable += Number(due.amount);
            if (due.transaction_type === 'payable') totalPayable += Number(due.amount);
        });

        // Calculate a naive "Total Balance" 
        // This could mean logical Net Worth: Assets - Liabilities - Expenses
        // Or just cash balance depending on incomes logging (which we don't have a table for).
        // Let's just return all these distinct metrics for the UI to display neatly.

        // Calculate monthly expense distribution for charts
        // Grouping current year expenses by month
        const currentYear = new Date().getFullYear();
        const monthlyExpenses = Array(12).fill(0);
        expenses.forEach(exp => {
            const date = new Date(exp.expense_date);
            if (date.getFullYear() === currentYear) {
                monthlyExpenses[date.getMonth()] += Number(exp.amount);
            }
        });

        const chartData = monthlyExpenses.map((amount, index) => ({
            month: new Date(0, index).toLocaleString('default', { month: 'short' }),
            amount
        }));

        // Calculate Investment distribution
        const investmentDistribution = [
            { name: 'Mutual Funds', value: mfCurrentValue },
            { name: 'Stocks', value: stockCurrentValue }
        ].filter(item => item.value > 0);

        res.json({
            metrics: {
                totalExpenses,
                totalInvestments,
                currentPortfolioValue,
                profitLoss,
                totalReceivable,
                totalPayable
            },
            charts: {
                monthlyExpenses: chartData,
                investmentDistribution
            }
        });

    } catch (error) {
        console.error('Dashboard Summary Error:', error);
        res.status(500).json({ message: 'Server error generating dashboard summary' });
    }
};
