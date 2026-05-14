import { test, expect } from './fixtures/auth.js';

// Helper: wait until the skeleton is gone (loading state shows "My Accounts", loaded state shows "Total Liquidity")
async function waitForAccountsLoaded(page) {
  await expect(page.getByRole('heading', { name: /total liquidity/i })).toBeVisible({ timeout: 15_000 });
}

test.describe('Accounts page', () => {
  test('loads with Total Liquidity heading', async ({ page }) => {
    await page.goto('/accounts');
    await waitForAccountsLoaded(page);
  });

  test('shows Formal Banking and Wallets & Cash sections', async ({ page }) => {
    await page.goto('/accounts');
    await waitForAccountsLoaded(page);
    await expect(page.getByRole('heading', { name: /formal banking/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /wallets/i })).toBeVisible();
  });

  test('shows Add Bank and Add Wallet buttons', async ({ page }) => {
    await page.goto('/accounts');
    await waitForAccountsLoaded(page);
    await expect(page.getByRole('button', { name: /add bank/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /add wallet/i }).first()).toBeVisible();
  });

  test('can open Add Bank modal', async ({ page }) => {
    await page.goto('/accounts');
    await waitForAccountsLoaded(page);
    await page.getByRole('button', { name: /add bank/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/add formal bank account/i)).toBeVisible();
  });

  test('closing Add Bank modal hides it', async ({ page }) => {
    await page.goto('/accounts');
    await waitForAccountsLoaded(page);
    await page.getByRole('button', { name: /add bank/i }).click();
    await page.getByRole('dialog').getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});

test.describe('Bank detail page', () => {
  test('navigates to bank detail and shows balance', async ({ page }) => {
    await page.goto('/accounts');
    await waitForAccountsLoaded(page);
    const bankLink = page.locator('a[href^="/banks/"]').first();
    if (await bankLink.count() === 0) { test.skip(); return; }
    await bankLink.click();
    await expect(page).toHaveURL(/\/banks\//);
    await expect(page.getByText(/current balance/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/monthly statements/i)).toBeVisible();
  });

  test('Upload Statement modal opens', async ({ page }) => {
    await page.goto('/accounts');
    await waitForAccountsLoaded(page);
    const bankLink = page.locator('a[href^="/banks/"]').first();
    if (await bankLink.count() === 0) { test.skip(); return; }
    await bankLink.click();
    await expect(page.getByRole('button', { name: /upload statement/i })).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /upload statement/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('button', { name: /upload & process/i })).toBeVisible();
  });
});
