import { test, expect } from './fixtures/auth.js';

test.describe('Beneficiaries page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/beneficiaries');
    // Wait until loaded — Add Beneficiary button appears once data is ready
    await expect(page.getByRole('button', { name: /add beneficiary/i })).toBeVisible({ timeout: 15_000 });
  });

  test('shows Beneficiaries heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /beneficiaries/i })).toBeVisible();
  });

  test('shows subtitle text', async ({ page }) => {
    await expect(page.getByText(/track payments/i)).toBeVisible();
  });

  test('opens Add Beneficiary modal', async ({ page }) => {
    await page.getByRole('button', { name: /add beneficiary/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.locator('#b-name')).toBeVisible();
    await expect(page.locator('#b-nickname')).toBeVisible();
    await expect(page.locator('#b-phone')).toBeVisible();
  });

  test('cancel closes the modal', async ({ page }) => {
    await page.getByRole('button', { name: /add beneficiary/i }).click();
    await page.getByRole('dialog').getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('adds a new beneficiary and it appears in the list', async ({ page }) => {
    await page.getByRole('button', { name: /add beneficiary/i }).click();
    const name = `Test Person ${Date.now()}`;
    await page.locator('#b-name').fill(name);
    await page.locator('#b-nickname').fill('TestNick');
    await page.getByRole('dialog').getByRole('button', { name: /add beneficiary/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(name)).toBeVisible({ timeout: 15_000 });
  });

  test('beneficiary detail page loads', async ({ page }) => {
    const beneficiaryLink = page.locator('a[href^="/beneficiaries/"]').first();
    if (await beneficiaryLink.count() === 0) { test.skip(); return; }
    await beneficiaryLink.click();
    await expect(page).toHaveURL(/\/beneficiaries\//);
  });
});
