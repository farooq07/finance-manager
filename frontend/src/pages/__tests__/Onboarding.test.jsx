import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toast } from 'sonner';
import api from '../../services/api';
import { fmtPKR } from '../../utils/currency';
import Onboarding from '../Onboarding';

vi.mock('../../services/api', () => ({ setSessionEndedHandler: vi.fn(), default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
const refreshUser = vi.fn(async () => {});
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', interests: null }, refreshUser }) }));

let existing;
let summary;
const apiError = (message) => Object.assign(new Error(message), { response: { data: { message } } });

const renderPage = () => render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <MemoryRouter initialEntries={['/onboarding']}>
            <Routes>
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/" element={<p>DASHBOARD</p>} />
            </Routes>
        </MemoryRouter>
    </QueryClientProvider>,
);

const continueBtn = () => screen.getByRole('button', { name: 'Continue' });
const toStep2 = async () => {
    renderPage();
    fireEvent.click(continueBtn());
    await screen.findByRole('heading', { name: 'Add your accounts' });
};
const fillRow = (index, { type, name, balance }) => {
    if (type) fireEvent.change(screen.getAllByLabelText('Account type')[index], { target: { value: type } });
    if (name !== undefined) fireEvent.change(screen.getAllByLabelText('Account name')[index], { target: { value: name } });
    if (balance !== undefined) fireEvent.change(screen.getAllByLabelText('Balance')[index], { target: { value: balance } });
};

describe('Onboarding', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        existing = { banks: [], wallets: [] };
        summary = () => Promise.resolve({ data: { metrics: { netWorth: 123456 } } });
        vi.mocked(api.get).mockImplementation((url) => {
            if (url === '/banks') return Promise.resolve({ data: existing.banks });
            if (url === '/wallets') return Promise.resolve({ data: existing.wallets });
            if (url === '/dashboard/summary') return summary();
            return Promise.reject(new Error(`unexpected GET ${url}`));
        });
        vi.mocked(api.patch).mockResolvedValue({ data: {} });
    });

    it('step 1 saves picks and moves on', async () => {
        renderPage();
        expect(screen.getByRole('heading', { name: 'What do you want to track?' })).toBeInTheDocument();
        expect(screen.getByText('Accounts, expenses, Zakat and reports are always included.')).toBeInTheDocument();
        fireEvent.click(screen.getByLabelText(/^Gold/));
        fireEvent.click(continueBtn());
        await screen.findByRole('heading', { name: 'Add your accounts' });
        expect(api.patch).toHaveBeenCalledWith('/users/me/preferences', { interests: ['gold'] });
        expect(refreshUser).toHaveBeenCalled();
    });

    it('zero picks saves []', async () => {
        await toStep2();
        expect(api.patch).toHaveBeenCalledWith('/users/me/preferences', { interests: [] });
    });

    it('preferences failure keeps the user on the step with a toast', async () => {
        vi.mocked(api.patch).mockRejectedValueOnce(apiError('Could not save your preferences'));
        renderPage();
        fireEvent.click(continueBtn());
        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Could not save your preferences'));
        expect(screen.getByRole('heading', { name: 'What do you want to track?' })).toBeInTheDocument();
    });

    it('continue needs at least one account', async () => {
        await toStep2();
        expect(continueBtn()).toBeDisabled();
        fillRow(0, { name: 'Meezan', balance: '0' });
        expect(continueBtn()).toBeEnabled();
    });

    it('blank balance is not accepted', async () => {
        await toStep2();
        fillRow(0, { name: 'Meezan' });
        expect(continueBtn()).toBeDisabled();
    });

    it('shows a live net-worth total', async () => {
        await toStep2();
        fillRow(0, { name: 'Meezan', balance: '100000' });
        expect(screen.getByText(/Net worth so far:/).textContent).toContain(fmtPKR(100000));
    });

    it('one failing row stays with its error, others are saved', async () => {
        // Like the real server: a saved bank shows up in later GET /banks.
        vi.mocked(api.post).mockImplementation((url, body) => {
            if (url !== '/banks') return Promise.reject(apiError('Wallet name is required'));
            const bank = { id: 'b1', name: body.name, current_balance: String(body.starting_balance) };
            existing.banks = [...existing.banks, bank];
            return Promise.resolve({ data: bank });
        });
        await toStep2();
        fillRow(0, { type: 'bank', name: 'Meezan', balance: '100000' });
        fireEvent.click(screen.getByRole('button', { name: '+ Add another' }));
        fillRow(1, { type: 'wallet', name: 'JazzCash', balance: '5000' });
        fireEvent.click(continueBtn());

        await screen.findByText('Wallet name is required');
        expect(api.post).toHaveBeenCalledWith('/banks', { name: 'Meezan', starting_balance: 100000 });
        expect(api.post).toHaveBeenCalledWith('/wallets', { name: 'JazzCash', institution: 'JazzCash', balance: 5000 });
        expect(screen.getByRole('heading', { name: 'Add your accounts' })).toBeInTheDocument();
        expect(screen.getAllByLabelText('Account name')).toHaveLength(1); // only the failed row is still editable
        // The saved bank is listed exactly once, and counted once.
        await waitFor(() => expect(screen.getAllByText('Meezan')).toHaveLength(1));
        expect(screen.getByText(/Net worth so far:/).textContent).toContain(fmtPKR(105000));
    });

    it('accepts balances typed with commas', async () => {
        vi.mocked(api.post).mockResolvedValue({ data: { id: 'b1', name: 'Meezan', current_balance: '150000' } });
        await toStep2();
        fillRow(0, { name: 'Meezan', balance: '1,50,000' });
        expect(continueBtn()).toBeEnabled();
        fireEvent.click(continueBtn());
        await waitFor(() => expect(api.post).toHaveBeenCalledWith('/banks', { name: 'Meezan', starting_balance: 150000 }));
    });

    it.each([
        ['-500', "Balance can't be negative"],
        ['abc', 'Enter an amount like 100000'],
    ])('explains an invalid balance %s', async (balance, message) => {
        await toStep2();
        fillRow(0, { name: 'Meezan', balance });
        expect(screen.getByText(message)).toBeInTheDocument();
        expect(continueBtn()).toBeDisabled();
    });

    it('lists existing accounts and does not resend them', async () => {
        existing.banks = [{ id: 'b0', name: 'HBL', current_balance: '2500' }];
        await toStep2();
        expect(await screen.findByText('HBL')).toBeInTheDocument();
        await waitFor(() => expect(continueBtn()).toBeEnabled());
        fireEvent.click(continueBtn());
        await screen.findByRole('heading', { name: "You're set up" });
        expect(api.post).not.toHaveBeenCalled();
    });

    it('step 3 shows the real net worth', async () => {
        existing.banks = [{ id: 'b0', name: 'HBL', current_balance: '2500' }];
        await toStep2();
        await waitFor(() => expect(continueBtn()).toBeEnabled());
        fireEvent.click(continueBtn());
        await screen.findByText(/Your net worth:/);
        await waitFor(() => expect(screen.getByText(/Your net worth:/).textContent).toContain(fmtPKR(123456)));
    });

    it('net-worth falls back to typed total', async () => {
        summary = () => Promise.reject(new Error('down'));
        existing.banks = [{ id: 'b0', name: 'HBL', current_balance: '2500' }];
        await toStep2();
        await waitFor(() => expect(continueBtn()).toBeEnabled());
        fireEvent.click(continueBtn());
        await screen.findByRole('heading', { name: "You're set up" });
        await waitFor(() => expect(screen.getByText(/Your net worth:/).textContent).toContain(fmtPKR(2500)));
    });

    it('go to dashboard completes onboarding', async () => {
        existing.banks = [{ id: 'b0', name: 'HBL', current_balance: '2500' }];
        await toStep2();
        await waitFor(() => expect(continueBtn()).toBeEnabled());
        fireEvent.click(continueBtn());
        fireEvent.click(await screen.findByRole('button', { name: 'Go to dashboard' }));
        await screen.findByText('DASHBOARD');
        expect(api.patch).toHaveBeenLastCalledWith('/users/me/preferences', { completeOnboarding: true });
    });

    it('skip completes onboarding and keeps saved picks', async () => {
        renderPage();
        fireEvent.click(screen.getByRole('button', { name: 'Skip setup' }));
        await screen.findByText('DASHBOARD');
        expect(api.patch).toHaveBeenCalledTimes(1);
        expect(api.patch).toHaveBeenCalledWith('/users/me/preferences', { completeOnboarding: true });
    });
});
