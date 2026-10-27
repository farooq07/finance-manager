import { jest } from '@jest/globals';
import prisma from '../../utils/prisma.js';

jest.unstable_mockModule('../categorizer.service.js', () => ({
    categorizeTransactionBatch: jest.fn(async (_u, txs) => txs.map(() => ({ category: 'Groceries', confidence: 0.9 }))),
}));

const { saveStatementImport, shouldTakeBalance, statementEndDate } = await import('../statementImport.service.js');

const txs = [
    { transaction_date: new Date('2026-03-02'), description: 'A', debit_amount: 100, credit_amount: null, net_amount: -100 },
    { transaction_date: new Date('2026-03-28'), description: 'B', debit_amount: null, credit_amount: 500, net_amount: 500 },
];
const base = { kind: 'bank', userId: 'u1', accountId: 'b1', parsedTxs: txs, statementData: { month: 'March', year: 2026 } };

beforeEach(() => {
    jest.spyOn(prisma, '$transaction').mockImplementation((fn) => fn(prisma));
    jest.spyOn(prisma.bankStatement, 'create').mockResolvedValue({ id: 's1' });
    jest.spyOn(prisma.bankTransactionLog, 'createMany').mockResolvedValue({ count: 2 });
    // 1st findMany = duplicate lookup (real detector), then the saved rows.
    jest.spyOn(prisma.bankTransactionLog, 'findMany')
        .mockResolvedValueOnce([])
        .mockResolvedValue([{ id: 'l1' }, { id: 'l2' }]);
});
afterEach(() => jest.restoreAllMocks());

describe('saveStatementImport', () => {
    it('writes the statement and every row in one transaction', async () => {
        jest.spyOn(prisma.bank, 'findUnique').mockResolvedValue({ balance_as_of: null });
        jest.spyOn(prisma.bank, 'update').mockResolvedValue({});
        const out = await saveStatementImport({ ...base, closingBalance: 9000 });

        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
        expect(prisma.bankStatement.create.mock.calls[0][0].data).toEqual({ month: 'March', year: 2026, bank_id: 'b1' });
        const rows = prisma.bankTransactionLog.createMany.mock.calls[0][0].data;
        expect(rows).toHaveLength(2);
        expect(rows[0]).toMatchObject({ bank_statement_id: 's1', suggested_category: 'Groceries', processing_status: 'pending' });
        expect(out.transactionLogs).toHaveLength(2);
        expect(out.balanceUpdated).toBe(true);
    });

    it('a failed row write fails the whole import instead of dropping the row', async () => {
        prisma.bankTransactionLog.createMany.mockRejectedValue(new Error('bad row'));
        await expect(saveStatementImport({ ...base, closingBalance: null })).rejects.toThrow('bad row');
    });

    it('refuses to finish if fewer rows were saved than parsed', async () => {
        prisma.bankTransactionLog.findMany.mockReset()
            .mockResolvedValueOnce([])
            .mockResolvedValue([{ id: 'l1' }]);
        await expect(saveStatementImport({ ...base, closingBalance: null })).rejects.toThrow('Saved 1 of 2');
    });

    it('an older statement does not overwrite a newer balance', async () => {
        jest.spyOn(prisma.bank, 'findUnique').mockResolvedValue({ balance_as_of: new Date('2026-05-31'), balance_source: 'statement' });
        const update = jest.spyOn(prisma.bank, 'update');
        const out = await saveStatementImport({ ...base, closingBalance: 9000 });
        expect(update).not.toHaveBeenCalled();
        expect(out.balanceUpdated).toBe(false);
    });

    it('a newer statement updates the balance with its date and source', async () => {
        jest.spyOn(prisma.bank, 'findUnique').mockResolvedValue({ balance_as_of: new Date('2026-02-28'), balance_source: 'statement' });
        const update = jest.spyOn(prisma.bank, 'update').mockResolvedValue({});
        await saveStatementImport({ ...base, closingBalance: 9000 });
        expect(update.mock.calls[0][0].data).toEqual({
            current_balance: 9000,
            balance_as_of: new Date('2026-03-28'),
            balance_source: 'statement',
            balance_statement_id: 's1',
        });
    });

    it('certain duplicates are saved rejected, possible ones pending and flagged', async () => {
        prisma.bankTransactionLog.findMany.mockReset()
            .mockResolvedValueOnce([
                { id: 'old1', description: 'A', net_amount: -100, transaction_date: new Date('2026-03-02') },
                { id: 'old2', description: 'B ', net_amount: 500, transaction_date: new Date('2026-03-30') },
            ])
            .mockResolvedValue([{ id: 'l1' }, { id: 'l2' }]);
        const out = await saveStatementImport({ ...base, closingBalance: null });
        const rows = prisma.bankTransactionLog.createMany.mock.calls[0][0].data;
        expect(rows[0]).toMatchObject({ is_duplicate: true, duplicate_of_id: 'old1', processing_status: 'rejected' });
        expect(rows[1]).toMatchObject({ is_duplicate: false, duplicate_match: 'possible', processing_status: 'pending' });
        expect(out).toMatchObject({ duplicateCount: 1, possibleDuplicateCount: 1 });
    });
});

describe('balance helpers', () => {
    it('statementEndDate is the last transaction date', () => {
        expect(statementEndDate(txs)).toEqual(new Date('2026-03-28'));
        expect(statementEndDate([])).toBeNull();
    });
    it('shouldTakeBalance', () => {
        const st = (d) => ({ balance_as_of: new Date(d), balance_source: 'statement' });
        expect(shouldTakeBalance({ balance_as_of: null }, null)).toBe(true);
        expect(shouldTakeBalance(st('2026-03-28'), new Date('2026-03-28'))).toBe(true);
        expect(shouldTakeBalance(st('2026-03-29'), new Date('2026-03-28'))).toBe(false);
        expect(shouldTakeBalance(st('2026-03-29'), null)).toBe(false);
    });

    it('the starting balance typed at account creation gives way to the first statement', () => {
        expect(shouldTakeBalance({ balance_as_of: new Date('2026-10-27'), balance_source: 'opening' }, new Date('2026-03-10'))).toBe(true);
    });

    it('a balance typed by hand wins over statements that end before it', () => {
        const manual = { balance_as_of: new Date('2026-10-20'), balance_source: 'manual' };
        expect(shouldTakeBalance(manual, new Date('2026-10-19'))).toBe(false);
        expect(shouldTakeBalance(manual, new Date('2026-10-20'))).toBe(true);
    });
});
