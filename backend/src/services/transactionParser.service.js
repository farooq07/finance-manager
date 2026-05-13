import Decimal from 'decimal.js';

const monthMap = {
    'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
    'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
};

// These match anywhere in the description
const CREDIT_KEYWORDS = [
    'received', 'credit', 'credited', 'deposit', 'reverse',
    'refund', 'salary', 'dividend', 'profit', 'interest', 'transfer in',
    'incoming', 'inward', 'cr.', 'cr ',
    'raast in',           // NayaPay
    'incoming fund',      // NayaPay
    'top up', 'topup',    // NayaPay wallet top-up
    'cashback',           // NayaPay
    'add money',          // NayaPay
    'wallet load'         // NayaPay
];

// "rec from" / "eft rec" are only reliable credit signals when at the START of the description.
// When they appear in the middle (e.g. next transaction's text bleeding in), they are noise.
const CREDIT_KEYWORDS_START_ONLY = ['rec from', 'eft rec from', 'eft rec'];

const DEBIT_KEYWORDS = [
    'withdrawal', 'withdraw', 'atm', 'pos', 'purchase', 'payment',
    'paid', 'debit', 'debited', 'transfer out', 'outgoing', 'outward',
    'charges', 'fee', 'tax', 'wht', 'utility', 'bill', 'dr.', 'dr ',
    'mobile to', 'raast mobile',
    'mpbl',               // Habib Metro RAAST Mobile to reference prefix
    'dc txn',             // Standard Chartered debit card transaction
    'dc debit',
    'raast out',          // NayaPay
    'card purchase',      // NayaPay
    'wallet payment',     // NayaPay
    'send money',         // NayaPay
    'mobile topup',       // NayaPay
    'online payment'      // NayaPay
];

/**
 * Parse transactions from extracted PDF text
 * Block-based approach: groups lines between date markers as transaction blocks
 */
export function parseTransactions(rawText) {
    // Pre-filter: remove page footers, headers, and metadata lines
    const allLines = rawText.split('\n').map(l => l.trim()).filter(l => l);
    const lines = allLines.filter(l => !isFooterOrHeaderLine(l));
    const transactions = [];

    // Find all date markers
    const dateMarkers = [];
    for (let i = 0; i < lines.length; i++) {
        const dateInfo = detectDate(lines[i]);
        if (dateInfo) {
            dateMarkers.push({ index: i, ...dateInfo });
        }
    }

    console.log(`[PARSER] Found ${dateMarkers.length} date markers in ${lines.length} lines`);

    if (dateMarkers.length === 0) {
        if (lines.length > 0) {
            console.log('[PARSER] No date markers found. Sample lines (first 15):');
            for (let i = 0; i < Math.min(15, lines.length); i++) {
                console.log(`  [${i}] ${lines[i].substring(0, 150)}`);
            }
        }
        return [];
    }

    // Process each block (date marker to next date marker)
    for (let m = 0; m < dateMarkers.length; m++) {
        const marker = dateMarkers[m];
        const startIdx = marker.index;
        const endIdx = m + 1 < dateMarkers.length ? dateMarkers[m + 1].index : lines.length;

        // Combine all lines in this block
        const blockLines = lines.slice(startIdx, endIdx);
        const blockText = blockLines.join(' ');

        // Extract amounts from block (filtered to actual money values)
        const amounts = extractAmountsFromText(blockText);

        if (!amounts.length) {
            console.log(`[PARSER] Block ${m} has date but no amounts: ${blockText.substring(0, 100)}`);
            continue;
        }

        // Build description (text between date and last amounts)
        let description = blockText.substring(blockText.indexOf(marker.dateStr) + marker.dateStr.length).trim();
        // Strip NayaPay time prefix (e.g., "06:13 PM " at start of description)
        description = description.replace(/^\d{1,2}:\d{2}\s*(AM|PM)\s*/i, '');
        // Strip signed Rs. amount notation from description (e.g., "+Rs. 20,000" or "-Rs. 3,500")
        description = description.replace(/[+-]\s*Rs\.?\s*[\d,]+(?:\.\d{1,2})?/gi, '');
        description = removeTrailingAmounts(description);
        // Clean up any leftover "Rs." fragments
        description = description.replace(/\bRs\.?\s*$/i, '').trim();
        description = description.replace(/\s{2,}/g, ' ').trim();
        description = description.substring(0, 255);

        // Determine debit vs credit based on keywords + amount layout
        const direction = determineDirection(description, amounts, blockText);

        const txDate = parseDate(marker.dateStr);

        const tx = {
            transaction_date: txDate,
            description,
            withdrawal_amount: direction.debit,
            deposit_amount: direction.credit,
            debit_amount: direction.debit,
            credit_amount: direction.credit,
            net_amount: direction.credit
                ? new Decimal(direction.credit).toNumber()
                : direction.debit
                    ? new Decimal(direction.debit).negated().toNumber()
                    : 0,
            balance: direction.balance
        };

        transactions.push(tx);
    }

    const valid = transactions.filter(tx => tx.net_amount !== 0);
    console.log(`[PARSER] Extracted ${valid.length} valid transactions (${transactions.length - valid.length} zero-amount rows skipped)`);
    return valid;
}

/**
 * Check if a line is a page footer, header, or metadata (not transaction data)
 */
function isFooterOrHeaderLine(line) {
    const lower = line.toLowerCase();
    const footerPatterns = [
        /page\s+\d+\s+of\s+\d+/,
        /closing\s+balance/,
        /opening\s+balance/,
        /balance\s+b\/f/,              // Standard Chartered: "BALANCE B/F" or "01Apr26 BALANCE B/F"
        /balance\s+brought\s+forward/,
        /balance\s+c\/f/,
        /balance\s+carried\s+forward/,
        /fixed\s+deposit\s+balance/,
        /please\s+report\s+any\s+discrepancy/,
        /within\s+\d+\s+days\s+from\s+the\s+date/,
        /currency\s+from\s+to\s+printed/,
        /^date\s+particulars\s+debit\s+credit\s+balance/,
        /^date\s+description\s+debit\s+credit/,
        /statement\s+of\s+account/,
        /account\s+number\s*:/,
        /branch\s*:/,
        /printed\s+on/,
        /generated\s+on/,
        /signature/,
        /authorized\s+signatory/,
        /^\s*\d+\s+of\s+\d+\s*$/,
        /this\s+is\s+a\s+computer\s+generated/,
        /this\s+is\s+an?\s+electronic\s+statement/,  // Standard Chartered footer
        /items\s+and\s+balance\s+on\s+this\s+statement/,
        /must\s+be\s+verified\s+and\s+the\s+bank/,
        /notified\s+of\s+any\s+discrepancy/,
        /hereof\s+or\s+it\b/,
        /no\s+signature\s+required/
    ];
    const nayaPayHeaderPatterns = [
        /^time\s+type\s+description/,           // NayaPay table header row
        /service\s+charges\s+rs\.?\s*0/,         // NayaPay service charges (zero amount)
        /^transaction\s+id\s+[a-z0-9]{10,}/i,   // NayaPay transaction ID lines
        /^[a-z0-9]{15,}$/i,                      // Lone transaction ID (long alphanumeric only)
        /^nayapay\s+id/i,
        /^account\s+number\s+0[0-9]{9,}/,        // NayaPay account number header
        /opening\s+balance.*rs\./i,
        /closing\s+balance.*rs\./i,
        /total\s+income.*rs\./i,
        /total\s+spent.*rs\./i,
        /^\d{1,2}:\d{2}\s*(am|pm)$/i,            // Time-only lines ("06:13 PM")
        /^current\s+address/i,
        /^account\s+statement/i,
    ];
    if (footerPatterns.some(p => p.test(lower))) return true;
    if (nayaPayHeaderPatterns.some(p => p.test(lower))) return true;
    // Lines that start with a date then "BALANCE B/F" (Standard Chartered page header)
    if (/^\d{2}[a-z]{3}\d{2}\s+balance\s+b\/f/i.test(line)) return true;
    return false;
}

/**
 * Detect a date at the start of a line
 * Returns { dateStr, format } or null
 */
function detectDate(line) {
    // Standard Chartered: DDMmmYY (e.g., "01Apr26")
    const scbMatch = line.match(/^(0[1-9]|[12]\d|3[01])([A-Z][a-z]{2})(\d{2})\b/);
    if (scbMatch) {
        return { dateStr: scbMatch[0], format: 'scb' };
    }

    // Habib Metropolitan: DD-Mmm-YYYY (e.g., "02-Mar-2026")
    const habibMatch = line.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})/);
    if (habibMatch) {
        return { dateStr: habibMatch[0], format: 'habib' };
    }

    // NayaPay / space-separated: DD MMM YYYY (e.g., "01 Apr 2026")
    const nayaMatch = line.match(/^(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})\b/i);
    if (nayaMatch) {
        return { dateStr: nayaMatch[0], format: 'naya' };
    }

    // Generic: DD/MM/YYYY or DD-MM-YYYY (no Mmm)
    const genericMatch = line.match(/^(\d{1,2}[\-\/]\d{1,2}[\-\/]\d{2,4})\b/);
    if (genericMatch) {
        return { dateStr: genericMatch[1], format: 'generic' };
    }

    return null;
}

/**
 * Extract amount values from text
 * Only matches properly formatted amounts: must have commas (e.g., 20,000.00) or decimals (e.g., 1234.56)
 * This filters out IDs, account numbers, dates embedded in description
 */
function extractAmountsFromText(text) {
    const pattern = /\b(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+\.\d{2})\b/g;
    const matches = [...text.matchAll(pattern)];
    return matches
        .map(m => parseFloat(m[1].replace(/,/g, '')))
        .filter(n => !isNaN(n) && n > 0);
}

/**
 * Detect NayaPay-style signed amounts: "+Rs. 20,000" → credit, "-Rs. 1,500" → debit
 * Returns 'credit', 'debit', or null
 */
function detectSignedRsAmount(text) {
    if (/\+\s*Rs\.?\s*[\d,]+/i.test(text)) return 'credit';
    if (/-\s*Rs\.?\s*[\d,]+/i.test(text)) return 'debit';
    return null;
}

/**
 * Determine debit vs credit based on description keywords and amount layout.
 *
 * Priority (highest → lowest):
 *  1. NayaPay ±Rs. sign in raw block text
 *  2. Habib Metro "Sender (" → always credit (EFT in, dividends, etc.)
 *  3. Explicit credit phrases (Account Credited, charges reverse)
 *  4. Strong debit phrases (ATM Withdrawal, RAAST Mobile, A/C PK IBAN, MPBL)
 *  5. Generic keyword lists (for other bank formats)
 *  6. Default → debit (prevents credits landing in Expenses)
 */
function determineDirection(description, amounts, rawBlockText = '') {
    if (amounts.length === 0) return { debit: null, credit: null, balance: null };

    const lowerDesc = description.toLowerCase();

    // ── 1. NayaPay: signed ±Rs. amount ──────────────────────────────────────
    const signedDirection = detectSignedRsAmount(rawBlockText || description);
    if (signedDirection === 'credit') return buildCreditResult(amounts, null);
    if (signedDirection === 'debit')  return buildDebitResult(amounts);

    // ── 2. Habib Metro: "Sender (" appears ONLY in inbound EFT transactions ─
    // Debit transactions (ATM, RAAST out, etc.) never contain "Sender (".
    if (/\bsender\s*\(/i.test(description)) {
        return buildCreditResult(amounts, extractSenderAmount(description));
    }

    // ── 3. Explicit credit phrases ───────────────────────────────────────────
    if (/account credited|credited[- ]dividends/i.test(description)) return buildCreditResult(amounts, null);
    if (/charges reverse|fee reverse|reversal/i.test(description))   return buildCreditResult(amounts, null);

    // ── 4. Strong debit phrases ──────────────────────────────────────────────
    if (/atm withdrawal|cash withdrawal|atm\s+cash/i.test(description)) return buildDebitResult(amounts);
    if (/raast mobile to|\bmobile to\b/i.test(description))             return buildDebitResult(amounts);
    if (/a\/c\s+pk\d{2}/i.test(description))                            return buildDebitResult(amounts);
    if (/\bmpbl\b/i.test(description))                                  return buildDebitResult(amounts);

    // ── 5. Generic keywords (NayaPay / Standard Chartered / others) ──────────
    // Strip leading amounts before checking "starts-with" keywords —
    // Habib Metro sometimes emits amounts before the description text.
    const descStripped = lowerDesc.replace(/^[\d,.\s]+/, '').trim();
    const creditStartHit = CREDIT_KEYWORDS_START_ONLY.some(kw => descStripped.startsWith(kw));
    const isCredit = creditStartHit || CREDIT_KEYWORDS.some(kw => lowerDesc.includes(kw));
    const isDebit  = DEBIT_KEYWORDS.some(kw => lowerDesc.includes(kw));

    if (isCredit && !isDebit) return buildCreditResult(amounts, null);

    // ── 6. Default → debit ───────────────────────────────────────────────────
    return buildDebitResult(amounts);
}

function buildDebitResult(amounts) {
    if (amounts.length === 1) return { debit: amounts[0], credit: null, balance: null };
    return { debit: amounts[amounts.length - 2], credit: null, balance: amounts[amounts.length - 1] };
}

function buildCreditResult(amounts, specificAmount) {
    // specificAmount: pulled from inside Sender(...) — handles small unformatted integers
    // like "697" that the generic amount extractor misses.
    if (specificAmount !== null && specificAmount > 0) {
        const balance = amounts.length > 0 ? amounts[amounts.length - 1] : null;
        if (balance !== specificAmount) {
            return { debit: null, credit: specificAmount, balance };
        }
    }
    if (amounts.length === 1) return { debit: null, credit: amounts[0], balance: null };
    return { debit: null, credit: amounts[amounts.length - 2], balance: amounts[amounts.length - 1] };
}

/**
 * Extract transaction amount from Habib Metro's "Sender (...)" field.
 *   Sender (- 245,447.00 ...)   → 245447
 *   Sender (ACCOUNT 697 ...)    → 697
 *   Sender ( AKBL DIVIDEND ...) → null  (fallback to amounts array)
 */
function extractSenderAmount(description) {
    const m = description.match(/Sender\s*\(\s*(?:ACCOUNT\s+|-)?\s*([\d,]+(?:\.\d{1,2})?)\b/i);
    return m ? parseFloat(m[1].replace(/,/g, '')) : null;
}

/**
 * Remove trailing amount strings from description
 */
function removeTrailingAmounts(text) {
    let cleaned = text;
    // Remove trailing amounts (with commas or decimals)
    const trailingAmountPattern = /\s*\b(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+\.\d{2})\s*$/;
    while (trailingAmountPattern.test(cleaned)) {
        cleaned = cleaned.replace(trailingAmountPattern, '');
    }
    return cleaned.trim();
}

/**
 * Parse date string (handles multiple formats)
 */
function parseDate(dateStr) {
    // Habib Metropolitan: DD-Mmm-YYYY (e.g., 02-Mar-2026)
    const habibMatch = dateStr.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
    if (habibMatch) {
        const day = parseInt(habibMatch[1]);
        const month = monthMap[habibMatch[2].toLowerCase()];
        const year = parseInt(habibMatch[3]);
        if (month !== undefined) {
            return new Date(Date.UTC(year, month, day));
        }
    }

    // NayaPay: DD MMM YYYY (e.g., "01 Apr 2026")
    const nayaMatch = dateStr.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
    if (nayaMatch) {
        const day = parseInt(nayaMatch[1]);
        const month = monthMap[nayaMatch[2].toLowerCase()];
        const year = parseInt(nayaMatch[3]);
        if (month !== undefined) {
            return new Date(Date.UTC(year, month, day));
        }
    }

    // Standard Chartered: DDMmmYY
    const scbMatch = dateStr.match(/^(\d{2})([A-Za-z]{3})(\d{2})$/);
    if (scbMatch) {
        const day = parseInt(scbMatch[1]);
        const month = monthMap[scbMatch[2].toLowerCase()];
        const year = parseInt(scbMatch[3]) + 2000;
        if (month !== undefined) {
            return new Date(Date.UTC(year, month, day));
        }
    }

    // Generic: DD/MM/YYYY or DD-MM-YYYY
    const parts = dateStr.split(/[\-\/]/);
    if (parts.length === 3) {
        let day = parseInt(parts[0]);
        let month = parseInt(parts[1]);
        let year = parseInt(parts[2]);

        if (year < 100) {
            year += year < 50 ? 2000 : 1900;
        }

        return new Date(Date.UTC(year, month - 1, day));
    }

    return new Date();
}

/**
 * Extract opening and closing balances from raw PDF text.
 * Handles multiple Pakistani bank formats.
 */
export function parseStatementBalances(rawText) {
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

    // Regex to pull the last number (with optional commas) from a line
    const extractAmount = (line) => {
        const matches = line.match(/[\d,]+\.?\d*/g);
        if (!matches) return null;
        // Take the last numeric token (balance is usually rightmost)
        const raw = matches[matches.length - 1].replace(/,/g, '');
        const val = parseFloat(raw);
        return isNaN(val) ? null : val;
    };

    const OPENING_PATTERNS = [
        /opening\s+balance/i,
        /balance\s+b\/?f/i,
        /balance\s+brought\s+forward/i,
        /ob\s*:/i,
        /^b\/f/i,
    ];
    const CLOSING_PATTERNS = [
        /closing\s+balance/i,
        /balance\s+c\/?f/i,
        /balance\s+carried\s+forward/i,
        /cb\s*:/i,
        /^c\/f/i,
    ];

    let opening = null;
    let closing = null;

    for (const line of lines) {
        if (opening === null && OPENING_PATTERNS.some(p => p.test(line))) {
            const val = extractAmount(line);
            if (val !== null) opening = val;
        }
        if (CLOSING_PATTERNS.some(p => p.test(line))) {
            const val = extractAmount(line);
            if (val !== null) closing = val; // Keep updating — take the LAST match (end of statement)
        }
    }

    return { opening, closing };
}

/**
 * Reconcile transactions against opening/closing balance
 */
export function validateBalance(transactions, openingBalance, closingBalance) {
    if (!openingBalance || !closingBalance || transactions.length === 0) {
        return { isValid: true, warning: 'Missing balance data for validation' };
    }

    let runningBalance = new Decimal(openingBalance);

    for (const tx of transactions) {
        const amount = new Decimal(tx.net_amount);
        runningBalance = runningBalance.plus(amount);
    }

    const calculated = runningBalance.toNumber();
    const expectedClosing = parseFloat(closingBalance);
    const difference = Math.abs(calculated - expectedClosing);

    return {
        isValid: difference < 0.01,
        calculatedClosing: calculated,
        expectedClosing: expectedClosing,
        difference: difference
    };
}
