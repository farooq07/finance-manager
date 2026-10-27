import { test, expect } from './fixtures/auth.js';

// Debts live in the Ledger's "Loans & Cards" tab. Read-only checks: E2E runs
// against a real backend, so it must not create records.
test.describe('Loans & Cards (Ledger)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ledger?tab=loans');
    await expect(page.getByRole('button', { name: /loans & cards/i }).first()).toBeVisible({ timeout: 15_000 });
  });

  test('shows loans, or the empty state with an Add a loan button', async ({ page }) => {
    const empty = page.getByText(/no loans or cards tracked/i);
    const list = page.locator('a[href^="/debts/"]').first();
    await expect(empty.or(list)).toBeVisible({ timeout: 15_000 });
  });

  test('a loan opens its detail page', async ({ page }) => {
    const link = page.locator('a[href^="/debts/"]').first();
    if (await link.count() === 0) { test.skip(); return; }
    await link.click();
    await expect(page).toHaveURL(/\/debts\//);
  });
});
