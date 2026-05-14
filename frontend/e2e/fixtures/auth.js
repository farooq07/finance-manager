import { test as base } from '@playwright/test';

async function injectToken(page, token, baseURL) {
  // Go to login page first so localStorage is writable on the app's origin
  await page.goto(baseURL + '/login');
  await page.evaluate((t) => {
    localStorage.setItem('token', t);
  }, token);

  // Navigate to root and wait for the /auth/me validation to complete
  await Promise.all([
    page.waitForResponse(
      (resp) => resp.url().includes('/auth/me') && resp.status() === 200,
      { timeout: 10_000 }
    ),
    page.goto(baseURL + '/'),
  ]);

  // Wait for any sidebar/nav element to confirm the app shell is rendered
  await page.waitForSelector('nav a, aside a, [data-testid="sidebar"]', { timeout: 10_000 }).catch(() => {});
}

export const test = base.extend({
  /** Authenticated as a regular user */
  page: async ({ page, baseURL }, use) => {
    const token = process.env.E2E_USER_TOKEN;
    if (!token) throw new Error('E2E_USER_TOKEN is not set in .env.test');
    await injectToken(page, token, baseURL);
    await use(page);
  },
});

export const adminTest = base.extend({
  /** Authenticated as an admin / super.admin user */
  page: async ({ page, baseURL }, use) => {
    const token = process.env.E2E_ADMIN_TOKEN;
    if (!token) throw new Error('E2E_ADMIN_TOKEN is not set in .env.test');
    await injectToken(page, token, baseURL);
    await use(page);
  },
});

export { expect } from '@playwright/test';
