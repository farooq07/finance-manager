import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import prisma from '../../utils/prisma.js';

let fileAlreadyImported = false;
jest.unstable_mockModule('../../services/duplicateDetector.service.js', () => ({
    findDuplicates: jest.fn(async () => new Map()),
    findWalletDuplicates: jest.fn(async () => new Map()),
    isFilePreviouslyImported: jest.fn(async () => fileAlreadyImported),
    isWalletFilePreviouslyImported: jest.fn(async () => fileAlreadyImported),
    markAsDuplicate: jest.fn(),
}));

const bank = await import('../bank.controller.js');
const wallet = await import('../wallet.controller.js');

// Opening 10,000 → -500 → +1,000 = 10,500. A closing of 99,999 can't reconcile.
const reviewedTxs = [
    { transaction_date: '2026-03-01', description: 'ATM', debit_amount: 500, credit_amount: null, net_amount: -500, balance: 9500 },
    { transaction_date: '2026-03-02', description: 'SALARY', debit_amount: null, credit_amount: 1000, net_amount: 1000, balance: 10500 },
];

const SAVE_REACHED = new Error('save reached');

const cases = [
    {
        name: 'bank',
        commit: bank.commitStatement,
        dir: 'uploads/statements',
        params: { bankId: 'b1' },
        owner: () => jest.spyOn(prisma.bank, 'findUnique').mockResolvedValue({ id: 'b1' }),
        save: () => jest.spyOn(prisma.bankStatement, 'create').mockRejectedValue(SAVE_REACHED),
        statementModel: () => prisma.bankStatement,
    },
    {
        name: 'wallet',
        commit: wallet.commitStatement,
        dir: 'uploads/wallet-statements',
        params: { walletId: 'w1' },
        owner: () => jest.spyOn(prisma.wallet, 'findUnique').mockResolvedValue({ id: 'w1' }),
        save: () => jest.spyOn(prisma.walletStatement, 'create').mockRejectedValue(SAVE_REACHED),
        statementModel: () => prisma.walletStatement,
    },
];

describe.each(cases)('$name commitStatement reconciliation gate', ({ commit, dir, params, owner, save, statementModel }) => {
    let uploadId, res, saveSpy;

    beforeEach(() => {
        fs.mkdirSync(dir, { recursive: true });
        uploadId = `jest-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`;
        fs.writeFileSync(path.join(dir, uploadId), 'test statement');
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        owner();
        saveSpy = save();
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        fs.rmSync(path.join(dir, uploadId), { force: true });
        fileAlreadyImported = false;
        jest.restoreAllMocks();
    });

    it('force-replace of a duplicate that doesn\'t reconcile keeps the old statement', async () => {
        fileAlreadyImported = true;
        jest.spyOn(statementModel(), 'findFirst').mockResolvedValue({ id: 'old', transaction_count: 12, file_path: null });
        const deleteSpy = jest.spyOn(statementModel(), 'delete').mockResolvedValue({});

        await commit(request({ closing: 99999, force: true }), res);

        expect(res.status).toHaveBeenCalledWith(422);
        expect(deleteSpy).not.toHaveBeenCalled();
    });

    it('force-replace that is accepted deletes the old statement before saving', async () => {
        fileAlreadyImported = true;
        jest.spyOn(statementModel(), 'findFirst').mockResolvedValue({ id: 'old', transaction_count: 12, file_path: null });
        const deleteSpy = jest.spyOn(statementModel(), 'delete').mockResolvedValue({});

        await commit(request({ closing: 99999, force: true, acceptMismatch: true }), res);

        expect(deleteSpy).toHaveBeenCalledWith({ where: { id: 'old' } });
        expect(saveSpy).toHaveBeenCalled();
    });

    const request = (body) => ({
        user: { id: 'u1' },
        params,
        body: { uploadId, type: 'pdf', transactions: reviewedTxs, opening: 10000, ...body },
    });

    it('CSV commit checks the opening/closing typed in the mapping dialog', async () => {
        fs.writeFileSync(path.join(dir, uploadId), [
            'Date,Description,Amount,Balance',
            '01/03/2026,ATM,-500.00,9500.00',
            '02/03/2026,SALARY,1000.00,10500.00',
        ].join('\n'));
        const mapping = { headerRowIndex: 0, date: 0, description: 1, amount: 2, debit: -1, credit: -1, balance: 3, type: -1 };

        await commit({ user: { id: 'u1' }, params, body: { uploadId, type: 'csv', mapping: { ...mapping, opening: '10000', closing: '99999' } } }, res);
        expect(res.status).toHaveBeenCalledWith(422);
        expect(saveSpy).not.toHaveBeenCalled();

        await commit({ user: { id: 'u1' }, params, body: { uploadId, type: 'csv', mapping: { ...mapping, opening: '10000', closing: '10500' } } }, res);
        expect(saveSpy).toHaveBeenCalled();
    });

    it('mismatched rows → 422, nothing saved', async () => {
        await commit(request({ closing: 99999 }), res);
        expect(res.status).toHaveBeenCalledWith(422);
        expect(res.json.mock.calls[0][0]).toMatchObject({ needsConfirmation: true });
        expect(saveSpy).not.toHaveBeenCalled();
    });

    it('acceptMismatch → saves the statement marked unreconciled', async () => {
        await commit(request({ closing: 99999, acceptMismatch: true }), res);
        expect(saveSpy).toHaveBeenCalled();
        expect(saveSpy.mock.calls[0][0].data.processing_status).toBe('unreconciled');
    });

    it('balanced statement → saved as pending without override', async () => {
        await commit(request({ closing: 10500 }), res);
        expect(saveSpy).toHaveBeenCalled();
        expect(saveSpy.mock.calls[0][0].data.processing_status).toBe('pending');
    });
});
