import { test as userTest, expect } from './fixtures/auth.js';
import { adminTest } from './fixtures/auth.js';

userTest.describe('Admin routes — non-admin user', () => {
  userTest('is redirected away from /users', async ({ page }) => {
    await page.goto('/users');
    // AdminRoute redirects non-admins back to dashboard
    await expect(page).not.toHaveURL(/\/users/);
  });

  userTest('sidebar does not show Users link', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('a[href="/users"]')).toHaveCount(0);
  });
});

adminTest.describe('Admin routes — admin user', () => {
  adminTest('can access /users page', async ({ page }) => {
    await page.goto('/users');
    await expect(page).toHaveURL(/\/users/);
    await expect(page.getByRole('heading', { name: /users management/i })).toBeVisible({ timeout: 15_000 });
  });

  adminTest('Settings page shows Users & Roles section', async ({ page }) => {
    await page.goto('/settings');
    await page.getByRole('button', { name: /^users$/i }).click();
    await expect(page.getByRole('heading', { name: /users & roles/i })).toBeVisible({ timeout: 15_000 });
  });

  adminTest('users table has Name, Email and Role columns', async ({ page }) => {
    await page.goto('/users');
    // Wait for table to render
    await expect(page.locator('thead')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('th').filter({ hasText: 'Name' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: 'Email' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: 'Role' })).toBeVisible();
  });

  adminTest('Add User button opens modal', async ({ page }) => {
    await page.goto('/users');
    await expect(page.getByRole('button', { name: /add user/i })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: /add user/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/add new user/i)).toBeVisible();
  });

  adminTest('cancel closes Add User modal', async ({ page }) => {
    await page.goto('/users');
    await expect(page.getByRole('button', { name: /add user/i })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: /add user/i }).click();
    await page.getByRole('dialog').getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});
