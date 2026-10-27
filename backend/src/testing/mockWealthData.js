import { jest } from '@jest/globals';
import prisma from '../utils/prisma.js';

/**
 * Stub every query computeWealth() makes. Override any piece per test.
 * Defaults: bank 400,000 · wallet 50,000 · stocks 200,000 (cost 150,000) ·
 * trading cash 20,000 · mutual funds 80,000 (cost 70,000) · gold 10 g 24K at
 * 20,000/g · assets 9,000,000 · credit card 50,000 · receivable 100,000 ·
 * payable 50,000 · rent received 50,000.
 */
export function mockWealthData(over = {}) {
    const d = {
        banks: [{ current_balance: '400000', exchange_rate: '1', balance_as_of: new Date('2026-10-01') }],
        wallets: [{ balance: '50000', exchange_rate: '1', balance_as_of: null }],
        psx: { snapshot_date: new Date('2026-10-20'), total_custody: '200000', holdings_data: [{ symbol: 'OGDC', holding: 100, cost_per_unit: 1500 }] },
        psxWithSummary: { summary_data: { trading_cash: 20000 } },
        portfolio: { upload_date: new Date('2026-10-18'), total_value: '80000', total_invested: '70000' },
        funds: [],
        goldItems: [{ weight_grams: '10', carats: 24 }],
        priceRow: { date: new Date('2026-10-19'), price_24k_per_gram: '20000' },
        assets: [{ value: '9000000' }],
        debts: [{ debt_type: 'credit_card', outstanding: '50000', minimum_payment: null }],
        people: [
            { transactions: [{ transaction_type: 'receivable', amount: 100000 }] },
            { transactions: [{ transaction_type: 'payable', amount: 50000 }] },
        ],
        rent: 50000,
        ...over,
    };
    jest.spyOn(prisma.bank, 'findMany').mockResolvedValue(d.banks);
    jest.spyOn(prisma.wallet, 'findMany').mockResolvedValue(d.wallets);
    jest.spyOn(prisma.psxSnapshot, 'findFirst').mockImplementation(async ({ where }) => (where.NOT ? d.psxWithSummary : d.psx));
    jest.spyOn(prisma.stock, 'findMany').mockResolvedValue([]);
    jest.spyOn(prisma.portfolioSnapshot, 'findFirst').mockResolvedValue(d.portfolio);
    jest.spyOn(prisma.mutualFund, 'findMany').mockResolvedValue(d.funds);
    jest.spyOn(prisma.goldItem, 'findMany').mockResolvedValue(d.goldItems);
    jest.spyOn(prisma.goldPriceHistory, 'findFirst').mockResolvedValue(d.priceRow);
    jest.spyOn(prisma.asset, 'findMany').mockResolvedValue(d.assets);
    jest.spyOn(prisma.debt, 'findMany').mockResolvedValue(d.debts);
    jest.spyOn(prisma.person, 'findMany').mockResolvedValue(d.people);
    jest.spyOn(prisma.rentEntry, 'aggregate').mockResolvedValue({ _sum: { amount: d.rent } });
    return d;
}
