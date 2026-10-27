# WealthAxis Mobile — Foundation (Sub-project 1) Design

**Status:** approved in conversation 2026-10-21, pending written-spec review
**Roadmap:** Phase 4 of `docs/superpowers/plans/2026-10-20-market-readiness-roadmap.md`

## Programme context

Goal: a market-ready Android app (iOS soon after) at parity with the web app, delivered in releases, talking to the same backend.

| # | Sub-project | Contents |
|---|---|---|
| **1** | **Foundation (this spec)** | app shell + navigation, design system, API client, sign-in, onboarding, PIN/fingerprint |
| 2 | Money core | dashboard & net worth, banks/wallets, statement import + review, expenses, Zakat, gold |
| 3 | Investments | stocks, mutual funds, watchlist, dividends |
| 4 | Ledger + AI assistant | people & loans, chat |
| 5 | Play Store launch | EAS production build, icon/splash, listing, privacy & data-safety forms, closed test track |

Release 1 = sub-projects 1–5. Later releases: rent, assets, reports, beneficiaries, export, iOS + Apple sign-in.

## Decisions (owner)

| Question | Decision |
|---|---|
| Stores | Android (Google Play) first, iOS soon after |
| Approach | Fresh app shell inside `mobile/`; keep Expo 54, expo-router, TanStack Query, zustand; remove React Native Paper and the old screens; custom design system |
| App name | **WealthAxis** |
| Android package / iOS bundle id | **`com.wealthaxis.app`** (permanent once published) |
| Look | Soft light gradients, airy rounded cards, clean list rows, 5-tab bar (owner's reference screenshot) |

Assumptions: same REST API as web; light-first with a matching dark theme; PKR only; online-only with cached data shown offline.

## Visual system

- **Background:** soft vertical gradient on every screen — light: mint white `#F3FBF7` → cream `#FFFBF4` → light sky `#F1F6FC`; dark: slate `#0F172A` → `#111827`.
- **HeroCard:** radius 28, white (dark: `#1E293B`) with a pastel gradient bloom in one corner; holds the screen's key figure; quick actions beneath as text buttons with ↗ / ↙ glyphs plus a round "…" more button.
- **ListCard / ListRow:** white card, header row (filter icon · centred title · search icon), day group labels ("Today", "Yesterday"); row = 40px round logo/icon, name, category caption, amount right-aligned (money in green `#059669`, money out near-black/near-white) with a small caption.
- **TabBar:** Home · Accounts · **Add** (raised round centre button) · Invest · More. Add opens a sheet: Expense / Transfer / Import statement / Ask AI. Invest and More entries follow the user's interests (same rule as web).
- **Type & motion:** Inter; generous spacing; light haptics on taps; slide-up sheets for forms; pull-to-refresh on every list.

## Structure

```
mobile/
  app/                 expo-router: (auth)/…, (onboarding)/…, (tabs)/home|accounts|add|invest|more, detail screens
  src/ui/              tokens.ts + Screen, HeroCard, ListCard, ListRow, Amount, Sheet, Button, Field, TabBar, EmptyState, ErrorState, Skeleton
  src/api/             client.ts + one module per backend area (auth, preferences, banks, wallets, …)
  src/features/        screen logic per feature (auth, onboarding, lock, …)
  src/lib/             currency.ts, dates.ts, interests.ts, menuVisibility.ts, parseBalance.ts
```

Old `app/` screens, `components/`, React Native Paper, `rnpTheme.ts`, the RNP migration docs and `react-native-vector-icons` are removed in this sub-project. Existing hooks/types are reused only where they match today's API (e.g. `/broker-accounts`, not `/brokers`).

## API client (`src/api/client.ts`)

- Base URL from `EXPO_PUBLIC_API_URL` (set per EAS profile); default `https://finance-manager-production-73ad.up.railway.app/api`.
- Bearer token from SecureStore key `auth_token`.
- No spoofed User-Agent, no request/response logging.
- One automatic retry for network errors (no response); never for 4xx/5xx.
- 401 → clear token + query cache, route to sign-in.
- `apiError(err)` → `err.response.data.message` or a plain fallback.

## Sign-in

- Email + password → `POST /auth/login` → 6-digit OTP → `POST /auth/verify-otp`; register, verify-email notice, forgot/reset password as on web.
- **Google:** native picker (`@react-native-google-signin/google-signin`) → ID token → `POST /auth/google`. Owner creates an Android OAuth client in Google Cloud (package `com.wealthaxis.app` + signing SHA-1); backend verification must accept the web client ID as audience (Android client configured with `webClientId`).
- After any sign-in: store token, then load the full user from `GET /auth/me` (fallback to the login reply if that call fails) — same rule as web.
- Apple sign-in deferred to the iOS release.

## Onboarding

Same three steps and API as web (`PATCH /users/me/preferences`, `POST /banks`, `POST /wallets`, `GET /dashboard/summary`): what to track → accounts with today's balance (accepts `1,50,000`; inline errors for negative / non-numeric) → "Your net worth", Go to Home. Redirect rule: `onboarded_at === null` → onboarding; checked on open, not mid-flow. Skip available on steps 1–2.

## Lock

- First sign-in prompts for a 4-digit PIN (existing PIN endpoints), then offers fingerprint via `expo-local-authentication`.
- Unlock required on app open and after 5 minutes in background; 5 wrong PINs → sign out.
- App-switcher preview hides amounts (privacy overlay when backgrounded).

## States & errors

Every data screen has Skeleton, EmptyState (with its next action) and ErrorState ("Try again"). Offline → slim banner, cached data stays. Field errors under the field. Server messages shown as given.

## Testing

- **Unit (Jest + React Native Testing Library):** `src/lib` helpers checked against the web's examples (`fmtPKR(1234567.89) === 'PKR 1,234,568'`, `parseBalance('1,50,000') === 150000`, visibility truth table); `src/ui` components render and handle props.
- **Screen tests** with mocked API: sign-in + OTP, Google sign-in hand-off, onboarding (picks, ≥1 account, partial failure, skip), lock (PIN ok, wrong ×5 signs out, background timeout).
- **Manual checklist** on a real Android device via an EAS internal (preview) build before each release.

## Out of scope (Foundation)

Money, investment, ledger and AI screens (sub-projects 2–4). Until they exist: Home shows net worth only; Accounts/Invest/More tabs and the Add sheet entries show their EmptyState with "Coming in the next update" (no dead links). Also out: push notifications, offline editing, iOS build, store submission (sub-project 5).
