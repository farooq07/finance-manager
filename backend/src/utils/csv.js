// Minimal CSV serialiser. RFC 4180 compatible enough for spreadsheet consumers.
// Wraps a field in quotes when it contains a quote, comma, or newline; doubles
// embedded quotes.

// A text cell starting with one of these is run as a formula by Excel/Sheets
// (e.g. a transaction description "=HYPERLINK(...)"). Prefixing an apostrophe
// makes the spreadsheet show it as plain text.
const FORMULA_START = /^[=+\-@\t\r]/;

const isNumeric = (value) =>
    typeof value === 'number' || typeof value === 'bigint'
    || (value !== null && typeof value === 'object' && typeof value.toFixed === 'function'); // Prisma Decimal

function escapeField(value) {
    if (value === null || value === undefined) return '';
    let str = value instanceof Date ? value.toISOString() : String(value);
    if (!isNumeric(value) && !(value instanceof Date) && FORMULA_START.test(str)) str = `'${str}`;
    if (/[",\n\r]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

/**
 * Serialize an array of objects to a CSV string.
 * @param {string[]} columns - ordered column keys
 * @param {object[]} rows
 * @param {object} [opts]
 * @param {string[]} [opts.headers] - human-readable headers; defaults to columns
 * @returns {string}
 */
export function toCsv(columns, rows, opts = {}) {
    const headers = opts.headers || columns;
    const lines = [headers.map(escapeField).join(',')];
    for (const row of rows) {
        lines.push(columns.map((c) => escapeField(row?.[c])).join(','));
    }
    return lines.join('\n');
}
