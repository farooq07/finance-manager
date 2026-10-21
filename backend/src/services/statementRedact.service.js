// Strip personal identifiers from extracted statement text so it can be
// committed as a test fixture. Best effort only: names inside transaction
// descriptions (e.g. "IBFT TO ALI KHAN") are NOT detected — every fixture
// must still be read by a human before it is committed.
//
// Order matters: specific patterns run before the generic 8+ digit rule so a
// phone number or IBAN is labelled as such rather than as an account number.
// A labelled value runs until a double space (column gap), the next known
// label, or the end of the line — PDF extraction often merges several
// "Label: value" fields onto one line.
const VALUE_END = String.raw`(?=\s{2,}|\s+(?:branch|account|address|cnic|iban|currency|period|from|statement|date|phone|mobile|email|city)\b|$)`;
const label = (names) => new RegExp(String.raw`(\b(?:${names})\s*[:-]\s*)(\S.*?)${VALUE_END}`, 'gim');

const RULES = [
    [/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '[EMAIL]'],
    [/\bPK\s?\d{2}(?:\s?[A-Z0-9]{4}){5}\b/gi, '[IBAN]'],
    [/\b\d{5}[\s-]\d{7}[\s-]\d\b/g, '[CNIC]'],
    [/(?:\+92|\b0092|\b92|\b0)[\s-]?3\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/g, '[PHONE]'],
    [/\b\d{4}(?:[\s-]\d{4}){3}\b/g, '[CARD]'],
    [label(String.raw`account\s*(?:title|name)|title\s+of\s+account|customer(?:\s*name)?|name`), '$1[NAME]'],
    [label('address'), '$1[ADDRESS]'],
    // 8+ digit runs (account, card, reference numbers) — but not amounts:
    // a run followed by a decimal part like 12500000.00 is money. A run that
    // reads as a YYYYMMDD date is kept, or the parser would lose that row.
    [/(?<![\d,])\d{8,}(?![\d,]*\.\d)(?![\d,])/g, (run) => (isYmdDate(run) ? null : '[ACCOUNT]')],
];

const isYmdDate = (run) => /^(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])$/.test(run);

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * @param {string} text
 * @param {{ extraTerms?: string[] }} [options] - words the caller knows are
 *   personal (e.g. the account holder's name), masked case-insensitively
 *   wherever they appear — the generic rules can't spot an unlabelled name.
 * @returns {{ text: string, redactions: number }}
 */
export function redactStatementText(text, { extraTerms = [] } = {}) {
    let redactions = 0;
    let out = text;
    for (const term of extraTerms.map((t) => t.trim()).filter(Boolean)) {
        const pattern = new RegExp(escapeRegExp(term).replace(/\s+/g, '\\s+'), 'gi');
        out = out.replace(pattern, () => { redactions += 1; return '[NAME]'; });
    }
    for (const [pattern, replacement] of RULES) {
        out = out.replace(pattern, (...args) => {
            // A function replacement may return null to keep the match as-is.
            const result = typeof replacement === 'function'
                ? replacement(args[0])
                : replacement.replace('$1', args[1] ?? '');
            if (result === null) return args[0];
            redactions += 1;
            return result;
        });
    }
    return { text: out, redactions };
}
