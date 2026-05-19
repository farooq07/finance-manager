import { test, expect } from '@playwright/test';

test.describe('Login page', () => {
  test('renders login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('#login-identifier')).toBeVisible();
    await expect(page.locator('#login-password')).toBeVisible();
    await expect(page.locator('#login-submit')).toBeVisible();
  });

  test('shows error on wrong credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#login-identifier', 'wrong@example.com');
    await page.fill('#login-password', 'wrongpassword123');
    await page.click('#login-submit');
    // Backend returns an error message in a red box
    await expect(page.locator('text=/invalid|incorrect|failed|not found/i').first()).toBeVisible({ timeout: 8000 });
  });

  test('unauthenticated user is redirected from / to /welcome', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/welcome/);
  });

  test('unauthenticated user is redirected from /expenses to /welcome', async ({ page }) => {
    await page.goto('/expenses');
    await expect(page).toHaveURL(/\/welcome/);
  });
});
