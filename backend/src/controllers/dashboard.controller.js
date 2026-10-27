import prisma from '../utils/prisma.js';
import { sendSummaryEmail } from '../utils/email.js';
import { computeWealth } from '../services/wealth.service.js';
import { loadMoneyEvents, summarizeFlows } from '../services/moneyFlow.service.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Everything the dashboard (and emails / snapshots / the AI overview) shows.
 * Wealth comes from wealth.service, spending from moneyFlow.service — the
 * same rules every other surface uses.
 */
export const fetchDashboardData = async (userId, { now = new Date() } = {}) => {
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const yearStart = new Date(currentYear, 0, 1);
    const prevMonthStart = new Date(currentYear, currentMonth - 1, 1);
    const monthStart = new Date(currentYear, currentMonth, 1);
    const nextMonthStart = new Date(currentYear, currentMonth + 1, 1);
    const spendFrom = prevMonthStart < yearStart ? prevMonthStart : yearStart;

    const [wealth, events] = await Promise.all([
        computeWealth(userId, { valuationDate: now }),
        loadMoneyEvents(userId, spendFrom, nextMonthStart),
    ]);

    // Spending (each money event once; transfers, cash withdrawals,
    // investments and loan principal are not spending; refunds reduce it).
    const inRange = (from, to) => events.filter((e) => new Date(e.date) >= from && new Date(e.date) < to);
    const monthly = MONTHS.map((_, i) =>
        summarizeFlows(inRange(new Date(currentYear, i, 1), new Date(currentYear, i + 1, 1))).totals.spend);
    const thisMonth = summarizeFlows(inRange(monthStart, nextMonthStart));
    const currentMonthExpenses = thisMonth.totals.spend;
    const lastMonthExpenses = summarizeFlows(inRange(prevMonthStart, monthStart)).totals.spend;
    const yearToDateExpenses = summarizeFlows(inRange(yearStart, nextMonthStart)).totals.spend;

    // Average spend across completed months this year — the baseline for the
    // "are you spending faster than usual?" pace indicator.
    const completedMonths = monthly.slice(0, currentMonth).filter((v) => v > 0);
    const avgMonthlyExpenses = completedMonths.length
        ? completedMonths.reduce((s, v) => s + v, 0) / completedMonths.length
        : 0;

    const currentMonthCategories = Array.from(thisMonth.spendByCategory, ([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    const w = wealth;
    const totalInvestments = w.investments.total;

    return {
        generatedAt: now.toISOString(),
        // Per-source freshness for the trust strip. `null` means the user has
        // never imported that source (so the UI shows "not connected" rather
        // than a stale warning).
        sources: w.sources,
        netWorthDefinition: {
            version: w.definition,
            valuationDate: w.valuationDate,
            includes: ['cash', 'investments', 'gold', 'assets'],
            subtracts: ['debts'],
            excludes: ['rentReceived', 'dues'],
        },
        netWorthBreakdown: {
            cash: w.cash.total,
            investments: totalInvestments,
            gold: w.gold.value,
            assets: w.assets,
            debts: w.debts.outstanding,
            netWorth: w.netWorth,
        },
        metrics: {
            netWorth: w.netWorth,
            totalBankBalance: w.cash.bank,
            totalWalletBalance: w.cash.wallet,
            totalInvestments,
            mutualFundValue: w.investments.mutualFunds.value,
            mutualFundCost: w.investments.mutualFunds.cost,
            stockValue: w.investments.stocks.value,
            stockCost: w.investments.stocks.cost,
            psxTradingCash: w.investments.tradingCash,
            totalGoldValue: w.gold.value,
            totalReceivable: w.dues.receivable,
            totalPayable: w.dues.payable,
            // Spending this calendar year (it used to be every manual expense ever).
            totalExpenses: yearToDateExpenses,
            currentMonthExpenses,
            lastMonthExpenses,
            avgMonthlyExpenses,
            totalAssetValue: w.assets,
            // Income history, not wealth — not part of net worth.
            totalRentBalance: w.rentReceived,
            totalDebt: w.debts.outstanding,
        },
        charts: {
            monthlyExpenses: monthly.map((amount, i) => ({ month: MONTHS[i], amount })),
            currentMonthCategories,
            investmentDistribution: [
                { name: 'Mutual Funds', value: w.investments.mutualFunds.value },
                { name: 'Stocks', value: w.investments.stocks.value },
            ].filter((i) => i.value > 0),
            assetAllocation: [
                { name: 'Banks', value: w.cash.bank },
                { name: 'Wallets', value: w.cash.wallet },
                { name: 'Mutual Funds', value: w.investments.mutualFunds.value },
                { name: 'Stocks', value: w.investments.stocks.value },
                { name: 'Gold', value: w.gold.value ?? 0 },
                { name: 'Physical Assets', value: w.assets },
            ].filter((i) => i.value > 0),
        },
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

