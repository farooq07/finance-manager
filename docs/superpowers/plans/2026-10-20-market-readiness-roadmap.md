# Market Readiness Roadmap

Goal: take FSWealth Axis from "feature-rich" to "trustworthy enough to recommend".
Ordered by what loses a user fastest: a wrong number, then a failed import, then confusion, then reach.

Each phase gets its own implementation plan in this folder when it starts. Only Phase 1 is detailed now.

| Phase | Theme | Why first | Plan | Blocked on |
|---|---|---|---|---|
| 1 | Money-math correctness | A wrong Zakat or net-worth figure destroys trust instantly | `2026-10-20-phase1-money-math.md` | Zakat rule sign-off (see plan) |
| 2 | Statement import reliability | Import is the only "bank sync" Pakistan has | to write | Anonymised sample statements |
| 3 | Onboarding / first-run path | 35 pages overwhelms new users | to write (brainstorm first) | Phase 1–2 done |
| 4 | Mobile release | Users are on phones | to write after audit | Audit of `mobile/` |
| 5 | Trust signals | Users upload bank statements — they need reasons to trust us | to write | — |

## Phase 1 — Money-math correctness (detailed plan exists)

Found during review:
- `frontend/src/pages/Zakat.jsx:34` computes `(netWorth - totalReceivable) * 0.025`. `netWorth` never included receivables, so this **subtracts** them from an unrelated total. It also ignores gold, payables, debts, and nisab.
- Gold Zakat is computed separately in `gold.controller.js` (`zakatSummary`), so the two pages disagree.
- Dashboard aggregation (`fetchDashboardData`) sums money with plain `Number` and has zero tests, yet it feeds the dashboard, net-worth snapshots, cron emails and the AI assistant.
- `ragEngine.service.js` comment and `CLAUDE.md` still reference retired Gemini 1.5 models.

## Phase 2 — Statement import reliability

- Golden-file test harness: `backend/src/services/__tests__/fixtures/statements/<bank>/*.txt` (extracted text) + `*.expected.json` (transactions, opening, closing). One test per fixture asserts `parseTransactions` output and that `reconcile()` returns `ok: true`.
- Target banks: HBL, Meezan, UBL, MCB, Bank Alfalah, SadaPay, NayaPay (Habib Metro already has inline tests).
- **Needs from you:** 2–3 real statements per bank, with names/account numbers redacted. Without these the harness tests nothing real.
- Import UI must block "Save" (or require explicit override) when `reconcile().ok === false`, pointing at the failing rows.

## Phase 3 — Onboarding

Brainstorm first. Working hypothesis: a first-run checklist — add an account → import one statement → see net worth → check Zakat — and hide advanced menus (Stocks, Mutual Funds, Rent, Beneficiaries) until enabled, reusing `menu_visibility`.

## Phase 4 — Mobile

`mobile/` already contains an Expo 54 app with many status docs (`RNP_FINAL_STATUS.md`, `APK_DELIVERY.md`, …). First step is an audit: what screens work against the current API, what's stale, and whether to ship to the Play Store or fall back to a PWA for the web app.

## Phase 5 — Trust signals

User-facing data export (`export.controller.js` exists — verify coverage), account deletion, a plain-language "how we store your statements" page, and an uptime/status link.

## Product decisions you need to make (not engineering calls)

1. **Headline net worth**: currently excludes gold, physical assets, and debts. Should it include gold and subtract debt? (Phase 1 does *not* change this.)
2. **Zakat rules**: Phase 1 ships the defaults listed in its plan; confirm or change them before Task 1 is merged.
