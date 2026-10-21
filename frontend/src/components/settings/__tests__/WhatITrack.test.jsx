import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toast } from 'sonner';
import api from '../../../services/api';
import WhatITrack from '../WhatITrack';

vi.mock('../../../services/api', () => ({ default: { patch: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
let currentUser;
const refreshUser = vi.fn(async () => {});
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: currentUser, refreshUser }) }));

const renderCard = () => render(
    <QueryClientProvider client={new QueryClient()}>
        <WhatITrack />
    </QueryClientProvider>,
);

describe('WhatITrack', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(api.patch).mockResolvedValue({ data: {} });
    });

    it('shows current picks checked', () => {
        currentUser = { interests: ['gold'] };
        renderCard();
        expect(screen.getByLabelText(/^Gold/)).toBeChecked();
        expect(screen.getByLabelText(/^Stocks/)).not.toBeChecked();
    });

    it('with no picks saved (null), everything shows as ticked', () => {
        currentUser = { interests: null };
        renderCard();
        expect(screen.getByLabelText(/^Gold/)).toBeChecked();
        expect(screen.getByLabelText(/^Stocks/)).toBeChecked();
    });

    it('saving picks sends interests', async () => {
        currentUser = { interests: ['gold'] };
        renderCard();
        fireEvent.click(screen.getByLabelText(/^Stocks/));
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/users/me/preferences', { interests: ['gold', 'stocks'] }));
        expect(toast.success).toHaveBeenCalled();
        expect(refreshUser).toHaveBeenCalled();
    });

    it('Show everything sends null', async () => {
        currentUser = { interests: [] };
        renderCard();
        fireEvent.click(screen.getByRole('button', { name: 'Show everything' }));
        await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/users/me/preferences', { interests: null }));
    });

    it('a failed save shows the server message', async () => {
        currentUser = { interests: [] };
        vi.mocked(api.patch).mockRejectedValueOnce({ response: { data: { message: 'Unknown interest: x' } } });
        renderCard();
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Unknown interest: x'));
    });
});
