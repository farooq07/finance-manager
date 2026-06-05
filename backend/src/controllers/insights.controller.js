import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';

// Merchant cleaning -----------------------------------------------------------
// Bank statement descriptions are mostly noise: running balances, account
// numbers, transaction codes, dates. We strip the noise and bucket the rest
// into recognisable categories so the "Top destinations" list isn't a wall
// of "PK-019-260401- 60,000.00 769,127.25" strings.

const TXN_NOISE_PATTERNS = [
    /(?:Rs\.?|PKR)\s*[\d,]+(?:\.\d{1,2})?/gi,                  // "Rs. 60,000.00"
    /\b\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?\b/g,                   // grouped decimals like "769,127.25"
    /\b\d{6,}\b/g,                                              // long digit sequences (account numbers)
    /\bPK[-\s]?\d+[-\s]?\d+[-\s]?/gi,                          // "PK-019-260401-"
    /\bDt[:.]?\s?[A-Za-z]{3}\s?\d{1,2}(?:[\s,]?\d{2,4})?/gi,   // "Dt:Apr 13" / "Dt.May 2 2026"
    /\(\d+\)/g,                                                  // "(1234)"
    /\b[A-Z]{2,4}\d{6,}\b/g,                                    // "REF1234567"
    /\b\d{1,4}\.\d{2}\b/g,                                      // standalone "32544.00"
];

const MERCHANT_BUCKETS = [
    { match: /\b(ATM|withdraw)\b/i,                       label: 'ATM withdrawal' },
    { match: /\b(POS|DC\s?TXN|debit\s?card)\b/i,          label: 'Card payment' },
    { match: /\b(RAAST|IBFT|MPBL|EFT|funds?\s?transfer)\b/i, label: 'Bank transfer' },
    { match: /\b(salary|payroll|wages)\b/i,               label: 'Salary' },
    { match: /\b(dividend|profit\s?credit|markup|mark[\s-]?up)\b/i, label: 'Profit / dividend' },
    { match: /\b(service\s?charge|wht|withholding|maintenance\s?fee|sms\s?charge)\b/i, label: 'Bank charges' },
    { match: /\b(bill\s?pay|utility|k[-\s]?electric|ptcl|wapda|sui\s?gas)\b/i, label: 'Utility' },
];

function cleanDescription(desc) {
    if (!desc) return '';
    let s = String(desc);
    for (const re of TXN_NOISE_PATTERNS) s = s.replace(re, ' ');
    s = s.replace(/[-_/\\|]+/g, ' ');
    s = s.replace(/\s+/g, ' ').trim();
    return s;
}

function resolveMerchant(rawDesc) {
    if (!rawDesc) return { key: 'Bank transfer', name: 'Bank transfer' };
    for (const { match, label } of MERCHANT_BUCKETS) {
        if (match.test(rawDesc)) return { key: label, name: label };
    }
    const cleaned = cleanDescription(rawDesc);
    if (!cleaned || cleaned.length < 3) {
        return { key: 'Bank transfer', name: 'Bank transfer' };
    }
    const name = cleaned.length > 38 ? cleaned.slice(0, 38).trim() + '…' : cleaned;
    return { key: name.toUpperCase(), name };
}

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

function getRanges(period, anchor) {
    const baseDate = anchor instanceof Date && !isNaN(anchor) ? anchor : new Date();
    let currentStart;
    if (period === 'quarter')   currentStart = startOfQuarter(baseDate);
    else if (period === 'year') currentStart = startOfYear(baseDate);
    else                        currentStart = startOfMonth(baseDate);

    const currentEnd = addPeriod(currentStart, period);
    const previousStart = new Date(currentStart);
    if (period === 'month')        previousStart.setMonth(previousStart.getMonth() - 1);
    else if (period === 'quarter') previousStart.setMonth(previousStart.getMonth() - 3);
    else                           previousStart.setFullYear(previousStart.getFullYear() - 1);
    const previousEnd = currentStart;

    return { currentStart, currentEnd, previousStart, previousEnd };
}

// Returns spend (debits) and income (credits) keyed by category for a period.
// Note: bank/wallet transaction logs have no user_id — ownership is via
// statement → bank/wallet. Categories live on approved_/suggested_category;
// amounts on debit_amount/credit_amount. We normalise to debit/credit/category.
async function loadCategorizedFlows(userId, start, end) {
    const [bankRaw, walletRaw, expenseRows] = await Promise.all([
        prisma.bankTransactionLog.findMany({
            where: {
                transaction_date: { gte: start, lt: end },
                bank_statement: { bank: { user_id: userId } },
            },
            select: {
                approved_category: true,
                suggested_category: true,
                debit_amount: true,
                credit_amount: true,
                description: true,
                transaction_date: true,
            },
        }),
        prisma.walletTransactionLog.findMany({
            where: {
                transaction_date: { gte: start, lt: end },
                wallet_statement: { wallet: { user_id: userId } },
            },
            select: {
                approved_category: true,
                suggested_category: true,
                debit_amount: true,
                credit_amount: true,
                description: true,
                transaction_date: true,
            },
        }),
        prisma.expense.findMany({
            where: { user_id: userId, expense_date: { gte: start, lt: end } },
            select: { category: true, amount: true, notes: true, expense_date: true },
        }),
    ]);

    const normalise = (r) => ({
        category: r.approved_category || r.suggested_category || 'Uncategorised',
        debit: r.debit_amount,
        credit: r.credit_amount,
        description: r.description,
        transaction_date: r.transaction_date,
    });
    const bankRows = bankRaw.map(normalise);
    const walletRows = walletRaw.map(normalise);
    const normalisedExpenses = expenseRows.map((r) => ({
        category: r.category,
        amount: r.amount,
        description: r.notes,
        expense_date: r.expense_date,
    }));

    return { bankRows, walletRows, expenseRows: normalisedExpenses };
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

// GET /api/dashboard/insights?period=month|quarter|year&anchor=YYYY-MM-DD
// anchor lets the client ask for a specific historical period rather than
// always the current one — used by the Spending page's month navigator.
export const getInsights = async (req, res) => {
    try {
        const period = ['month', 'quarter', 'year'].includes(req.query.period)
            ? req.query.period
            : 'month';
        const anchor = req.query.anchor ? new Date(req.query.anchor) : null;
        const userId = req.user.id;
        const { currentStart, currentEnd, previousStart, previousEnd } = getRanges(period, anchor);

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

        // Top destinations — bank/wallet transaction descriptions are noisy
        // (account codes, running balances, dates). Clean them, bucket
        // unrecognisable ones into well-known categories, count occurrences.
        const merchantMap = new Map();
        const collectMerchant = (desc, amt) => {
            if (amt <= 0) return;
            const { key, name } = resolveMerchant(desc);
            const existing = merchantMap.get(key);
            if (existing) {
                existing.total += amt;
                existing.count += 1;
            } else {
                merchantMap.set(key, { merchant: name, total: amt, count: 1 });
            }
        };
        current.bankRows.forEach(r    => collectMerchant(r.description, Number(r.debit || 0)));
        current.walletRows.forEach(r  => collectMerchant(r.description, Number(r.debit || 0)));
        current.expenseRows.forEach(r => collectMerchant(r.description, Number(r.amount || 0)));
        const topMerchants = Array.from(merchantMap.values())
            .sort((a, b) => b.total - a.total)
            .slice(0, 8)
            .map((m) => ({ merchant: m.merchant, total: m.total, count: m.count }));

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

// ─────────────────────────────────────────────────────────────────────────────
//  getSpendingRows — period-filtered, unified transaction list across
//  bank statements + wallet statements + manual expenses.
//  The Spending page uses this so the table matches the hero stats exactly
//  (same period, same sources). Each row carries a `source` (bank|wallet|manual)
//  and the human-readable `sourceLabel` (e.g. "Standard Chartered", "Naya Pay")
//  so the frontend can colour-code by institution.
// ─────────────────────────────────────────────────────────────────────────────
export const getSpendingRows = async (req, res) => {
    try {
        const userId = req.user.id;
        const period = ['month', 'quarter', 'year'].includes(req.query.period) ? req.query.period : 'month';
        const anchor = req.query.anchor ? new Date(req.query.anchor) : new Date();
        const { currentStart, currentEnd } = getRanges(period, anchor);

        const [bankRows, walletRows, expenseRows] = await Promise.all([
            prisma.bankTransactionLog.findMany({
                where: {
                    transaction_date: { gte: currentStart, lt: currentEnd },
                    bank_statement: { bank: { user_id: userId } },
                },
                select: {
                    id: true,
                    transaction_date: true,
                    description: true,
                    debit_amount: true,
                    credit_amount: true,
                    approved_category: true,
                    suggested_category: true,
                    processing_status: true,
                    bank_statement: { select: { bank: { select: { id: true, name: true } } } },
                },
            }),
            prisma.walletTransactionLog.findMany({
                where: {
                    transaction_date: { gte: currentStart, lt: currentEnd },
                    wallet_statement: { wallet: { user_id: userId } },
                },
                select: {
                    id: true,
                    transaction_date: true,
                    description: true,
                    debit_amount: true,
                    credit_amount: true,
                    approved_category: true,
                    suggested_category: true,
                    processing_status: true,
                    wallet_statement: { select: { wallet: { select: { id: true, name: true, institution: true } } } },
                },
            }),
            prisma.expense.findMany({
                where: { user_id: userId, expense_date: { gte: currentStart, lt: currentEnd } },
                select: { id: true, category: true, amount: true, notes: true, expense_date: true, payment_method: true },
            }),
        ]);

        const rows = [];

        for (const tx of bankRows) {
            const debit = Number(tx.debit_amount || 0);
            const credit = Number(tx.credit_amount || 0);
            const amount = credit > 0 ? credit : debit;
            const kind = credit > 0 ? 'credit' : 'debit';
            rows.push({
                id: `bank:${tx.id}`,
                source: 'bank',
                sourceId: tx.bank_statement?.bank?.id,
                sourceLabel: tx.bank_statement?.bank?.name || 'Bank',
                date: tx.transaction_date,
                description: tx.description || '',
                category: tx.approved_category || tx.suggested_category || 'Uncategorised',
                amount,
                kind,
                status: tx.processing_status || 'approved',
            });
        }

        for (const tx of walletRows) {
            const debit = Number(tx.debit_amount || 0);
            const credit = Number(tx.credit_amount || 0);
            const amount = credit > 0 ? credit : debit;
            const kind = credit > 0 ? 'credit' : 'debit';
            rows.push({
                id: `wallet:${tx.id}`,
                source: 'wallet',
                sourceId: tx.wallet_statement?.wallet?.id,
                sourceLabel: tx.wallet_statement?.wallet?.institution || tx.wallet_statement?.wallet?.name || 'Wallet',
                date: tx.transaction_date,
                description: tx.description || '',
                category: tx.approved_category || tx.suggested_category || 'Uncategorised',
                amount,
                kind,
                status: tx.processing_status || 'approved',
            });
        }

        for (const e of expenseRows) {
            rows.push({
                id: `manual:${e.id}`,
                source: 'manual',
                sourceId: null,
                sourceLabel: e.payment_method || 'Manual',
                date: e.expense_date,
                description: e.notes || '',
                category: e.category || 'Uncategorised',
                amount: Number(e.amount || 0),
                kind: 'debit',
                status: 'approved',
            });
        }

        rows.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json({
            period,
            range: { start: currentStart, end: currentEnd },
            count: rows.length,
            rows,
        });
    } catch (error) {
        logger.error('[SPENDING_ROWS] failed:', error);
        res.status(500).json({ message: 'Server error loading spending rows' });
    }
};
