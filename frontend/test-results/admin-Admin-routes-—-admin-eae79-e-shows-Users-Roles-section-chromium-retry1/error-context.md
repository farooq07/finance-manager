# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin.spec.js >> Admin routes — admin user >> Settings page shows Users & Roles section
- Location: e2e\admin.spec.js:24:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: /users & roles/i })
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByRole('heading', { name: /users & roles/i })

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
      - navigation [ref=e8]:
        - link "Dashboard" [ref=e9] [cursor=pointer]:
          - /url: /
          - img [ref=e10]
          - generic [ref=e13]: Dashboard
        - link "Accounts" [ref=e14] [cursor=pointer]:
          - /url: /accounts
          - img [ref=e15]
          - generic [ref=e18]: Accounts
        - link "Expenses" [ref=e19] [cursor=pointer]:
          - /url: /expenses
          - img [ref=e20]
          - generic [ref=e23]: Expenses
        - link "Mutual Funds" [ref=e24] [cursor=pointer]:
          - /url: /mutual-funds
          - img [ref=e25]
          - generic [ref=e28]: Mutual Funds
        - link "Stocks" [ref=e29] [cursor=pointer]:
          - /url: /stocks
          - img [ref=e30]
          - generic [ref=e31]: Stocks
        - link "Dues Ledger" [ref=e32] [cursor=pointer]:
          - /url: /dues
          - img [ref=e33]
          - generic [ref=e38]: Dues Ledger
        - link "Personal" [ref=e39] [cursor=pointer]:
          - /url: /personal
          - img [ref=e40]
          - generic [ref=e43]: Personal
        - link "Beneficiaries" [ref=e44] [cursor=pointer]:
          - /url: /beneficiaries
          - img [ref=e45]
          - generic [ref=e49]: Beneficiaries
        - link "AI Assistant" [ref=e50] [cursor=pointer]:
          - /url: /assistant
          - img [ref=e51]
          - generic [ref=e53]: AI Assistant
        - link "Reports" [ref=e54] [cursor=pointer]:
          - /url: /reports
          - img [ref=e55]
          - generic [ref=e58]: Reports
        - link "Settings" [ref=e59] [cursor=pointer]:
          - /url: /settings
          - img [ref=e60]
          - generic [ref=e63]: Settings
        - link "Design System" [ref=e64] [cursor=pointer]:
          - /url: /design-system
          - img [ref=e65]
          - generic [ref=e69]: Design System
      - button [ref=e70] [cursor=pointer]:
        - img
    - generic [ref=e71]:
      - banner [ref=e72]:
        - heading "WealthAxis" [level=1] [ref=e73]
        - generic [ref=e74]:
          - button "Toggle Theme" [ref=e75] [cursor=pointer]:
            - img [ref=e76]
          - generic [ref=e78]:
            - generic [ref=e80]: S
            - generic [ref=e81]: Super Admin
          - button "Logout" [ref=e82] [cursor=pointer]:
            - img [ref=e83]
      - main [ref=e86]:
        - generic [ref=e87]:
          - generic [ref=e88]:
            - generic [ref=e89]:
              - heading "Console" [level=1] [ref=e90]
              - paragraph [ref=e91]: Administration
            - navigation [ref=e92]:
              - generic [ref=e93]:
                - heading "Data Dictionary" [level=3] [ref=e94]
                - generic [ref=e95]:
                  - button "Banks & Wallets" [ref=e96] [cursor=pointer]:
                    - generic [ref=e97]:
                      - img [ref=e98]
                      - text: Banks & Wallets
                    - img [ref=e101]
                  - button "Broker Accounts" [ref=e103] [cursor=pointer]:
                    - generic [ref=e104]:
                      - img [ref=e105]
                      - text: Broker Accounts
              - generic [ref=e108]:
                - heading "System" [level=3] [ref=e109]
                - generic [ref=e110]:
                  - button "Users" [ref=e111] [cursor=pointer]:
                    - generic [ref=e112]:
                      - img [ref=e113]
                      - text: Users
                  - button "Roles" [ref=e118] [cursor=pointer]:
                    - generic [ref=e119]:
                      - img [ref=e120]
                      - text: Roles
                  - button "Security & PIN" [ref=e122] [cursor=pointer]:
                    - generic [ref=e123]:
                      - img [ref=e124]
                      - text: Security & PIN
                  - button "Menu Access" [ref=e126] [cursor=pointer]:
                    - generic [ref=e127]:
                      - img [ref=e128]
                      - text: Menu Access
          - generic [ref=e130]:
            - generic [ref=e131]:
              - generic [ref=e132]:
                - heading "Banks & Wallets" [level=2] [ref=e133]
                - paragraph [ref=e134]: Manage the global list of banks and wallets available across the app.
              - button "Add Record" [ref=e135] [cursor=pointer]:
                - img
                - text: Add Record
            - generic [ref=e137]:
              - img [ref=e138]
              - heading "No Banks Configured" [level=3] [ref=e140]
              - paragraph [ref=e141]: You need to register at least one institution (like a bank or wallet) before you can add accounts in the app.
              - button "Auto-Seed Defaults" [ref=e142] [cursor=pointer]
```

# Test source

```ts
  1  | import { test as userTest, expect } from './fixtures/auth.js';
  2  | import { adminTest } from './fixtures/auth.js';
  3  | 
  4  | userTest.describe('Admin routes — non-admin user', () => {
  5  |   userTest('is redirected away from /users', async ({ page }) => {
  6  |     await page.goto('/users');
  7  |     // AdminRoute redirects non-admins back to dashboard
  8  |     await expect(page).not.toHaveURL(/\/users/);
  9  |   });
  10 | 
  11 |   userTest('sidebar does not show Users link', async ({ page }) => {
  12 |     await page.goto('/');
  13 |     await expect(page.locator('a[href="/users"]')).toHaveCount(0);
  14 |   });
  15 | });
  16 | 
  17 | adminTest.describe('Admin routes — admin user', () => {
  18 |   adminTest('can access /users page', async ({ page }) => {
  19 |     await page.goto('/users');
  20 |     await expect(page).toHaveURL(/\/users/);
  21 |     await expect(page.getByRole('heading', { name: /users management/i })).toBeVisible({ timeout: 15_000 });
  22 |   });
  23 | 
  24 |   adminTest('Settings page shows Users & Roles section', async ({ page }) => {
  25 |     await page.goto('/settings');
> 26 |     await expect(page.getByRole('heading', { name: /users & roles/i })).toBeVisible({ timeout: 15_000 });
     |                                                                         ^ Error: expect(locator).toBeVisible() failed
  27 |   });
  28 | 
  29 |   adminTest('users table has Name, Email and Role columns', async ({ page }) => {
  30 |     await page.goto('/users');
  31 |     // Wait for table to render
  32 |     await expect(page.locator('thead')).toBeVisible({ timeout: 15_000 });
  33 |     await expect(page.locator('th').filter({ hasText: 'Name' })).toBeVisible();
  34 |     await expect(page.locator('th').filter({ hasText: 'Email' })).toBeVisible();
  35 |     await expect(page.locator('th').filter({ hasText: 'Role' })).toBeVisible();
  36 |   });
  37 | 
  38 |   adminTest('Add User button opens modal', async ({ page }) => {
  39 |     await page.goto('/users');
  40 |     await expect(page.getByRole('button', { name: /add user/i })).toBeVisible({ timeout: 15_000 });
  41 |     await page.getByRole('button', { name: /add user/i }).click();
  42 |     await expect(page.getByRole('dialog')).toBeVisible();
  43 |     await expect(page.getByText(/add new user/i)).toBeVisible();
  44 |   });
  45 | 
  46 |   adminTest('cancel closes Add User modal', async ({ page }) => {
  47 |     await page.goto('/users');
  48 |     await expect(page.getByRole('button', { name: /add user/i })).toBeVisible({ timeout: 15_000 });
  49 |     await page.getByRole('button', { name: /add user/i }).click();
  50 |     await page.getByRole('dialog').getByRole('button', { name: /cancel/i }).click();
  51 |     await expect(page.getByRole('dialog')).not.toBeVisible();
  52 |   });
  53 | });
  54 | 
```