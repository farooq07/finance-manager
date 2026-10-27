import { test, expect } from './fixtures/auth.js';

// Pages that were folded into others still resolve, so old links and
// bookmarks keep working.
test.describe('retired page links', () => {
  test('/bills → Expenses', async ({ page }) => {
    await page.goto('/bills');
    await expect(page).toHaveURL(/\/expenses/);
  });

  test('/debts → Ledger, Loans & Cards tab', async ({ page }) => {
    await page.goto('/debts');
    await expect(page).toHaveURL(/\/ledger\?tab=loans/);
  });

  test('/beneficiaries → Accounts, Beneficiaries tab', async ({ page }) => {
    await page.goto('/beneficiaries');
    await expect(page).toHaveURL(/\/accounts\?tab=beneficiaries/);
  });
});
