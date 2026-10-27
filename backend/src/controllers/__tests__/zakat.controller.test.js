import { jest } from '@jest/globals';
import prisma from '../../utils/prisma.js';
import { mockWealthData } from '../../testing/mockWealthData.js';

const { getZakatSummary, createZakatEntry } = await import('../zakat.controller.js');

// Gold: 10 g 24K at 20,000/g = 200,000. Nisab = 85 × 20,000 = 1,700,000.
describe('getZakatSummary', () => {
    let req, res;

    beforeEach(() => {
        req = { user: { id: 'u1' } };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        mockWealthData();
    });
    afterEach(() => jest.restoreAllMocks());

    it('deducts only the next 12 months of a mortgage, not the whole balance', async () => {
        prisma.debt.findMany.mockResolvedValue([
            { debt_type: 'credit_card', outstanding: '50000', minimum_payment: '5000' },
            { debt_type: 'mortgage', outstanding: '5000000', minimum_payment: '50000' },
        ]);
        await getZakatSummary(req, res);
        expect(prisma.debt.findMany).toHaveBeenCalledWith({ where: { user_id: 'u1', is_active: true } });
        expect(res.json.mock.calls[0][0].breakdown.debts).toBe(650000);
    });

    it('queries with req.user.id', async () => {
        await getZakatSummary(req, res);
        expect(prisma.goldItem.findMany).toHaveBeenCalledWith({ where: { user_id: 'u1' } });
        expect(prisma.bank.findMany).toHaveBeenCalledWith({ where: { user_id: 'u1' } });
    });

    it('maps wealth into zakat buckets; personal assets are not zakatable', async () => {
        await getZakatSummary(req, res);
        const body = res.json.mock.calls[0][0];
        expect(body.breakdown).toEqual({
            cash: 450000,
            investments: 300000,   // stocks 200,000 + trading cash 20,000 + funds 80,000
            goldValue: 200000,
            receivables: 100000, payables: 50000, debts: 50000,
        });
        expect(body.netZakatable).toBe(950000);
        expect(body.nisabValue).toBe(1700000);
        expect(body.isNisabMet).toBe(false);
        expect(body.zakatDue).toBe(0);
        expect(body.goldPriceDate).toEqual(new Date('2026-10-19'));
        expect(body.valuationDate).toBeInstanceOf(Date);
    });

    it('rent received is not added to cash (it already lands in bank/wallet balances)', async () => {
        await getZakatSummary(req, res);
        expect(res.json.mock.calls[0][0].breakdown.cash).toBe(450000);
    });

    it('no gold price → nisabValue null, goldPriceDate null, isNisabMet null', async () => {
        prisma.goldPriceHistory.findFirst.mockResolvedValue(null);
        await getZakatSummary(req, res);
        const body = res.json.mock.calls[0][0];
        expect(body.nisabValue).toBeNull();
        expect(body.goldPriceDate).toBeNull();
        expect(body.isNisabMet).toBeNull();
        expect(body.breakdown.goldValue).toBe(0);
    });

    it('prisma throws → 500 with { message }', async () => {
        prisma.goldItem.findMany.mockRejectedValue(new Error('db down'));
        await getZakatSummary(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: expect.any(String) });
    });
});

describe('explainable zakat', () => {
    let res;
    beforeEach(() => {
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        mockWealthData({
            banks: [{ name: 'Meezan', current_balance: '400000', exchange_rate: '1', balance_as_of: new Date('2026-10-01') }],
            debts: [{ name: 'Car loan', debt_type: 'car_loan', outstanding: '900000', minimum_payment: '25000' }],
        });
    });
    afterEach(() => jest.restoreAllMocks());

    it('shows where each line comes from and the rules used', async () => {
        await getZakatSummary({ user: { id: 'u1' } }, res);
        const body = res.json.mock.calls[0][0];
        expect(body.details.cash[0]).toMatchObject({ kind: 'bank', name: 'Meezan', value: 400000 });
        expect(body.details.debts[0]).toEqual({ name: 'Car loan', outstanding: 900000, deductible: 300000, rule: 'Long-term loan: next 12 monthly payments' });
        expect(body.details.gold).toMatchObject({ grams24k: 10, pricePerGram24k: 20000 });
        expect(body.assumptions.length).toBeGreaterThan(3);
    });

    it('a recorded payment keeps the calculation it was based on', async () => {
        const create = jest.spyOn(prisma.zakat, 'create').mockResolvedValue({ id: 'z1' });
        await createZakatEntry({ user: { id: 'u1' }, body: { amount: 5000, description: 'Ramadan' } }, res);
        const { computation } = create.mock.calls[0][0].data;
        expect(computation).toMatchObject({ nisabValue: 1700000, goldPriceDate: new Date('2026-10-19') });
        expect(computation.breakdown.debts).toBe(300000);
    });
});
