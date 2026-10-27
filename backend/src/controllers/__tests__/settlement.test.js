import { jest } from '@jest/globals';
import { Prisma } from '@prisma/client';
import prisma from '../../utils/prisma.js';
import { addPayment, splitPayment } from '../debt.controller.js';
import { markPaid } from '../recurring.controller.js';

const res = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
const expenseFields = new Set(Prisma.dmmf.datamodel.models.find((m) => m.name === 'Expense').fields.map((f) => f.name));

beforeEach(() => {
    jest.spyOn(prisma, '$transaction').mockImplementation((fn) => fn(prisma));
    jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('splitPayment', () => {
    it.each([
        [1000, undefined, undefined, { principal: 1000, interest: 0 }],
        [1000, 800, undefined, { principal: 800, interest: 200 }],
        [1000, undefined, 150, { principal: 850, interest: 150 }],
        [1000, 700, 300, { principal: 700, interest: 300 }],
    ])('%i (p=%s, i=%s)', (amount, p, i, expected) => {
        expect(splitPayment(amount, p, i)).toEqual(expected);
    });

    it.each([
        [1000, 700, 200],   // doesn't add up
        [1000, -5, undefined],
        [1000, 1200, undefined],
    ])('rejects %i (p=%s, i=%s)', (amount, p, i) => {
        expect(splitPayment(amount, p, i).error).toEqual(expect.any(String));
    });
});

describe('addPayment', () => {
    it('lets the database apply the reduction (no stale read-modify-write)', async () => {
        jest.spyOn(prisma.debt, 'findFirst').mockResolvedValue({ id: 'd1', outstanding: 5000 });
        jest.spyOn(prisma.debtPayment, 'create').mockResolvedValue({ id: 'p1' });
        const update = jest.spyOn(prisma.debt, 'update').mockResolvedValue({ id: 'd1', outstanding: 4000 });

        await addPayment({ params: { id: 'd1' }, user: { id: 'u1' }, body: { amount: 1000 } }, res());

        expect(update.mock.calls[0][0].data).toEqual({ outstanding: { decrement: 1000 } });
        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('paying it off closes the debt at zero', async () => {
        jest.spyOn(prisma.debt, 'findFirst').mockResolvedValue({ id: 'd1', outstanding: 500 });
        jest.spyOn(prisma.debtPayment, 'create').mockResolvedValue({ id: 'p1' });
        const update = jest.spyOn(prisma.debt, 'update')
            .mockResolvedValueOnce({ id: 'd1', outstanding: -500 })
            .mockResolvedValueOnce({ id: 'd1', outstanding: 0, is_active: false });

        await addPayment({ params: { id: 'd1' }, user: { id: 'u1' }, body: { amount: 1000 } }, res());

        expect(update.mock.calls[1][0].data).toEqual({ outstanding: 0, is_active: false });
    });

    it('only the interest part does not reduce the balance', async () => {
        jest.spyOn(prisma.debt, 'findFirst').mockResolvedValue({ id: 'd1', outstanding: 5000 });
        const create = jest.spyOn(prisma.debtPayment, 'create').mockResolvedValue({ id: 'p1' });
        const update = jest.spyOn(prisma.debt, 'update').mockResolvedValue({ id: 'd1', outstanding: 4200 });
        await addPayment({ params: { id: 'd1' }, user: { id: 'u1' }, body: { amount: 1000, interest_portion: 200 } }, res());
        expect(create.mock.calls[0][0].data).toMatchObject({ principal_portion: 800, interest_portion: 200 });
        expect(update.mock.calls[0][0].data).toEqual({ outstanding: { decrement: 800 } });
    });
});

describe('markPaid', () => {
    const bill = { id: 'r1', user_id: 'u1', name: 'K-Electric', amount: 4500, category: 'Utilities', frequency: 'monthly', next_due_date: new Date('2026-01-31'), due_day: 31 };

    it('advances Jan 31 to Feb 28 and records a valid expense in the same transaction', async () => {
        jest.spyOn(prisma.recurringPayment, 'findFirst').mockResolvedValue(bill);
        const advance = jest.spyOn(prisma.recurringPayment, 'updateMany').mockResolvedValue({ count: 1 });
        jest.spyOn(prisma.recurringPayment, 'findUnique').mockResolvedValue({ ...bill, next_due_date: new Date('2026-02-28') });
        const expense = jest.spyOn(prisma.expense, 'create').mockResolvedValue({});

        await markPaid({ params: { id: 'r1' }, user: { id: 'u1' }, body: { record_expense: true } }, res());

        expect(advance.mock.calls[0][0].where).toEqual({ id: 'r1', user_id: 'u1', next_due_date: bill.next_due_date });
        expect(advance.mock.calls[0][0].data.next_due_date.toISOString().slice(0, 10)).toBe('2026-02-28');
        const data = expense.mock.calls[0][0].data;
        for (const field of Object.keys(data)) expect(expenseFields.has(field)).toBe(true);
        expect(data.notes).toBe('K-Electric');
    });

    it('a second click on the same cycle does not skip a month', async () => {
        jest.spyOn(prisma.recurringPayment, 'findFirst').mockResolvedValue(bill);
        jest.spyOn(prisma.recurringPayment, 'updateMany').mockResolvedValue({ count: 0 });
        jest.spyOn(prisma.recurringPayment, 'findUnique').mockResolvedValue(bill);
        const expense = jest.spyOn(prisma.expense, 'create');
        const r = res();
        await markPaid({ params: { id: 'r1' }, user: { id: 'u1' }, body: { record_expense: true } }, r);
        expect(r.status).toHaveBeenCalledWith(409);
        expect(expense).not.toHaveBeenCalled();
    });
});
