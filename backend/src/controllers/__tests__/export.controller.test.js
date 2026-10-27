import { jest } from '@jest/globals';
import prisma from '../../utils/prisma.js';
import { recordPrismaReads, queryShapeErrors } from '../../testing/prismaShape.js';
import { toCsv } from '../../utils/csv.js';
import { exportTransactions, exportExpenses, exportDues, exportAll } from '../export.controller.js';

const res = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn(), setHeader: jest.fn() });
const req = { user: { id: 'u1' } };

afterEach(() => jest.restoreAllMocks());

describe.each([
    ['transactions.csv', exportTransactions],
    ['expenses.csv', exportExpenses],
    ['dues.csv', exportDues],
    ['all.json', exportAll],
])('%s', (_name, handler) => {
    it('every query matches the Prisma schema and is scoped to the user', async () => {
        const calls = recordPrismaReads();
        const r = res();
        await handler(req, r);

        expect(r.status).not.toHaveBeenCalled();
        expect(calls.length).toBeGreaterThan(0);
        for (const { model, args } of calls) {
            expect(queryShapeErrors(model, args)).toEqual([]);
            expect(JSON.stringify(args.where)).toContain('u1');
        }
    });
});

describe('exportAll', () => {
    it('never includes credentials', async () => {
        const calls = recordPrismaReads();
        const r = res();
        await exportAll(req, r);

        const userQuery = calls.find((c) => c.model === 'User').args.select;
        for (const secret of ['password_hash', 'app_pin_code', 'otp_code', 'email_verification_token']) {
            expect(userQuery[secret]).toBeUndefined();
        }
        const broker = calls.find((c) => c.model === 'BrokerAccount').args.select;
        expect(broker.stock_pin_code).toBeUndefined();
        const statements = calls.find((c) => c.model === 'BankStatement').args.select;
        expect(statements.password_encrypted).toBeUndefined();
        expect(statements.file_path).toBeUndefined();
        expect(calls.some((c) => c.model === 'GoldPin')).toBe(false);
    });

    it('includes the newer modules', async () => {
        const calls = recordPrismaReads();
        await exportAll(req, res());
        const models = new Set(calls.map((c) => c.model));
        for (const m of ['GoldItem', 'Debt', 'DebtPayment', 'RecurringPayment', 'NetWorthSnapshot', 'PsxSnapshot', 'ChatSession']) {
            expect(models.has(m)).toBe(true);
        }
    });
});

describe('exportTransactions', () => {
    it('maps the real log columns', async () => {
        recordPrismaReads();
        prisma.bankTransactionLog.findMany.mockResolvedValue([{
            transaction_date: new Date('2026-03-05'), description: 'KFC', approved_category: 'Food',
            suggested_category: 'Other', debit_amount: 1500, credit_amount: null,
            processing_status: 'approved', is_duplicate: false, user_approved: true,
            bank_statement: { bank: { name: 'Meezan', currency: 'PKR' } },
        }]);
        const r = res();
        await exportTransactions(req, r);
        const csv = r.send.mock.calls[0][0];
        expect(csv.split('\n')[1]).toBe('bank,Meezan,PKR,2026-03-05T00:00:00.000Z,KFC,Food,1500,,approved,false,true');
    });
});

describe('toCsv', () => {
    it('neutralises spreadsheet formulas in text but keeps negative numbers', () => {
        const csv = toCsv(['d', 'n'], [{ d: '=HYPERLINK("http://x")', n: -500 }, { d: '@SUM(A1)', n: 1 }]);
        const [, first, second] = csv.split('\n');
        expect(first).toBe(`"'=HYPERLINK(""http://x"")",-500`);
        expect(second).toBe("'@SUM(A1),1");
    });
});
