import * as SecureStore from 'expo-secure-store';
import { api } from '../../../api/client';
import { useSession } from '../sessionStore';
import { ok, httpError, networkError } from '../../../api/__tests__/testServer';
import type { InternalAxiosRequestConfig } from 'axios';

const store = (SecureStore as unknown as { __store: Map<string, string> }).__store;
const me = { id: 'u1', name: 'Ali', email: 'a@x.com', role: 'user', hasPin: true, must_change_password: false, onboarded_at: '2026-10-21T00:00:00Z', interests: null };

const serve = (fn: (config: InternalAxiosRequestConfig) => ReturnType<typeof ok>) => {
    api.defaults.adapter = jest.fn(fn);
};

describe('session store', () => {
    beforeEach(() => {
        store.clear();
        useSession.setState({ status: 'loading', user: null, offline: false });
    });

    it('boot without a token → signed out', async () => {
        await useSession.getState().boot();
        expect(useSession.getState().status).toBe('signedOut');
    });

    it('boot with a valid token → signed in with the user from /auth/me', async () => {
        store.set('auth_token', 'jwt');
        serve((config) => ok(config, me));
        await useSession.getState().boot();
        expect(useSession.getState()).toMatchObject({ status: 'signedIn', user: me, offline: false });
    });

    it('boot with an expired token (401) → signed out and token removed', async () => {
        store.set('auth_token', 'old');
        serve((config) => httpError(config, 401));
        await useSession.getState().boot();
        expect(useSession.getState().status).toBe('signedOut');
        expect(store.has('auth_token')).toBe(false);
    });

    it('network error keeps the session (offline, cached user)', async () => {
        store.set('auth_token', 'jwt');
        store.set('last_user', JSON.stringify(me));
        serve(networkError);
        await useSession.getState().boot();
        expect(useSession.getState()).toMatchObject({ status: 'signedIn', user: me, offline: true });
        expect(store.get('auth_token')).toBe('jwt');
    });

    it('offline with no cached user → signed out but the token is kept for next time', async () => {
        store.set('auth_token', 'jwt');
        serve(networkError);
        await useSession.getState().boot();
        expect(useSession.getState()).toMatchObject({ status: 'signedOut', offline: true });
        expect(store.get('auth_token')).toBe('jwt');
    });

    it('adoptSession stores the token and loads the full user', async () => {
        serve((config) => ok(config, me));
        await useSession.getState().adoptSession('new-jwt', { id: 'u1', role: 'user' });
        expect(store.get('auth_token')).toBe('new-jwt');
        expect(useSession.getState()).toMatchObject({ status: 'signedIn', user: me });
        expect(JSON.parse(store.get('last_user') as string)).toEqual(me);
    });

    it('adoptSession falls back to the login user when /auth/me fails', async () => {
        serve((config) => httpError(config, 500));
        await useSession.getState().adoptSession('new-jwt', { id: 'u1', role: 'user' });
        expect(useSession.getState()).toMatchObject({ status: 'signedIn', user: { id: 'u1', role: 'user' } });
    });

    it('signOut clears token, cached user and state', async () => {
        store.set('auth_token', 'jwt');
        store.set('last_user', JSON.stringify(me));
        useSession.setState({ status: 'signedIn', user: me });
        await useSession.getState().signOut();
        expect(store.has('auth_token')).toBe(false);
        expect(store.has('last_user')).toBe(false);
        expect(useSession.getState()).toMatchObject({ status: 'signedOut', user: null });
    });

    it('a 401 on any request signs the user out', async () => {
        store.set('auth_token', 'jwt');
        useSession.setState({ status: 'signedIn', user: me });
        serve((config) => httpError(config, 401));
        await api.get('/banks').catch(() => {});
        await Promise.resolve();
        expect(useSession.getState().status).toBe('signedOut');
    });
});
