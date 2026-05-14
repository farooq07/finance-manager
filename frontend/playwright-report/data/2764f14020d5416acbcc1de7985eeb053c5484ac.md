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
        - link "Dues Ledger" [ref=e32] [cursor=pointer]:
          - /url: /dues
          - img [ref=e33]
          - generic [ref=e38]: Dues Ledger
        - link "Beneficiaries" [ref=e39] [cursor=pointer]:
          - /url: /beneficiaries
          - img [ref=e40]
          - generic [ref=e44]: Beneficiaries
        - link "Rent Tracker" [ref=e45] [cursor=pointer]:
          - /url: /rents
          - img [ref=e46]
          - generic [ref=e49]: Rent Tracker
        - link "Zakat" [ref=e50] [cursor=pointer]:
          - /url: /zakat
          - img [ref=e51]
          - generic [ref=e53]: Zakat
        - link "Physical Assets" [ref=e54] [cursor=pointer]:
          - /url: /assets
          - img [ref=e55]
          - generic [ref=e58]: Physical Assets
        - link "AI Assistant" [ref=e59] [cursor=pointer]:
          - /url: /assistant
          - img [ref=e60]
          - generic [ref=e62]: AI Assistant
        - link "Reports" [ref=e63] [cursor=pointer]:
          - /url: /reports
          - img [ref=e64]
          - generic [ref=e67]: Reports
        - link "Settings" [ref=e68] [cursor=pointer]:
          - /url: /settings
          - img [ref=e69]
          - generic [ref=e72]: Settings
        - link "Design System" [ref=e73] [cursor=pointer]:
          - /url: /design-system
          - img [ref=e74]
          - generic [ref=e78]: Design System
      - button [ref=e79] [cursor=pointer]:
        - img
    - generic [ref=e80]:
      - banner [ref=e81]:
        - heading "Expenses" [level=1] [ref=e82]
        - generic [ref=e83]:
          - button "Toggle Theme" [ref=e84] [cursor=pointer]:
            - img [ref=e85]
          - generic [ref=e87]:
            - generic [ref=e89]: F
            - generic [ref=e90]: farooq
          - button "Logout" [ref=e91] [cursor=pointer]:
            - img [ref=e92]
      - main [ref=e95]:
        - generic [ref=e96]:
          - generic [ref=e97]:
            - heading "Expenses" [level=1] [ref=e98]
            - generic [ref=e99]:
              - generic [ref=e100]:
                - button "Previous Month" [ref=e101] [cursor=pointer]:
                  - img
                - generic [ref=e102]:
                  - img [ref=e103]
                  - textbox [ref=e105]: 2026-05
                - button "Next Month" [ref=e106] [cursor=pointer]:
                  - img
              - button "Log Monthly Bills" [active] [ref=e107] [cursor=pointer]:
                - img
                - text: Log Monthly Bills
              - button "Single Expense" [ref=e108] [cursor=pointer]:
                - img
                - text: Single Expense
          - generic [ref=e109]:
            - img [ref=e111]
            - generic [ref=e114]:
              - paragraph [ref=e115]: Total Expenses for 2026-05
              - generic [ref=e116]:
                - generic [ref=e117]: ••••••
                - button "Click to unlock with PIN" [ref=e118] [cursor=pointer]:
                  - img [ref=e119]
          - generic [ref=e123]:
            - generic [ref=e124]:
              - generic [ref=e125]:
                - heading "Monthly Bill Run" [level=2] [ref=e126]:
                  - img [ref=e127]
                  - text: Monthly Bill Run
                - paragraph [ref=e130]: Review standard tracking lines. Enter values for bills to process; blank fields are skipped.
              - button [ref=e131] [cursor=pointer]:
                - img
            - generic [ref=e132]:
              - generic [ref=e133]:
                - generic [ref=e134]:
                  - generic [ref=e135]: Bill / Category
                  - generic [ref=e136]: Amount (PKR)
                  - generic [ref=e137]: Date
                  - generic [ref=e138]: Paid Via
                  - generic [ref=e139]: Ref / Notes
                  - generic [ref=e140]: Delete
                - generic [ref=e141]:
                  - textbox "Custom Type" [ref=e145]: Gas Bill
                  - spinbutton [ref=e149]
                  - button "14/05/2026" [ref=e151] [cursor=pointer]:
                    - text: 14/05/2026
                    - img
                  - combobox [ref=e153]:
                    - option "Select Method" [selected]
                    - option "Cash"
                  - textbox "Optional notes" [ref=e157]
                  - button "Remove Row" [ref=e159] [cursor=pointer]:
                    - img
                - generic [ref=e160]:
                  - textbox "Custom Type" [ref=e164]: Gardner Bill
                  - spinbutton [ref=e168]
                  - button "14/05/2026" [ref=e170] [cursor=pointer]:
                    - text: 14/05/2026
                    - img
                  - combobox [ref=e172]:
                    - option "Select Method" [selected]
                    - option "Cash"
                  - textbox "Optional notes" [ref=e176]
                  - button "Remove Row" [ref=e178] [cursor=pointer]:
                    - img
                - generic [ref=e179]:
                  - textbox "Custom Type" [ref=e183]: Electricity Bill
                  - spinbutton [ref=e187]
                  - button "14/05/2026" [ref=e189] [cursor=pointer]:
                    - text: 14/05/2026
                    - img
                  - combobox [ref=e191]:
                    - option "Select Method" [selected]
                    - option "Cash"
                  - textbox "Optional notes" [ref=e195]
                  - button "Remove Row" [ref=e197] [cursor=pointer]:
                    - img
                - generic [ref=e198]:
                  - textbox "Custom Type" [ref=e202]: School
                  - spinbutton [ref=e206]
                  - button "14/05/2026" [ref=e208] [cursor=pointer]:
                    - text: 14/05/2026
                    - img
                  - combobox [ref=e210]:
                    - option "Select Method" [selected]
                    - option "Cash"
                  - textbox "Optional notes" [ref=e214]
                  - button "Remove Row" [ref=e216] [cursor=pointer]:
                    - img
                - generic [ref=e217]:
                  - textbox "Custom Type" [ref=e221]: Water Bill
                  - spinbutton [ref=e225]
                  - button "14/05/2026" [ref=e227] [cursor=pointer]:
                    - text: 14/05/2026
                    - img
                  - combobox [ref=e229]:
                    - option "Select Method" [selected]
                    - option "Cash"
                  - textbox "Optional notes" [ref=e233]
                  - button "Remove Row" [ref=e235] [cursor=pointer]:
                    - img
                - generic [ref=e236]:
                  - textbox "Custom Type" [ref=e240]: Mobile Bill
                  - spinbutton [ref=e244]
                  - button "14/05/2026" [ref=e246] [cursor=pointer]:
                    - text: 14/05/2026
                    - img
                  - combobox [ref=e248]:
                    - option "Select Method" [selected]
                    - option "Cash"
                  - textbox "Optional notes" [ref=e252]
                  - button "Remove Row" [ref=e254] [cursor=pointer]:
                    - img
                - generic [ref=e255]:
                  - textbox "Custom Type" [ref=e259]: Internet Bill
                  - spinbutton [ref=e263]
                  - button "14/05/2026" [ref=e265] [cursor=pointer]:
                    - text: 14/05/2026
                    - img
                  - combobox [ref=e267]:
                    - option "Select Method" [selected]
                    - option "Cash"
                  - textbox "Optional notes" [ref=e271]
                  - button "Remove Row" [ref=e273] [cursor=pointer]:
                    - img
              - button "Custom Blank Row" [ref=e274] [cursor=pointer]:
                - img
                - text: Custom Blank Row
            - generic [ref=e275]:
              - generic [ref=e276]:
                - text: "Total Rows Detected:"
                - generic [ref=e277]: 0 valid entries
              - generic [ref=e278]:
                - button "Discard Session" [ref=e279] [cursor=pointer]
                - button "Commit Batch to Ledger" [ref=e280] [cursor=pointer]
          - table [ref=e282]:
            - rowgroup [ref=e283]:
              - row "Date Category Amount Method Notes Actions" [ref=e284]:
                - columnheader "Date" [ref=e285]
                - columnheader "Category" [ref=e286]
                - columnheader "Amount" [ref=e287]
                - columnheader "Method" [ref=e288]
                - columnheader "Notes" [ref=e289]
                - columnheader "Actions" [ref=e290]
            - rowgroup [ref=e291]:
              - row "No expenses recorded You have no tracking data for 2026-05." [ref=e292]:
                - cell "No expenses recorded You have no tracking data for 2026-05." [ref=e293]:
                  - paragraph [ref=e294]: No expenses recorded
                  - paragraph [ref=e295]: You have no tracking data for 2026-05.
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