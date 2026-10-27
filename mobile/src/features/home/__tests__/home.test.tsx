import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import * as accounts from '../../../api/accounts';
import { useSession } from '../../session/sessionStore';
import { fmtPKR } from '../../../lib/currency';
import { testQueryClient } from '../../../testing/queryClient';
import { HomeScreen } from '../HomeScreen';

jest.mock('../../../api/accounts');
const api = jest.mocked(accounts);

const renderHome = () => render(<QueryClientProvider client={testQueryClient()}><HomeScreen /></QueryClientProvider>);

beforeEach(() => {
    jest.clearAllMocks();
    useSession.setState({ user: { id: 'u1', role: 'user', name: 'Ali Khan' }, offline: false });
});

describe('HomeScreen', () => {
    it('greets the user and shows net worth', async () => {
        api.getDashboardSummary.mockResolvedValue({ metrics: { netWorth: 1250000, currentMonthExpenses: 42000 } });
        await renderHome();
        expect(screen.getByText('Hi, Ali')).toBeTruthy();
        expect(await screen.findByText(fmtPKR(1250000))).toBeTruthy();
        expect(screen.getByText('Net worth')).toBeTruthy();
        expect(screen.getByText(`Spent this month: ${fmtPKR(42000)}`)).toBeTruthy();
    });

    it('shows a skeleton while loading', async () => {
        api.getDashboardSummary.mockReturnValue(new Promise(() => {}));
        await renderHome();
        expect(screen.getAllByLabelText('Loading').length).toBeGreaterThan(0);
    });

    it('error → Try again refetches', async () => {
        api.getDashboardSummary.mockRejectedValueOnce(new Error('down'))
            .mockResolvedValueOnce({ metrics: { netWorth: 5000 } });
        await renderHome();
        await fireEvent.press(await screen.findByRole('button', { name: 'Try again' }));
        expect(await screen.findByText(fmtPKR(5000))).toBeTruthy();
        expect(api.getDashboardSummary).toHaveBeenCalledTimes(2);
    });

    it('shows the offline banner when working from saved data', async () => {
        useSession.setState({ offline: true });
        api.getDashboardSummary.mockResolvedValue({ metrics: { netWorth: 5000 } });
        await renderHome();
        expect(screen.getByText("You're offline — showing saved data")).toBeTruthy();
        await waitFor(() => expect(api.getDashboardSummary).toHaveBeenCalled());
    });
});
