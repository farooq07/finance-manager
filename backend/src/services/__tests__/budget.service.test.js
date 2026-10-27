import { jest } from '@jest/globals';
import prisma from '../../utils/prisma.js';
import { mockWealthData } from '../../testing/mockWealthData.js';
import { budgetLine, upcomingCommitments, goalLine, budgetOverview } from '../budget.service.js';

afterEach(() => jest.restoreAllMocks());

const base = { category: 'Food & Dining', monthlyAmount: 20000, rollover: false, spent: 0, lastMonthSpent: 0, dayOfMonth: 15, daysInMonth: 30 };

describe('budgetLine', () => {
    it('ok, warning at 80%, over when spent passes the budget', () => {
        expect(budgetLine({ ...base, spent: 5000 })).toMatchObject({ status: 'ok', remaining: 15000, usedPct: 25 });
        expect(budgetLine({ ...base, spent: 16000 })).toMatchObject({ status: 'warning', usedPct: 80 });
        expect(budgetLine({ ...base, spent: 21000 })).toMatchObject({ status: 'over', remaining: -1000 });
    });

    it('rollover carries last month\'s unspent amount (or overspend)', () => {
        expect(budgetLine({ ...base, rollover: true, lastMonthSpent: 15000 })).toMatchObject({ carried: 5000, available: 25000 });
        expect(budgetLine({ ...base, rollover: true, lastMonthSpent: 24000 })).toMatchObject({ carried: -4000, available: 16000 });
    });

    it('flags spending ahead of the month\'s pace', () => {
        expect(budgetLine({ ...base, spent: 12000 }).aheadOfPace).toBe(true);   // half the month, 60% spent
        expect(budgetLine({ ...base, spent: 8000 }).aheadOfPace).toBe(false);
    });
});

describe('upcomingCommitments', () => {
    it('lists bills still to come this month, including repeats of weekly ones', () => {
        const now = new Date('2026-10-10T00:00:00Z');
        const end = new Date('2026-11-01T00:00:00Z');
        const out = upcomingCommitments([
            { name: 'K-Electric', amount: 4500, frequency: 'monthly', next_due_date: new Date('2026-10-20') },
            { name: 'Maid', amount: 2000, frequency: 'weekly', next_due_date: new Date('2026-10-12') },
            { name: 'Overdue', amount: 999, frequency: 'monthly', next_due_date: new Date('2026-10-01') },
        ], now, end);
        expect(out.items.map((i) => i.due)).toEqual(['2026-10-12', '2026-10-19', '2026-10-20', '2026-10-26']);
        expect(out.total).toBe(4500 + 3 * 2000);
    });
});

describe('goalLine', () => {
    it('progress and the monthly saving needed to hit the date', () => {
        const g = goalLine({ id: 'g', name: 'Umrah', target_amount: 600000, saved_amount: 150000, target_date: new Date('2027-04-15') }, new Date('2026-10-27'));
        expect(g).toMatchObject({ progressPct: 25, monthlyNeeded: 75000, done: false });
    });
});

describe('budgetOverview', () => {
    it('combines budgets, runway and goals for the signed-in user', async () => {
        mockWealthData();
        jest.spyOn(prisma.budget, 'findMany').mockResolvedValue([{ id: 'b1', category: 'Groceries', monthly_amount: 30000, rollover: false }]);
        jest.spyOn(prisma.savingsGoal, 'findMany').mockResolvedValue([]);
        jest.spyOn(prisma.recurringPayment, 'findMany').mockResolvedValue([]);
        jest.spyOn(prisma.expense, 'findMany').mockResolvedValue([
            { id: 'e1', amount: 12000, category: 'Groceries', expense_date: new Date(2026, 9, 5), source_bank_tx_id: null, source_wallet_tx_id: null },
            { id: 'e2', amount: 45000, category: 'Shopping', expense_date: new Date(2026, 8, 5), source_bank_tx_id: null, source_wallet_tx_id: null },
        ]);
        jest.spyOn(prisma.bankTransactionLog, 'findMany').mockResolvedValue([]);
        jest.spyOn(prisma.walletTransactionLog, 'findMany').mockResolvedValue([]);

        const out = await budgetOverview('u1', new Date(2026, 9, 27));
        expect(prisma.budget.findMany.mock.calls[0][0].where).toEqual({ user_id: 'u1' });
        expect(out.budgets[0]).toMatchObject({ category: 'Groceries', spent: 12000, remaining: 18000 });
        expect(out.runway).toEqual({ cash: 450000, avgMonthlySpend: 45000, months: 10 });
    });
});
