import { test, expect } from './fixtures/auth.js';

test.describe('Debts page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/debts');
    await expect(page.getByRole('heading', { name: /^debts$/i }).first())
      .toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: /add a debt/i }).first())
      .toBeVisible({ timeout: 15_000 });
  });

  test('shows heading and subtitle', async ({ page }) => {
    await expect(page.getByText(/credit cards, loans, and other institutional debts/i)).toBeVisible();
  });

  test('shows summary cards', async ({ page }) => {
    await expect(page.getByText(/total outstanding/i)).toBeVisible();
    await expect(page.getByText(/repaid so far/i)).toBeVisible();
    await expect(page.getByText(/minimum monthly/i)).toBeVisible();
  });

  test('opens the Add a debt modal', async ({ page }) => {
    await page.getByRole('button', { name: /add a debt/i }).first().click();
    // Form fields appear
    await expect(page.getByPlaceholder(/hbl credit card, car loan/i)).toBeVisible();
    await expect(page.getByText(/original principal/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /^cancel$/i })).toBeVisible();
  });

  test('cancel closes the modal', async ({ page }) => {
    await page.getByRole('button', { name: /add a debt/i }).first().click();
    await expect(page.getByRole('button', { name: /^cancel$/i })).toBeVisible();
    await page.getByRole('button', { name: /^cancel$/i }).click();
    await expect(page.getByRole('button', { name: /^cancel$/i })).not.toBeVisible();
  });

  test('creates a new debt and shows it in the list', async ({ page }) => {
    await page.getByRole('button', { name: /add a debt/i }).first().click();

    const debtName = `Test Debt ${Date.now()}`;
    await page.getByPlaceholder(/hbl credit card, car loan/i).fill(debtName);

    // Original principal is the first number input
    const principal = page.locator('form input[type="number"]').first();
    await principal.fill('100000');

    const post = page.waitForResponse(
      (r) => r.url().endsWith('/debts') && r.request().method() === 'POST',
      { timeout: 15_000 },
    );
    await page.getByRole('button', { name: /^add debt$/i }).click();
    await post;

    await expect(page.getByText(debtName).first()).toBeVisible({ timeout: 15_000 });
  });
});
