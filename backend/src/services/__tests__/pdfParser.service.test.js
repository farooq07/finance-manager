import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractPdfText, extractWithPdfParse } from '../pdfParser.service.js';

// Synthetic statement (no real data) printed to PDF by Chrome.
const PDF = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'pdfs', 'synthetic-statement.pdf');

describe('PDF text extraction', () => {
    let tmpDir;
    beforeAll(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-test-')); });
    afterAll(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

    it('pdf-parse fallback extracts text', async () => {
        const { rawText, method } = await extractWithPdfParse(PDF);
        expect(method).toBe('pdf-parse');
        expect(rawText).toContain('SALARY CREDIT MONTHLY');
    }, 30000);

    it('tolerates junk bytes before the %PDF header (e.g. a UTF-8 BOM)', async () => {
        const withBom = path.join(tmpDir, 'bom.pdf');
        fs.writeFileSync(withBom, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), fs.readFileSync(PDF)]));
        const { rawText, method } = await extractPdfText(withBom);
        expect(method).toBe('pdfreader'); // the table-aware reader, not the fallback
        expect(rawText).toContain('SALARY CREDIT MONTHLY');
    }, 30000);

    it('password path extracts text (pdf-parse with a password)', async () => {
        const { rawText, method } = await extractPdfText(PDF, 'any-password');
        expect(method).toBe('pdf-parse');
        expect(rawText).toContain('K-ELECTRIC BILL PAYMENT');
    }, 30000);

    it('rejects a file that is not a PDF', async () => {
        const notPdf = path.join(tmpDir, 'not.pdf');
        fs.writeFileSync(notPdf, 'hello');
        await expect(extractPdfText(notPdf)).rejects.toThrow(/not a valid PDF/i);
    }, 30000);
});
