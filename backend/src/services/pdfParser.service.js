import pdfParse from 'pdf-parse';
import Tesseract from 'tesseract.js';
import fs from 'fs';

/**
 * Extract text from PDF (handles encrypted PDFs)
 * @param {string} filePath - Path to PDF file
 * @param {string} password - Optional password for encrypted PDF
 * @returns {Promise<{rawText: string, pageCount: number}>}
 */
export async function extractPdfText(filePath, password = null) {
    try {
        const pdfBuffer = fs.readFileSync(filePath);
        const options = password ? { password } : {};

        const pdfData = await pdfParse(pdfBuffer, options);

        return {
            rawText: pdfData.text || '',
            pageCount: pdfData.numpages || 0,
            metadata: pdfData.info || {}
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
    const crypto = require('crypto');
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}
