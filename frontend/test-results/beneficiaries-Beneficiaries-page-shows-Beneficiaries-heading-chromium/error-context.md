# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: beneficiaries.spec.js >> Beneficiaries page >> shows Beneficiaries heading
- Location: e2e\beneficiaries.spec.js:10:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: /add beneficiary/i })
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByRole('button', { name: /add beneficiary/i })

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
        - heading "WealthAxis" [level=1] [ref=e12]
        - generic [ref=e13]:
          - button "Toggle Theme" [ref=e14] [cursor=pointer]:
            - img [ref=e15]
          - generic [ref=e17]:
            - generic [ref=e19]: F
            - generic [ref=e20]: farooq
          - button "Logout" [ref=e21] [cursor=pointer]:
            - img [ref=e22]
      - main [ref=e25]:
        - heading "Beneficiaries" [level=1] [ref=e27]
```

# Test source

```ts
  1  | import { test, expect } from './fixtures/auth.js';
  2  | 
  3  | test.describe('Beneficiaries page', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     await page.goto('/beneficiaries');
  6  |     // Wait until loaded — Add Beneficiary button appears once data is ready
> 7  |     await expect(page.getByRole('button', { name: /add beneficiary/i })).toBeVisible({ timeout: 15_000 });
     |                                                                          ^ Error: expect(locator).toBeVisible() failed
  8  |   });
  9  | 
  10 |   test('shows Beneficiaries heading', async ({ page }) => {
  11 |     await expect(page.getByRole('heading', { name: /beneficiaries/i })).toBeVisible();
  12 |   });
  13 | 
  14 |   test('shows subtitle text', async ({ page }) => {
  15 |     await expect(page.getByText(/track payments/i)).toBeVisible();
  16 |   });
  17 | 
  18 |   test('opens Add Beneficiary modal', async ({ page }) => {
  19 |     await page.getByRole('button', { name: /add beneficiary/i }).click();
  20 |     await expect(page.getByRole('dialog')).toBeVisible();
  21 |     await expect(page.locator('#b-name')).toBeVisible();
  22 |     await expect(page.locator('#b-nickname')).toBeVisible();
  23 |     await expect(page.locator('#b-phone')).toBeVisible();
  24 |   });
  25 | 
  26 |   test('cancel closes the modal', async ({ page }) => {
  27 |     await page.getByRole('button', { name: /add beneficiary/i }).click();
  28 |     await page.getByRole('dialog').getByRole('button', { name: /cancel/i }).click();
  29 |     await expect(page.getByRole('dialog')).not.toBeVisible();
  30 |   });
  31 | 
  32 |   test('adds a new beneficiary and it appears in the list', async ({ page }) => {
  33 |     await page.getByRole('button', { name: /add beneficiary/i }).click();
  34 |     const name = `Test Person ${Date.now()}`;
  35 |     await page.locator('#b-name').fill(name);
  36 |     await page.locator('#b-nickname').fill('TestNick');
  37 |     await page.getByRole('dialog').getByRole('button', { name: /add beneficiary/i }).click();
  38 |     await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 15_000 });
  39 |     await expect(page.getByText(name)).toBeVisible({ timeout: 15_000 });
  40 |   });
  41 | 
  42 |   test('beneficiary detail page loads', async ({ page }) => {
  43 |     const beneficiaryLink = page.locator('a[href^="/beneficiaries/"]').first();
  44 |     if (await beneficiaryLink.count() === 0) { test.skip(); return; }
  45 |     await beneficiaryLink.click();
  46 |     await expect(page).toHaveURL(/\/beneficiaries\//);
  47 |   });
  48 | });
  49 | 
```