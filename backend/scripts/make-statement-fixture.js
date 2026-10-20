// Turn a real bank statement PDF into a redacted draft test fixture.
//
//   node scripts/make-statement-fixture.js <statement.pdf> <bank> <name> [password]
//   e.g. node scripts/make-statement-fixture.js ~/Downloads/hbl-mar.pdf hbl 2026-03
//
// Writes src/services/__tests__/fixtures/statements/<bank>/<name>.txt and
// <name>.expected.json. The expected file is a DRAFT copied from the current
// parser ("reviewed": false) — the fixture test fails until a person checks
// every row against the PDF, fixes any mistakes, and sets "reviewed": true.
// Nothing here touches the database.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractPdfText } from '../src/services/pdfParser.service.js';
import { parseTransactions, parseStatementBalances } from '../src/services/transactionParser.service.js';
import { reconcile } from '../src/services/reconcile.service.js';
import { redactStatementText } from '../src/services/statementRedact.service.js';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'services', '__tests__', 'fixtures', 'statements');
const SLUG = /^[a-z0-9][a-z0-9-]*$/;

const [pdfPath, bank, name, password] = process.argv.slice(2);
if (!pdfPath || !bank || !name) {
    console.error('Usage: node scripts/make-statement-fixture.js <statement.pdf> <bank> <name> [password]');
    process.exit(1);
}
if (!SLUG.test(bank) || !SLUG.test(name)) {
    console.error('<bank> and <name> must be lowercase letters, digits and dashes (e.g. hbl, 2026-03).');
    process.exit(1);
}

const dir = path.join(FIXTURES, bank);
const txtPath = path.join(dir, `${name}.txt`);
const jsonPath = path.join(dir, `${name}.expected.json`);
if (fs.existsSync(txtPath) || fs.existsSync(jsonPath)) {
    console.error(`Refusing to overwrite existing fixture ${bank}/${name}.`);
    process.exit(1);
}

const { rawText } = await extractPdfText(pdfPath, password || null);
if (!rawText?.trim()) {
    console.error('No text could be extracted from this PDF (scanned image or wrong password?).');
    process.exit(1);
}

const { text, redactions } = redactStatementText(rawText);
const txs = parseTransactions(text);
const { opening, closing } = parseStatementBalances(text);
const recon = reconcile(txs, opening, closing);

fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(txtPath, text);
fs.writeFileSync(jsonPath, JSON.stringify({
    source: `Redacted text of a real ${bank} statement. DRAFT values below were produced by the parser — verify against the PDF.`,
    reviewed: false,
    opening,
    closing,
    transactions: txs.map((t) => ({ date: new Date(t.transaction_date).toISOString().slice(0, 10), net: t.net_amount })),
}, null, 2) + '\n');

console.log(`Wrote ${path.relative(process.cwd(), txtPath)}`);
console.log(`Wrote ${path.relative(process.cwd(), jsonPath)}`);
console.log(`Redactions: ${redactions} · Transactions parsed: ${txs.length} · Opening ${opening} · Closing ${closing}`);
console.log(`Reconciliation: ${recon.message}`);
console.log(`
Before committing:
  1. Read the .txt end to end. Replace any remaining personal data (names in
     transfer descriptions, addresses, reference numbers) with [NAME] etc.
  2. Check every row in .expected.json against the PDF: date, amount, sign
     (money out is negative). Fix wrong rows; add missing ones.
  3. Check opening and closing against the PDF.
  4. Set "reviewed": true, then run: npm test -- statementFixtures
     A failing test now means the parser is wrong for this bank — that is
     the point. Fix the parser, not the expected file.`);
