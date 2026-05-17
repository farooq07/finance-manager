# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: beneficiaries.spec.js >> Beneficiaries page >> shows subtitle text
- Location: e2e\beneficiaries.spec.js:14:3

# Error details

```
TimeoutError: page.waitForResponse: Timeout 10000ms exceeded while waiting for event "response"
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications alt+T"
  - generic [ref=e3]:
    - complementary [ref=e4]:
      - generic [ref=e5]:
        - img "WealthAxis" [ref=e6]
        - heading "FSWealth Axis" [level=1] [ref=e7]
      - navigation [ref=e8]
      - button [ref=e9] [cursor=pointer]:
        - img
    - generic [ref=e10]:
      - banner [ref=e11]:
        - heading "Dashboard" [level=1] [ref=e12]
        - generic [ref=e13]:
          - button "Toggle Theme" [ref=e14] [cursor=pointer]:
            - img [ref=e15]
          - generic [ref=e17]:
            - generic [ref=e19]: F
            - generic [ref=e20]: farooq
          - button "Logout" [ref=e21] [cursor=pointer]:
            - img [ref=e22]
      - main [ref=e25]:
        - heading "Dashboard Overview" [level=1] [ref=e28]
```

# Test source

```ts
  1  | import { test as base } from '@playwright/test';
  2  | 
  3  | async function injectToken(page, token, baseURL) {
  4  |   // Go to login page first so localStorage is writable on the app's origin
  5  |   await page.goto(baseURL + '/login');
  6  |   await page.evaluate((t) => {
  7  |     localStorage.setItem('token', t);
  8  |   }, token);
  9  | 
  10 |   // Navigate to root and wait for the /auth/me validation to complete
  11 |   await Promise.all([
> 12 |     page.waitForResponse(
     |          ^ TimeoutError: page.waitForResponse: Timeout 10000ms exceeded while waiting for event "response"
  13 |       (resp) => resp.url().includes('/auth/me') && resp.status() === 200,
  14 |       { timeout: 10_000 }
  15 |     ),
  16 |     page.goto(baseURL + '/'),
  17 |   ]);
  18 | 
  19 |   // Wait for any sidebar/nav element to confirm the app shell is rendered
  20 |   await page.waitForSelector('nav a, aside a, [data-testid="sidebar"]', { timeout: 10_000 }).catch(() => {});
  21 | }
  22 | 
  23 | export const test = base.extend({
  24 |   /** Authenticated as a regular user */
  25 |   page: async ({ page, baseURL }, use) => {
  26 |     const token = process.env.E2E_USER_TOKEN;
  27 |     if (!token) throw new Error('E2E_USER_TOKEN is not set in .env.test');
  28 |     await injectToken(page, token, baseURL);
  29 |     await use(page);
  30 |   },
  31 | });
  32 | 
  33 | export const adminTest = base.extend({
  34 |   /** Authenticated as an admin / super.admin user */
  35 |   page: async ({ page, baseURL }, use) => {
  36 |     const token = process.env.E2E_ADMIN_TOKEN;
  37 |     if (!token) throw new Error('E2E_ADMIN_TOKEN is not set in .env.test');
  38 |     await injectToken(page, token, baseURL);
  39 |     await use(page);
  40 |   },
  41 | });
  42 | 
  43 | export { expect } from '@playwright/test';
  44 | 
```