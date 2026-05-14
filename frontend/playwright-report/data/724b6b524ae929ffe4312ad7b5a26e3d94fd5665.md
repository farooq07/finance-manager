# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: accounts.spec.js >> Accounts page >> can open Add Bank modal
- Location: e2e\accounts.spec.js:28:3

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
        - heading "WealthAxis" [level=1] [ref=e82]
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
            - generic [ref=e98]:
              - heading "Total Liquidity" [level=1] [ref=e99]
              - paragraph [ref=e100]: Aggregated balance across all your banks and mapped wallets.
            - generic [ref=e102]:
              - generic [ref=e103]: ••••••
              - button "Click to unlock with PIN" [ref=e104] [cursor=pointer]:
                - img [ref=e105]
          - generic [ref=e108]:
            - generic [ref=e109]:
              - heading "Formal Banking" [level=2] [ref=e110]:
                - img [ref=e111]
                - text: Formal Banking
              - button "Add Bank" [active] [ref=e115] [cursor=pointer]:
                - img
                - text: Add Bank
            - generic [ref=e117]:
              - img [ref=e118]
              - paragraph [ref=e122]: No bank accounts linked yet.
          - generic [ref=e123]:
            - generic [ref=e124]:
              - heading "Wallets & Cash" [level=2] [ref=e125]:
                - img [ref=e126]
                - text: Wallets & Cash
              - button "Add Wallet" [ref=e129] [cursor=pointer]:
                - img
                - text: Add Wallet
            - button "Link New Wallet" [ref=e131] [cursor=pointer]:
              - img
              - generic [ref=e132]: Link New Wallet
          - generic [ref=e134]:
            - generic [ref=e135]:
              - heading "Add Formal Bank Account" [level=2] [ref=e136]
              - button "✕" [ref=e137] [cursor=pointer]
            - generic [ref=e138]:
              - generic [ref=e140]:
                - generic [ref=e142]: Bank Institution
                - combobox [ref=e143] [cursor=pointer]:
                  - generic: Select bank...
                  - img [ref=e144]
                - combobox [ref=e146]
                - paragraph [ref=e147]: Please add a Formal Bank via Console Settings first.
              - generic [ref=e148]:
                - generic [ref=e149]: Account Number
                - textbox [ref=e152]
              - generic [ref=e153]:
                - generic [ref=e154]: IBAN Number
                - textbox [ref=e157]
              - generic [ref=e158]:
                - generic [ref=e159]: Starting Balance
                - spinbutton [ref=e162]
              - generic [ref=e163]:
                - generic [ref=e164]:
                  - generic [ref=e165]: Currency
                  - generic [ref=e166]:
                    - combobox [ref=e167] [cursor=pointer]:
                      - generic:
                        - generic:
                          - generic: PKR - Pakistan Rupee
                      - img [ref=e168]
                    - combobox [ref=e170]
                - generic [ref=e171]:
                  - generic [ref=e173]: Exchange Rate (to PKR)
                  - spinbutton [disabled] [ref=e176]: "1"
              - generic [ref=e177]:
                - button "Cancel" [ref=e178] [cursor=pointer]
                - button "Link Bank" [disabled]
```

# Test source

```ts
  1  | import { test, expect } from './fixtures/auth.js';
  2  | 
  3  | // Helper: wait until the skeleton is gone (loading state shows "My Accounts", loaded state shows "Total Liquidity")
  4  | async function waitForAccountsLoaded(page) {
  5  |   await expect(page.getByRole('heading', { name: /total liquidity/i })).toBeVisible({ timeout: 15_000 });
  6  | }
  7  | 
  8  | test.describe('Accounts page', () => {
  9  |   test('loads with Total Liquidity heading', async ({ page }) => {
  10 |     await page.goto('/accounts');
  11 |     await waitForAccountsLoaded(page);
  12 |   });
  13 | 
  14 |   test('shows Formal Banking and Wallets & Cash sections', async ({ page }) => {
  15 |     await page.goto('/accounts');
  16 |     await waitForAccountsLoaded(page);
  17 |     await expect(page.getByRole('heading', { name: /formal banking/i })).toBeVisible();
  18 |     await expect(page.getByRole('heading', { name: /wallets/i })).toBeVisible();
  19 |   });
  20 | 
  21 |   test('shows Add Bank and Add Wallet buttons', async ({ page }) => {
  22 |     await page.goto('/accounts');
  23 |     await waitForAccountsLoaded(page);
  24 |     await expect(page.getByRole('button', { name: /add bank/i })).toBeVisible();
  25 |     await expect(page.getByRole('button', { name: /add wallet/i }).first()).toBeVisible();
  26 |   });
  27 | 
  28 |   test('can open Add Bank modal', async ({ page }) => {
  29 |     await page.goto('/accounts');
  30 |     await waitForAccountsLoaded(page);
  31 |     await page.getByRole('button', { name: /add bank/i }).click();
> 32 |     await expect(page.getByRole('dialog')).toBeVisible();
     |                                            ^ Error: expect(locator).toBeVisible() failed
  33 |     await expect(page.getByText(/add formal bank account/i)).toBeVisible();
  34 |   });
  35 | 
  36 |   test('closing Add Bank modal hides it', async ({ page }) => {
  37 |     await page.goto('/accounts');
  38 |     await waitForAccountsLoaded(page);
  39 |     await page.getByRole('button', { name: /add bank/i }).click();
  40 |     await page.getByRole('dialog').getByRole('button', { name: /cancel/i }).click();
  41 |     await expect(page.getByRole('dialog')).not.toBeVisible();
  42 |   });
  43 | });
  44 | 
  45 | test.describe('Bank detail page', () => {
  46 |   test('navigates to bank detail and shows balance', async ({ page }) => {
  47 |     await page.goto('/accounts');
  48 |     await waitForAccountsLoaded(page);
  49 |     const bankLink = page.locator('a[href^="/banks/"]').first();
  50 |     if (await bankLink.count() === 0) { test.skip(); return; }
  51 |     await bankLink.click();
  52 |     await expect(page).toHaveURL(/\/banks\//);
  53 |     await expect(page.getByText(/current balance/i)).toBeVisible({ timeout: 10_000 });
  54 |     await expect(page.getByText(/monthly statements/i)).toBeVisible();
  55 |   });
  56 | 
  57 |   test('Upload Statement modal opens', async ({ page }) => {
  58 |     await page.goto('/accounts');
  59 |     await waitForAccountsLoaded(page);
  60 |     const bankLink = page.locator('a[href^="/banks/"]').first();
  61 |     if (await bankLink.count() === 0) { test.skip(); return; }
  62 |     await bankLink.click();
  63 |     await expect(page.getByRole('button', { name: /upload statement/i })).toBeVisible({ timeout: 10_000 });
  64 |     await page.getByRole('button', { name: /upload statement/i }).click();
  65 |     await expect(page.getByRole('dialog')).toBeVisible();
  66 |     await expect(page.getByRole('button', { name: /upload & process/i })).toBeVisible();
  67 |   });
  68 | });
  69 | 
```