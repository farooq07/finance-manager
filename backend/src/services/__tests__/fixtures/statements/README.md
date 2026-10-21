# Statement fixtures

Golden-file tests for the PDF statement parser. `statementFixtures.test.js`
picks up every `<bank>/<name>.txt` that has a sibling `<name>.expected.json`
and checks that the parser finds the same opening/closing balances and
transactions (date + signed amount, money out negative) and that the result
reconciles.

## Adding a bank statement

```bash
cd backend
npm run fixture:statement -- path/to/statement.pdf hbl 2026-03 --mask "YOUR NAME,OTHER NAME"
# password-protected PDF: set STATEMENT_PDF_PASSWORD in the environment first
```

`--mask` hides the given words everywhere (case-insensitive). Always pass your
own name and the names of people you transfer money to — the automatic rules
only catch names that follow a label like `Account Title:`.

The script extracts the text, redacts what it can (account/card numbers,
IBANs, CNICs, phone numbers, emails, labelled name/address lines) and writes a
**draft** `expected.json` copied from the current parser with
`"reviewed": false`. The test fails until you:

1. Read the `.txt` end to end and remove any remaining personal data —
   names inside transfer descriptions are **not** detected automatically.
2. Check every expected row against the PDF and fix mistakes.
3. Set `"reviewed": true`.

These files are committed to git. Never commit a fixture you haven't read.

## Folders

- `synthetic/` — hand-written statements, not real data.
- One folder per bank slug: `hbl`, `meezan`, `ubl`, `mcb`, `alfalah`,
  `sadapay`, `nayapay`, `habib-metro`, …
