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

// ─────────────────────────────────────────────────────────────────────────────
//  Mapping-based parsing — powers the "Map Columns" UI.
//
//  inspectCsv() returns everything the frontend modal needs to render a mapping
//  screen: headers, a few sample rows, an auto-detected mapping, and the
//  opening/closing balance found in the metadata section.
//
//  parseCsvWithMapping() takes a user-confirmed mapping (explicit column indices)
//  and parses deterministically — no guessing. This is what makes CSV import
//  reliable for ANY bank: the human resolves the columns once.
// ─────────────────────────────────────────────────────────────────────────────

const OUR_FIELDS = ['date', 'description', 'amount', 'debit', 'credit', 'balance', 'type'];
const FIELD_ALIASES = {
    date:        DATE_ALIASES,
    description: DESC_ALIASES,
    amount:      AMOUNT_ALIASES,
    debit:       DEBIT_ALIASES,
    credit:      CREDIT_ALIASES,
    balance:     BALANCE_ALIASES,
    type:        TYPE_ALIASES,
};

function readRows(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
}

// Locate the header row: first row (within the first 25) that has at least 2
// non-empty cells AND contains a date-like or description-like column name.
// Falls back to the first row with the most columns if no names are recognised.
function detectHeaderRow(rawLines) {
    let best = -1;
    let bestCols = 0;
    for (let i = 0; i < Math.min(rawLines.length, 25); i++) {
        const cols = splitCsvLine(rawLines[i]).map(h => h.replace(/^﻿/, '').trim());
        const nonEmpty = cols.filter(Boolean).length;
        if (nonEmpty < 2) continue;
        const hasDate = findCol(cols, DATE_ALIASES) !== -1;
        const hasDesc = findCol(cols, DESC_ALIASES) !== -1;
        if (hasDate && hasDesc) return i;            // confident match
        if (nonEmpty > bestCols) { best = i; bestCols = nonEmpty; }
    }
    return best; // best-effort fallback so the user can still map manually
}

export function inspectCsv(filePath) {
    const rawLines = readRows(filePath);
    if (rawLines.length < 2) {
        throw new Error('CSV appears to be empty or has no data rows.');
    }

    const headerRowIndex = detectHeaderRow(rawLines);
    if (headerRowIndex === -1) {
        throw new Error('Could not find a header row in this CSV.');
    }

    const headers = splitCsvLine(rawLines[headerRowIndex]).map(h => h.replace(/^﻿/, '').trim());

    // Auto-detect a mapping (our field → column index, -1 if not found)
    const autoMap = {};
    for (const field of OUR_FIELDS) {
        autoMap[field] = findCol(headers, FIELD_ALIASES[field]);
    }

    // Sample data rows (first 3 non-empty rows after the header)
    const sampleRows = [];
    for (let i = headerRowIndex + 1; i < rawLines.length && sampleRows.length < 3; i++) {
        const cells = splitCsvLine(rawLines[i]);
        if (cells.filter(Boolean).length >= 2) sampleRows.push(cells);
    }

    const rowCount = rawLines.length - headerRowIndex - 1;
    const metaRows = rawLines.slice(0, headerRowIndex);
    const { openingBalance, closingBalance } = extractMetaBalances(metaRows);

    return {
        headers,
        headerRowIndex,
        sampleRows,
        rowCount,
        autoMap,
        meta: { opening: openingBalance, closing: closingBalance },
    };
}

// Build one transaction from a row of cells given an explicit column mapping.
// Returns null if the row can't be parsed (skipped).
function buildRowFromMapping(cells, map) {
    const at = (idx) => (idx != null && idx >= 0 && idx < cells.length ? cells[idx] : undefined);

    const dateStr = at(map.date);
    if (!dateStr) return null;
    const txDate = parseDate(dateStr);
    if (!txDate || isNaN(txDate)) return null;

    const description = (at(map.description) || '').replace(/\s+/g, ' ').trim();

    let debit = map.debit != null && map.debit >= 0 ? parseAmount(at(map.debit)) : null;
    let credit = map.credit != null && map.credit >= 0 ? parseAmount(at(map.credit)) : null;
    let netAmount;

    if (debit === null && credit === null && map.amount != null && map.amount >= 0) {
        // Single signed amount column. Sign is source of truth; TYPE disambiguates
        // an unsigned positive value.
        const rawCell = at(map.amount) ?? '';
        const rawAmount = parseAmount(rawCell);
        if (rawAmount === null) return null;
        const hasMinus = /-/.test(String(rawCell));

        if (rawAmount < 0 || hasMinus) {
            debit = Math.abs(rawAmount);
        } else if (rawAmount > 0) {
            const typeVal = map.type != null && map.type >= 0 ? normalise(at(map.type) || '') : '';
            const looksDebit = typeVal.includes('debit')
                || typeVal === 'dr'
                || typeVal.includes('withdrawal')
                || typeVal.includes('outgoing')
                || typeVal.includes('out)')
                || typeVal.includes('paid');
            if (looksDebit) debit = rawAmount;
            else            credit = rawAmount;
        } else {
            return null; // zero
        }
        netAmount = credit !== null ? credit : -(debit ?? 0);
    } else {
        debit = debit ?? 0;
        credit = credit ?? 0;
        netAmount = credit - debit;
    }

    if ((debit ?? 0) === 0 && (credit ?? 0) === 0) return null;

    const balance = map.balance != null && map.balance >= 0 ? parseAmount(at(map.balance)) : null;

    return {
        transaction_date: txDate,
        description,
        debit_amount:  debit  > 0 ? debit  : null,
        credit_amount: credit > 0 ? credit : null,
        net_amount:    netAmount,
        balance,
    };
}

/**
 * Parse a CSV using an explicit, user-confirmed column mapping.
 *
 * mapping = {
 *   headerRowIndex: number,
 *   date, description, amount, debit, credit, balance, type   // column index or -1/null
 *   opening, closing                                          // optional confirmed balances
 * }
 *
 * Returns { transactions, openingBalance, closingBalance } in file order.
 */
export function parseCsvWithMapping(filePath, mapping) {
    const rawLines = readRows(filePath);
    const headerRowIndex = Number.isInteger(mapping.headerRowIndex) ? mapping.headerRowIndex : 0;

    const map = {
        date:        normIdx(mapping.date),
        description: normIdx(mapping.description),
        amount:      normIdx(mapping.amount),
        debit:       normIdx(mapping.debit),
        credit:      normIdx(mapping.credit),
        balance:     normIdx(mapping.balance),
        type:        normIdx(mapping.type),
    };

    if (map.date < 0) throw new Error('A Date column must be mapped.');
    if (map.amount < 0 && map.debit < 0 && map.credit < 0) {
        throw new Error('Map an Amount column, or Debit/Credit columns.');
    }

    const transactions = [];
    for (let i = headerRowIndex + 1; i < rawLines.length; i++) {
        const cells = splitCsvLine(rawLines[i]);
        if (cells.filter(Boolean).length < 2) continue;
        const tx = buildRowFromMapping(cells, map);
        if (tx) transactions.push(tx);
    }

    // Balances: prefer the user-confirmed values, then metadata, then last running balance.
    const metaRows = rawLines.slice(0, headerRowIndex);
    const meta = extractMetaBalances(metaRows);

    let openingBalance = numOrNull(mapping.opening) ?? meta.openingBalance;
    let closingBalance = numOrNull(mapping.closing) ?? meta.closingBalance;

    if (closingBalance === null && transactions.length > 0) {
        const withBal = transactions.filter(t => t.balance !== null);
        if (withBal.length > 0) closingBalance = withBal[withBal.length - 1].balance;
    }

    logger.log(`[CSV_PARSER] mapping parse → ${transactions.length} txns, opening=${openingBalance}, closing=${closingBalance}`);
    return { transactions, openingBalance, closingBalance };
}

function normIdx(v) {
    if (v === null || v === undefined || v === '') return -1;
    const n = Number(v);
    return Number.isInteger(n) ? n : -1;
}
function numOrNull(v) {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(String(v).replace(/[,\s]/g, ''));
    return isNaN(n) ? null : n;
}
