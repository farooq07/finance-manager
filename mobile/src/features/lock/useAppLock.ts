import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useSession } from '../session/sessionStore';
import { useLock } from './lockStore';

const hasPin = () => {
    const { status, user } = useSession.getState();
    return status === 'signedIn' && user?.hasPin === true;
};

/**
 * Wires the PIN lock to the app's life cycle:
 * - app opens with a restored session that has a PIN → locked
 *   (a fresh sign-in just proved who you are, so it isn't locked)
 * - back from the background after 5+ minutes → locked
 * - signing out → unlocked (nothing left to protect)
 */
export function useAppLock() {
    useEffect(() => {
        void useLock.getState().loadBiometricsSetting().catch(() => {});

        const unsubscribe = useSession.subscribe((state, prev) => {
            if (prev.status === 'loading' && state.status === 'signedIn' && state.user?.hasPin === true) {
                useLock.getState().lock();
            }
            if (state.status === 'signedOut' && prev.status !== 'signedOut') {
                useLock.setState({ locked: false, failedAttempts: 0 });
            }
        });

        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'background') useLock.getState().onBackground(Date.now());
            if (state === 'active') useLock.getState().onForeground(Date.now(), hasPin());
        });

        return () => {
            unsubscribe();
            sub.remove();
        };
    }, []);
}
