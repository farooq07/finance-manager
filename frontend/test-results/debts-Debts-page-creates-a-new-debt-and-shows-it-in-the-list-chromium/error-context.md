# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: debts.spec.js >> Debts page >> creates a new debt and shows it in the list
- Location: e2e\debts.spec.js:37:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: /^debts$/i }).first()
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByRole('heading', { name: /^debts$/i }).first()

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications alt+T"
  - generic [ref=e3]:
    - complementary [ref=e4]:
      - generic [ref=e5]:
        - img "FSWealth Axis" [ref=e6]
        - heading "FSWealth Axis" [level=1] [ref=e7]
      - navigation [ref=e8]:
        - generic [ref=e9]:
          - paragraph [ref=e10]: Overview
          - generic [ref=e11]:
            - link "Dashboard" [ref=e12] [cursor=pointer]:
              - /url: /
              - img [ref=e14]
              - generic [ref=e17]: Dashboard
            - link "Reports" [ref=e18] [cursor=pointer]:
              - /url: /reports
              - img [ref=e20]
              - generic [ref=e23]: Reports
        - generic [ref=e24]:
          - paragraph [ref=e25]: Money
          - generic [ref=e26]:
            - link "Accounts" [ref=e27] [cursor=pointer]:
              - /url: /accounts
              - img [ref=e29]
              - generic [ref=e32]: Accounts
            - link "Expenses" [ref=e33] [cursor=pointer]:
              - /url: /expenses
              - img [ref=e35]
              - generic [ref=e38]: Expenses
            - link "Ledger" [ref=e39] [cursor=pointer]:
              - /url: /ledger
              - img [ref=e41]
              - generic [ref=e45]: Ledger
        - generic [ref=e46]:
          - paragraph [ref=e47]: Investments
          - generic [ref=e48]:
            - link "Mutual Funds" [ref=e49] [cursor=pointer]:
              - /url: /mutual-funds
              - img [ref=e51]
              - generic [ref=e54]: Mutual Funds
            - link "Stocks" [ref=e55] [cursor=pointer]:
              - /url: /stocks
              - img [ref=e57]
              - generic [ref=e58]: Stocks
        - generic [ref=e59]:
          - paragraph [ref=e60]: Personal
          - link "Personal" [ref=e62] [cursor=pointer]:
            - /url: /personal
            - img [ref=e64]
            - generic [ref=e67]: Personal
        - generic [ref=e68]:
          - paragraph [ref=e69]: Tools
          - generic [ref=e70]:
            - link "Settings" [ref=e71] [cursor=pointer]:
              - /url: /settings
              - img [ref=e73]
              - generic [ref=e76]: Settings
            - link "Help & Feedback" [ref=e77] [cursor=pointer]:
              - /url: /help
              - img [ref=e79]
              - generic [ref=e86]: Help & Feedback
      - generic [ref=e87]:
        - generic [ref=e88]: v1
        - button "Collapse sidebar" [ref=e89] [cursor=pointer]:
          - img [ref=e90]
    - generic [ref=e92]:
      - banner [ref=e93]:
        - heading "Ledger" [level=1] [ref=e95]
        - generic [ref=e96]:
          - link "AI Assistant" [ref=e97] [cursor=pointer]:
            - /url: /assistant
            - img [ref=e98]
          - button "F farooq" [ref=e102] [cursor=pointer]:
            - generic [ref=e104]: F
            - generic [ref=e105]: farooq
            - img [ref=e106]
      - main [ref=e108]:
        - generic [ref=e109]:
          - generic [ref=e110]:
            - generic [ref=e111]:
              - heading "Ledger" [level=1] [ref=e112]
              - paragraph [ref=e113]: Money you owe and money owed to you — people and lenders, in one place.
            - button "Add" [ref=e115] [cursor=pointer]:
              - img [ref=e116]
              - text: Add
              - img [ref=e117]
          - generic [ref=e119]:
            - generic [ref=e120]:
              - generic [ref=e121]:
                - generic [ref=e122]: Receivable
                - img [ref=e124]
              - paragraph [ref=e127]: +PKR 0
              - paragraph [ref=e128]: From 0 people
            - generic [ref=e129]:
              - generic [ref=e130]:
                - generic [ref=e131]: Payable
                - img [ref=e133]
              - paragraph [ref=e136]: −PKR 0
              - paragraph [ref=e137]: Nothing owed
            - generic [ref=e138]:
              - generic [ref=e139]:
                - generic [ref=e140]: Net
                - img [ref=e142]
              - paragraph [ref=e146]: +PKR 0
              - paragraph [ref=e147]: You're net positive
          - generic [ref=e148]:
            - button "All" [ref=e149] [cursor=pointer]
            - button "People" [ref=e150] [cursor=pointer]
            - button "Loans & Cards" [ref=e151] [cursor=pointer]
          - generic [ref=e152]:
            - img [ref=e154]
            - heading "No loans or cards tracked" [level=3] [ref=e156]
            - paragraph [ref=e157]: Track credit cards, car loans, mortgages — anything with a payoff schedule. Outstanding balances are subtracted from your net worth automatically.
            - button "Add a loan" [ref=e158] [cursor=pointer]:
              - img [ref=e159]
              - text: Add a loan
```

# Test source

```ts
  1  | import { test, expect } from './fixtures/auth.js';
  2  | 
  3  | test.describe('Debts page', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     await page.goto('/debts');
  6  |     await expect(page.getByRole('heading', { name: /^debts$/i }).first())
> 7  |       .toBeVisible({ timeout: 15_000 });
     |        ^ Error: expect(locator).toBeVisible() failed
  8  |     await expect(page.getByRole('button', { name: /add a debt/i }).first())
  9  |       .toBeVisible({ timeout: 15_000 });
  10 |   });
  11 | 
  12 |   test('shows heading and subtitle', async ({ page }) => {
  13 |     await expect(page.getByText(/credit cards, loans, and other institutional debts/i)).toBeVisible();
  14 |   });
  15 | 
  16 |   test('shows summary cards', async ({ page }) => {
  17 |     await expect(page.getByText(/total outstanding/i)).toBeVisible();
  18 |     await expect(page.getByText(/repaid so far/i)).toBeVisible();
  19 |     await expect(page.getByText(/minimum monthly/i)).toBeVisible();
  20 |   });
  21 | 
  22 |   test('opens the Add a debt modal', async ({ page }) => {
  23 |     await page.getByRole('button', { name: /add a debt/i }).first().click();
  24 |     // Form fields appear
  25 |     await expect(page.getByPlaceholder(/hbl credit card, car loan/i)).toBeVisible();
  26 |     await expect(page.getByText(/original principal/i)).toBeVisible();
  27 |     await expect(page.getByRole('button', { name: /^cancel$/i })).toBeVisible();
  28 |   });
  29 | 
  30 |   test('cancel closes the modal', async ({ page }) => {
  31 |     await page.getByRole('button', { name: /add a debt/i }).first().click();
  32 |     await expect(page.getByRole('button', { name: /^cancel$/i })).toBeVisible();
  33 |     await page.getByRole('button', { name: /^cancel$/i }).click();
  34 |     await expect(page.getByRole('button', { name: /^cancel$/i })).not.toBeVisible();
  35 |   });
  36 | 
  37 |   test('creates a new debt and shows it in the list', async ({ page }) => {
  38 |     await page.getByRole('button', { name: /add a debt/i }).first().click();
  39 | 
  40 |     const debtName = `Test Debt ${Date.now()}`;
  41 |     await page.getByPlaceholder(/hbl credit card, car loan/i).fill(debtName);
  42 | 
  43 |     // Original principal is the first number input
  44 |     const principal = page.locator('form input[type="number"]').first();
  45 |     await principal.fill('100000');
  46 | 
  47 |     const post = page.waitForResponse(
  48 |       (r) => r.url().endsWith('/debts') && r.request().method() === 'POST',
  49 |       { timeout: 15_000 },
  50 |     );
  51 |     await page.getByRole('button', { name: /^add debt$/i }).click();
  52 |     await post;
  53 | 
  54 |     await expect(page.getByText(debtName).first()).toBeVisible({ timeout: 15_000 });
  55 |   });
  56 | });
  57 | 
```