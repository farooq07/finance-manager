import { test, expect } from '@playwright/test';

// First-run onboarding, end to end in a real browser. Every API call is
// answered here (page.route), so no real user, bank or preference is
// created — the backend is never reached.

const MENU = [
    ['/', 'Dashboard', null], ['/accounts', 'Accounts', null], ['/expenses', 'Expenses', null],
    ['/mutual-funds', 'Mutual Funds', null], ['/stocks', 'Stocks', null], ['/personal', 'Personal', null],
    ['/personal#zakat', 'Zakat', '/personal'], ['/personal#rent', 'Rent', '/personal'],
    ['/personal#assets', 'Assets', '/personal'], ['/personal#gold', 'Gold', '/personal'],
    ['/reports', 'Reports', null], ['/ledger', 'Ledger', null], ['/settings', 'Settings', null], ['/help', 'Help & Feedback', null],
].map(([path, name, parent_path], i) => ({
    path, name, parent_path, icon: 'Home', sort_order: i, visible_to_roles: ['user', 'admin', 'super.admin'],
}));

function fakeBackend() {
    const state = {
        user: {
            id: 'e2e-user', name: 'New Person', email: 'new@example.invalid', role: 'user',
            hasPin: false, must_change_password: false, onboarded_at: null, interests: null,
        },
        banks: [],
        writes: [],
    };
    const netWorth = () => state.banks.reduce((s, b) => s + Number(b.current_balance), 0);

    const respond = (request) => {
        const url = new URL(request.url());
        const path = url.pathname.replace(/^.*\/api/, '');
        const method = request.method();
        const body = request.postDataJSON?.() ?? null;
        if (method !== 'GET') state.writes.push({ method, path, body });

        if (method === 'GET' && path === '/auth/me') return state.user;
        if (method === 'GET' && path === '/menu-visibility') return MENU;
        if (method === 'PATCH' && path === '/users/me/preferences') {
            if ('interests' in body) state.user.interests = body.interests;
            if (body.completeOnboarding && !state.user.onboarded_at) state.user.onboarded_at = new Date().toISOString();
            return { onboarded_at: state.user.onboarded_at, interests: state.user.interests };
        }
        if (method === 'GET' && path === '/banks') return state.banks;
        if (method === 'POST' && path === '/banks') {
            const bank = { id: `b${state.banks.length + 1}`, name: body.name, current_balance: String(body.starting_balance) };
            state.banks.push(bank);
            return bank;
        }
        if (method === 'GET' && path === '/dashboard/summary') {
            return {
                metrics: { netWorth: netWorth(), totalBankBalance: netWorth(), totalWalletBalance: 0, totalInvestments: 0, totalReceivable: 0, totalPayable: 0, totalExpenses: 0, currentMonthExpenses: 0, lastMonthExpenses: 0, avgMonthlyExpenses: 0, totalAssetValue: 0, totalRentBalance: 0, totalDebt: 0, mutualFundValue: 0, mutualFundCost: 0, stockValue: 0, stockCost: 0 },
                charts: { monthlyExpenses: [], currentMonthCategories: [], investmentDistribution: [], assetAllocation: [] },
                sources: {},
            };
        }
        if (method === 'GET' && path === '/zakat') return { entries: [], currentYearTotal: 0 };
        if (method === 'GET' && path === '/zakat/summary') {
            return { breakdown: { cash: netWorth(), investments: 0, goldValue: 0, receivables: 0, payables: 0, debts: 0 }, zakatableAssets: netWorth(), deductions: 0, netZakatable: netWorth(), nisabValue: null, isNisabMet: null, zakatDue: netWorth() * 0.025, goldPriceDate: null };
        }
        return method === 'GET' ? [] : {};
    };

    return { state, respond };
}

test('a new user picks interests, adds a bank, sees net worth and a trimmed menu', async ({ page }) => {
    const backend = fakeBackend();
    await page.route(/\/api\//, (route) => route.fulfill({ json: backend.respond(route.request()) }));
    await page.addInitScript(() => localStorage.setItem('token', 'e2e-fake-token'));

    // Signed-in, not onboarded → sent to onboarding
    await page.goto('/');
    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(page.getByRole('heading', { name: 'What do you want to track?' })).toBeVisible();

    // Step 1: only Gold
    await page.getByText('Gold', { exact: true }).click();
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 2: one bank
    await expect(page.getByRole('heading', { name: 'Add your accounts' })).toBeVisible();
    await page.getByLabel('Account name').fill('Meezan');
    await page.getByLabel('Balance').fill('100000');
    await expect(page.getByText(/Net worth so far:/)).toContainText('100,000');
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 3: real net worth
    await expect(page.getByRole('heading', { name: "You're set up" })).toBeVisible();
    await expect(page.getByText(/Your net worth:/)).toContainText('100,000');
    await page.getByRole('button', { name: 'Go to dashboard' }).click();
    await expect(page).toHaveURL(/\/$/);

    expect(backend.state.writes).toEqual([
        { method: 'PATCH', path: '/users/me/preferences', body: { interests: ['gold'] } },
        { method: 'POST', path: '/banks', body: { name: 'Meezan', starting_balance: 100000 } },
        { method: 'PATCH', path: '/users/me/preferences', body: { completeOnboarding: true } },
    ]);

    // Menu trimmed to core + Gold
    const sidebar = page.locator('aside').first();
    await expect(sidebar.getByRole('link', { name: 'Accounts' }).first()).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Stocks' })).toHaveCount(0);
    await expect(sidebar.getByRole('link', { name: 'Ledger' })).toHaveCount(0);

    await page.goto('/personal');
    await expect(page.getByRole('button', { name: /Gold/ }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^Rent$/ })).toHaveCount(0);
});
