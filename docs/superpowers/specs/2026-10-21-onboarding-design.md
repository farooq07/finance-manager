# First-Run Onboarding — Design

**Status:** approved in conversation 2026-10-21, pending written-spec review
**Roadmap:** Phase 3 of `docs/superpowers/plans/2026-10-20-market-readiness-roadmap.md`

## Goal

A new user sees their **real net worth in their first session**, in a sidebar that only shows what they track.

## Decisions (from the owner)

| Question | Decision |
|---|---|
| Who is it for | Public sign-ups and admin-invited users, equally |
| Success | User has added at least one account with a real balance and seen net worth |
| Sidebar | User picks interests; sidebar shows core pages + picks; editable later in Settings |
| First account | Typed balance only — statement import is not part of onboarding |
| Shape | Dedicated full-screen `/onboarding` page, 3 steps |

## Data

Two nullable columns on `users` (Prisma migration):

| Column | Type | Meaning |
|---|---|---|
| `onboarded_at` | `timestamptz NULL` | `NULL` → user is sent to onboarding |
| `interests` | `text[] NULL` | `NULL` → show everything (today's behaviour); otherwise the picked interest keys |

Migration backfills `onboarded_at = now()` for all existing users (3 today) so none of them see onboarding; their `interests` stay `NULL`.

### Interest keys

| Key | Label shown | Menu paths it unlocks |
|---|---|---|
| `stocks` | Stocks (PSX) | `/stocks` |
| `mutual-funds` | Mutual funds | `/mutual-funds` |
| `ledger` | Money lent / borrowed | `/ledger` |
| `rent` | Rental income | `/personal#rent` |
| `gold` | Gold | `/personal#gold` |
| `assets` | Property & other assets | `/personal#assets` |

**Always visible (core):** `/`, `/accounts`, `/expenses`, `/personal`, `/personal#zakat`, `/reports` (and its `#` sub-rows), `/settings`, `/help`.
Any path not listed in either table (e.g. `/design-system`, future rows) is treated as core — new menu rows never disappear because of interests.

## Visibility rule

One pure function, `frontend/src/utils/menuVisibility.js`:

```
isMenuPathVisible(path, row, user) =
    roleAllows(row, user.role)                       // existing menu_visibility rule
    && (user.interests == null                       // null = everything
        || !INTEREST_FOR_PATH[path]                  // core / unknown path
        || user.interests.includes(INTEREST_FOR_PATH[path]))
```

- `Sidebar.jsx` and `useMenuAccess().canSee` (used by Personal and Reports tabs) both call it — today they each implement the role check separately.
- Keeps `useMenuAccess`'s fail-open behaviour: no row for a path → role check passes.
- This declutters the menu; it is **not** access control. Hidden pages still open by URL.

## API

- `GET /api/auth/me` additionally returns `onboarded_at` and `interests`.
- `PATCH /api/users/me/preferences` body `{ interests?: string[] | null, completeOnboarding?: true }`
  - user is always `req.user.id`
  - `interests`: array of known keys (deduplicated) or `null` (show everything); any unknown key → 400 `{ message }`
  - `completeOnboarding: true` sets `onboarded_at = now()` if not already set
  - returns `{ onboarded_at, interests }`
  - must be registered before `/:id` routes in `user.routes.js`
- Accounts are created with the existing `POST /api/banks` (`name`, `starting_balance`) and `POST /api/wallets` (`name`, `institution`, `balance`) — same validation as the Accounts page.

## Flow

**Redirect:** `ProtectedRoute` sends a user with `onboarded_at == null` to `/onboarding` (after the existing `must_change_password` check, so invited users set their password first). `/onboarding` is a protected route outside `Layout` (no sidebar). A user who is already onboarded and visits `/onboarding` is sent to `/`.

**Skip:** every step has "Skip setup" → `PATCH { completeOnboarding: true }` → `/`. Interests already saved are kept; if none were saved they stay `NULL` (everything visible).

**Step 1 — What do you want to track?**
Six tick-cards (the interest table), note "Accounts, expenses, Zakat and reports are always included." Zero picks allowed. Continue → `PATCH { interests }` (an empty pick saves `[]`, i.e. core only).

**Step 2 — Add your accounts**
Rows of: type (Bank | Wallet), name, today's balance (wallet name suggestions: JazzCash, Easypaisa, SadaPay, NayaPay, Cash). "+ Add another". Live "Net worth so far: {fmtPKR(sum)}". Accounts the user already has (e.g. after a refresh) are listed read-only above the new rows and count toward the total.
Continue saves new rows one by one via the existing endpoints; failures don't stop the others, failed rows stay with their error, saved rows move to the read-only list. Continue requires ≥ 1 account (existing or newly saved); a new row needs a name and a balance entered (0 is allowed — an empty balance field is not).

**Step 3 — You're set up**
"Your net worth: {fmtPKR}" from `GET /api/dashboard/summary` (`metrics.netWorth`); if that call fails, show the sum of the step-2 balances. Links: import a statement for history (`/accounts`), check your Zakat (`/personal?tab=zakat`), change what you track (`/settings`). "Go to dashboard" → `PATCH { completeOnboarding: true }` → `/`.

**Settings:** a "What I track" card with the same six toggles plus "Show everything" (`interests: null`), saved via the same endpoint.

**UI:** single column, mobile-first, `Step n of 3` indicator, `dark:` variants on every class, amounts via `fmtPKR()`. After any preferences change, invalidate the auth user so sidebar and tabs update immediately.

## Errors

| Failure | Behaviour |
|---|---|
| `PATCH preferences` fails | stay on the step, toast the server message, nothing lost |
| One account row fails | only that row stays, with its error; others are saved |
| Net-worth summary fails | show sum of typed balances |
| Unknown interest key | 400 from API |

## Testing

- **Backend (Jest):** preferences endpoint — writes only `req.user.id`; rejects unknown keys; `null` and `[]` both accepted; `completeOnboarding` sets `onboarded_at` once; `/auth/me` returns both fields. Migration backfill verified by `/prisma-check` before deploy.
- **Frontend (Vitest):** `isMenuPathVisible` truth table (role × interests null/[]/picked × core/interest/unknown path); `ProtectedRoute` redirect; each onboarding step (picks saved, ≥1 account rule, partial row failure, net-worth fallback, skip); Settings card.
- **E2E (Playwright):** new-user happy path with a dedicated disposable test user — never the owner's account.

## Out of scope

Statement import in onboarding, per-user hiding of core pages, changing `menu_visibility` itself, onboarding for existing users, analytics on drop-off.
