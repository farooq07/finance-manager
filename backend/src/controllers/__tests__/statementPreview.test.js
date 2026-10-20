import { jest } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';
import prisma from '../../utils/prisma.js';

let extractFailure;
jest.unstable_mockModule('../../services/pdfParser.service.js', () => ({
    extractPdfText: jest.fn(async () => { throw extractFailure; }),
    getFileHash: jest.fn(() => 'hash'),
}));
jest.unstable_mockModule('../../services/duplicateDetector.service.js', () => ({
    findDuplicates: jest.fn(),
    findWalletDuplicates: jest.fn(),
    isFilePreviouslyImported: jest.fn(async () => false),
    isWalletFilePreviouslyImported: jest.fn(async () => false),
    markAsDuplicate: jest.fn(),
}));

const bank = await import('../bank.controller.js');
const wallet = await import('../wallet.controller.js');

const coded = (code, message) => Object.assign(new Error(message), { code });

const cases = [
    { name: 'bank', preview: bank.previewStatement, params: { bankId: 'b1' }, owner: () => jest.spyOn(prisma.bank, 'findUnique').mockResolvedValue({ id: 'b1' }) },
    { name: 'wallet', preview: wallet.previewStatement, params: { walletId: 'w1' }, owner: () => jest.spyOn(prisma.wallet, 'findUnique').mockResolvedValue({ id: 'w1' }) },
];

describe.each(cases)('$name previewStatement PDF errors', ({ preview, params, owner }) => {
    let file, res;

    beforeEach(() => {
        file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'preview-')), 'upload.pdf');
        fs.writeFileSync(file, '%PDF-1.4');
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        owner();
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });
    afterEach(() => jest.restoreAllMocks());

    const request = (body = {}) => ({
        user: { id: 'u1' }, params, body,
        file: { path: file, originalname: 'statement.pdf', mimetype: 'application/pdf' },
    });

    it.each([
        ['PDF_PASSWORD_REQUIRED', 'This PDF is password-protected — enter its password and try again.'],
        ['PDF_PASSWORD_INCORRECT', 'Incorrect PDF password. Check it and try again.'],
        ['PDF_INVALID', 'This file is not a valid PDF.'],
    ])('%s → 400 with the message, not an empty preview', async (code, message) => {
        extractFailure = coded(code, message);
        await preview(request(), res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message, code });
    });
});
