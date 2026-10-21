# Phase 3: First-Run Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (owner chose native execution) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** New users pick what they track, type their account balances, and see their real net worth in the first session; the sidebar then shows only core pages plus their picks.

**Architecture:** Two nullable user columns (`onboarded_at`, `interests`) and one `PATCH /api/users/me/preferences` endpoint. A pure `isMenuPathVisible` replaces the two separate role checks in the sidebar and `useMenuAccess`. A full-screen `/onboarding` page (3 steps) reuses the existing bank/wallet create endpoints; Settings gets a "What I track" tab built from the same picker component.

**Tech Stack:** Express 5, Prisma 5 (Postgres), Zod, Jest (ESM); React 19, TanStack Query v5, React Router v6, Tailwind, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-21-onboarding-design.md`

## Global Constraints

- `user_id` only from `req.user.id`.
- Interest keys, exactly: `stocks`, `mutual-funds`, `ledger`, `rent`, `gold`, `assets`.
- Interest → path: `stocks`→`/stocks`, `mutual-funds`→`/mutual-funds`, `ledger`→`/ledger`, `rent`→`/personal#rent`, `gold`→`/personal#gold`, `assets`→`/personal#assets`. Every other path is core.
- `interests` null = show everything; `[]` = core only.
- Amounts via `fmtPKR()`; every new class has a `dark:` pair; custom modals are divs.
- No `prisma db push`; run `/prisma-check` before deploying the migration.
- Tests never touch the real database; the E2E test mocks the network.

## Spec deviations (decided while planning)

1. **`interests` is `Json?`, not `text[] NULL`** — Prisma scalar lists can't be optional, so `NULL` vs `[]` couldn't be told apart. Server validates it is `null` or an array of known keys.
2. **Banks without account details:** `bankSchema` requires `account_no` and `iban_no` (DB columns are NOT NULL). Onboarding only collects name + balance, so both become optional in Zod with default `''`. No column change.
3. **Login sets the user from `/auth/me`:** `verifyOtp`, `googleLogin`, `appleLogin` currently `setUser(data.user)`, which won't carry the new fields — a new user would skip onboarding until a reload. They call `refreshUser()` instead.

## Review Focus

1. **Existing user logs in after deploy** — must land on the dashboard, never onboarding (backfill + redirect only on `onboarded_at === null`). → Task 1 migration backfill check; Task 4 test `already-onboarded user is not redirected`.
2. **User refreshes mid-onboarding** — accounts already saved appear in step 2, nothing is created twice. → Task 5 test `lists existing accounts and does not resend them`.
3. **Admin hid a page by role, user picked its interest** — stays hidden. → Task 3 truth-table case.
4. **Picked nothing then later "Show everything" in Settings** — sidebar shows all again. → Task 6 test.
5. **Invited user with `must_change_password`** — password page first, then onboarding. → Task 4 test.

---

### Task 1: User columns + preferences API

**Files:**
- Modify: `backend/prisma/schema.prisma` (model `User`)
- Create: `backend/prisma/migrations/20261021120000_add_user_onboarding/migration.sql`
- Create: `backend/src/constants/interests.js`
- Create: `backend/src/controllers/preferences.controller.js`
- Modify: `backend/src/routes/user.routes.js` (register `/me/preferences` above `/:id` routes)
- Modify: `backend/src/controllers/auth.controller.js` (`getMe` select + response)
- Test: `backend/src/controllers/__tests__/preferences.controller.test.js`, extend `auth.controller.test.js`

**Interfaces — Produces:**
- `INTEREST_KEYS: string[]` (the six keys) from `backend/src/constants/interests.js`
- `updatePreferences(req, res)` → 200 `{ onboarded_at: string|null, interests: string[]|null }`; 400 `{ message }`
- `GET /api/auth/me` adds `onboarded_at`, `interests`

- [ ] **Step 1: Schema + migration.** `onboarded_at DateTime? @db.Timestamptz(6)`, `interests Json?`. Migration SQL:
  ```sql
  ALTER TABLE "users" ADD COLUMN "onboarded_at" TIMESTAMPTZ(6), ADD COLUMN "interests" JSONB;
  UPDATE "users" SET "onboarded_at" = now() WHERE "onboarded_at" IS NULL;
  ```
  Run `npx prisma generate`. Expected: client regenerated, no DB contact.
- [ ] **Step 2: Failing tests** (`prisma.user.update` / `findUnique` spied):
  - `writes only req.user.id` — `update` called with `where: { id: 'u1' }` even if body has `userId: 'x'`
  - `saves picked interests deduplicated` — `['gold','gold','stocks']` → data.interests `['gold','stocks']`
  - `accepts null (show everything) and [] (core only)`
  - `rejects an unknown key with 400` — `['crypto']` → 400, `update` not called
  - `rejects a non-array, non-null interests with 400`
  - `completeOnboarding sets onboarded_at only when unset` — existing value kept
  - `getMe returns onboarded_at and interests`
- [ ] **Step 3: Run** `cd backend && npm test -- preferences auth.controller` → FAIL (module missing).
- [ ] **Step 4: Implement** controller (read current row for `onboarded_at`; Prisma `Prisma.JsonNull` for null interests), route, `getMe` fields.
- [ ] **Step 5: Run** full `npm test` → all pass. **Commit** `feat(onboarding): add user onboarding columns and preferences API`.

### Task 2: Allow banks without account number / IBAN

**Files:** Modify `backend/src/middleware/validate.js` (`bankSchema`); Test `backend/src/middleware/__tests__/validate.test.js` (create)

- [ ] Tests: `bankSchema accepts name + starting_balance only` → parsed `account_no === ''`, `iban_no === ''`; `still rejects a missing name`; `still rejects a negative balance`.
- [ ] Run → FAIL. Change both fields to `z.string().optional().default('')`. Run → PASS. Full suite. Commit `fix(banks): account number and IBAN are optional`.

### Task 3: One visibility rule for sidebar and tabs

**Files:**
- Create: `frontend/src/utils/interests.js`, `frontend/src/utils/menuVisibility.js`
- Modify: `frontend/src/components/Sidebar.jsx:76-86`, `frontend/src/hooks/useMenuAccess.js`
- Test: `frontend/src/utils/__tests__/menuVisibility.test.js`

**Interfaces — Produces:**
- `INTERESTS: { key, label, description, path }[]` (labels: `Stocks (PSX)`, `Mutual funds`, `Money lent / borrowed`, `Rental income`, `Gold`, `Property & other assets`)
- `interestForPath(path: string) => string | undefined`
- `isMenuPathVisible(path: string, row: {visible_to_roles: string[]} | undefined, user: {role, interests}) => boolean` — `row` undefined → role check passes (fail-open, as today)

- [ ] Tests (truth table): role excluded → false regardless; `interests` null → true for `/stocks`; `[]` → false for `/stocks`, true for `/`, `/accounts`, `/personal#zakat`, `/reports#annual`, `/design-system`; `['gold']` → true `/personal#gold`, false `/personal#rent`; admin-hidden `/stocks` + `['stocks']` → false; unknown row + `[]` → true for core path.
- [ ] Run → FAIL. Implement; Sidebar filter and `canSee` both call `isMenuPathVisible(path, row, user)`; `useMemo` deps include `user?.interests`.
- [ ] Run full `npx vitest run` → PASS. Commit `refactor(menu): one visibility rule honouring user interests`.

### Task 4: Redirect new users; login loads full user

**Files:**
- Modify: `frontend/src/context/AuthContext.jsx` (`verifyOtp`, `googleLogin`, `appleLogin` → `await refreshUser()` after storing token)
- Create: `frontend/src/components/OnboardingGate.jsx` — `ProtectedRoute`'s rules extracted so they're testable
- Modify: `frontend/src/App.jsx` (`ProtectedRoute` uses it; add `/onboarding` route outside `Layout`)
- Test: `frontend/src/components/__tests__/OnboardingGate.test.jsx`, `frontend/src/context/__tests__/AuthContext.test.jsx`

**Interfaces — Produces:** `<OnboardingGate mode="app"|"onboarding">{children}</OnboardingGate>` — `app`: no user → `/welcome`; `must_change_password` → `/change-password`; `onboarded_at === null` → `/onboarding`. `onboarding`: no user → `/welcome`; already onboarded → `/`.

- [ ] Tests: `new user is sent to /onboarding`; `already-onboarded user is not redirected`; `must_change_password wins over onboarding`; `onboarded user visiting /onboarding goes to /`; `verifyOtp sets the user from /auth/me` (api mocked; user has `onboarded_at`).
- [ ] Run → FAIL. Implement (strict `=== null`). `/onboarding` route renders a placeholder until Task 5. Run full suite → PASS. Commit.

### Task 5: Onboarding page

**Files:**
- Create: `frontend/src/pages/Onboarding.jsx` (step state, skip, navigation)
- Create: `frontend/src/components/onboarding/InterestPicker.jsx` (six tick-cards; reused in Task 6)
- Create: `frontend/src/components/onboarding/AccountRows.jsx` (step 2)
- Create: `frontend/src/hooks/usePreferences.js` — `useUpdatePreferences()` mutation → `PATCH /users/me/preferences`, on success `refreshUser()`
- Test: `frontend/src/pages/__tests__/Onboarding.test.jsx`

UI copy (exact): titles `What do you want to track?`, `Add your accounts`, `You're set up`; note `Accounts, expenses, Zakat and reports are always included.`; `Net worth so far:`; `Your net worth:`; links `Skip setup`, `+ Add another`, `Go to dashboard`, `Import a statement for history`, `Check your Zakat`, `Change what you track`. Wallet suggestions: JazzCash, Easypaisa, SadaPay, NayaPay, Cash.

Saving: Bank → `POST /banks { name, starting_balance }`; Wallet → `POST /wallets { name, institution: name, balance }`.

- [ ] Tests (api mocked):
  - `step 1 saves picks and moves on` — PATCH body `{ interests: ['gold'] }`
  - `zero picks saves []`
  - `continue needs at least one account` — disabled with no rows; enabled with name + `0`
  - `blank balance is not accepted` — row with name only keeps Continue disabled
  - `one failing row stays with its error, others are saved` — POST 1 resolves, POST 2 rejects with `{ message: 'Wallet name is required' }`
  - `lists existing accounts and does not resend them` — GET /banks returns one; Continue posts only new rows
  - `net-worth falls back to typed total` — GET /dashboard/summary rejects → shows `fmtPKR(sum)`
  - `go to dashboard completes onboarding` — PATCH `{ completeOnboarding: true }` then navigate `/`
  - `skip completes onboarding and keeps saved picks` — PATCH `{ completeOnboarding: true }` only
  - `preferences failure keeps the user on the step with a toast`
- [ ] Run → FAIL. Implement. Run full suite + `npx eslint` on new files + `npx vite build` → PASS. Commit.

### Task 6: Settings "What I track" tab

**Files:** Create `frontend/src/components/settings/WhatITrack.jsx`; Modify `frontend/src/pages/Settings.jsx` (tab `{ id: 'tracking', label: 'What I track' }` in the first group; initial tab from `?tab=`); Test `frontend/src/components/settings/__tests__/WhatITrack.test.jsx`

- [ ] Tests: `shows current picks checked`; `saving picks sends interests`; `Show everything sends null`; Settings opens the tab from `?tab=tracking`.
- [ ] Run → FAIL. Implement with `InterestPicker`. Run → PASS. Commit.

### Task 7: E2E + deploy checks

**Files:** Create `frontend/e2e/onboarding.spec.js`

- [ ] Playwright test with `page.route` mocking `/api/auth/me` (new user), `/api/menu-visibility`, `/api/users/me/preferences`, `/api/banks`, `/api/wallets`, `/api/dashboard/summary`: sign-in token injected → lands on `/onboarding` → picks Gold → adds a bank `Meezan` 100000 → sees `Your net worth:` → Go to dashboard → sidebar shows Gold tab path and no Stocks. No real backend writes.
- [ ] Run `npx playwright test e2e/onboarding.spec.js` (Chrome channel) → PASS.
- [ ] Run `/prisma-check`; expected drift = only the new migration. Do not push the DB manually — Railway applies `prisma migrate deploy`.
- [ ] Commit.

## Done when

All suites green; an existing user sees no change; a new user goes sign-up → onboarding → dashboard with their net worth and a trimmed sidebar; Settings can change or reset interests.
