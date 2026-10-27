import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { TOKEN_KEY, isNetworkError, setUnauthorizedHandler } from '../../api/client';
import { getMe } from '../../api/auth';
import { forgetPushOnSignOut } from '../notifications/push';
import type { User } from '../../api/types';

const LAST_USER_KEY = 'last_user';

type SessionState = {
    status: 'loading' | 'signedOut' | 'signedIn';
    user: User | null;
    /** true when the last attempt to reach the server failed */
    offline: boolean;
    boot: () => Promise<void>;
    refreshUser: () => Promise<void>;
    adoptSession: (token: string, loginUser: User) => Promise<void>;
    signOut: () => Promise<void>;
};

async function readCachedUser(): Promise<User | null> {
    try {
        const raw = await SecureStore.getItemAsync(LAST_USER_KEY);
        return raw ? (JSON.parse(raw) as User) : null;
    } catch {
        return null;
    }
}

export const useSession = create<SessionState>((set, get) => ({
    status: 'loading',
    user: null,
    offline: false,

    /** On app start: restore the session from the stored token. */
    boot: async () => {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!token) return set({ status: 'signedOut', user: null });
        try {
            await get().refreshUser();
        } catch (err) {
            if (get().status === 'signedOut') return; // a 401 already signed us out
            // No connection (or a server hiccup): keep the session with the
            // last known user; the token stays so the next open works online.
            const cached = await readCachedUser();
            set(cached
                ? { status: 'signedIn', user: cached, offline: isNetworkError(err) }
                : { status: 'signedOut', user: null, offline: isNetworkError(err) });
        }
    },

    /** Load the full profile (incl. onboarding fields) and cache it. */
    refreshUser: async () => {
        const user = await getMe();
        await SecureStore.setItemAsync(LAST_USER_KEY, JSON.stringify(user));
        set({ status: 'signedIn', user, offline: false });
    },

    /** After any successful sign-in. /auth/me failing must not undo the sign-in. */
    adoptSession: async (token, loginUser) => {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
        try {
            await get().refreshUser();
        } catch {
            set({ status: 'signedIn', user: loginUser });
        }
    },

    signOut: async () => {
        await forgetPushOnSignOut().catch(() => {}); // needs the token, so before it's gone
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(LAST_USER_KEY);
        set({ status: 'signedOut', user: null });
    },
}));

// Any 401 from the server ends the session.
setUnauthorizedHandler(() => {
    void useSession.getState().signOut();
});
