# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: expenses.spec.js >> Expenses page >> shows Expenses heading
- Location: e2e\expenses.spec.js:10:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: /expenses/i })
Expected: visible
Error: strict mode violation: getByRole('heading', { name: /expenses/i }) resolved to 2 elements:
    1) <h1 class="text-[15px] font-semibold text-gray-900 dark:text-gray-100 tracking-tight transition-colors">Expenses</h1> aka getByRole('banner').getByRole('heading', { name: 'Expenses' })
    2) <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 transition-colors">Expenses</h1> aka getByRole('main').getByRole('heading', { name: 'Expenses' })

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByRole('heading', { name: /expenses/i })

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
        - heading "Expenses" [level=1] [ref=e12]
        - generic [ref=e13]:
          - button "Toggle Theme" [ref=e14] [cursor=pointer]:
            - img [ref=e15]
          - generic [ref=e17]:
            - generic [ref=e19]: F
            - generic [ref=e20]: farooq
          - button "Logout" [ref=e21] [cursor=pointer]:
            - img [ref=e22]
      - main [ref=e25]:
        - generic [ref=e26]:
          - generic [ref=e27]:
            - heading "Expenses" [level=1] [ref=e28]
            - generic [ref=e29]:
              - generic [ref=e30]:
                - button "Previous Month" [ref=e31] [cursor=pointer]:
                  - img
                - generic [ref=e32]:
                  - img [ref=e33]
                  - textbox [ref=e35]: 2026-05
                - button "Next Month" [ref=e36] [cursor=pointer]:
                  - img
              - button "Log Monthly Bills" [ref=e37] [cursor=pointer]:
                - img
                - text: Log Monthly Bills
              - button "Single Expense" [ref=e38] [cursor=pointer]:
                - img
                - text: Single Expense
          - generic [ref=e39]:
            - img [ref=e41]
            - generic [ref=e44]:
              - paragraph [ref=e45]: Total Expenses for 2026-05
              - generic [ref=e46]:
                - generic [ref=e47]: ••••••
                - button "Click to unlock with PIN" [ref=e48] [cursor=pointer]:
                  - img [ref=e49]
          - table [ref=e53]:
            - rowgroup [ref=e54]:
              - row "Date Category Amount Method Notes Actions" [ref=e55]:
                - columnheader "Date" [ref=e56]
                - columnheader "Category" [ref=e57]
                - columnheader "Amount" [ref=e58]
                - columnheader "Method" [ref=e59]
                - columnheader "Notes" [ref=e60]
                - columnheader "Actions" [ref=e61]
            - rowgroup [ref=e62]:
              - row "No expenses recorded You have no tracking data for 2026-05." [ref=e63]:
                - cell "No expenses recorded You have no tracking data for 2026-05." [ref=e64]:
                  - paragraph [ref=e65]: No expenses recorded
                  - paragraph [ref=e66]: You have no tracking data for 2026-05.
```

# Test source

```ts
  1  | import { test, expect } from './fixtures/auth.js';
  2  | 
  3  | test.describe('Expenses page', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     await page.goto('/expenses');
  6  |     // Wait until the page finishes loading (buttons are visible)
  7  |     await expect(page.getByRole('button', { name: /single expense/i })).toBeVisible({ timeout: 15_000 });
  8  |   });
  9  | 
  10 |   test('shows Expenses heading', async ({ page }) => {
> 11 |     await expect(page.getByRole('heading', { name: /expenses/i })).toBeVisible();
     |                                                                    ^ Error: expect(locator).toBeVisible() failed
  12 |   });
  13 | 
  14 |   test('shows Single Expense and Log Monthly Bills buttons', async ({ page }) => {
  15 |     await expect(page.getByRole('button', { name: /log monthly bills/i })).toBeVisible();
  16 |   });
  17 | 
  18 |   test('opens add expense modal', async ({ page }) => {
  19 |     await page.getByRole('button', { name: /single expense/i }).click();
  20 |     await expect(page.getByRole('dialog')).toBeVisible();
  21 |     await expect(page.locator('#exp-amount')).toBeVisible();
  22 |     await expect(page.locator('#exp-category')).toBeVisible();
  23 |   });
  24 | 
  25 |   test('cancel closes the modal', async ({ page }) => {
  26 |     await page.getByRole('button', { name: /single expense/i }).click();
  27 |     await page.getByRole('dialog').getByRole('button', { name: /cancel/i }).click();
  28 |     await expect(page.getByRole('dialog')).not.toBeVisible();
  29 |   });
  30 | 
  31 |   test('adds a new expense', async ({ page }) => {
  32 |     await page.getByRole('button', { name: /single expense/i }).click();
  33 |     await page.locator('#exp-amount').fill('500');
  34 |     await page.locator('#exp-category').fill('Food & Dining');
  35 |     await page.getByRole('dialog').getByRole('button', { name: /save expense/i }).click();
  36 |     await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 15_000 });
  37 |   });
  38 | 
  39 |   test('opens monthly bills modal', async ({ page }) => {
  40 |     await page.getByRole('button', { name: /log monthly bills/i }).click();
  41 |     await expect(page.getByRole('dialog')).toBeVisible();
  42 |     await expect(page.getByText(/monthly bill run/i)).toBeVisible();
  43 |   });
  44 | });
  45 | 
```