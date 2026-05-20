// Minimal CSV serialiser. RFC 4180 compatible enough for spreadsheet consumers.
// Wraps a field in quotes when it contains a quote, comma, or newline; doubles
// embedded quotes.

function escapeField(value) {
    if (value === null || value === undefined) return '';
    const str = value instanceof Date ? value.toISOString() : String(value);
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
