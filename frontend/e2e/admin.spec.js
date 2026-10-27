import { test as userTest, expect } from './fixtures/auth.js';
import { adminTest } from './fixtures/auth.js';

// Users and roles are managed in Settings → Access Control (there is no
// /users page any more).
userTest.describe('Access Control — regular user', () => {
  userTest('does not see Access Control in Settings', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('button', { name: /access control/i })).toHaveCount(0);
  });
});

adminTest.describe('Access Control — admin', () => {
  adminTest.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await page.getByRole('button', { name: /access control/i }).first().click();
    await expect(page.getByRole('heading', { name: /access control/i }).first()).toBeVisible({ timeout: 15_000 });
  });

  adminTest('users table has Name, Email and Role columns', async ({ page }) => {
    await expect(page.locator('thead').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('th').filter({ hasText: 'Name' }).first()).toBeVisible();
    await expect(page.locator('th').filter({ hasText: 'Email' }).first()).toBeVisible();
    await expect(page.locator('th').filter({ hasText: 'Role' }).first()).toBeVisible();
  });

  adminTest('Roles tab lists the three fixed roles', async ({ page }) => {
    await page.getByRole('button', { name: /^roles$/i }).first().click();
    await expect(page.getByText(/three fixed roles/i)).toBeVisible();
  });
});
