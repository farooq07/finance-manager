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
        - heading "WealthAxis" [level=1] [ref=e69]
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
            - generic [ref=e85]:
              - heading "Total Liquidity" [level=1] [ref=e86]
              - paragraph [ref=e87]: Aggregated balance across all your banks and mapped wallets.
            - generic [ref=e89]:
              - generic [ref=e90]: ••••••
              - button "Click to unlock with PIN" [ref=e91] [cursor=pointer]:
                - img [ref=e92]
          - generic [ref=e95]:
            - generic [ref=e96]:
              - heading "Formal Banking" [level=2] [ref=e97]:
                - img [ref=e98]
                - text: Formal Banking
              - button "Add Bank" [active] [ref=e102] [cursor=pointer]:
                - img
                - text: Add Bank
            - generic [ref=e104]:
              - img [ref=e105]
              - paragraph [ref=e109]: No bank accounts linked yet.
          - generic [ref=e110]:
            - generic [ref=e111]:
              - heading "Wallets & Cash" [level=2] [ref=e112]:
                - img [ref=e113]
                - text: Wallets & Cash
              - button "Add Wallet" [ref=e116] [cursor=pointer]:
                - img
                - text: Add Wallet
            - button "Link New Wallet" [ref=e118] [cursor=pointer]:
              - img
              - generic [ref=e119]: Link New Wallet
          - generic [ref=e121]:
            - generic [ref=e122]:
              - heading "Add Formal Bank Account" [level=2] [ref=e123]
              - button "✕" [ref=e124] [cursor=pointer]
            - generic [ref=e125]:
              - generic [ref=e127]:
                - generic [ref=e129]: Bank Institution
                - combobox [ref=e130] [cursor=pointer]:
                  - generic: Select bank...
                  - img [ref=e131]
                - combobox [ref=e133]
                - paragraph [ref=e134]: Please add a Formal Bank via Console Settings first.
              - generic [ref=e135]:
                - generic [ref=e136]: Account Number
                - textbox [ref=e139]
              - generic [ref=e140]:
                - generic [ref=e141]: IBAN Number
                - textbox [ref=e144]
              - generic [ref=e145]:
                - generic [ref=e146]: Starting Balance
                - spinbutton [ref=e149]
              - generic [ref=e150]:
                - generic [ref=e151]:
                  - generic [ref=e152]: Currency
                  - generic [ref=e153]:
                    - combobox [ref=e154] [cursor=pointer]:
                      - generic:
                        - generic:
                          - generic: PKR - Pakistan Rupee
                      - img [ref=e155]
                    - combobox [ref=e157]
                - generic [ref=e158]:
                  - generic [ref=e160]: Exchange Rate (to PKR)
                  - spinbutton [disabled] [ref=e163]: "1"
              - generic [ref=e164]:
                - button "Cancel" [ref=e165] [cursor=pointer]
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