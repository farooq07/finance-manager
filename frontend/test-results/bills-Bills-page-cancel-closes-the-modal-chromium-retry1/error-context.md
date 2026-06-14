# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: bills.spec.js >> Bills page >> cancel closes the modal
- Location: e2e\bills.spec.js:32:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: /bills & subscriptions/i }).first()
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByRole('heading', { name: /bills & subscriptions/i }).first()

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
        - heading "Spending" [level=1] [ref=e95]
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
              - paragraph [ref=e112]: Money out
              - heading "Spending" [level=1] [ref=e113]
              - paragraph [ref=e114]: Aggregated analytics across your bank statements, wallet transactions, and manual entries — and a journal for the things you log by hand.
            - generic [ref=e115]:
              - generic [ref=e117]:
                - button "Previous" [ref=e118] [cursor=pointer]:
                  - img [ref=e119]
                - generic [ref=e121]: June 2026
                - button "Next" [disabled] [ref=e122]:
                  - img [ref=e123]
              - generic [ref=e126]:
                - button "month" [ref=e127] [cursor=pointer]
                - button "quarter" [ref=e128] [cursor=pointer]
                - button "year" [ref=e129] [cursor=pointer]
              - button "Log bills" [ref=e131] [cursor=pointer]:
                - img [ref=e132]
                - text: Log bills
              - button "Add entry" [ref=e135] [cursor=pointer]:
                - img [ref=e136]
                - text: Add entry
          - generic [ref=e137]:
            - generic [ref=e138]:
              - generic [ref=e141]:
                - generic [ref=e142]:
                  - img [ref=e143]
                  - paragraph [ref=e146]: Spent
                - paragraph [ref=e147]: PKR 0
                - generic [ref=e148]:
                  - generic [ref=e149]: this month
                  - generic [ref=e150]: "-100.0%"
                  - generic [ref=e151]: vs last month
              - generic [ref=e152]:
                - generic [ref=e153]:
                  - img [ref=e154]
                  - paragraph [ref=e157]: Earned
                - paragraph [ref=e158]: PKR 0
                - generic [ref=e160]: this month
              - generic [ref=e161]:
                - generic [ref=e162]:
                  - img [ref=e163]
                  - paragraph [ref=e165]: Net
                - paragraph [ref=e166]: PKR 0
                - generic [ref=e168]: this month
            - generic [ref=e170]: The story
            - generic [ref=e172]:
              - generic [ref=e173]:
                - generic [ref=e175]:
                  - heading "Day by day" [level=3] [ref=e176]
                  - paragraph [ref=e177]: No spending in this period
                - generic [ref=e179]: No data
              - generic [ref=e180]:
                - generic [ref=e182]:
                  - heading "By category" [level=3] [ref=e183]
                  - paragraph [ref=e184]: No spending in this period
                - generic [ref=e186]: No data
            - generic [ref=e187]:
              - generic [ref=e188]:
                - generic [ref=e190]:
                  - heading "Top destinations" [level=3] [ref=e191]
                  - paragraph [ref=e192]: No data
                - generic [ref=e194]: No data
              - generic [ref=e195]:
                - generic [ref=e197]:
                  - heading "Weekday rhythm" [level=3] [ref=e198]
                  - paragraph [ref=e199]: No data
                - generic [ref=e201]: No data
          - generic [ref=e202]:
            - generic [ref=e204]: All Transactions
            - generic [ref=e207]:
              - heading "Transactions" [level=2] [ref=e208]
              - paragraph [ref=e209]: No entries logged for June 2026.
```

# Test source

```ts
  1  | import { test, expect } from './fixtures/auth.js';
  2  | 
  3  | test.describe('Bills page', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     await page.goto('/bills');
  6  |     await expect(page.getByRole('heading', { name: /bills & subscriptions/i }).first())
> 7  |       .toBeVisible({ timeout: 15_000 });
     |        ^ Error: expect(locator).toBeVisible() failed
  8  |     // Wait until either the empty state or the table is rendered.
  9  |     await expect(page.getByRole('button', { name: /add a bill/i }).first())
  10 |       .toBeVisible({ timeout: 15_000 });
  11 |   });
  12 | 
  13 |   test('shows the heading and Add a bill button', async ({ page }) => {
  14 |     await expect(page.getByText(/recurring payments tracked/i)).toBeVisible();
  15 |   });
  16 | 
  17 |   test('shows the three summary stat cards', async ({ page }) => {
  18 |     await expect(page.getByText(/estimated monthly outgoings/i)).toBeVisible();
  19 |     await expect(page.getByText(/due in next 7 days/i)).toBeVisible();
  20 |     await expect(page.getByText(/^overdue$/i).first()).toBeVisible();
  21 |   });
  22 | 
  23 |   test('opens the Add a bill modal', async ({ page }) => {
  24 |     // The page header has its own "Add a bill" — modal title is "Add a bill" too.
  25 |     // Use .first() on the header button.
  26 |     await page.getByRole('button', { name: /add a bill/i }).first().click();
  27 |     // Modal title (h2 inside the overlay div) — confirm by waiting on the Name field.
  28 |     await expect(page.getByText(/^name$/i).first()).toBeVisible();
  29 |     await expect(page.getByRole('button', { name: /^cancel$/i })).toBeVisible();
  30 |   });
  31 | 
  32 |   test('cancel closes the modal', async ({ page }) => {
  33 |     await page.getByRole('button', { name: /add a bill/i }).first().click();
  34 |     await expect(page.getByRole('button', { name: /^cancel$/i })).toBeVisible();
  35 |     await page.getByRole('button', { name: /^cancel$/i }).click();
  36 |     await expect(page.getByRole('button', { name: /^cancel$/i })).not.toBeVisible();
  37 |   });
  38 | 
  39 |   test('creates a new bill and shows it in the list', async ({ page }) => {
  40 |     await page.getByRole('button', { name: /add a bill/i }).first().click();
  41 | 
  42 |     const billName = `Test Bill ${Date.now()}`;
  43 |     // Inputs have no IDs, so target by label text via the parent <label>.
  44 |     await page.getByPlaceholder(/k-electric, netflix, rent/i).fill(billName);
  45 | 
  46 |     // First number input is Amount, then reminder_days. Use locator with input[type=number] order.
  47 |     const amountInput = page.locator('form input[type="number"]').first();
  48 |     await amountInput.fill('1500');
  49 | 
  50 |     // Submit
  51 |     const post = page.waitForResponse(
  52 |       (r) => r.url().endsWith('/recurring') && r.request().method() === 'POST',
  53 |       { timeout: 15_000 },
  54 |     );
  55 |     await page.getByRole('button', { name: /add bill/i }).last().click();
  56 |     await post;
  57 | 
  58 |     // The modal should close and the new bill name should appear in the table.
  59 |     await expect(page.getByText(billName).first()).toBeVisible({ timeout: 15_000 });
  60 |   });
  61 | });
  62 | 
```