import { test, expect } from './fixtures/auth.js';

test.describe('Expenses page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/expenses');
    // Wait until the page finishes loading (buttons are visible)
    await expect(page.getByRole('button', { name: /single expense/i })).toBeVisible({ timeout: 15_000 });
  });

  test('shows Expenses heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /expenses/i })).toBeVisible();
  });

  test('shows Single Expense and Log Monthly Bills buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /log monthly bills/i })).toBeVisible();
  });

  test('opens add expense modal', async ({ page }) => {
    await page.getByRole('button', { name: /single expense/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.locator('#exp-amount')).toBeVisible();
    await expect(page.locator('#exp-category')).toBeVisible();
  });

  test('cancel closes the modal', async ({ page }) => {
    await page.getByRole('button', { name: /single expense/i }).click();
    await page.getByRole('dialog').getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('adds a new expense', async ({ page }) => {
    await page.getByRole('button', { name: /single expense/i }).click();
    await page.locator('#exp-amount').fill('500');
    await page.locator('#exp-category').fill('Food & Dining');
    await page.getByRole('dialog').getByRole('button', { name: /save expense/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 15_000 });
  });

  test('opens monthly bills modal', async ({ page }) => {
    await page.getByRole('button', { name: /log monthly bills/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/monthly bill run/i)).toBeVisible();
  });
});
