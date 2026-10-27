import prisma from '../utils/prisma.js';
import { loadMoneyEvents, summarizeFlows } from './moneyFlow.service.js';
import { computeWealth } from './wealth.service.js';
import { nextDueDate, anchorDayOf } from '../utils/recurrence.js';

export const WARN_AT = 0.8; // a budget 80% used is flagged before it runs out

const monthStart = (d, offset = 0) => new Date(d.getFullYear(), d.getMonth() + offset, 1);
const round = (n) => Math.round(n * 100) / 100;

/** One budget's position this month. Pure: the inputs are already summed. */
export function budgetLine({ category, monthlyAmount, rollover, spent, lastMonthSpent, dayOfMonth, daysInMonth }) {
    const carried = rollover ? round(monthlyAmount - lastMonthSpent) : 0;
    const available = round(monthlyAmount + carried);
    const remaining = round(available - spent);
    const used = available > 0 ? spent / available : (spent > 0 ? Infinity : 0);
    // On pace = spending no faster than the days that have gone by.
    const expectedSoFar = available * (dayOfMonth / daysInMonth);
    return {
        category,
        budget: monthlyAmount,
        carried,
        available,
        spent: round(spent),
        remaining,
        usedPct: Number.isFinite(used) ? Math.round(used * 100) : null,
        status: spent > available ? 'over' : used >= WARN_AT ? 'warning' : 'ok',
        aheadOfPace: spent > expectedSoFar && spent <= available,
    };
}

/** Bills still to come this month (and their total) from active recurring payments. */
export function upcomingCommitments(recurring, now, end) {
    const items = [];
    for (const r of recurring) {
        let due = new Date(r.next_due_date);
        const anchor = r.due_day ?? anchorDayOf(due);
        for (let guard = 0; due < end && guard < 60; guard++) {
            if (due >= now) items.push({ name: r.name, amount: Number(r.amount), due: due.toISOString().slice(0, 10), category: r.category });
            due = nextDueDate(due, r.frequency, anchor);
        }
    }
    items.sort((a, b) => a.due.localeCompare(b.due));
    return { items, total: round(items.reduce((s, i) => s + i.amount, 0)) };
}

/** What a goal needs: progress and the monthly saving that reaches it on time. */
export function goalLine(goal, now) {
    const target = Number(goal.target_amount);
    const saved = Number(goal.saved_amount);
    const left = Math.max(0, target - saved);
    let monthsLeft = null;
    if (goal.target_date) {
        const t = new Date(goal.target_date);
        monthsLeft = Math.max(1, (t.getFullYear() - now.getFullYear()) * 12 + (t.getMonth() - now.getMonth()));
    }
    return {
        id: goal.id,
        name: goal.name,
        target,
        saved,
        progressPct: target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0,
        targetDate: goal.target_date,
        monthlyNeeded: monthsLeft ? round(left / monthsLeft) : null,
        done: saved >= target,
    };
}

/**
 * Budgets, upcoming bills, emergency-fund runway and goals for this month.
 * Spending uses the same rules as everywhere else (moneyFlow.service).
 */
export async function budgetOverview(userId, now = new Date()) {
    const thisMonth = monthStart(now);
    const nextMonth = monthStart(now, 1);
    const threeMonthsAgo = monthStart(now, -3);

    const [budgets, goals, recurring, events, wealth] = await Promise.all([
        prisma.budget.findMany({ where: { user_id: userId }, orderBy: { category: 'asc' } }),
        prisma.savingsGoal.findMany({ where: { user_id: userId }, orderBy: { created_at: 'asc' } }),
        prisma.recurringPayment.findMany({ where: { user_id: userId, is_active: true, next_due_date: { lt: nextMonth } } }),
        loadMoneyEvents(userId, threeMonthsAgo, nextMonth),
        computeWealth(userId, { valuationDate: now }),
    ]);

    const inMonth = (offset) => {
        const from = monthStart(now, offset);
        const to = monthStart(now, offset + 1);
        return summarizeFlows(events.filter((e) => new Date(e.date) >= from && new Date(e.date) < to));
    };
    const current = inMonth(0);
    const last = inMonth(-1);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    const lines = budgets.map((b) => ({
        id: b.id,
        ...budgetLine({
            category: b.category,
            monthlyAmount: Number(b.monthly_amount),
            rollover: b.rollover,
            spent: current.spendByCategory.get(b.category) || 0,
            lastMonthSpent: last.spendByCategory.get(b.category) || 0,
            dayOfMonth: now.getDate(),
            daysInMonth,
        }),
    }));

    // Emergency-fund runway: cash ÷ average spending of the last 3 full months.
    const fullMonths = [inMonth(-1), inMonth(-2), inMonth(-3)].map((m) => m.totals.spend).filter((v) => v > 0);
    const avgMonthlySpend = fullMonths.length ? fullMonths.reduce((s, v) => s + v, 0) / fullMonths.length : null;

    return {
        month: thisMonth.toISOString().slice(0, 7),
        budgets: lines,
        alerts: lines.filter((l) => l.status !== 'ok').map((l) => ({ category: l.category, status: l.status, remaining: l.remaining })),
        unbudgetedSpend: round([...current.spendByCategory].filter(([c]) => !budgets.some((b) => b.category === c)).reduce((s, [, v]) => s + v, 0)),
        commitments: upcomingCommitments(recurring, now, nextMonth),
        runway: {
            cash: round(wealth.cash.total),
            avgMonthlySpend: avgMonthlySpend == null ? null : round(avgMonthlySpend),
            months: avgMonthlySpend ? Math.round((wealth.cash.total / avgMonthlySpend) * 10) / 10 : null,
        },
        goals: goals.map((g) => goalLine(g, now)),
    };
}
