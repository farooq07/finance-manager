import logger from '../utils/logger.js';
import { loadMoneyEvents, summarizeFlows, spendEvents } from '../services/moneyFlow.service.js';

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

const add = (m, k, v) => m.set(k, (m.get(k) || 0) + v);

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

        // When the user is looking at the in-progress period, only compare against
        // the SAME elapsed span of the previous period (month-to-date vs the same
        // point last month). Otherwise a partial current period always looks like a
        // collapse against a full prior one — the bug that made spend read "-93%".
        const now = new Date();
        const isCurrent = now >= currentStart && now < currentEnd;
        const asOf = isCurrent ? now : new Date(currentEnd.getTime() - 1);
        const prevCompareEnd = isCurrent
            ? new Date(previousStart.getTime() + (now.getTime() - currentStart.getTime()))
            : previousEnd;

        // Every figure below comes from the shared money-flow rules: each event
        // counted once, rejected duplicates and own-account transfers excluded.
        const [currentEvents, previousEvents] = await Promise.all([
            loadMoneyEvents(userId, currentStart, currentEnd),
            loadMoneyEvents(userId, previousStart, prevCompareEnd),
        ]);
        const current = summarizeFlows(currentEvents);
        const previous = summarizeFlows(previousEvents);

        const currentSpend = current.totals.spend;
        const currentIncome = current.totals.income;
        const previousSpend = previous.totals.spend;
        const previousIncome = previous.totals.income;

        const spendDelta  = previousSpend  > 0 ? ((currentSpend  - previousSpend)  / previousSpend)  * 100 : null;
        const incomeDelta = previousIncome > 0 ? ((currentIncome - previousIncome) / previousIncome) * 100 : null;

        // Net delta — higher net is better, so this is NOT inverted on the client.
        // Denominator is the magnitude of previous net so a swing from negative to
        // positive reads as a positive (good) change.
        const currentNet  = currentIncome - currentSpend;
        const previousNet  = previousIncome - previousSpend;
        const netDelta = previousNet !== 0
            ? ((currentNet - previousNet) / Math.abs(previousNet)) * 100
            : null;

        // Category breakdown (spend only) — current and the same-span previous,
        // the latter powering the "X× vs last period" callouts.
        const merged = current.spendByCategory;
        const prevMerged = previous.spendByCategory;
        const categoryBreakdown = Array.from(merged, ([category, total]) => ({ category, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 12);

        // Source split — where each rupee of spend was recorded.
        const spent = spendEvents(currentEvents);
        const bySource = new Map();
        for (const e of spent) add(bySource, e.source, e.amount);
        const sourceBreakdown = [
            { source: 'bank',   label: 'Bank statements',    total: bySource.get('bank') || 0 },
            { source: 'wallet', label: 'Wallet transactions', total: bySource.get('wallet') || 0 },
            { source: 'manual', label: 'Manual & journal',   total: bySource.get('manual') || 0 },
        ].filter((s) => s.total > 0);

        // Auto callouts — structured so the client owns currency formatting.
        const callouts = [];
        if (currentNet < 0) callouts.push({ kind: 'net_negative', value: currentNet });
        const spikeFloor = currentSpend * 0.03; // ignore trivial categories
        const spikes = [];
        for (const [category, cur] of merged) {
            if (cur < spikeFloor) continue;
            const prev = prevMerged.get(category) || 0;
            if (prev > 0 && cur >= prev * 1.8) {
                spikes.push({ kind: 'category_spike', category, value: cur, multiplier: cur / prev });
            } else if (prev === 0) {
                spikes.push({ kind: 'new_category', category, value: cur });
            }
        }
        spikes.sort((a, b) => b.value - a.value);
        callouts.push(...spikes.slice(0, 2));
        if (categoryBreakdown.length && currentSpend > 0) {
            const top = categoryBreakdown[0];
            callouts.push({ kind: 'top_category', category: top.category, value: top.total, share: (top.total / currentSpend) * 100 });
        }
        const trimmedCallouts = callouts.slice(0, 3);

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
        spent.forEach((e) => collectMerchant(e.description, e.amount));
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
        spent.forEach((e) => addDaily(e.date, e.amount));
        // Fill EVERY calendar day in the period (up to "as of") with zeros so a
        // month with three spending days reads as three bars on an empty axis —
        // not a smooth line implying a trend across days that have no data.
        const dailyTrend = [];
        const cursor = new Date(currentStart);
        const lastDay = new Date(Math.min(asOf.getTime(), currentEnd.getTime() - 1));
        while (cursor <= lastDay) {
            const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
            dailyTrend.push({ day: key, total: dayMap.get(key) || 0 });
            cursor.setDate(cursor.getDate() + 1);
        }

        // Weekday pattern (Sun=0..Sat=6)
        const weekdayTotals = Array(7).fill(0);
        const weekdayCount  = Array(7).fill(0);
        const addWeekday = (date, amt) => {
            if (amt <= 0) return;
            const w = new Date(date).getDay();
            weekdayTotals[w] += amt;
            weekdayCount[w]  += 1;
        };
        spent.forEach((e) => addWeekday(e.date, e.amount));
        const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const weekdayPattern = weekdays.map((label, i) => ({
            day: label,
            total: weekdayTotals[i],
            avg: weekdayCount[i] > 0 ? weekdayTotals[i] / weekdayCount[i] : 0,
        }));

        res.json({
            period,
            range: { start: currentStart, end: currentEnd },
            mtd: isCurrent,        // true when the comparison is month-to-date vs same-point-last
            asOf,                  // the effective "up to" date the figures cover
            totals: {
                currentSpend,
                currentIncome,
                net: currentNet,
                previousSpend,
                previousIncome,
                previousNet,
                spendDelta,   // % change vs previous period (same-span when mtd)
                incomeDelta,
                netDelta,
                // Movements that are not spending, shown separately
                refunds: current.totals.refunds,
                transfers: current.totals.transfers,
                cashWithdrawn: current.totals.cashWithdrawn,
                invested: current.totals.invested,
                debtRepaid: current.totals.debtRepaid,
            },
            categoryBreakdown,
            sourceBreakdown,
            callouts: trimmedCallouts,
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

        // Same events as the hero figures, so the table always matches them.
        const events = await loadMoneyEvents(userId, currentStart, currentEnd);
        const rows = events.map((e) => ({
            id: e.id,
            source: e.source,
            sourceId: e.accountId,
            sourceLabel: e.accountLabel,
            date: e.date,
            description: e.description,
            category: e.category,
            amount: e.amount,
            kind: e.direction === 'in' ? 'credit' : 'debit',
            flow: e.kind,           // spend | income | refund | transfer | cash | investment | debt
            status: e.status,
            possibleDuplicate: e.possibleDuplicate,
        }));

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

// GET /api/dashboard/annual?year=2026 — income, spending, net and top category
// for each month of a year, from ONE load of the year's money events (the
// Annual Summary used to make 12 insights requests, 24 loads).
export const getAnnualSummary = async (req, res) => {
    try {
        const year = Number.parseInt(req.query.year, 10) || new Date().getFullYear();
        if (year < 2000 || year > 2100) return res.status(400).json({ message: 'year must be between 2000 and 2100' });

        const events = await loadMoneyEvents(req.user.id, new Date(year, 0, 1), new Date(year + 1, 0, 1));
        const byMonth = Array.from({ length: 12 }, () => []);
        for (const e of events) byMonth[new Date(e.date).getMonth()].push(e);

        const months = byMonth.map((monthEvents, i) => {
            const { totals, spendByCategory } = summarizeFlows(monthEvents);
            const top = [...spendByCategory].sort((a, b) => b[1] - a[1])[0];
            return {
                month: i + 1,
                income: totals.income,
                spending: totals.spend,
                net: totals.income - totals.spend,
                topCategory: top ? top[0] : null,
                hasData: monthEvents.length > 0,
            };
        });
        res.json({ year, months });
    } catch (error) {
        logger.error('[ANNUAL] failed:', error);
        res.status(500).json({ message: 'Server error building the annual summary' });
    }
};
