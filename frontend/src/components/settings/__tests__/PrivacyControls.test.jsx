import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../../../services/api';
import PrivacyControls from '../PrivacyControls';

vi.mock('../../../services/api', () => ({ setSessionEndedHandler: vi.fn(), default: { patch: vi.fn(), post: vi.fn() } }));
const auth = { user: { notifications: { weeklySummary: true, billReminders: false } }, refreshUser: vi.fn(), logout: vi.fn() };
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('PrivacyControls', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('shows and saves email choices', async () => {
        vi.mocked(api.patch).mockResolvedValue({ data: {} });
        render(<PrivacyControls />);
        const weekly = screen.getByRole('checkbox', { name: /weekly summary/i });
        expect(weekly).toBeChecked();
        expect(screen.getByRole('checkbox', { name: /bill reminders/i })).not.toBeChecked();

        fireEvent.click(weekly);
        await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/users/me/preferences', { notifications: { weeklySummary: false } }));
        expect(auth.refreshUser).toHaveBeenCalled();
    });

    it('signs out other devices and keeps this one signed in', async () => {
        vi.mocked(api.post).mockResolvedValue({ data: { token: 'fresh-token' } });
        render(<PrivacyControls />);
        fireEvent.click(screen.getByRole('button', { name: /sign out of all other devices/i }));
        await waitFor(() => expect(localStorage.getItem('token')).toBe('fresh-token'));
        expect(api.post).toHaveBeenCalledWith('/auth/sessions/revoke-all');
    });

    it('deleting the account needs the password and then signs out', async () => {
        vi.mocked(api.post).mockResolvedValue({ data: { message: 'queued' } });
        render(<PrivacyControls />);
        fireEvent.click(screen.getByRole('button', { name: /delete my account…/i }));
        fireEvent.change(screen.getByLabelText(/your password/i), { target: { value: 'secret123' } });
        fireEvent.click(screen.getByRole('button', { name: /^delete my account$/i }));
        await waitFor(() => expect(api.post).toHaveBeenCalledWith('/users/me/deletion-request', { password: 'secret123' }));
        expect(auth.logout).toHaveBeenCalled();
    });
});
