import fs from 'fs';
import logger from '../utils/logger.js';

// Column name aliases → our standard fields
const DATE_ALIASES    = ['date', 'transaction date', 'txn date', 'value date', 'posting date', 'trans date', 'tran date', 'created at', 'time', 'timestamp', 'datetime'];
const DESC_ALIASES    = ['description', 'particulars', 'narration', 'details', 'transaction details', 'remarks', 'reference', 'memo', 'trans description', 'transaction description', 'detail'];
const DEBIT_ALIASES   = ['debit', 'withdrawal', 'dr', 'debit amount', 'withdrawals', 'debit (pkr)', 'debit amount (pkr)', 'amount debited'];
const CREDIT_ALIASES  = ['credit', 'deposit', 'cr', 'credit amount', 'deposits', 'credit (pkr)', 'credit amount (pkr)', 'amount credited'];
const AMOUNT_ALIASES  = ['amount', 'net amount', 'transaction amount', 'trans amount', 'value'];
const TYPE_ALIASES    = ['type', 'transaction type', 'txn type', 'dr/cr', 'dr / cr', 'debit/credit'];
const BALANCE_ALIASES = ['balance', 'running balance', 'closing balance', 'bal', 'available balance'];

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

    // DD/MM/YYYY or DD-MM-YYYY (with optional time suffix: "02/05/2026 1:55")
    const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+\d{1,2}:\d{2}.*)?$/);
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

    // ISO datetime: 2026-06-01T10:30:00
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})T/);
    if (iso) {
        const d = new Date(s);
        return isNaN(d) ? null : d;
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

// Match an alias as a whole word inside a header, e.g. alias "dr" matches
// "dr" or "tran dr" but NOT "description". Prevents short aliases (cr, dr, ob)
// from false-matching substrings of longer column names.
function wordMatch(header, alias) {
    const re = new RegExp(`(^|[^a-z])${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`, 'i');
    return re.test(header);
}

function findCol(headers, aliases) {
    const normed = headers.map(normalise);
    // 1. Exact match (handles short aliases like 'cr', 'dr', 'amount' safely)
    for (const alias of aliases) {
        const idx = normed.findIndex(h => h === alias);
        if (idx !== -1) return idx;
    }
    // 2. Whole-word partial match — but only for aliases ≥ 3 chars, so short
    //    codes like 'cr'/'dr' never bleed into words like "description".
    for (const alias of aliases) {
        if (alias.length < 3) continue;
        const idx = normed.findIndex(h => wordMatch(h, alias));
        if (idx !== -1) return idx;
    }
    return -1;
}

/**
 * Scan pre-header metadata rows for opening/closing balance values.
 * Handles NayaPay format: "Opening B", 2031.34, "Closing Ba", 23436.86
 * and generic formats: "Opening Balance: 1,234.56"
 */
function extractMetaBalances(metaRows) {
    let openingBalance = null;
    let closingBalance = null;

    for (const row of metaRows) {
        const cells = splitCsvLine(row);
        for (let i = 0; i < cells.length; i++) {
            const cell = normalise(cells[i]);

            if (openingBalance === null && (cell.includes('opening') || cell === 'ob')) {
                // Check adjacent cells (next 1-3) for a numeric value
                for (let j = i + 1; j < Math.min(cells.length, i + 4); j++) {
                    const val = parseAmount(cells[j]);
                    if (val !== null && val >= 0) { openingBalance = val; break; }
                }
                // Also check if the value is embedded in the same cell: "Opening Balance: 1,234.56"
                if (openingBalance === null) {
                    const embedded = cell.match(/[\d,]+(?:\.\d{1,2})?/);
                    if (embedded) {
                        const val = parseAmount(embedded[0]);
                        if (val !== null) openingBalance = val;
                    }
                }
            }

            if (closingBalance === null && (cell.includes('closing') || cell === 'cb')) {
                for (let j = i + 1; j < Math.min(cells.length, i + 4); j++) {
                    const val = parseAmount(cells[j]);
                    if (val !== null && val >= 0) { closingBalance = val; break; }
                }
                if (closingBalance === null) {
                    const embedded = cell.match(/[\d,]+(?:\.\d{1,2})?/);
                    if (embedded) {
                        const val = parseAmount(embedded[0]);
                        if (val !== null) closingBalance = val;
                    }
                }
            }
        }
    }

    return { openingBalance, closingBalance };
}

/**
 * Parse a CSV file into the same transaction shape as parseTransactions().
 *
 * Returns: {
 *   transactions: [{ transaction_date, description, debit_amount, credit_amount, net_amount, balance }],
 *   openingBalance: number | null,
 *   closingBalance: number | null,
 * }
 *
 * Opening/closing balance is extracted from metadata rows above the transaction
 * header (e.g. NayaPay summary line) so they are never confused with transactions.
 */
export function parseCsvTransactions(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const rawLines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    if (rawLines.length < 2) return { transactions: [], openingBalance: null, closingBalance: null };

    // ── Find the real header row ─────────────────────────────────────────────
    // Scan up to 25 rows. The header row must have BOTH a recognisable date
    // column AND a recognisable description column. This skips metadata rows
    // (customer info, opening/closing balance lines) that happen to have many
    // columns but no real column names.
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rawLines.length, 25); i++) {
        const cols = splitCsvLine(rawLines[i]).map(h => h.replace(/^﻿/, '').trim()); // strip BOM
        if (cols.length < 2) continue;
        const hasDate = findCol(cols, DATE_ALIASES) !== -1;
        const hasDesc = findCol(cols, DESC_ALIASES) !== -1;
        if (hasDate && hasDesc) { headerIdx = i; break; }
    }

    if (headerIdx === -1) {
        // Build a helpful error with what was actually found
        const sample = rawLines.slice(0, 5).map(l => splitCsvLine(l).join(' | ')).join('\n');
        throw new Error(
            `CSV headers not recognised. Expected columns like: Date, Description, Debit/Credit or Amount.\n` +
            `First rows found:\n${sample}`
        );
    }

    // ── Extract metadata balances from rows ABOVE the header ─────────────────
    const metaRows = rawLines.slice(0, headerIdx);
    const { openingBalance, closingBalance: metaClosing } = extractMetaBalances(metaRows);

    // ── Parse column positions from the header row ────────────────────────────
    const headers = splitCsvLine(rawLines[headerIdx]).map(h => h.replace(/^﻿/, '').trim());

    const dateCol    = findCol(headers, DATE_ALIASES);
    const descCol    = findCol(headers, DESC_ALIASES);
    const debitCol   = findCol(headers, DEBIT_ALIASES);
    const creditCol  = findCol(headers, CREDIT_ALIASES);
    const amountCol  = findCol(headers, AMOUNT_ALIASES);
    const typeCol    = findCol(headers, TYPE_ALIASES);
    const balanceCol = findCol(headers, BALANCE_ALIASES);

    // ── Parse each data row ───────────────────────────────────────────────────
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
            // Single amount column. The SIGN is the source of truth:
            //   negative = debit (money out), positive = credit (money in).
            // This matches NayaPay (and most wallet CSVs): "Paid to …" rows are
            // negative, "Incoming" rows are positive. We only consult the TYPE
            // column when the amount has no sign to disambiguate it.
            const rawCell = cols[amountCol] ?? '';
            const rawAmount = parseAmount(rawCell);
            if (rawAmount === null) continue;

            const hasMinus = /-/.test(String(rawCell));

            if (rawAmount < 0 || hasMinus) {
                debit = Math.abs(rawAmount);
            } else if (rawAmount > 0) {
                // Positive but unsigned — default to credit, unless the TYPE
                // column clearly marks it as an outgoing/debit transaction.
                const typeVal = typeCol !== -1 ? normalise(cols[typeCol] || '') : '';
                const looksDebit = typeVal.includes('debit')
                    || typeVal === 'dr'
                    || typeVal.includes('withdrawal')
                    || typeVal.includes('outgoing')
                    || typeVal.includes('out)')
                    || typeVal.includes('paid');
                if (looksDebit) debit = rawAmount;
                else            credit = rawAmount;
            } else {
                continue; // zero amount
            }
            netAmount = credit !== null ? credit : -(debit ?? 0);
        } else {
            debit  = debit  ?? 0;
            credit = credit ?? 0;
            netAmount = credit - debit;
        }

        if (debit === 0 && credit === 0) continue;

        // Running balance column (used for display; not for opening/closing balance)
        const balance = balanceCol !== -1 ? parseAmount(cols[balanceCol]) : null;

        transactions.push({
            transaction_date: txDate,
            description: desc.replace(/\s+/g, ' ').trim(),
            debit_amount:  debit  > 0 ? debit  : null,
            credit_amount: credit > 0 ? credit : null,
            net_amount:    netAmount,
            balance,
        });
    }

    // If the CSV didn't have a metadata balance line, derive closing from last
    // running balance row (opening stays null — can't compute reliably without
    // the pre-first-transaction balance).
    let closingBalance = metaClosing;
    if (closingBalance === null && transactions.length > 0) {
        const withBal = transactions.filter(t => t.balance !== null);
        if (withBal.length > 0) {
            const sorted = [...withBal].sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));
            closingBalance = sorted[sorted.length - 1].balance;
        }
    }

    logger.log(
        `[CSV_PARSER] headerIdx=${headerIdx}, metaRows=${metaRows.length}, ` +
        `parsed=${transactions.length} txns, opening=${openingBalance}, closing=${closingBalance}`
    );

    return { transactions, openingBalance, closingBalance };
}
