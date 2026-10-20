import { jest } from '@jest/globals';
import prisma from '../../utils/prisma.js';

const fetchDashboardData = jest.fn();
jest.unstable_mockModule('../dashboard.controller.js', () => ({ fetchDashboardData }));

const { getZakatSummary } = await import('../zakat.controller.js');

const metrics = {
    totalBankBalance: 400000,
    totalWalletBalance: 50000,
    totalRentBalance: 50000,
    totalInvestments: 300000,
    totalReceivable: 100000,
    totalPayable: 50000,
    totalDebt: 50000,
    totalAssetValue: 9000000, // personal-use property — must not count
};

// One 24K item of 10 g at 20,000/g → gold value 200,000. Nisab = 85 × 20,000 = 1,700,000.
const goldItems = [{ weight_grams: '10', carats: 24 }];
const priceRow = { date: new Date('2026-10-19'), price_24k_per_gram: '20000' };

describe('getZakatSummary', () => {
    let req, res;

    beforeEach(() => {
        req = { user: { id: 'u1' } };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        fetchDashboardData.mockResolvedValue({ metrics });
        jest.spyOn(prisma.goldItem, 'findMany').mockResolvedValue(goldItems);
        jest.spyOn(prisma.goldPriceHistory, 'findFirst').mockResolvedValue(priceRow);
    });

    it('queries gold and dashboard with req.user.id', async () => {
        await getZakatSummary(req, res);
        expect(prisma.goldItem.findMany).toHaveBeenCalledWith({ where: { user_id: 'u1' } });
        expect(fetchDashboardData).toHaveBeenCalledWith('u1');
    });

    it('maps metrics into buckets', async () => {
        await getZakatSummary(req, res);
        const body = res.json.mock.calls[0][0];
        expect(body.breakdown).toEqual({
            cash: 500000, investments: 300000, goldValue: 200000,
            receivables: 100000, payables: 50000, debts: 50000,
        });
        expect(body.netZakatable).toBe(1000000);
        expect(body.nisabValue).toBe(1700000);
        expect(body.isNisabMet).toBe(false);
        expect(body.zakatDue).toBe(0);
        expect(body.goldPriceDate).toEqual(priceRow.date);
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
