import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

// The module exports a PDFParse class in this environment
const PDFParse = pdf.PDFParse;

/**
 * Parse a brokerage PDF buffer and extract holdings data.
 *
 * Expected columns in the PDF table:
 *   Security | Quantity | Cost/Unit | Total Cost | Current Price |
 *   Current Value | ROI % | Unrealized Gain/Loss | Portfolio Weight
 *
 * The parser is flexible: it scans each line for patterns that look like
 * a holdings row (a text label followed by several numbers).
 */
export async function parsePdfHoldings(buffer) {
    let data;
    try {
        if (typeof PDFParse === 'function') {
            const parser = new PDFParse(new Uint8Array(buffer));
            const textContent = await parser.getText();
            data = { text: textContent };
        } else {
            // Fallback for standard pdf-parse behavior if it's a function
            const parse = typeof pdf === 'function' ? pdf : (pdf.default || (() => { throw new Error('pdf-parse is not a function'); }));
            data = await parse(buffer);
        }
    } catch (err) {
        console.error('pdf-parse failed:', err);
        throw new Error('Failed to extract text from PDF file');
    }

    if (!data || !data.text) {
        console.error('pdf-parse returned no text');
        return [];
    }

    const text = data.text;
    console.log('Extracted PDF Text (first 500 chars):', text.substring(0, 500));

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    console.log(`Processing ${lines.length} lines from PDF`);

    const holdings = [];

    for (const line of lines) {
        // Try to match a line that has a security name followed by numeric columns.
        // Strategy: split on 2+ whitespace to get tokens, then see if we have
        // a text token followed by 8 numeric tokens.
        const tokens = line.split(/\s{2,}/).map(t => t.trim()).filter(Boolean);

        if (tokens.length < 4) continue; // Too few columns

        // Find the boundary between text and numbers.
        // The first token(s) may be the security name (text),
        // followed by numeric values.
        const numericTokens = [];
        let securityParts = [];
        let foundFirstNumber = false;

        for (const token of tokens) {
            const cleaned = token.replace(/,/g, '').replace(/%/g, '').replace(/\(|\)/g, '');
            if (!foundFirstNumber && isNaN(parseFloat(cleaned))) {
                securityParts.push(token);
            } else {
                foundFirstNumber = true;
                numericTokens.push(cleaned);
            }
        }

        const security = securityParts.join(' ').trim();

        // Skip header rows, totals, or lines with too few numbers
        if (!security || security.toLowerCase().includes('security') ||
            security.toLowerCase().includes('total') ||
            security.toLowerCase().includes('grand')) continue;

        // We expect at least 4 numeric columns for a valid row
        if (numericTokens.length < 4) continue;

        // Map columns based on how many we found
        const nums = numericTokens.map(n => parseFloat(n) || 0);

        let holding;

        if (nums.length >= 8) {
            // Full 9-column format (security is already extracted)
            holding = {
                security,
                quantity: nums[0],
                costPerUnit: nums[1],
                totalCost: nums[2],
                currentPrice: nums[3],
                currentValue: nums[4],
                roiPercent: nums[5],
                unrealizedGL: nums[6],
                portfolioWeight: nums[7]
            };
        } else if (nums.length >= 5) {
            // Partial — at least qty, cost/unit, totalCost, price, value
            holding = {
                security,
                quantity: nums[0],
                costPerUnit: nums[1],
                totalCost: nums[2],
                currentPrice: nums[3],
                currentValue: nums[4],
                roiPercent: nums[5] || 0,
                unrealizedGL: nums[6] || 0,
                portfolioWeight: nums[7] || 0
            };
        } else {
            // Minimal — symbol + qty + price + value
            holding = {
                security,
                quantity: nums[0],
                costPerUnit: nums[1] || 0,
                totalCost: nums[2] || 0,
                currentPrice: nums[1] || 0,
                currentValue: nums[3] || (nums[0] * (nums[1] || 0)),
                roiPercent: 0,
                unrealizedGL: 0,
                portfolioWeight: 0
            };
        }

        // Sanity check: quantity should be > 0
        if (holding.quantity > 0) {
            holdings.push(holding);
        }
    }

    return holdings;
}
