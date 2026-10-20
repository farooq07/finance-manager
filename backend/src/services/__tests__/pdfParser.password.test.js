import { jest } from '@jest/globals';
import path from 'path';
import { fileURLToPath } from 'url';

// pdf.js reports encryption problems as PasswordException with code 1
// (password needed) or 2 (wrong password). No tool here can make an
// encrypted PDF, so pdf-parse is mocked to raise those.
let failure;
jest.unstable_mockModule('pdf-parse', () => ({
    PDFParse: jest.fn(() => ({
        getText: async () => { throw failure; },
        destroy: async () => {},
    })),
}));

// pdfreader can't open encrypted files, so the service falls back to pdf-parse.
jest.unstable_mockModule('pdfreader', () => ({
    default: {
        PdfReader: jest.fn(() => ({
            parseBuffer: (_buf, cb) => cb(new Error('encrypted')),
            parseFileItems: (_path, cb) => cb(new Error('encrypted')),
        })),
    },
}));

const { extractPdfText } = await import('../pdfParser.service.js');
const PDF = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'pdfs', 'synthetic-statement.pdf');

const passwordException = (code) => Object.assign(new Error('pw'), { name: 'PasswordException', code });

describe('password-protected PDFs', () => {
    it('no password → clear PDF_PASSWORD_REQUIRED error', async () => {
        failure = passwordException(1);
        await expect(extractPdfText(PDF)).rejects.toMatchObject({
            code: 'PDF_PASSWORD_REQUIRED',
            message: expect.stringMatching(/password-protected/i),
        });
    });

    it('wrong password → clear PDF_PASSWORD_INCORRECT error', async () => {
        failure = passwordException(2);
        await expect(extractPdfText(PDF, 'wrong')).rejects.toMatchObject({
            code: 'PDF_PASSWORD_INCORRECT',
            message: expect.stringMatching(/incorrect/i),
        });
    });
});
