import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../../services/api';
import { AuthProvider, useAuth } from '../AuthContext';

vi.mock('../../services/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

const fullUser = { id: 'u1', role: 'user', onboarded_at: null, interests: null };

let auth;
function Probe() {
    auth = useAuth();
    return <p>{auth.user ? `user:${auth.user.id}:${String(auth.user.onboarded_at)}` : 'no user'}</p>;
}

describe('AuthContext login sets the full user from /auth/me', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.mocked(api.get).mockReset().mockResolvedValue({ data: fullUser });
        vi.mocked(api.post).mockReset();
    });

    it.each([
        ['verifyOtp', () => auth.verifyOtp('u1', '123456'), '/auth/verify-otp'],
        ['googleLogin', () => auth.googleLogin('credential'), '/auth/google'],
        ['appleLogin', () => auth.appleLogin({ identityToken: 't' }), '/auth/apple'],
    ])('%s', async (_name, call, endpoint) => {
        // The login reply's user object lacks onboarding fields.
        vi.mocked(api.post).mockResolvedValue({ data: { token: 'jwt', user: { id: 'u1', role: 'user' } } });
        render(<AuthProvider><Probe /></AuthProvider>);
        await screen.findByText('no user');

        await act(call);

        expect(api.post).toHaveBeenCalledWith(endpoint, expect.anything());
        expect(api.get).toHaveBeenCalledWith('/auth/me');
        expect(screen.getByText('user:u1:null')).toBeInTheDocument();
        expect(localStorage.getItem('token')).toBe('jwt');
    });
});
