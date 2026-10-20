# Phase 1: Money-Math Correctness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken Zakat estimate with one tested, server-side calculation that covers cash, investments, gold, dues and debts, and put the dues aggregation behind unit tests.

**Architecture:** Pure calculation functions in services (no Prisma inside them), tested with Jest. Controllers gather data via existing `fetchDashboardData` and gold helpers, then call the pure functions. The frontend Zakat page renders the server result instead of doing math.

**Tech Stack:** Express 5, Prisma, `decimal.js`, Jest (ESM, `jest.unstable_mockModule`), React 19, TanStack Query v5, Vitest.

**Spec:** `docs/superpowers/plans/2026-10-20-market-readiness-roadmap.md` (Phase 1 section)

## Global Constraints

- All money math in new code uses `decimal.js`; return plain numbers rounded to 2 dp.
- `user_id` only from `req.user.id`.
- Display amounts only via `fmtPKR()` from `frontend/src/utils/currency.js`; no hardcoded "PKR"/"Rs.".
- Every new UI class gets a `dark:` pair.
- Reuse `ZAKAT_RATE` (0.025) and `NISAB_GRAMS` (85) from `backend/src/services/goldValuation.service.js` — do not redefine.
- Do not change the headline `netWorth` formula in `dashboard.controller.js`.

### Zakat rules (defaults — owner must confirm before merging Task 1)

| Bucket | Source (`fetchDashboardData().metrics` unless noted) | Treatment |
|---|---|---|
| Cash | `totalBankBalance + totalWalletBalance + totalRentBalance` | zakatable |
| Investments | `totalInvestments` (market value) | zakatable |
| Gold | current value of all `GoldItem`s at latest 24K price | zakatable |
| Receivables | `totalReceivable` | zakatable |
| Payables | `totalPayable` | deducted |
| Debts | `totalDebt` (active institutional debt outstanding) | deducted |
| Physical assets | `totalAssetValue` | **excluded** (personal-use property) |

Nisab = value of 85 g of 24K gold at the latest price. Zakat is due when net zakatable wealth ≥ nisab.

## Review Focus

1. **No gold price recorded yet** (fresh DB): nisab is unknown — the page must say so, not show a confident "PKR 0 due". → Task 1 test `nisab unknown`, Task 4 test `shows nisab-unknown warning`.
2. **Liabilities exceed assets**: net zakatable is 0, never negative Zakat. → Task 1 test `clamps negative net to zero`.
3. **Exactly at nisab**: counts as met (`>=`). → Task 1 test `exactly at nisab is due`.
4. **Person whose receivables and payables cancel out**: lands in neither bucket. → Task 2 test `netted-to-zero person`.
5. **Prisma Decimal / string amounts** (`"1500.50"`): sums must be exact, no float drift. → Task 2 test `sums string amounts exactly`.

---

### Task 1: Pure Zakat calculator

**Files:**
- Create: `backend/src/services/zakat.service.js`
- Test: `backend/src/services/__tests__/zakat.service.test.js`

**Interfaces:**
- Consumes: `ZAKAT_RATE` from `goldValuation.service.js`
- Produces:
  ```js
  computeZakat({ cash, investments, goldValue, receivables, payables, debts, nisabValue })
  // all inputs: number (nisabValue may be null = unknown)
  // => { zakatableAssets, deductions, netZakatable, nisabValue, isNisabMet, zakatDue }
  //    numbers rounded 2dp; isNisabMet: boolean | null (null when nisabValue is null/0)
  ```

- [ ] **Step 1: Write failing tests**

```js
import { computeZakat } from '../zakat.service.js';

const base = { cash: 500000, investments: 300000, goldValue: 200000,
               receivables: 100000, payables: 50000, debts: 50000, nisabValue: 600000 };

it('sums zakatable assets and deductions', () => {
    const r = computeZakat(base);
    expect(r.zakatableAssets).toBe(1100000);
    expect(r.deductions).toBe(100000);
    expect(r.netZakatable).toBe(1000000);
    expect(r.isNisabMet).toBe(true);
    expect(r.zakatDue).toBe(25000);
});
it('below nisab owes nothing', () => {
    const r = computeZakat({ ...base, cash: 0, investments: 0, goldValue: 0, receivables: 500000, payables: 0, debts: 0 });
    expect(r.isNisabMet).toBe(false);
    expect(r.zakatDue).toBe(0);
});
it('exactly at nisab is due', () => {
    const r = computeZakat({ cash: 600000, investments: 0, goldValue: 0, receivables: 0, payables: 0, debts: 0, nisabValue: 600000 });
    expect(r.isNisabMet).toBe(true);
    expect(r.zakatDue).toBe(15000);
});
it('clamps negative net to zero', () => {
    const r = computeZakat({ ...base, debts: 5000000 });
    expect(r.netZakatable).toBe(0);
    expect(r.zakatDue).toBe(0);
});
it('nisab unknown: isNisabMet null, zakatDue still reported on net', () => {
    const r = computeZakat({ ...base, nisabValue: null });
    expect(r.isNisabMet).toBeNull();
    expect(r.zakatDue).toBe(25000);
});
it('no float drift', () => {
    const r = computeZakat({ cash: 0.1, investments: 0.2, goldValue: 0, receivables: 0, payables: 0, debts: 0, nisabValue: 0.3 });
    expect(r.netZakatable).toBe(0.3);
    expect(r.isNisabMet).toBe(true);
});
```

- [ ] **Step 2: Run, expect FAIL** — `cd backend && npm test -- zakat.service` → "Cannot find module '../zakat.service.js'"
- [ ] **Step 3: Implement `computeZakat`** in `zakat.service.js` with `Decimal`; treat missing/NaN inputs as 0; when nisab unknown, `zakatDue = netZakatable × rate` so the UI can show an estimate alongside the warning.
- [ ] **Step 4: Run, expect PASS** — same command, 6 passing.
- [ ] **Step 5: Commit** — `git add backend/src/services/zakat.service.js backend/src/services/__tests__/zakat.service.test.js && git commit -m "feat(zakat): add tested pure zakat calculator"`

---

### Task 2: Extract and test dues aggregation

**Files:**
- Create: `backend/src/services/dues.service.js`
- Modify: `backend/src/controllers/dashboard.controller.js:91-110` (replace inline loop with `summarizeDues(people)`)
- Test: `backend/src/services/__tests__/dues.service.test.js`

**Interfaces:**
- Produces: `summarizeDues(people) => { totalReceivable: number, totalPayable: number }` where `people` is `[{ transactions: [{ transaction_type: 'receivable'|'payable', amount: number|string|Decimal }] }]`. Nets per person first, then splits by sign. Uses `Decimal`.

- [ ] **Step 1: Write failing tests** — cases:
  - `one receivable person` → `{ totalReceivable: 1000, totalPayable: 0 }`
  - `one payable person` → `{ 0, 700 }`
  - `nets within a person`: receivable 1000 + payable 400 → `{ 600, 0 }`
  - `netted-to-zero person`: receivable 500 + payable 500 → `{ 0, 0 }`
  - `sums string amounts exactly`: receivables `"0.10"`, `"0.20"` → `totalReceivable` `0.3` (`toBe`, not `toBeCloseTo`)
  - `ignores unknown transaction types` and `empty list → zeros`
- [ ] **Step 2: Run, expect FAIL** — `npm test -- dues.service`
- [ ] **Step 3: Implement `summarizeDues`**; swap it into `fetchDashboardData` (keep the `people` query as-is).
- [ ] **Step 4: Run full backend suite, expect PASS** — `cd backend && npm test`
- [ ] **Step 5: Commit** — `git commit -m "refactor(dashboard): extract tested summarizeDues"`

---

### Task 3: `GET /api/zakat/summary` endpoint

**Files:**
- Modify: `backend/src/services/goldValuation.service.js` — add `summarizeGold(items, pricePerGram24k) => { total24kGrams, totalValue }`
- Modify: `backend/src/controllers/gold.controller.js:267-286` — use `summarizeGold` instead of the inline loop (response shape unchanged)
- Modify: `backend/src/controllers/zakat.controller.js` — add `getZakatSummary`
- Modify: `backend/src/routes/zakat.routes.js` — `router.get('/summary', getZakatSummary);` above existing routes
- Test: `backend/src/controllers/__tests__/zakat.controller.test.js`

**Interfaces:**
- Consumes: `computeZakat` (Task 1), `fetchDashboardData(userId)`, `getLatestPriceRow()`, `NISAB_GRAMS`
- Produces: JSON `{ breakdown: { cash, investments, goldValue, receivables, payables, debts }, ...computeZakat result, goldPriceDate: string|null }`

- [ ] **Step 1: Write failing tests** using the pattern in `auth.controller.test.js`: `jest.unstable_mockModule('../dashboard.controller.js', …)` to return fixed `metrics`; `jest.spyOn(prisma.goldItem, 'findMany')` and `prisma.goldPriceHistory.findFirst`. Cases:
  - `queries gold with req.user.id` — `findMany` called with `{ where: { user_id: 'u1' } }`, and `fetchDashboardData` called with `'u1'`
  - `maps metrics into buckets` — cash = bank + wallet + rent; response `zakatDue` matches hand-computed value
  - `no gold price → nisabValue null, goldPriceDate null, isNisabMet null`
  - `prisma throws → 500 with { message }`
- [ ] **Step 2: Run, expect FAIL** — `npm test -- zakat.controller`
- [ ] **Step 3: Implement** `summarizeGold`, refactor gold controller to use it, then `getZakatSummary`. `nisabValue = perGram ? NISAB_GRAMS * perGram : null`.
- [ ] **Step 4: Run full backend suite, expect PASS** — `cd backend && npm test`
- [ ] **Step 5: Manual check** — `cd backend && npm run dev`, then `curl -H "Authorization: Bearer <token>" localhost:5000/api/zakat/summary` returns the shape above.
- [ ] **Step 6: Commit** — `git commit -m "feat(zakat): add server-side zakat summary endpoint"`

---

### Task 4: Zakat page uses the summary

**Files:**
- Modify: `frontend/src/hooks/useZakat.js` — add `useZakatSummary()` (`queryKey: ['zakat', 'summary']`, GET `/zakat/summary`); remove the now-unused `useDashboardSummary` export only if nothing else imports it (grep first)
- Modify: `frontend/src/pages/Zakat.jsx:15-34, ~78` — drop the client-side formula; render `zakatDue`, a breakdown list (six buckets), and nisab status
- Test: `frontend/src/pages/Zakat.test.jsx`

**Interfaces:**
- Consumes: Task 3 response shape.

UI copy (exact):
- Nisab met: `Zakat is due on your wealth`
- Below nisab: `Your wealth is below nisab — no Zakat due`
- Nisab unknown: `Gold price not available yet — nisab can't be checked. Estimate shown assumes Zakat is due.`

- [ ] **Step 1: Write failing tests** — mock `../hooks/useZakat` with `vi.mock`; render in `QueryClientProvider` + `MemoryRouter` as `OTPVerification.test.jsx` does. Cases:
  - `shows zakat due` — expect text `fmtPKR(25000)`
  - `shows below-nisab message` when `isNisabMet: false`
  - `shows nisab-unknown warning` when `isNisabMet: null`
  - `renders all six breakdown rows`
- [ ] **Step 2: Run, expect FAIL** — `cd frontend && npm run test -- Zakat`
- [ ] **Step 3: Implement** hook and page changes; invalidate `['zakat']` already covers the summary key on entry add/delete.
- [ ] **Step 4: Run, expect PASS** — `cd frontend && npm run test`
- [ ] **Step 5: Visual check** — run both servers, open `/personal?tab=zakat` (or the Zakat route) in light and dark mode; numbers match the curl from Task 3.
- [ ] **Step 6: Commit** — `git commit -m "fix(zakat): show server-calculated zakat with breakdown and nisab status"`

---

### Task 5: Stale AI model references

**Files:**
- Modify: `backend/src/services/ragEngine.service.js:10-17` (comment block)
- Modify: `CLAUDE.md` (Stack → AI line)

- [ ] **Step 1:** In Google AI Studio, confirm the models the code defaults to (`gemini-2.0-flash` in `ragEngine.service.js:24` and `aiCategorizer.service.js:45`) are still served. If not, set `GEMINI_CHAT_MODEL` in Doppler `dev_farooq` and Railway to a live model, and update both defaults.
- [ ] **Step 2:** Rewrite the comment to list only the currently live models; change CLAUDE.md "Gemini 1.5 Flash" to the actual default.
- [ ] **Step 3:** `cd backend && npm run dev`, send one AI assistant message, confirm a reply.
- [ ] **Step 4: Commit** — `git commit -m "docs: correct stale Gemini model references"`

---

## Done when

- `cd backend && npm test` and `cd frontend && npm run test` both green.
- Zakat page and `/api/gold/zakat-summary` agree on gold value for the same user.
- No client-side Zakat arithmetic remains (`grep -n "0.025" frontend/src` → only display text, if any).
