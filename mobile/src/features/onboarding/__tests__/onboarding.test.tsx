import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import * as accounts from '../../../api/accounts';
import { useSession } from '../../session/sessionStore';
import { fmtPKR } from '../../../lib/currency';
import { testQueryClient } from '../../../testing/queryClient';
import { OnboardingScreen } from '../OnboardingScreen';

jest.mock('../../../api/accounts');
const api = jest.mocked(accounts);
const serverError = (message: string) =>
    new AxiosError(message, 'ERR_BAD_REQUEST', undefined, {}, { data: { message }, status: 400, statusText: '', headers: {}, config: {} as never });

const refreshUser = jest.fn(async () => {});
let existingBanks: { id: string; name: string; current_balance: string }[];

const renderScreen = () => render(<QueryClientProvider client={testQueryClient()}><OnboardingScreen /></QueryClientProvider>);
const continueBtn = () => screen.getByRole('button', { name: 'Continue' });
const toStep2 = async () => {
    await renderScreen();
    await fireEvent.press(continueBtn());
    await screen.findByRole('header', { name: 'Add your accounts' });
};
const fillRow = async (i: number, { name, balance, wallet }: { name?: string; balance?: string; wallet?: boolean }) => {
    if (wallet) await fireEvent.press(screen.getAllByRole('button', { name: 'Wallet' })[i]);
    if (name !== undefined) await fireEvent.changeText(screen.getAllByLabelText('Account name')[i], name);
    if (balance !== undefined) await fireEvent.changeText(screen.getAllByLabelText('Balance')[i], balance);
};

beforeEach(() => {
    jest.clearAllMocks();
    existingBanks = [];
    useSession.setState({ refreshUser, user: { id: 'u1', role: 'user', interests: null, onboarded_at: null } });
    api.getBanks.mockImplementation(async () => existingBanks as never);
    api.getWallets.mockResolvedValue([]);
    api.updatePreferences.mockResolvedValue({ onboarded_at: null, interests: [] });
    api.getDashboardSummary.mockResolvedValue({ metrics: { netWorth: 123456 } });
});

describe('Onboarding step 1', () => {
    it('saves picks and moves on', async () => {
        await renderScreen();
        expect(screen.getByRole('header', { name: 'What do you want to track?' })).toBeTruthy();
        expect(screen.getByText('Accounts, expenses, Zakat and reports are always included.')).toBeTruthy();
        await fireEvent.press(screen.getByRole('checkbox', { name: /^Gold/ }));
        await fireEvent.press(continueBtn());
        await screen.findByRole('header', { name: 'Add your accounts' });
        expect(api.updatePreferences).toHaveBeenCalledWith({ interests: ['gold'] });
        expect(refreshUser).toHaveBeenCalled();
    });

    it('zero picks saves []', async () => {
        await toStep2();
        expect(api.updatePreferences).toHaveBeenCalledWith({ interests: [] });
    });

    it('a failed save keeps the user on the step and says why', async () => {
        api.updatePreferences.mockRejectedValueOnce(serverError('Could not save your preferences'));
        await renderScreen();
        await fireEvent.press(continueBtn());
        expect(await screen.findByText('Could not save your preferences')).toBeTruthy();
        expect(screen.getByRole('header', { name: 'What do you want to track?' })).toBeTruthy();
    });
});

describe('Onboarding step 2', () => {
    it('continue needs at least one account; 0 is a valid balance', async () => {
        await toStep2();
        expect(continueBtn()).toBeDisabled();
        await fillRow(0, { name: 'Meezan', balance: '0' });
        expect(continueBtn()).toBeEnabled();
    });

    it('a blank balance is not accepted', async () => {
        await toStep2();
        await fillRow(0, { name: 'Meezan' });
        expect(continueBtn()).toBeDisabled();
    });

    it('accepts "1,50,000" and shows the live total', async () => {
        api.createBank.mockResolvedValue({ id: 'b1', name: 'Meezan', current_balance: '150000' });
        await toStep2();
        await fillRow(0, { name: 'Meezan', balance: '1,50,000' });
        expect(screen.getByText(fmtPKR(150000))).toBeTruthy();
        await fireEvent.press(continueBtn());
        await waitFor(() => expect(api.createBank).toHaveBeenCalledWith('Meezan', 150000));
    });

    it.each([
        ['-500', "Balance can't be negative"],
        ['abc', 'Enter an amount like 100000'],
    ])('explains an invalid balance %s', async (balance, message) => {
        await toStep2();
        await fillRow(0, { name: 'Meezan', balance });
        expect(screen.getByText(message)).toBeTruthy();
        expect(continueBtn()).toBeDisabled();
    });

    it('one failing row keeps its error; the saved one is listed once and counted once', async () => {
        api.createBank.mockImplementation(async (name, balance) => {
            const bank = { id: 'b1', name, current_balance: String(balance) };
            existingBanks = [...existingBanks, bank];
            return bank;
        });
        api.createWallet.mockRejectedValue(serverError('Wallet name is required'));
        await toStep2();
        await fillRow(0, { name: 'Meezan', balance: '100000' });
        await fireEvent.press(screen.getByRole('button', { name: '+ Add another' }));
        await fillRow(1, { wallet: true, name: 'JazzCash', balance: '5000' });
        await fireEvent.press(continueBtn());

        expect(await screen.findByText('Wallet name is required')).toBeTruthy();
        expect(api.createWallet).toHaveBeenCalledWith('JazzCash', 5000);
        expect(screen.getAllByLabelText('Account name')).toHaveLength(1);
        await waitFor(() => expect(screen.getAllByText('Meezan')).toHaveLength(1));
        expect(screen.getByText(fmtPKR(105000))).toBeTruthy();
    });

    it('lists existing accounts and does not resend them', async () => {
        existingBanks = [{ id: 'b0', name: 'HBL', current_balance: '2500' }];
        await toStep2();
        expect(await screen.findByText('HBL')).toBeTruthy();
        await waitFor(() => expect(continueBtn()).toBeEnabled());
        await fireEvent.press(continueBtn());
        await screen.findByRole('header', { name: "You're set up" });
        expect(api.createBank).not.toHaveBeenCalled();
    });
});

describe('Onboarding step 3', () => {
    const toStep3 = async () => {
        existingBanks = [{ id: 'b0', name: 'HBL', current_balance: '2500' }];
        await toStep2();
        await waitFor(() => expect(continueBtn()).toBeEnabled());
        await fireEvent.press(continueBtn());
        await screen.findByRole('header', { name: "You're set up" });
    };

    it('shows the real net worth', async () => {
        await toStep3();
        expect(await screen.findByText(fmtPKR(123456))).toBeTruthy();
    });

    it('falls back to the typed total when the summary fails', async () => {
        api.getDashboardSummary.mockRejectedValue(new Error('down'));
        await toStep3();
        expect(await screen.findByText(fmtPKR(2500))).toBeTruthy();
    });

    it('Go to Home completes onboarding and reloads the user', async () => {
        await toStep3();
        await fireEvent.press(screen.getByRole('button', { name: 'Go to Home' }));
        await waitFor(() => expect(api.updatePreferences).toHaveBeenLastCalledWith({ completeOnboarding: true }));
        expect(refreshUser).toHaveBeenCalled();
    });
});

describe('Skip', () => {
    it('completes onboarding without saving picks', async () => {
        await renderScreen();
        await fireEvent.press(screen.getByRole('button', { name: 'Skip setup' }));
        await waitFor(() => expect(api.updatePreferences).toHaveBeenCalledTimes(1));
        expect(api.updatePreferences).toHaveBeenCalledWith({ completeOnboarding: true });
        expect(refreshUser).toHaveBeenCalled();
    });
});
