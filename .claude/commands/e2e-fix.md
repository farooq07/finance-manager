---
description: Run Playwright E2E tests, fix all failures, re-run until green, then commit.
allowed-tools: Read, Grep, Glob, Edit, Bash
---

Run the full Playwright E2E suite, fix all failures, and commit when all tests pass.

## Steps

1. Check dev servers are running (frontend :5173, backend :5000). If either is not reachable, tell the user to start them first and stop.

2. Run the full suite:
   ```bash
   cd frontend && npx playwright test --reporter=list 2>&1
   ```

3. For each failing test, diagnose the root cause:
   - **Selector not found**: update to match actual DOM — use `getByText`, `locator('#id')`, never `getByRole('dialog')`
   - **Strict mode violation** (multiple matches): add `.first()` or a more specific parent locator
   - **Wrong URL expectation**: unauthenticated redirects go to `/welcome`, not `/login`
   - **Timeout**: use `{ timeout: 15_000 }` on visibility checks
   - **Missing fixture**: check `frontend/e2e/fixtures/auth.js` and `frontend/.env.test`

4. Fix the test files — never modify app source code to make a test pass.

5. Re-run only the fixed spec to confirm:
   ```bash
   cd frontend && npx playwright test e2e/<fixed-spec>.spec.js
   ```

6. Once all individual specs pass, run the full suite one final time:
   ```bash
   cd frontend && npx playwright test --reporter=list 2>&1
   ```

7. If all green, commit:
   ```bash
   git add frontend/e2e/ && git commit -m "fix(e2e): fix playwright test selectors"
   ```

## App-specific facts

- Custom modals are `<div>` overlays — `getByRole('dialog')` never matches anything
- Unauthenticated users are redirected to `/welcome`, not `/login`
- `frontend/vite.config.js` excludes `e2e/**` from Vitest — do not mix Playwright and Vitest APIs
- Test JWT tokens live in `frontend/.env.test` (`E2E_TEST_TOKEN`, `E2E_ADMIN_TOKEN`)
- Auth fixture injects tokens into localStorage to bypass OTP
