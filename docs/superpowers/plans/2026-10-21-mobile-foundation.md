# WealthAxis Mobile — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (owner has used native execution) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A clean WealthAxis Android app shell — design system, API client, sign-in (email+OTP, Google), onboarding, PIN/fingerprint lock and a Home screen with net worth — on the existing Expo 54 base.

**Architecture:** Old screens, React Native Paper and its docs are removed. New code lives in `mobile/src/` (`lib` pure helpers, `api` client + modules, `ui` design system, `features` screen logic) with expo-router screens in `mobile/app/`. Routing decisions are a pure function (`routeFor`) so they are unit-testable; session and lock state live in zustand stores.

**Tech Stack:** Expo SDK 54, React Native 0.81, expo-router 6, TanStack Query 5, zustand 5, axios, expo-secure-store, expo-linear-gradient, expo-local-authentication, @react-native-google-signin/google-signin, @expo-google-fonts/inter, jest-expo + @testing-library/react-native.

**Spec:** `docs/superpowers/specs/2026-10-21-mobile-foundation-design.md`

## Global Constraints

- App name **WealthAxis**; Android package and iOS bundle id **`com.wealthaxis.app`**; scheme `wealthaxis`.
- API base URL `process.env.EXPO_PUBLIC_API_URL`, default `https://finance-manager-production-73ad.up.railway.app/api`.
- Token in SecureStore key `auth_token`.
- No React Native Paper, no `react-native-vector-icons`, no request logging, no spoofed User-Agent.
- Money shown with `fmtPKR` from `src/lib/currency.ts` (`PKR 1,234,568` format, identical to web); never hardcode "PKR" in screens.
- Every screen has light and dark styling from `src/ui/tokens.ts`; every data screen has Skeleton / EmptyState / ErrorState.
- Colours (spec): light bg gradient `#F3FBF7 → #FFFBF4 → #F1F6FC`; dark `#0F172A → #111827`; money-in `#059669`; HeroCard radius 28.
- Lock: unlock on open and after **5 minutes** in background; **5** wrong PINs → sign out.
- Placeholder copy for unbuilt areas, exactly: `Coming in the next update`.
- Tests mock the network; nothing calls the live API.
- Testing Library 14: `render` is async — always `await render(...)` (found in Task 1).
- `app.json` slug stays `finance-manager-mobile`: it must match the linked EAS project (`extra.eas.projectId`); users never see it. Name/package/scheme are the WealthAxis values (Task 1 ruling).

## Review Focus

1. **Expired token at app open** (`/auth/me` → 401) — lands on sign-in once, no redirect loop. → Task 5 `routeFor` case + Task 3 401 test.
2. **Offline at app open with a saved token** — stays signed in, shows offline banner, never signs out. → Task 3 test `network error keeps the session`; Task 5 case.
3. **User cancels the Google picker** — no error message, stays on sign-in. → Task 6 test.
4. **Small Android screen + keyboard** — OTP and balance fields stay visible (screens wrap forms in `KeyboardAwareScreen`). → Task 4 component test that `Screen` with `keyboard` prop renders a `KeyboardAvoidingView`.
5. **Clock jumps / background exactly 5 min** — locks at ≥ 300 000 ms, not before. → Task 8 `shouldLock` boundary tests.

---

### Task 1: Clean base, packages, app identity, test runner

**Files:** Delete `mobile/app/**`, `mobile/components/**`, `mobile/constants/rnpTheme.ts`, `mobile/RNP_*.md`, `mobile/M3_MIGRATION_GUIDE.md`, `mobile/BATCH_UPDATE_SCRIPT.md`; Modify `mobile/package.json`, `mobile/app.json`, `mobile/eas.json`; Create `mobile/jest.config.js`, `mobile/app/_layout.tsx` (minimal), `mobile/src/lib/__tests__/smoke.test.ts`.

- [ ] Remove deps `react-native-paper`, `react-native-vector-icons`; add `expo-linear-gradient`, `expo-local-authentication`, `@react-native-google-signin/google-signin`, `@expo-google-fonts/inter` via `npx expo install`; devDeps `jest-expo`, `jest`, `@testing-library/react-native`, `@types/jest`. Scripts: `"test": "jest"`, `"typecheck": "tsc --noEmit"`.
- [ ] `app.json`: name `WealthAxis`, slug `wealthaxis`, scheme `wealthaxis`, `android.package`/`ios.bundleIdentifier` `com.wealthaxis.app`, plugins add `@react-native-google-signin/google-signin`, `expo-local-authentication`.
- [ ] `eas.json`: each profile `env.EXPO_PUBLIC_API_URL` = the Railway URL above.
- [ ] `jest.config.js`: preset `jest-expo`, `testMatch: ['**/__tests__/**/*.test.ts?(x)']`.
- [ ] Smoke test `expect(1 + 1).toBe(2)`; run `cd mobile && npm test` → PASS; `npm run typecheck` → 0 errors.
- [ ] Commit `chore(mobile): clean base for WealthAxis foundation`.

### Task 2: Shared helpers (`src/lib`)

**Files:** Create `src/lib/currency.ts`, `parseBalance.ts`, `interests.ts`, `menuVisibility.ts`, `dates.ts` + `src/lib/__tests__/*.test.ts`

**Produces:** `fmtPKR(value: number|string|null): string`; `parseBalance(text: string): { value: number|null; error: string|null }`; `INTERESTS` (same keys/labels as `frontend/src/utils/interests.js`), `interestForPath(path)`; `isMenuPathVisible(path, row, user): boolean`; `fmtDateLong(d): string` (same output as web `fmtDateLong`).

- [ ] Tests copy the web's examples: `fmtPKR(1234567.89) === 'PKR 1,234,568'`, `fmtPKR(null) === 'PKR 0'`; `parseBalance('1,50,000').value === 150000`, `'-5'` → error `Balance can't be negative`, `'abc'` → `Enter an amount like 100000`, `''` → `{value:null,error:null}`; visibility truth table from `frontend/src/utils/__tests__/menuVisibility.test.js`; `fmtDateLong('2026-03-02')` equals the web output for the same input.
- [ ] Run → FAIL; implement (port the web code to TS); run → PASS. Commit.

### Task 3: API client and session

**Files:** Create `src/api/client.ts`, `src/api/auth.ts`, `src/api/preferences.ts`, `src/api/accounts.ts`, `src/api/dashboard.ts`, `src/features/session/sessionStore.ts`; tests in `src/api/__tests__/client.test.ts`, `src/features/session/__tests__/sessionStore.test.ts`. Delete `services/api.ts`, `stores/authStore.ts` and old `hooks/*` once nothing imports them.

**Produces:**
- `api` (axios instance), `apiError(err: unknown): string`
- `useSession` store: `{ status: 'loading'|'signedOut'|'signedIn'; user: User|null; offline: boolean; adoptSession(token, loginUser): Promise<void>; refreshUser(): Promise<void>; signOut(): Promise<void>; boot(): Promise<void> }`
- `User` type: `{ id, name, email, role, hasPin, must_change_password, onboarded_at: string|null|undefined, interests: string[]|null|undefined }`

- [ ] Tests (axios mocked with `axios-mock-adapter` or jest mocks): `adds bearer token from SecureStore`; `retries once on network error then succeeds`; `does not retry a 500`; `401 clears token and signs out`; `apiError prefers server message`; `adoptSession falls back to login user when /auth/me fails`; `boot: no token → signedOut`; `boot: 401 → signedOut`; `network error keeps the session` (boot with token + network error → signedIn, offline true, user from cache).
- [ ] Run → FAIL; implement (cache last user in SecureStore key `last_user` for offline boot); run → PASS. Commit.

### Task 4: Design system (`src/ui`)

**Files:** Create `src/ui/tokens.ts`, `Screen.tsx`, `HeroCard.tsx`, `ListCard.tsx`, `ListRow.tsx`, `Amount.tsx`, `Button.tsx`, `Field.tsx`, `Sheet.tsx`, `EmptyState.tsx`, `ErrorState.tsx`, `Skeleton.tsx`, `OfflineBanner.tsx`, `src/ui/index.ts`; tests `src/ui/__tests__/*.test.tsx`

**Produces:** `tokens.colors.{light,dark}`, `tokens.gradients.{light,dark}`, `tokens.radius.hero = 28`, spacing scale; components with props: `Screen({ children, keyboard?, refreshing?, onRefresh? })`, `HeroCard({ label, value, caption?, actions?: {label, glyph: '↗'|'↙', onPress}[] })`, `ListRow({ title, subtitle?, amount?: number, amountCaption?, icon?, onPress? })`, `Amount({ value, signed? })`, `EmptyState({ title, message, action?: {label,onPress} })`, `ErrorState({ message, onRetry })`.

- [ ] Tests: `Amount` positive signed → green `#059669` and `+` prefix, negative → no green; `ListRow` shows title/subtitle/fmtPKR amount and fires onPress; `EmptyState` renders `Coming in the next update` when passed; `ErrorState` "Try again" calls onRetry; `Screen keyboard` wraps children in KeyboardAvoidingView; dark scheme switches background gradient (mock `useColorScheme`).
- [ ] Run → FAIL; implement with `expo-linear-gradient`, Inter fonts, `expo-haptics` on Button press. Run → PASS. Commit.

### Task 5: App shell, routing and tabs

**Files:** Create `src/features/routing/routeFor.ts` + test; `app/_layout.tsx` (fonts, QueryClient, providers, boot, guard), `app/(auth)/_layout.tsx`, `app/(onboarding)/_layout.tsx`, `app/(tabs)/_layout.tsx` (custom TabBar with raised Add), `app/(tabs)/home.tsx`, `accounts.tsx`, `add.tsx` (opens Sheet), `invest.tsx`, `more.tsx`, `src/ui/TabBar.tsx` + test.

**Produces:** `routeFor({ status, user, locked }): '/(auth)/sign-in' | '/(auth)/first-password' | '/(onboarding)' | '/lock' | '/(tabs)/home' | null` (null = stay while loading).

- [ ] Root layout clears the TanStack Query cache whenever `useSession` status becomes `signedOut` (moved here from Task 3 — the query client lives in the root layout). Test: `cache is cleared on sign-out`.
- [ ] Tests: loading → null; signedOut → sign-in; `must_change_password` → first-password; `onboarded_at === null` → onboarding; `onboarded_at` undefined → home (never trapped); locked → `/lock` (beats onboarding/home); signedIn onboarded → home. TabBar renders Home · Accounts · Add · Invest · More and Add press opens the sheet with Expense / Transfer / Import statement / Ask AI each showing `Coming in the next update`. Accounts/Invest/More screens render EmptyState with that copy.
- [ ] Run → FAIL; implement; run → PASS; `npm run typecheck` → 0. Commit.

### Task 6: Sign-in screens

**Files:** `app/(auth)/sign-in.tsx`, `otp.tsx`, `register.tsx`, `forgot-password.tsx`, `reset-password.tsx`, `first-password.tsx`; `src/features/auth/useSignIn.ts`, `src/features/auth/google.ts`; tests `src/features/auth/__tests__/*.test.tsx`

**Consumes:** `useSession.adoptSession`, `api`.
Endpoints: `POST /auth/login` → `{ userId, requiresOtp }`; `POST /auth/verify-otp { userId, otp }`; `POST /auth/register`; `POST /auth/forgot-password`; `POST /auth/reset-password { email, otp, newPassword }`; `PUT /auth/first-password { newPassword }`; `POST /auth/google { credential }`; `GET /auth/config` → `{ googleClientId }` (web client id → `GoogleSignin.configure({ webClientId })`).

- [ ] Tests: login → OTP screen with userId; wrong OTP shows server message; OTP success calls `adoptSession`; register shows "check your email"; Google success posts `{ credential: idToken }` and adopts session; **Google cancelled (statusCodes.SIGN_IN_CANCELLED) shows nothing and stays**; Google button hidden when `/auth/config` has no client id; first-password submit → `PUT /auth/first-password` then `refreshUser`.
- [ ] Run → FAIL; implement; run → PASS. Commit. Note for owner in commit body: Android OAuth client steps (package `com.wealthaxis.app`, SHA-1 from `eas credentials`).

### Task 7: Onboarding screens

**Files:** `app/(onboarding)/index.tsx` (3 steps), `src/features/onboarding/InterestPicker.tsx`, `AccountRows.tsx`; tests `src/features/onboarding/__tests__/*.test.tsx`

Same behaviour and copy as web onboarding (`frontend/src/pages/Onboarding.jsx`): titles `What do you want to track?`, `Add your accounts`, `You're set up`; `Accounts, expenses, Zakat and reports are always included.`; `Net worth so far:`; `Your net worth:`; `Skip setup`; `+ Add another`; `Go to Home`.

- [ ] Port the web test cases (picks saved, `[]` saved, ≥1 account, blank balance, `1,50,000` accepted, invalid balance message, partial failure shows once in list, existing accounts not resent, net-worth fallback, finish/skip PATCH `{ completeOnboarding: true }`).
- [ ] Run → FAIL; implement; run → PASS. Commit.

### Task 8: PIN and fingerprint lock

**Files:** `src/features/lock/lockStore.ts` (+ `shouldLock`), `app/lock.tsx`, `app/(auth)/pin-setup.tsx`, `src/features/lock/useAppStateLock.ts`, `src/ui/PrivacyCover.tsx`; tests `src/features/lock/__tests__/*.test.ts(x)`

**Produces:** `shouldLock(backgroundedAt: number|null, now: number): boolean` (true when `now - backgroundedAt >= 300000`); lock store `{ locked, failedAttempts, lock(), unlockWithPin(pin), unlockWithBiometrics() }`. Endpoints: `PUT /auth/pin { pin }`, `POST /auth/verify-pin { pin }`.

- [ ] Tests: `shouldLock` at 299 999 → false, 300 000 → true, null → false; wrong PIN increments, 5th wrong → `signOut` called; correct PIN unlocks and resets count; biometrics success unlocks (mock `expo-local-authentication`); pin-setup requires 4 digits and matching confirm; PrivacyCover visible when AppState is `background`/`inactive`.
- [ ] Run → FAIL; implement; run → PASS. Commit.

### Task 9: Home screen + device check

**Files:** `app/(tabs)/home.tsx`, `src/features/home/useNetWorth.ts`; test `src/features/home/__tests__/home.test.tsx`; Create `mobile/docs/DEVICE_CHECKLIST.md`

- [ ] Tests: HeroCard shows `Net worth` and `fmtPKR(metrics.netWorth)`; loading → Skeleton; error → ErrorState retry refetches; offline → OfflineBanner.
- [ ] Run → FAIL; implement; run → PASS; full `npm test` + `npm run typecheck` → green.
- [ ] Write `DEVICE_CHECKLIST.md` (install via `eas build --profile preview --platform android`; steps: sign up, OTP, Google, onboarding, lock after 5 min, wrong PIN ×5, airplane-mode open, dark mode). Building requires the owner's Expo account — not run by the implementer.
- [ ] Commit.

## Done when

`npm test` and `npm run typecheck` green in `mobile/`; no React Native Paper left; a new user can sign up → OTP → set PIN → onboarding → Home with net worth; Google sign-in works once the owner adds the Android OAuth client.
