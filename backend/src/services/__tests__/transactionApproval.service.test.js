import { jest } from '@jest/globals';
import prisma from '../../utils/prisma.js';
import { approveImportedTransaction } from '../transactionApproval.service.js';

const debitLog = {
    id: 'tx1', net_amount: -1500, transaction_date: new Date('2026-03-05'),
    description: 'KFC', suggested_category: 'Food & Dining', approved_category: null, created_expense_id: null,
};

beforeEach(() => {
    // Run the interactive transaction against the (mocked) client itself.
    jest.spyOn(prisma, '$transaction').mockImplementation((fn) => fn(prisma));
});
afterEach(() => jest.restoreAllMocks());

describe('approveImportedTransaction', () => {
    it('first approval claims the row and creates one linked expense', async () => {
        jest.spyOn(prisma.bankTransactionLog, 'findFirst').mockResolvedValue(debitLog);
        const claim = jest.spyOn(prisma.bankTransactionLog, 'updateMany').mockResolvedValue({ count: 1 });
        const create = jest.spyOn(prisma.expense, 'create').mockResolvedValue({ id: 'e1' });
        const link = jest.spyOn(prisma.bankTransactionLog, 'update').mockResolvedValue({});

        const result = await approveImportedTransaction({ kind: 'bank', userId: 'u1', accountId: 'b1', txId: 'tx1', category: 'Groceries' });

        expect(result).toMatchObject({ approved: true, expenseId: 'e1', isCredit: false });
        // conditional claim: only an unapproved row can be claimed
        expect(claim.mock.calls[0][0].where).toEqual({ id: 'tx1', user_approved: false });
        expect(create.mock.calls[0][0].data).toMatchObject({ user_id: 'u1', amount: 1500, category: 'Groceries', source_bank_tx_id: 'tx1' });
        expect(link).toHaveBeenCalledWith({ where: { id: 'tx1' }, data: { created_expense_id: 'e1' } });
    });

    it('a repeated approval creates nothing and returns the original expense', async () => {
        jest.spyOn(prisma.bankTransactionLog, 'findFirst').mockResolvedValue({ ...debitLog, created_expense_id: 'e1' });
        jest.spyOn(prisma.bankTransactionLog, 'updateMany').mockResolvedValue({ count: 0 });
        const create = jest.spyOn(prisma.expense, 'create');

        const result = await approveImportedTransaction({ kind: 'bank', userId: 'u1', accountId: 'b1', txId: 'tx1' });

        expect(result).toEqual({ approved: false, expenseId: 'e1', isCredit: false });
        expect(create).not.toHaveBeenCalled();
    });

    it('scopes the lookup to the signed-in user', async () => {
        const find = jest.spyOn(prisma.walletTransactionLog, 'findFirst').mockResolvedValue(null);
        const result = await approveImportedTransaction({ kind: 'wallet', userId: 'u1', accountId: 'w1', txId: 'tx1' });
        expect(result).toBeNull();
        expect(find.mock.calls[0][0].where).toEqual({ id: 'tx1', wallet_statement: { wallet_id: 'w1', wallet: { user_id: 'u1' } } });
    });

    it('a credit is approved without creating an expense', async () => {
        jest.spyOn(prisma.walletTransactionLog, 'findFirst').mockResolvedValue({ ...debitLog, net_amount: 5000 });
        jest.spyOn(prisma.walletTransactionLog, 'updateMany').mockResolvedValue({ count: 1 });
        const create = jest.spyOn(prisma.expense, 'create');
        const result = await approveImportedTransaction({ kind: 'wallet', userId: 'u1', accountId: 'w1', txId: 'tx1' });
        expect(result).toMatchObject({ approved: true, expenseId: null, isCredit: true });
        expect(create).not.toHaveBeenCalled();
    });

    it('losing a race on the unique link returns the winner\'s expense', async () => {
        prisma.$transaction.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));
        jest.spyOn(prisma.expense, 'findFirst').mockResolvedValue({ id: 'e-winner' });
        const result = await approveImportedTransaction({ kind: 'bank', userId: 'u1', accountId: 'b1', txId: 'tx1' });
        expect(result).toEqual({ approved: false, expenseId: 'e-winner', isCredit: false });
    });
});
