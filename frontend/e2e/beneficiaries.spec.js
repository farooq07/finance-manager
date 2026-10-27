import { test, expect } from './fixtures/auth.js';

// Beneficiaries live under Accounts. Custom modals are <div> overlays, so
// they are found by their text, never role="dialog". Read-only checks.
test.describe('Beneficiaries (Accounts tab)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/accounts?tab=beneficiaries');
    await expect(page.getByRole('button', { name: /add beneficiary/i }).first()).toBeVisible({ timeout: 15_000 });
  });

  test('shows the Beneficiaries heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /beneficiaries/i }).first()).toBeVisible();
  });

  test('Add Beneficiary opens the form and Cancel closes it', async ({ page }) => {
    await page.getByRole('button', { name: /add beneficiary/i }).first().click();
    await expect(page.locator('#b-name')).toBeVisible();
    await page.getByRole('button', { name: /^cancel$/i }).first().click();
    await expect(page.locator('#b-name')).not.toBeVisible();
  });

  test('a beneficiary opens its detail page', async ({ page }) => {
    const link = page.locator('a[href^="/beneficiaries/"]').first();
    if (await link.count() === 0) { test.skip(); return; }
    await link.click();
    await expect(page).toHaveURL(/\/beneficiaries\//);
  });
});
