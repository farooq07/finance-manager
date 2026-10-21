# Phase 2: Statement Import Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (chosen: native) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop wrong statement imports from being saved silently, make AI categorisation survive large statements, and give every bank a golden-file regression test the moment a sample statement exists.

**Architecture:** A shared `importGate()` in `reconcile.service.js` decides whether a reconciled import may be saved; both bank and wallet `commitStatement` call it and return 422 unless the user explicitly accepts the mismatch. The PDF review modal flags failing rows live and requires an explicit "import anyway" confirmation. `aiCategorizeBatch` chunks descriptions. A fixture-driven Jest test runs every statement under `fixtures/statements/`, and a script turns a real PDF into a redacted draft fixture.

**Tech Stack:** Express 5, Jest (ESM, `jest.unstable_mockModule`), React 19, Vitest.

**Spec:** `docs/superpowers/plans/2026-10-20-market-readiness-roadmap.md` (Phase 2)

## Global Constraints

- Fixture files are committed to git: they must contain **no** real names, account numbers, IBANs, CNICs, phone numbers or addresses. The script redacts what it can; a human reviews every fixture before commit.
- The mismatch override is explicit per import (`acceptMismatch: true`), never a default.
- Tests never reach a real database (Jest setup pins an unreachable `DATABASE_URL`).
- Money display via `fmtPKR()`; every new UI class has a `dark:` pair.

## Review Focus

1. **No balances on the statement** (`reconcile` returns ok with `hasBalances:false`, no totalCheck): import must still be allowed — unverified is not wrong. → Task 1 test `unverifiable import is allowed`.
2. **CSV imports** have no review grid: a mismatch must still come back as 422 with a message the page can show, and the retry must carry `acceptMismatch`. → Task 2 test; Task 4 handles 422 in both pages.
3. **AI chunk failure** must only mark that chunk `ai_error`, not the whole statement. → Task 3 test `one failing chunk`.
4. **Chunk numbering**: each request numbers from 1; results must map back to the right descriptions. → Task 3 test `maps results across chunks`.
5. **Redaction misses** in fixture text (e.g. a name in a transfer description). → Task 5 script prints a review checklist; the README says fixtures are reviewed by hand.

---

### Task 1: `importGate` decision

**Files:** Modify `backend/src/services/reconcile.service.js`; Test `backend/src/services/__tests__/reconcile.service.test.js` (create)

**Interfaces — Produces:** `importGate(reconciliation, acceptMismatch) => null | { status: 422, body: { message, reconciliation, needsConfirmation: true } }`

- [ ] Tests: `balanced import is allowed` (null); `mismatch is blocked with 422 and the reconciliation`; `mismatch with acceptMismatch true is allowed`; `acceptMismatch 'true' string is allowed`; `unverifiable import is allowed`.
- [ ] Run → FAIL (no export). Implement. Run → PASS. Commit.

### Task 2: Gate both commit endpoints

**Files:** Modify `backend/src/controllers/bank.controller.js` (`commitStatement`), `backend/src/controllers/wallet.controller.js` (`commitStatement`); Test `backend/src/controllers/__tests__/statementCommit.test.js`

**Interfaces — Consumes:** `importGate`. Request body gains `acceptMismatch`.

- [ ] Tests per controller (bank + wallet), prisma and file helpers mocked: `mismatched rows → 422, nothing saved` (finalize/create not called); `acceptMismatch → 201`.
- [ ] Run → FAIL. Call `importGate` right after `reconcile(...)`, before any write. Run → PASS. Full backend suite. Commit.

### Task 3: Chunk AI categorisation

**Files:** Modify `backend/src/services/aiCategorizer.service.js`; Test `backend/src/services/__tests__/aiCategorizer.service.test.js`

**Interfaces — Produces:** `AI_BATCH_SIZE = 40` (exported); `aiCategorizeBatch` unchanged signature.

- [ ] Tests (mock `@google/generative-ai` via `jest.unstable_mockModule`, `AI_PROVIDER=gemini`): `splits 100 descriptions into 3 requests of ≤40`; `maps results across chunks` (2nd chunk's "1" → 41st description); `one failing chunk marks only its own items ai_error`.
- [ ] Run → FAIL. Implement sequential chunk loop (rate limits) with per-chunk try/catch. Run → PASS. Commit.

### Task 4: Review UI — flag rows, confirm mismatch, handle 422

**Files:** Modify `frontend/src/components/StatementReviewModal.jsx`, `frontend/src/pages/BankDetail.jsx`, `frontend/src/pages/WalletDetail.jsx`; Test `frontend/src/components/StatementReviewModal.test.jsx`

UI copy (exact): row flag title `Balance doesn't follow from the previous row`; checkbox `I've checked these rows — import anyway`; button when mismatched and unchecked is disabled.

- [ ] Tests: `marks a row whose balance breaks the running total`; `import disabled while totals don't reconcile`; `checking the override enables import and sends acceptMismatch`; `balanced statement imports without override`.
- [ ] Run → FAIL. Implement: per-row running-balance check (prev row balance + credit − debit vs row balance, when both present); `onConfirm` payload gains `acceptMismatch`. Pages: on 422 `needsConfirmation` → `window.confirm(message)` → retry with `acceptMismatch: true` (CSV path).
- [ ] Run → PASS, full frontend suite. Commit.

### Task 5: Golden-file harness + fixture script

**Files:** Create `backend/src/services/__tests__/statementFixtures.test.js`, `backend/src/services/__tests__/fixtures/statements/README.md`, `backend/src/services/__tests__/fixtures/statements/synthetic/habib-metro-basic.txt` + `.expected.json`, `backend/scripts/make-statement-fixture.js`, `backend/src/services/statementRedact.service.js` + test

**Interfaces — Produces:** `redactStatementText(text) => { text, redactions: number }` — masks digit runs ≥ 8 (account/card/CNIC/phone), IBANs (`PK\d{2}[A-Z]{4}\d+`), emails.

- [ ] Redaction tests: masks account numbers, IBAN, CNIC `12345-1234567-1`, phone `0300-1234567`, email; keeps amounts like `1,250,000.00` and dates.
- [ ] Harness: for each `*.txt` with a sibling `.expected.json` `{ opening, closing, count, transactions:[{date, net}] }` assert parse output and `reconcile().ok`. Seed with one synthetic statement. Run → PASS.
- [ ] Script: `node scripts/make-statement-fixture.js <pdf> <bank> <name> [password]` → extracts text, redacts, writes `.txt` + draft `.expected.json` from the current parser, prints redaction count and a "review by hand" checklist. Smoke-run on a generated PDF is not required; unit-tested pieces are.
- [ ] Commit.

## Done when

Both suites green; a mismatched PDF or CSV import cannot be saved without an explicit override; a 100-row statement categorises in 3 AI calls; adding a bank = dropping two files into `fixtures/statements/<bank>/`.
