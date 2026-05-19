# Testing Rules

## E2E selectors

The app uses custom React modals (div overlays), not native `<dialog>` elements.

**Never use:** `page.getByRole('dialog')` — it will always return nothing.

**Instead use:**
- `page.getByText(/modal title/i)` to confirm a modal is open
- `page.locator('#field-id')` for form fields inside modals
- `page.getByRole('button', { name: /save/i })` for action buttons

When a selector matches multiple elements (e.g. two `<h1>Expenses</h1>`), use `.first()`:
```js
await expect(page.getByRole('heading', { name: /expenses/i }).first()).toBeVisible();
```

## Auth redirect

Unauthenticated users are redirected to `/welcome` (the landing page), **not** `/login`.

E2E tests that check unauthenticated redirects must expect `/welcome`:
```js
await expect(page).toHaveURL(/\/welcome/);
```

## JWT tokens for E2E

Test JWTs are stored in `frontend/.env.test` as `E2E_TEST_TOKEN` (regular user) and `E2E_ADMIN_TOKEN` (admin user).

The fixture at `frontend/e2e/fixtures/auth.js` injects these into `localStorage` to skip OTP during tests.

To regenerate tokens (e.g. if JWT_SECRET changes):
```bash
node -e "import('jsonwebtoken').then(({default:jwt})=>console.log(jwt.sign({id:'<uuid>',email:'<email>'},process.env.JWT_SECRET,{expiresIn:'365d'})))"
```

## Vitest vs Playwright

Vitest runs unit tests in `frontend/src/`. It must NOT pick up Playwright spec files.

The `frontend/vite.config.js` must include:
```js
test: { environment: 'jsdom', globals: true, exclude: ['node_modules', 'e2e/**'] }
```

## Ambiguous selectors

For any selector that might match multiple elements, always add `.first()`, `.last()`, or a more specific parent locator. Strict mode violations (multiple matches) fail the test immediately.
