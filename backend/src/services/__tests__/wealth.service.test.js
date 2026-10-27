import { jest } from '@jest/globals';
import prisma from '../../utils/prisma.js';
import { mockWealthData } from '../../testing/mockWealthData.js';
import { computeWealth, NET_WORTH_DEFINITION } from '../wealth.service.js';

afterEach(() => jest.restoreAllMocks());

describe('computeWealth — net worth v2', () => {
    it('cash + investments + gold + assets − debts; rent and dues excluded', async () => {
        mockWealthData();
        const w = await computeWealth('u1');
        // 450,000 cash + 300,000 investments + 200,000 gold + 9,000,000 assets − 50,000 debt
        expect(w.netWorth).toBe(9900000);
        expect(w.definition).toBe(NET_WORTH_DEFINITION);
        expect(w.rentReceived).toBe(50000);           // reported, not added
        expect(w.dues).toEqual({ receivable: 100000, payable: 50000 });
    });

    it('stock cost comes from the CDC holdings; trading cash from the newest summary', async () => {
        mockWealthData();
        const w = await computeWealth('u1');
        expect(w.investments.stocks).toEqual({ value: 200000, cost: 150000 });
        expect(w.investments.tradingCash).toBe(20000);
    });

    it('trading cash survives a daily re-priced snapshot that has no summary', async () => {
        mockWealthData({ psx: { snapshot_date: new Date('2026-10-21'), total_custody: '210000', holdings_data: [], summary_data: null } });
        const w = await computeWealth('u1');
        expect(w.investments.tradingCash).toBe(20000);
        const summaryQuery = prisma.psxSnapshot.findFirst.mock.calls.find(([q]) => q.where.NOT)[0];
        expect(summaryQuery.where.user_id).toBe('u1');
    });

    it('mutual fund cost is the invested amount, not today\'s value', async () => {
        mockWealthData({ portfolio: null, funds: [{ current_value: '120000', invested_amount: '100000' }] });
        const w = await computeWealth('u1');
        expect(w.investments.mutualFunds).toEqual({ value: 120000, cost: 100000 });
    });

    it('gold without a price is unknown, not zero', async () => {
        mockWealthData({ priceRow: null });
        const w = await computeWealth('u1');
        expect(w.gold.value).toBeNull();
        expect(w.gold.pricePerGram24k).toBeNull();
    });

    it('reports the oldest dated balance for freshness', async () => {
        mockWealthData();
        const w = await computeWealth('u1');
        expect(w.sources.oldestBalanceAsOf).toEqual(new Date('2026-10-01'));
    });
});
