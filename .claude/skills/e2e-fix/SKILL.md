# /e2e-fix

Run the full Playwright E2E suite, fix all failures, re-run until green, then commit.

## Steps

1. Ensure dev servers are running (frontend :5173, backend :5000). If not, tell the user to start them first.

2. Run the full suite:
   ```bash
   cd frontend && npx playwright test --reporter=list 2>&1
   ```

3. For each failing test, diagnose the root cause:
   - **Selector not found**: update to match actual DOM (use `getByText`, `locator('#id')`, avoid `getByRole('dialog')`)
   - **Strict mode violation (multiple matches)**: add `.first()` or a more specific locator
   - **Wrong URL expectation**: check if redirect target changed (unauthenticated → `/welcome`)
   - **Timeout**: add `{ timeout: 15_000 }` to visibility checks
   - **Missing fixture**: check `frontend/e2e/fixtures/auth.js` and `frontend/.env.test`

4. Fix test files only — never modify app source to make a test pass.

5. Re-run the fixed spec to confirm:
   ```bash
   cd frontend && npx playwright test e2e/<fixed-spec>.spec.js
   ```

6. Once all tests pass, run the full suite one final time to confirm no regressions.

7. Commit with message: `fix(e2e): fix playwright test selectors`

## Key facts about this app

- Custom modals are `<div>` overlays — `getByRole('dialog')` never matches
- Unauthenticated redirect goes to `/welcome`, not `/login`
- Vitest excludes `e2e/**` — Playwright specs must not use Vitest APIs
- Test JWT tokens in `frontend/.env.test`
