import Tesseract from 'tesseract.js';
import fs from 'fs';
import crypto from 'crypto';
import pdfreader from 'pdfreader';
import { PDFParse } from 'pdf-parse';
import logger from '../utils/logger.js';

/**
 * Read a PDF from disk, dropping anything before the %PDF header. Some bank
 * portals prepend bytes (e.g. a UTF-8 BOM), which shifts every internal
 * offset and makes strict readers reject the file.
 */
function readPdfBuffer(filePath) {
    const buf = fs.readFileSync(filePath);
    const start = buf.indexOf('%PDF-');
    if (start === -1 || start > 1024) {
        const err = new Error('This file is not a valid PDF.');
        err.code = 'PDF_INVALID';
        throw err;
    }
    // Copy rather than subarray: pdf2json reads the underlying ArrayBuffer and
    // would ignore a subarray's byte offset, seeing the junk bytes again.
    return start === 0 ? buf : Buffer.from(buf.subarray(start));
}

/**
 * Extract text from PDF using pdfreader with positional reconstruction
 * Groups text items by y-coordinate to reconstruct table rows properly
 */
function extractTextWithPdfreader(pdfBuffer) {
    return new Promise((resolve, reject) => {
        let pageCount = 0;
        const items = [];
        let currentPage = 1;

        new pdfreader.PdfReader().parseBuffer(pdfBuffer, (err, item) => {
            if (err) {
                reject(err);
            } else if (!item) {
                // End of file - reconstruct lines using positional data
                const rawText = reconstructLinesFromItems(items);
                resolve({ rawText, pageCount });
            } else if (item.page) {
                currentPage = item.page;
                pageCount = item.page;
            } else if (item.text) {
                items.push({
                    x: item.x,
                    y: item.y,
                    text: item.text,
                    page: currentPage
                });
            }
        });
    });
}

/**
 * Reconstruct lines from positional text items
 * Groups items by page and y-coordinate (rows), sorts by x-coordinate (columns)
 */
function reconstructLinesFromItems(items) {
    if (items.length === 0) return '';

    // Sort by page, y, x
    items.sort((a, b) => {
        if (a.page !== b.page) return a.page - b.page;
        if (Math.abs(a.y - b.y) > 0.3) return a.y - b.y;
        return a.x - b.x;
    });

    const lines = [];
    let currentLine = [];
    let currentY = null;
    let currentPage = null;

    for (const item of items) {
        if (currentY === null) {
            currentLine = [item];
            currentY = item.y;
            currentPage = item.page;
        } else if (
            item.page === currentPage &&
            Math.abs(item.y - currentY) < 0.3
        ) {
            currentLine.push(item);
        } else {
            currentLine.sort((a, b) => a.x - b.x);
            lines.push(currentLine.map(i => i.text).join(' '));
            currentLine = [item];
            currentY = item.y;
            currentPage = item.page;
        }
    }

    if (currentLine.length > 0) {
        currentLine.sort((a, b) => a.x - b.x);
        lines.push(currentLine.map(i => i.text).join(' '));
    }

    return lines.join('\n');
}

/**
 * Extract text from PDF (handles encrypted PDFs)
 * Uses pdfreader for tabular PDFs (preserves rows), falls back to pdf-parse
 * @param {string} filePath - Path to PDF file
 * @param {string} password - Optional password for encrypted PDF
 * @returns {Promise<{rawText: string, pageCount: number}>}
 */
export async function extractPdfText(filePath, password = null) {
    const pdfBuffer = readPdfBuffer(filePath);

    // For password-protected PDFs, use pdf-parse first since pdfreader doesn't support passwords
    if (password) {
        return await extractWithPdfParse(pdfBuffer, password);
    }

    // For non-encrypted PDFs, prefer pdfreader for better table structure preservation
    try {
        logger.log('[PDF_PARSER] Trying pdfreader for table reconstruction...');
        const pdfreaderData = await extractTextWithPdfreader(pdfBuffer);

        if (pdfreaderData.rawText && pdfreaderData.rawText.trim().length > 0) {
            logger.log('[PDF_PARSER] pdfreader succeeded, text length:', pdfreaderData.rawText.length);
            return {
                rawText: pdfreaderData.rawText,
                pageCount: pdfreaderData.pageCount || 0,
                metadata: {},
                method: 'pdfreader'
            };
        }

        logger.log('[PDF_PARSER] pdfreader returned empty, falling back to pdf-parse...');
    } catch (pdfreaderError) {
        logger.log('[PDF_PARSER] pdfreader failed:', pdfreaderError.message, '- falling back to pdf-parse');
    }

    return await extractWithPdfParse(pdfBuffer, password);
}

/**
 * Extract text with pdf-parse (pdf.js). Handles encrypted PDFs.
 * Password problems are thrown with a `code` the controllers can show:
 * PDF_PASSWORD_REQUIRED or PDF_PASSWORD_INCORRECT.
 * @param {string|Buffer} input - file path or PDF bytes
 */
export async function extractWithPdfParse(input, password = null) {
    const pdfBuffer = Buffer.isBuffer(input) ? input : readPdfBuffer(input);
    // pdf.js may take ownership of the bytes it is given — pass a copy.
    const parser = new PDFParse({ data: new Uint8Array(pdfBuffer), ...(password ? { password } : {}) });
    try {
        const result = await parser.getText();
        return {
            rawText: result.text || '',
            pageCount: result.total || 0,
            metadata: {},
            method: 'pdf-parse'
        };
    } catch (error) {
        if (error?.name === 'PasswordException') {
            const incorrect = error.code === 2;
            const err = new Error(incorrect
                ? 'Incorrect PDF password. Check it and try again.'
                : 'This PDF is password-protected — enter its password and try again.');
            err.code = incorrect ? 'PDF_PASSWORD_INCORRECT' : 'PDF_PASSWORD_REQUIRED';
            throw err;
        }
        throw new Error(`PDF extraction failed: ${error.message}`);
    } finally {
        await parser.destroy?.();
    }
}

/**
 * Run OCR on PDF (for scanned/image-based statements)
 * @param {string} filePath - Path to PDF file
 * @returns {Promise<string>} Extracted text via OCR
 */
export async function runOCROnPdf(filePath) {
    try {
        const { createWorker } = Tesseract;
        const worker = await createWorker('eng');

        const pdfBuffer = fs.readFileSync(filePath);

        // For OCR, we'd need to convert PDF to images first
        // For now, return warning that OCR requires image preprocessing
        console.warn('Full OCR pipeline requires PDF to image conversion - skipping for now');
        await worker.terminate();

        return '';
    } catch (error) {
        console.error('OCR failed:', error.message);
        throw new Error(`OCR processing failed: ${error.message}`);
    }
}

/**
 * Calculate file hash for deduplication
 * @param {string} filePath - Path to PDF file
 * @returns {string} SHA256 hash
 */
export function getFileHash(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}
