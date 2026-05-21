import { test, expect } from './fixtures/auth.js';

test.describe('Net Worth page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/net-worth');
    await expect(page.getByRole('heading', { name: /^net worth$/i }).first())
      .toBeVisible({ timeout: 15_000 });
  });

  test('shows heading and subtitle', async ({ page }) => {
    await expect(page.getByText(/assets minus your liabilities/i)).toBeVisible();
  });

  test('shows all range toggles', async ({ page }) => {
    for (const label of ['1M', '3M', '6M', '1Y', '2Y']) {
      await expect(page.getByRole('button', { name: new RegExp(`^${label}$`) })).toBeVisible();
    }
  });

  test('shows the Capture now button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /capture now/i })).toBeVisible();
  });

  test('changing range triggers a new history request', async ({ page }) => {
    const req = page.waitForResponse(
      (r) => r.url().includes('/networth/history') && r.url().includes('days=180'),
      { timeout: 15_000 },
    );
    await page.getByRole('button', { name: /^6M$/ }).click();
    await req;
  });

  test('renders either history view, empty state, or error banner', async ({ page }) => {
    await page
      .waitForResponse((r) => r.url().includes('/networth/history'), { timeout: 15_000 })
      .catch(() => {});

    const history = page.getByRole('heading', { name: /^history$/i });
    const empty   = page.getByRole('heading', { name: /no snapshots yet/i });
    const err     = page.getByText(/could not load history/i);
    await expect(history.or(empty).or(err)).toBeVisible({ timeout: 15_000 });
  });

  test('Capture now triggers a snapshot POST', async ({ page }) => {
    const req = page.waitForResponse(
      (r) => r.url().includes('/networth/snapshot') && r.request().method() === 'POST',
      { timeout: 15_000 },
    );
    await page.getByRole('button', { name: /capture now/i }).click();
    await req;
  });
});
