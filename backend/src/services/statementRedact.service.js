// Strip personal identifiers from extracted statement text so it can be
// committed as a test fixture. Best effort only: names inside transaction
// descriptions (e.g. "IBFT TO ALI KHAN") are NOT detected — every fixture
// must still be read by a human before it is committed.
//
// Order matters: specific patterns run before the generic 8+ digit rule so a
// phone number or IBAN is labelled as such rather than as an account number.
const RULES = [
    [/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '[EMAIL]'],
    [/\bPK\d{2}[A-Z]{4}\d{16}\b/gi, '[IBAN]'],
    [/\b\d{5}-\d{7}-\d\b/g, '[CNIC]'],
    [/(?:\+92|\b0092|\b0)3\d{2}[-\s]?\d{7}\b/g, '[PHONE]'],
    [/^(\s*(?:account\s*(?:title|name)|customer\s*name|name)\s*[:-]\s*).+$/gim, '$1[NAME]'],
    [/^(\s*address\s*[:-]\s*).+$/gim, '$1[ADDRESS]'],
    // 8+ digit runs (account, card, reference numbers) — but not amounts:
    // a run followed by a decimal part like 12500000.00 is money.
    [/(?<![\d.,])\d{8,}(?![\d,]*\.\d)(?![\d,])/g, '[ACCOUNT]'],
];

/**
 * @param {string} text
 * @returns {{ text: string, redactions: number }}
 */
export function redactStatementText(text) {
    let redactions = 0;
    let out = text;
    for (const [pattern, replacement] of RULES) {
        out = out.replace(pattern, (...args) => {
            redactions += 1;
            return replacement.replace('$1', args[1] ?? '');
        });
    }
    return { text: out, redactions };
}
