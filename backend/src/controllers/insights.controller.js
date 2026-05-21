import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';

// Period helpers --------------------------------------------------------------

function startOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfQuarter(d) {
    const q = Math.floor(d.getMonth() / 3);
    return new Date(d.getFullYear(), q * 3, 1);
}
function startOfYear(d) {
    return new Date(d.getFullYear(), 0, 1);
}
function addPeriod(d, period) {
    const out = new Date(d);
    if (period === 'month')   out.setMonth(out.getMonth() + 1);
    if (period === 'quarter') out.setMonth(out.getMonth() + 3);
    if (period === 'year')    out.setFullYear(out.getFullYear() + 1);
    return out;
}

function getRanges(period) {
    const now = new Date();
    let currentStart;
    if (period === 'quarter')   currentStart = startOfQuarter(now);
    else if (period === 'year') currentStart = startOfYear(now);
    else                        currentStart = startOfMonth(now);

    const currentEnd = addPeriod(currentStart, period);
    const previousStart = new Date(currentStart);
    if (period === 'month')        previousStart.setMonth(previousStart.getMonth() - 1);
    else if (period === 'quarter') previousStart.setMonth(previousStart.getMonth() - 3);
    else                           previousStart.setFullYear(previousStart.getFullYear() - 1);
    const previousEnd = currentStart;

    return { currentStart, currentEnd, previousStart, previousEnd };
}

// Returns spend (debits) and income (credits) keyed by category for a period.
async function loadCategorizedFlows(userId, start, end) {
    const [bankRows, walletRows, expenseRows] = await Promise.all([
        prisma.bankTransactionLog.findMany({
            where: { user_id: userId, transaction_date: { gte: start, lt: end } },
            select: { category: true, debit: true, credit: true, description: true, transaction_date: true },
        }),
        prisma.walletTransactionLog.findMany({
            where: { user_id: userId, transaction_date: { gte: start, lt: end } },
            select: { category: true, debit: true, credit: true, description: true, transaction_date: true },
        }),
        prisma.expense.findMany({
            where: { user_id: userId, expense_date: { gte: start, lt: end } },
            select: { category: true, amount: true, description: true, expense_date: true },
        }),
    ]);

    return { bankRows, walletRows, expenseRows };
}

function sumDebits(rows) {
    return rows.reduce((s, r) => s + Number(r.debit || 0), 0);
}
function sumCredits(rows) {
    return rows.reduce((s, r) => s + Number(r.credit || 0), 0);
}
function sumAmounts(rows) {
    return rows.reduce((s, r) => s + Number(r.amount || 0), 0);
}

function bucketByCategory(rows, getAmount) {
    const out = new Map();
    for (const r of rows) {
        const key = r.category || 'Uncategorised';
        const amt = getAmount(r);
        if (amt <= 0) continue;
        out.set(key, (out.get(key) || 0) + amt);
    }
    return out;
}

function mergeBuckets(...maps) {
    const out = new Map();
    for (const m of maps) {
        for (const [k, v] of m) out.set(k, (out.get(k) || 0) + v);
    }
    return out;
}

// GET /api/dashboard/insights?period=month|quarter|year
export const getInsights = async (req, res) => {
    try {
        const period = ['month', 'quarter', 'year'].includes(req.query.period)
            ? req.query.period
            : 'month';
        const userId = req.user.id;
        const { currentStart, currentEnd, previousStart, previousEnd } = getRanges(period);

        const current  = await loadCategorizedFlows(userId, currentStart,  currentEnd);
        const previous = await loadCategorizedFlows(userId, previousStart, previousEnd);

        // Totals
        const currentSpend =
            sumDebits(current.bankRows) +
            sumDebits(current.walletRows) +
            sumAmounts(current.expenseRows);
        const currentIncome =
            sumCredits(current.bankRows) +
            sumCredits(current.walletRows);

        const previousSpend =
            sumDebits(previous.bankRows) +
            sumDebits(previous.walletRows) +
            sumAmounts(previous.expenseRows);
        const previousIncome =
            sumCredits(previous.bankRows) +
            sumCredits(previous.walletRows);

        const spendDelta  = previousSpend  > 0 ? ((currentSpend  - previousSpend)  / previousSpend)  * 100 : null;
        const incomeDelta = previousIncome > 0 ? ((currentIncome - previousIncome) / previousIncome) * 100 : null;

        // Category breakdown (spend only)
        const merged = mergeBuckets(
            bucketByCategory(current.bankRows,    (r) => Number(r.debit  || 0)),
            bucketByCategory(current.walletRows,  (r) => Number(r.debit  || 0)),
            bucketByCategory(current.expenseRows, (r) => Number(r.amount || 0)),
        );
        const categoryBreakdown = Array.from(merged, ([category, total]) => ({ category, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 12);

        // Top "merchants" — group spending by description (cleaned)
        const merchantMap = new Map();
        const collectMerchant = (desc, amt) => {
            if (!desc || amt <= 0) return;
            const key = desc.trim().slice(0, 60);
            if (!key) return;
            merchantMap.set(key, (merchantMap.get(key) || 0) + amt);
        };
        current.bankRows.forEach(r    => collectMerchant(r.description, Number(r.debit || 0)));
        current.walletRows.forEach(r  => collectMerchant(r.description, Number(r.debit || 0)));
        current.expenseRows.forEach(r => collectMerchant(r.description, Number(r.amount || 0)));
        const topMerchants = Array.from(merchantMap, ([merchant, total]) => ({ merchant, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 8);

        // Daily trend for current period
        const dayMap = new Map();
        const addDaily = (date, amt) => {
            if (amt <= 0) return;
            const d = new Date(date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            dayMap.set(key, (dayMap.get(key) || 0) + amt);
        };
        current.bankRows.forEach(r    => addDaily(r.transaction_date, Number(r.debit  || 0)));
        current.walletRows.forEach(r  => addDaily(r.transaction_date, Number(r.debit  || 0)));
        current.expenseRows.forEach(r => addDaily(r.expense_date,     Number(r.amount || 0)));
        const dailyTrend = Array.from(dayMap, ([day, total]) => ({ day, total }))
            .sort((a, b) => a.day.localeCompare(b.day));

        // Weekday pattern (Sun=0..Sat=6)
        const weekdayTotals = Array(7).fill(0);
        const weekdayCount  = Array(7).fill(0);
        const addWeekday = (date, amt) => {
            if (amt <= 0) return;
            const w = new Date(date).getDay();
            weekdayTotals[w] += amt;
            weekdayCount[w]  += 1;
        };
        current.bankRows.forEach(r    => addWeekday(r.transaction_date, Number(r.debit  || 0)));
        current.walletRows.forEach(r  => addWeekday(r.transaction_date, Number(r.debit  || 0)));
        current.expenseRows.forEach(r => addWeekday(r.expense_date,     Number(r.amount || 0)));
        const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const weekdayPattern = weekdays.map((label, i) => ({
            day: label,
            total: weekdayTotals[i],
            avg: weekdayCount[i] > 0 ? weekdayTotals[i] / weekdayCount[i] : 0,
        }));

        res.json({
            period,
            range: { start: currentStart, end: currentEnd },
            totals: {
                currentSpend,
                currentIncome,
                net: currentIncome - currentSpend,
                previousSpend,
                previousIncome,
                spendDelta,   // % change vs previous period
                incomeDelta,
            },
            categoryBreakdown,
            topMerchants,
            dailyTrend,
            weekdayPattern,
        });
    } catch (error) {
        logger.error('[INSIGHTS] failed:', error);
        res.status(500).json({ message: 'Server error generating insights' });
    }
};
