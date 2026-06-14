import { adminTest, expect } from './fixtures/auth.js';

// Wallet data lives under the admin fixture's user — the regular E2E user has no
// accounts. Wallet ids are not hardcoded: we discover a wallet that actually has
// pending transactions by walking the Accounts page links, and skip if none.
async function gotoWalletWithPending(page) {
  await page.goto('/accounts');
  await expect(page.getByRole('heading', { name: /total liquidity/i })).toBeVisible({ timeout: 15_000 });
  const hrefs = await page.locator('a[href^="/wallets/"]')
    .evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute('href')))]);
  for (const href of hrefs) {
    await page.goto(href);
    // Wait for the wallet to settle: either its async transactions table renders
    // ("Pending Transactions") or it has no statements at all. Racing avoids
    // burning the full timeout on empty wallets.
    const pending = page.getByRole('heading', { name: /pending transactions/i });
    const noStatements = page.getByText(/no statements yet/i);
    await Promise.race([
      pending.waitFor({ state: 'visible', timeout: 12_000 }).catch(() => {}),
      noStatements.waitFor({ state: 'visible', timeout: 12_000 }).catch(() => {}),
    ]);
    if (await pending.count() > 0) return href;
  }
  return null;
}

adminTest.describe('Wallet detail page', () => {
  adminTest('navigates to a wallet and shows balance + statements', async ({ page }) => {
    await page.goto('/accounts');
    await expect(page.getByRole('heading', { name: /total liquidity/i })).toBeVisible({ timeout: 15_000 });
    const walletLink = page.locator('a[href^="/wallets/"]').first();
    if (await walletLink.count() === 0) { adminTest.skip(); return; }
    await walletLink.click();
    await expect(page).toHaveURL(/\/wallets\//);
    // "Monthly Statements" is unique to the wallet detail page (the lowercase
    // "Current balance" labels belong to the shared account strip).
    await expect(page.getByRole('heading', { name: /monthly statements/i })).toBeVisible({ timeout: 10_000 });
  });

  adminTest('renders the pending transactions review table', async ({ page }) => {
    const href = await gotoWalletWithPending(page);
    if (!href) { adminTest.skip(); return; }
    await expect(page.getByRole('heading', { name: /pending transactions/i })).toBeVisible();
    // The shared review table always renders a bulk approve action.
    await expect(page.getByRole('button', { name: /approve all/i }).first()).toBeVisible();
  });

  // Regression guard for "inline approval option not appear": expanding a pending
  // row must reveal the inline Type / Amount / Category / Approve editor.
  adminTest('inline edit/approve row opens for a pending transaction', async ({ page }) => {
    const href = await gotoWalletWithPending(page);
    if (!href) { adminTest.skip(); return; }
    await page.locator('button[title="Edit category / notes"]').first().click();
    await expect(page.getByText('Transaction Type').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^approve$/i })).toBeVisible();
  });
});

// Core regression: a wallet's transactions must be approved against /api/wallets,
// not /api/banks (which caused "Bank not found"). We intercept the request to
// assert the target URL deterministically without mutating real data.
adminTest.describe('Wallet transaction approval routing', () => {
  adminTest('single approve POSTs to the wallet endpoint and succeeds', async ({ page }) => {
    const href = await gotoWalletWithPending(page);
    if (!href) { adminTest.skip(); return; }

    let approveUrl = null;
    await page.route('**/transactions/*/approve', async (route) => {
      approveUrl = route.request().url();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Transaction approved', expenseId: null, isCredit: false }),
      });
    });

    await page.locator('button[title="Edit category / notes"]').first().click();
    await page.getByRole('button', { name: /^approve$/i }).click();

    await expect.poll(() => approveUrl, { timeout: 10_000 }).not.toBeNull();
    expect(approveUrl).toContain('/api/wallets/');
    expect(approveUrl).not.toContain('/api/banks/');
    await expect(page.getByText(/transaction approved/i)).toBeVisible();
    await expect(page.getByText(/no longer exists|bank not found/i)).toHaveCount(0);
  });

  adminTest('bulk approve POSTs to the wallet endpoint and succeeds', async ({ page }) => {
    const href = await gotoWalletWithPending(page);
    if (!href) { adminTest.skip(); return; }

    let bulkUrl = null;
    await page.route('**/bulk-approve', async (route) => {
      bulkUrl = route.request().url();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Approved 1 transactions', successCount: 1, errors: [] }),
      });
    });

    await page.getByRole('button', { name: /approve all/i }).first().click();

    await expect.poll(() => bulkUrl, { timeout: 10_000 }).not.toBeNull();
    expect(bulkUrl).toContain('/api/wallets/');
    expect(bulkUrl).not.toContain('/api/banks/');
    await expect(page.getByText(/approved 1 transaction/i)).toBeVisible();
    await expect(page.getByText(/no longer exists|bank not found/i)).toHaveCount(0);
  });
});
