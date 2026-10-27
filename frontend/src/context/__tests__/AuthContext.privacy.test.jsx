import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../../services/api';
import { queryClient } from '../../providers/QueryProvider';
import { setVaultToken, getVaultToken } from '../../services/goldVault';
import { AuthProvider, useAuth } from '../AuthContext';

vi.mock('../../services/api', () => ({ setSessionEndedHandler: vi.fn(), default: { get: vi.fn(), post: vi.fn() } }));

let auth;
function Probe() {
    auth = useAuth();
    return <p>{auth.user ? `user:${auth.user.id}` : 'no user'}</p>;
}

describe('private data is dropped when the identity changes', () => {
    beforeEach(() => {
        localStorage.clear();
        queryClient.clear();
        vi.mocked(api.get).mockReset();
        vi.mocked(api.post).mockReset();
    });

    it('logout clears cached records and locks the Gold Vault', async () => {
        localStorage.setItem('token', 'jwt');
        vi.mocked(api.get).mockResolvedValue({ data: { id: 'u1' } });
        render(<AuthProvider><Probe /></AuthProvider>);
        await screen.findByText('user:u1');

        queryClient.setQueryData(['dashboard-summary'], { metrics: { netWorth: 999 } });
        setVaultToken('vault', 900);

        act(() => auth.logout());

        expect(screen.getByText('no user')).toBeInTheDocument();
        expect(queryClient.getQueryData(['dashboard-summary'])).toBeUndefined();
        expect(getVaultToken()).toBeNull();
        expect(localStorage.getItem('token')).toBeNull();
    });

    it('signing in as someone else drops the previous user\'s cache', async () => {
        localStorage.setItem('token', 'jwt-a');
        vi.mocked(api.get).mockResolvedValueOnce({ data: { id: 'a' } });
        render(<AuthProvider><Probe /></AuthProvider>);
        await screen.findByText('user:a');
        queryClient.setQueryData(['banks'], [{ id: 'bank-of-a' }]);

        vi.mocked(api.post).mockResolvedValue({ data: { token: 'jwt-b', user: { id: 'b' } } });
        vi.mocked(api.get).mockResolvedValue({ data: { id: 'b' } });
        await act(() => auth.verifyOtp('b', '123456'));

        expect(screen.getByText('user:b')).toBeInTheDocument();
        expect(queryClient.getQueryData(['banks'])).toBeUndefined();
    });
});
