import Tesseract from 'tesseract.js';
import fs from 'fs';
import crypto from 'crypto';
import pdfreader from 'pdfreader';
import logger from '../utils/logger.js';

let pdfParse;

// Dynamic import for CommonJS module
async function loadPdfParse() {
    if (!pdfParse) {
        const pdfParseModule = await import('pdf-parse');
        pdfParse = pdfParseModule.default || pdfParseModule;
    }
    return pdfParse;
}

/**
 * Extract text from PDF using pdfreader with positional reconstruction
 * Groups text items by y-coordinate to reconstruct table rows properly
 */
function extractTextWithPdfreader(filePath) {
    return new Promise((resolve, reject) => {
        let pageCount = 0;
        const items = [];
        let currentPage = 1;

        new pdfreader.PdfReader().parseFileItems(filePath, (err, item) => {
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
    // For password-protected PDFs, use pdf-parse first since pdfreader doesn't support passwords
    if (password) {
        return await extractWithPdfParse(filePath, password);
    }

    // For non-encrypted PDFs, prefer pdfreader for better table structure preservation
    try {
        logger.log('[PDF_PARSER] Trying pdfreader for table reconstruction...');
        const pdfreaderData = await extractTextWithPdfreader(filePath);

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

    return await extractWithPdfParse(filePath, password);
}

async function extractWithPdfParse(filePath, password) {
    try {
        const pdfParser = await loadPdfParse();
        const pdfBuffer = fs.readFileSync(filePath);
        const options = password ? { password } : {};

        const pdfData = await pdfParser(pdfBuffer, options);
        return {
            rawText: pdfData.text || '',
            pageCount: pdfData.numpages || 0,
            metadata: pdfData.info || {},
            method: 'pdf-parse'
        };
    } catch (error) {
        if (error.message?.includes('password')) {
            throw new Error('PDF is password-protected but no password provided');
        }
        throw new Error(`PDF extraction failed: ${error.message}`);
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
