# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: accounts.spec.js >> Accounts page >> loads with Total Liquidity heading
- Location: e2e\accounts.spec.js:9:3

# Error details

```
TimeoutError: page.waitForResponse: Timeout 10000ms exceeded while waiting for event "response"
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications alt+T"
  - generic [ref=e3]:
    - generic [ref=e4]:
      - img [ref=e5]
      - generic [ref=e8]: FSWealth Axis
      - generic [ref=e10]:
        - generic [ref=e11]:
          - generic [ref=e12]:
            - generic [ref=e13]:
              - paragraph [ref=e14]: Total Portfolio
              - paragraph [ref=e15]: $284,520+12.4%
            - img [ref=e17]
          - img [ref=e20]
        - generic [ref=e23]:
          - img [ref=e26]
          - heading "Bank-Level Security" [level=3] [ref=e29]
          - paragraph [ref=e30]: 256-bit encrypted
        - generic [ref=e31]:
          - img [ref=e34]
          - heading "Smart Wallets" [level=3] [ref=e37]
          - paragraph [ref=e38]: Track every account
        - generic [ref=e39]:
          - paragraph [ref=e40]: Asset Allocation
          - generic [ref=e41]:
            - generic [ref=e42]:
              - img [ref=e43]:
                - generic [ref=e46]: 42%
              - generic [ref=e47]: Stocks
            - generic [ref=e48]:
              - img [ref=e49]:
                - generic [ref=e52]: 28%
              - generic [ref=e53]: Bonds
            - generic [ref=e54]:
              - img [ref=e55]:
                - generic [ref=e58]: 18%
              - generic [ref=e59]: Real Estate
            - generic [ref=e60]:
              - img [ref=e61]:
                - generic [ref=e64]: 12%
              - generic [ref=e65]: Cash
        - generic [ref=e66]:
          - img [ref=e69]
          - heading "Live Reports" [level=3] [ref=e71]
          - paragraph [ref=e72]: Real-time analytics
        - generic [ref=e73]:
          - img [ref=e75]
          - generic [ref=e77]:
            - heading "All your finances, one dashboard" [level=3] [ref=e78]
            - paragraph [ref=e79]: Track investments, expenses, dues, rents, and portfolios — all in one place.
      - generic [ref=e81]:
        - generic [ref=e82]:
          - generic [ref=e83]: AK
          - generic [ref=e84]: MF
          - generic [ref=e85]: SR
        - paragraph [ref=e86]: Trusted by 2,000+ users worldwide
    - generic [ref=e90]:
      - generic [ref=e91]:
        - img "WealthAxis Logo" [ref=e92]
        - heading "Welcome back" [level=1] [ref=e93]
        - paragraph [ref=e94]: Sign in to your WealthAxis account to continue.
      - generic [ref=e95]:
        - generic [ref=e96]:
          - generic [ref=e97]: Email or Username
          - textbox "you@example.com" [ref=e98]
        - generic [ref=e99]:
          - generic [ref=e100]:
            - generic [ref=e101]: Password
            - link "Forgot password?" [ref=e102] [cursor=pointer]:
              - /url: /forgot-password
          - textbox "Enter your password" [ref=e103]
        - button "Sign in" [ref=e104] [cursor=pointer]
      - generic [ref=e109]: New to WealthAxis?
      - link "Create an account" [ref=e110] [cursor=pointer]:
        - /url: /register
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