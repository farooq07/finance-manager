import fs from 'fs';
import logger from '../utils/logger.js';

// Column name aliases → our standard fields
const DATE_ALIASES    = ['date', 'transaction date', 'txn date', 'value date', 'posting date', 'trans date', 'tran date', 'created at', 'time'];
const DESC_ALIASES    = ['description', 'particulars', 'narration', 'details', 'transaction details', 'remarks', 'reference', 'memo', 'trans description', 'transaction description', 'detail'];
const DEBIT_ALIASES   = ['debit', 'withdrawal', 'dr', 'debit amount', 'withdrawals', 'debit (pkr)', 'debit amount (pkr)', 'amount debited'];
const CREDIT_ALIASES  = ['credit', 'deposit', 'cr', 'credit amount', 'deposits', 'credit (pkr)', 'credit amount (pkr)', 'amount credited'];
const AMOUNT_ALIASES  = ['amount', 'net amount', 'transaction amount', 'trans amount', 'value'];
const TYPE_ALIASES    = ['type', 'transaction type', 'txn type', 'dr/cr', 'dr / cr', 'debit/credit'];

function normalise(str) {
    return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

function parseAmount(str) {
    if (!str && str !== 0) return null;
    const cleaned = String(str).replace(/[,\s]/g, '').replace(/^PKR\s*/i, '');
    const val = parseFloat(cleaned);
    return isNaN(val) ? null : val;
}

function parseDate(str) {
    if (!str) return null;
    const s = str.trim();

    // DD/MM/YYYY or DD-MM-YYYY
    const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmy) {
        const [, d, m, y] = dmy;
        return new Date(Date.UTC(+y, +m - 1, +d));
    }

    // YYYY-MM-DD
    const ymd = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (ymd) {
        const [, y, m, d] = ymd;
        return new Date(Date.UTC(+y, +m - 1, +d));
    }

    // DD MMM YYYY  or  DD-MMM-YYYY  (e.g. 01 Jan 2025)
    const dmy2 = s.match(/^(\d{1,2})[\s\-]([A-Za-z]{3,9})[\s\-](\d{4})/);
    if (dmy2) {
        const d = new Date(`${dmy2[2]} ${dmy2[1]} ${dmy2[3]}`);
        if (!isNaN(d)) return d;
    }

    // DD/MM/YY
    const dmyShort = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
    if (dmyShort) {
        const [, d, m, y] = dmyShort;
        const fullYear = +y < 50 ? 2000 + +y : 1900 + +y;
        return new Date(Date.UTC(fullYear, +m - 1, +d));
    }

    const fallback = new Date(s);
    return isNaN(fallback) ? null : fallback;
}

// Naive CSV line splitter — handles quoted fields with commas inside
function splitCsvLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
            result.push(current.trim().replace(/^"|"$/g, ''));
            current = '';
        } else {
            current += ch;
        }
    }
    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
}

function findCol(headers, aliases) {
    for (const alias of aliases) {
        const idx = headers.findIndex(h => normalise(h) === alias);
        if (idx !== -1) return idx;
    }
    // Partial match fallback
    for (const alias of aliases) {
        const idx = headers.findIndex(h => normalise(h).includes(alias) || alias.includes(normalise(h)));
        if (idx !== -1) return idx;
    }
    return -1;
}

/**
 * Parse a CSV file into the same transaction shape as parseTransactions().
 * Returns: [{ transaction_date, description, debit_amount, credit_amount, net_amount }]
 */
export function parseCsvTransactions(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const rawLines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    if (rawLines.length < 2) return [];

    // Find header row — first row that has ≥3 recognisable-ish columns
    let headerIdx = 0;
    for (let i = 0; i < Math.min(rawLines.length, 10); i++) {
        const cols = splitCsvLine(rawLines[i]);
        if (cols.length >= 3) { headerIdx = i; break; }
    }

    const headers = splitCsvLine(rawLines[headerIdx]).map(h => h.replace(/^﻿/, '')); // strip BOM

    const dateCol   = findCol(headers, DATE_ALIASES);
    const descCol   = findCol(headers, DESC_ALIASES);
    const debitCol  = findCol(headers, DEBIT_ALIASES);
    const creditCol = findCol(headers, CREDIT_ALIASES);
    const amountCol = findCol(headers, AMOUNT_ALIASES);
    const typeCol   = findCol(headers, TYPE_ALIASES);

    if (dateCol === -1 || descCol === -1) {
        throw new Error(
            `CSV headers not recognised. Expected columns like: Date, Description, Debit/Credit or Amount.\n` +
            `Found: ${headers.join(', ')}`
        );
    }

    const transactions = [];

    for (let i = headerIdx + 1; i < rawLines.length; i++) {
        const cols = splitCsvLine(rawLines[i]);
        if (cols.length < 2) continue;

        const dateStr = cols[dateCol];
        const desc    = cols[descCol] || '';
        if (!dateStr || !desc) continue;

        const txDate = parseDate(dateStr);
        if (!txDate || isNaN(txDate)) continue;

        let debit  = debitCol  !== -1 ? parseAmount(cols[debitCol])  : null;
        let credit = creditCol !== -1 ? parseAmount(cols[creditCol]) : null;
        let netAmount;

        if (debit === null && credit === null && amountCol !== -1) {
            // Single amount column — use type column or sign to determine direction
            const rawAmount = parseAmount(cols[amountCol]);
            if (rawAmount === null) continue;

            if (typeCol !== -1) {
                const typeVal = normalise(cols[typeCol] || '');
                const isDebit = typeVal.includes('dr') || typeVal.includes('debit') || typeVal.includes('withdrawal');
                if (isDebit) {
                    debit = Math.abs(rawAmount);
                } else {
                    credit = Math.abs(rawAmount);
                }
            } else {
                // Negative = debit, positive = credit
                if (rawAmount < 0) debit = Math.abs(rawAmount);
                else credit = rawAmount;
            }
            netAmount = credit !== null ? credit : -(debit ?? 0);
        } else {
            debit  = debit  ?? 0;
            credit = credit ?? 0;
            netAmount = credit - debit;
        }

        if (debit === 0 && credit === 0) continue;

        transactions.push({
            transaction_date: txDate,
            description: desc.replace(/\s+/g, ' ').trim(),
            debit_amount:  debit  > 0 ? debit  : null,
            credit_amount: credit > 0 ? credit : null,
            net_amount: netAmount
        });
    }

    logger.log(`[CSV_PARSER] Parsed ${transactions.length} transactions from ${rawLines.length - headerIdx - 1} data rows`);
    return transactions;
}
