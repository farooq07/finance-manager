import { test, expect } from './fixtures/auth.js';

test.describe('Bills page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/bills');
    await expect(page.getByRole('heading', { name: /bills & subscriptions/i }).first())
      .toBeVisible({ timeout: 15_000 });
    // Wait until either the empty state or the table is rendered.
    await expect(page.getByRole('button', { name: /add a bill/i }).first())
      .toBeVisible({ timeout: 15_000 });
  });

  test('shows the heading and Add a bill button', async ({ page }) => {
    await expect(page.getByText(/recurring payments tracked/i)).toBeVisible();
  });

  test('shows the three summary stat cards', async ({ page }) => {
    await expect(page.getByText(/estimated monthly outgoings/i)).toBeVisible();
    await expect(page.getByText(/due in next 7 days/i)).toBeVisible();
    await expect(page.getByText(/^overdue$/i).first()).toBeVisible();
  });

  test('opens the Add a bill modal', async ({ page }) => {
    // The page header has its own "Add a bill" — modal title is "Add a bill" too.
    // Use .first() on the header button.
    await page.getByRole('button', { name: /add a bill/i }).first().click();
    // Modal title (h2 inside the overlay div) — confirm by waiting on the Name field.
    await expect(page.getByText(/^name$/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^cancel$/i })).toBeVisible();
  });

  test('cancel closes the modal', async ({ page }) => {
    await page.getByRole('button', { name: /add a bill/i }).first().click();
    await expect(page.getByRole('button', { name: /^cancel$/i })).toBeVisible();
    await page.getByRole('button', { name: /^cancel$/i }).click();
    await expect(page.getByRole('button', { name: /^cancel$/i })).not.toBeVisible();
  });

  test('creates a new bill and shows it in the list', async ({ page }) => {
    await page.getByRole('button', { name: /add a bill/i }).first().click();

    const billName = `Test Bill ${Date.now()}`;
    // Inputs have no IDs, so target by label text via the parent <label>.
    await page.getByPlaceholder(/k-electric, netflix, rent/i).fill(billName);

    // First number input is Amount, then reminder_days. Use locator with input[type=number] order.
    const amountInput = page.locator('form input[type="number"]').first();
    await amountInput.fill('1500');

    // Submit
    const post = page.waitForResponse(
      (r) => r.url().endsWith('/recurring') && r.request().method() === 'POST',
      { timeout: 15_000 },
    );
    await page.getByRole('button', { name: /add bill/i }).last().click();
    await post;

    // The modal should close and the new bill name should appear in the table.
    await expect(page.getByText(billName).first()).toBeVisible({ timeout: 15_000 });
  });
});
