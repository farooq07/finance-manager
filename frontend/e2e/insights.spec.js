import { test, expect } from './fixtures/auth.js';

test.describe('Insights page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/insights');
    // Heading appears regardless of data state — wait for it before each test.
    await expect(page.getByRole('heading', { name: /spending insights/i }).first())
      .toBeVisible({ timeout: 15_000 });
  });

  test('shows Spending Insights heading and subtitle', async ({ page }) => {
    await expect(page.getByText(/where your money goes/i)).toBeVisible();
  });

  test('shows period toggle buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /^month$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^quarter$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^year$/i })).toBeVisible();
  });

  test('clicking Quarter triggers a new insights request', async ({ page }) => {
    const req = page.waitForResponse(
      (r) => r.url().includes('/dashboard/insights') && r.url().includes('period=quarter'),
      { timeout: 15_000 },
    );
    await page.getByRole('button', { name: /^quarter$/i }).click();
    await req;
  });

  test('clicking Year triggers a new insights request', async ({ page }) => {
    const req = page.waitForResponse(
      (r) => r.url().includes('/dashboard/insights') && r.url().includes('period=year'),
      { timeout: 15_000 },
    );
    await page.getByRole('button', { name: /^year$/i }).click();
    await req;
  });

  test('renders summary cards or an empty/error state', async ({ page }) => {
    // Wait for the initial request to settle.
    await page
      .waitForResponse((r) => r.url().includes('/dashboard/insights') && r.request().method() === 'GET', {
        timeout: 15_000,
      })
      .catch(() => {});

    // One of: summary cards (Spent/Earned/Net), the error banner, or skeleton.
    const summary  = page.getByText(/^spent$/i).first();
    const errBox   = page.getByText(/could not load insights/i);
    await expect(summary.or(errBox)).toBeVisible({ timeout: 15_000 });
  });
});
