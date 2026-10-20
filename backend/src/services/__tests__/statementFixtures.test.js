import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseTransactions, parseStatementBalances } from '../transactionParser.service.js';
import { reconcile } from '../reconcile.service.js';

// Golden-file regression tests: every fixtures/statements/<bank>/<name>.txt
// with a sibling <name>.expected.json is parsed and checked. See the README
// in that folder for how to add a bank.
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'statements');

function findFixtures() {
    if (!fs.existsSync(ROOT)) return [];
    const found = [];
    for (const bank of fs.readdirSync(ROOT)) {
        const dir = path.join(ROOT, bank);
        if (!fs.statSync(dir).isDirectory()) continue;
        for (const file of fs.readdirSync(dir)) {
            if (!file.endsWith('.txt')) continue;
            const expectedPath = path.join(dir, file.replace(/\.txt$/, '.expected.json'));
            if (fs.existsSync(expectedPath)) found.push({ bank, name: file.replace(/\.txt$/, ''), dir });
        }
    }
    return found;
}

const fixtures = findFixtures();
const isoDate = (d) => new Date(d).toISOString().slice(0, 10);

describe('statement fixtures', () => {
    it('at least one fixture exists', () => {
        expect(fixtures.length).toBeGreaterThan(0);
    });

    // Jest rejects an empty table; the test above already fails in that case.
    (fixtures.length ? describe.each(fixtures) : () => () => {})('$bank/$name', ({ dir, name }) => {
        const text = fs.readFileSync(path.join(dir, `${name}.txt`), 'utf8');
        const expected = JSON.parse(fs.readFileSync(path.join(dir, `${name}.expected.json`), 'utf8'));
        const txs = parseTransactions(text);
        const balances = parseStatementBalances(text);

        it('has been checked by a person against the original PDF', () => {
            // Drafts from scripts/make-statement-fixture.js copy the parser's
            // own output; they only become ground truth once someone verifies them.
            expect(expected.reviewed).toBe(true);
        });

        it('finds the right opening and closing balances', () => {
            expect(balances).toEqual({ opening: expected.opening, closing: expected.closing });
        });

        it('finds every transaction with the right date and signed amount', () => {
            expect(txs.map((t) => ({ date: isoDate(t.transaction_date), net: t.net_amount })))
                .toEqual(expected.transactions);
        });

        it('reconciles', () => {
            const recon = reconcile(txs, balances.opening, balances.closing);
            expect(recon.message).toBe('All balances reconcile.');
            expect(recon.ok).toBe(true);
        });
    });
});
