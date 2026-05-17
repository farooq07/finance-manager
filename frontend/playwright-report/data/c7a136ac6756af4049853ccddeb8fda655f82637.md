# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: expenses.spec.js >> Expenses page >> opens monthly bills modal
- Location: e2e\expenses.spec.js:39:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('dialog')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByRole('dialog')

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
        - link "Beneficiaries" [ref=e32] [cursor=pointer]:
          - /url: /beneficiaries
          - img [ref=e33]
          - generic [ref=e37]: Beneficiaries
        - link "Rent Tracker" [ref=e38] [cursor=pointer]:
          - /url: /rents
          - img [ref=e39]
          - generic [ref=e42]: Rent Tracker
        - link "Zakat" [ref=e43] [cursor=pointer]:
          - /url: /zakat
          - img [ref=e44]
          - generic [ref=e46]: Zakat
        - link "Physical Assets" [ref=e47] [cursor=pointer]:
          - /url: /assets
          - img [ref=e48]
          - generic [ref=e51]: Physical Assets
        - link "AI Assistant" [ref=e52] [cursor=pointer]:
          - /url: /assistant
          - img [ref=e53]
          - generic [ref=e55]: AI Assistant
        - link "Reports" [ref=e56] [cursor=pointer]:
          - /url: /reports
          - img [ref=e57]
          - generic [ref=e60]: Reports
        - link "Settings" [ref=e61] [cursor=pointer]:
          - /url: /settings
          - img [ref=e62]
          - generic [ref=e65]: Settings
      - button [ref=e66] [cursor=pointer]:
        - img
    - generic [ref=e67]:
      - banner [ref=e68]:
        - heading "Expenses" [level=1] [ref=e69]
        - generic [ref=e70]:
          - button "Toggle Theme" [ref=e71] [cursor=pointer]:
            - img [ref=e72]
          - generic [ref=e74]:
            - generic [ref=e76]: F
            - generic [ref=e77]: farooq
          - button "Logout" [ref=e78] [cursor=pointer]:
            - img [ref=e79]
      - main [ref=e82]:
        - generic [ref=e83]:
          - generic [ref=e84]:
            - heading "Expenses" [level=1] [ref=e85]
            - generic [ref=e86]:
              - generic [ref=e87]:
                - button "Previous Month" [ref=e88] [cursor=pointer]:
                  - img
                - generic [ref=e89]:
                  - img [ref=e90]
                  - textbox [ref=e92]: 2026-05
                - button "Next Month" [ref=e93] [cursor=pointer]:
                  - img
              - button "Log Monthly Bills" [active] [ref=e94] [cursor=pointer]:
                - img
                - text: Log Monthly Bills
              - button "Single Expense" [ref=e95] [cursor=pointer]:
                - img
                - text: Single Expense
          - generic [ref=e96]:
            - img [ref=e98]
            - generic [ref=e101]:
              - paragraph [ref=e102]: Total Expenses for 2026-05
              - generic [ref=e103]:
                - generic [ref=e104]: ••••••
                - button "Click to unlock with PIN" [ref=e105] [cursor=pointer]:
                  - img [ref=e106]
          - generic [ref=e110]:
            - generic [ref=e111]:
              - generic [ref=e112]:
                - heading "Monthly Bill Run" [level=2] [ref=e113]:
                  - img [ref=e114]
                  - text: Monthly Bill Run
                - paragraph [ref=e117]: Review standard tracking lines. Enter values for bills to process; blank fields are skipped.
              - button [ref=e118] [cursor=pointer]:
                - img
            - generic [ref=e119]:
              - generic [ref=e120]:
                - generic [ref=e121]:
                  - generic [ref=e122]: Bill / Category
                  - generic [ref=e123]: Amount (PKR)
                  - generic [ref=e124]: Date
                  - generic [ref=e125]: Paid Via
                  - generic [ref=e126]: Ref / Notes
                  - generic [ref=e127]: Delete
                - generic [ref=e128]:
                  - textbox "Custom Type" [ref=e132]: Gas Bill
                  - spinbutton [ref=e136]
                  - button "15/05/2026" [ref=e138] [cursor=pointer]:
                    - text: 15/05/2026
                    - img
                  - combobox [ref=e140]:
                    - option "Select Method" [selected]
                    - option "Cash"
                  - textbox "Optional notes" [ref=e144]
                  - button "Remove Row" [ref=e146] [cursor=pointer]:
                    - img
                - generic [ref=e147]:
                  - textbox "Custom Type" [ref=e151]: Gardner Bill
                  - spinbutton [ref=e155]
                  - button "15/05/2026" [ref=e157] [cursor=pointer]:
                    - text: 15/05/2026
                    - img
                  - combobox [ref=e159]:
                    - option "Select Method" [selected]
                    - option "Cash"
                  - textbox "Optional notes" [ref=e163]
                  - button "Remove Row" [ref=e165] [cursor=pointer]:
                    - img
                - generic [ref=e166]:
                  - textbox "Custom Type" [ref=e170]: Electricity Bill
                  - spinbutton [ref=e174]
                  - button "15/05/2026" [ref=e176] [cursor=pointer]:
                    - text: 15/05/2026
                    - img
                  - combobox [ref=e178]:
                    - option "Select Method" [selected]
                    - option "Cash"
                  - textbox "Optional notes" [ref=e182]
                  - button "Remove Row" [ref=e184] [cursor=pointer]:
                    - img
                - generic [ref=e185]:
                  - textbox "Custom Type" [ref=e189]: School
                  - spinbutton [ref=e193]
                  - button "15/05/2026" [ref=e195] [cursor=pointer]:
                    - text: 15/05/2026
                    - img
                  - combobox [ref=e197]:
                    - option "Select Method" [selected]
                    - option "Cash"
                  - textbox "Optional notes" [ref=e201]
                  - button "Remove Row" [ref=e203] [cursor=pointer]:
                    - img
                - generic [ref=e204]:
                  - textbox "Custom Type" [ref=e208]: Water Bill
                  - spinbutton [ref=e212]
                  - button "15/05/2026" [ref=e214] [cursor=pointer]:
                    - text: 15/05/2026
                    - img
                  - combobox [ref=e216]:
                    - option "Select Method" [selected]
                    - option "Cash"
                  - textbox "Optional notes" [ref=e220]
                  - button "Remove Row" [ref=e222] [cursor=pointer]:
                    - img
                - generic [ref=e223]:
                  - textbox "Custom Type" [ref=e227]: Mobile Bill
                  - spinbutton [ref=e231]
                  - button "15/05/2026" [ref=e233] [cursor=pointer]:
                    - text: 15/05/2026
                    - img
                  - combobox [ref=e235]:
                    - option "Select Method" [selected]
                    - option "Cash"
                  - textbox "Optional notes" [ref=e239]
                  - button "Remove Row" [ref=e241] [cursor=pointer]:
                    - img
                - generic [ref=e242]:
                  - textbox "Custom Type" [ref=e246]: Internet Bill
                  - spinbutton [ref=e250]
                  - button "15/05/2026" [ref=e252] [cursor=pointer]:
                    - text: 15/05/2026
                    - img
                  - combobox [ref=e254]:
                    - option "Select Method" [selected]
                    - option "Cash"
                  - textbox "Optional notes" [ref=e258]
                  - button "Remove Row" [ref=e260] [cursor=pointer]:
                    - img
              - button "Custom Blank Row" [ref=e261] [cursor=pointer]:
                - img
                - text: Custom Blank Row
            - generic [ref=e262]:
              - generic [ref=e263]:
                - text: "Total Rows Detected:"
                - generic [ref=e264]: 0 valid entries
              - generic [ref=e265]:
                - button "Discard Session" [ref=e266] [cursor=pointer]
                - button "Commit Batch to Ledger" [ref=e267] [cursor=pointer]
          - table [ref=e269]:
            - rowgroup [ref=e270]:
              - row "Date Category Amount Method Notes Actions" [ref=e271]:
                - columnheader "Date" [ref=e272]
                - columnheader "Category" [ref=e273]
                - columnheader "Amount" [ref=e274]
                - columnheader "Method" [ref=e275]
                - columnheader "Notes" [ref=e276]
                - columnheader "Actions" [ref=e277]
            - rowgroup [ref=e278]:
              - row "No expenses recorded You have no tracking data for 2026-05." [ref=e279]:
                - cell "No expenses recorded You have no tracking data for 2026-05." [ref=e280]:
                  - paragraph [ref=e281]: No expenses recorded
                  - paragraph [ref=e282]: You have no tracking data for 2026-05.
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
  11 |     await expect(page.getByRole('heading', { name: /expenses/i })).toBeVisible();
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
> 41 |     await expect(page.getByRole('dialog')).toBeVisible();
     |                                            ^ Error: expect(locator).toBeVisible() failed
  42 |     await expect(page.getByText(/monthly bill run/i)).toBeVisible();
  43 |   });
  44 | });
  45 | 
```