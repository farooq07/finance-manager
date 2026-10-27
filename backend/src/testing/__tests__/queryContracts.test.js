import { jest } from '@jest/globals';
import { recordPrismaReads, queryShapeErrors } from '../prismaShape.js';
import { computeWealth } from '../../services/wealth.service.js';
import { loadMoneyEvents } from '../../services/moneyFlow.service.js';
import { fetchDashboardData } from '../../controllers/dashboard.controller.js';
import { getInsights, getSpendingRows } from '../../controllers/insights.controller.js';

afterEach(() => jest.restoreAllMocks());

describe('queryShapeErrors', () => {
    it('catches a filter on a field the model does not have (the old export bug)', () => {
        expect(queryShapeErrors('BankTransactionLog', { where: { user_id: 'u1' } }))
            .toEqual(['BankTransactionLog.where.user_id — no such field on BankTransactionLog']);
    });

    it('catches a missing relation in include', () => {
        expect(queryShapeErrors('BankTransactionLog', { include: { bank: true } })).toHaveLength(1);
    });

    it('follows relations', () => {
        expect(queryShapeErrors('BankTransactionLog', { where: { bank_statement: { bank: { user_id: 'u1' } } } })).toEqual([]);
        expect(queryShapeErrors('BankTransactionLog', { where: { bank_statement: { bank: { owner: 'u1' } } } })).toHaveLength(1);
    });
});

const res = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

describe('money queries match the schema and stay scoped to the user', () => {
    it.each([
        ['computeWealth', () => computeWealth('u1')],
        ['loadMoneyEvents', () => loadMoneyEvents('u1', new Date('2026-01-01'), new Date('2026-02-01'))],
        ['fetchDashboardData', () => fetchDashboardData('u1')],
        ['getInsights', () => getInsights({ user: { id: 'u1' }, query: { period: 'month' } }, res())],
        ['getSpendingRows', () => getSpendingRows({ user: { id: 'u1' }, query: {} }, res())],
    ])('%s', async (_name, run) => {
        const calls = recordPrismaReads();
        await run();
        expect(calls.length).toBeGreaterThan(0);
        for (const { model, args } of calls) {
            expect(queryShapeErrors(model, args)).toEqual([]);
            // Global reference data (gold price) has no owner; everything else must be scoped.
            if (model !== 'GoldPriceHistory') expect(JSON.stringify(args?.where)).toContain('u1');
        }
    });
});
