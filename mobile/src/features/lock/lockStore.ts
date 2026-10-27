import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { verifyPin } from '../../api/auth';
import { useSession } from '../session/sessionStore';

export const LOCK_AFTER_MS = 5 * 60 * 1000;
export const MAX_PIN_ATTEMPTS = 5;
const BIOMETRICS_KEY = 'biometrics_enabled';

/** True once the app has been in the background for 5 minutes or more. */
export const shouldLock = (backgroundedAt: number | null, now: number) =>
    backgroundedAt !== null && now - backgroundedAt >= LOCK_AFTER_MS;

type LockState = {
    locked: boolean;
    failedAttempts: number;
    backgroundedAt: number | null;
    biometricsEnabled: boolean;
    lock: () => void;
    onBackground: (now: number) => void;
    /** `canLock` = signed in with a PIN; otherwise there's nothing to unlock with. */
    onForeground: (now: number, canLock: boolean) => void;
    unlockWithPin: (pin: string) => Promise<'ok' | 'wrong' | 'signedOut'>;
    unlockWithBiometrics: () => Promise<boolean>;
    loadBiometricsSetting: () => Promise<void>;
    setBiometricsEnabled: (enabled: boolean) => Promise<void>;
};

export const useLock = create<LockState>((set, get) => ({
    locked: false,
    failedAttempts: 0,
    backgroundedAt: null,
    biometricsEnabled: false,

    lock: () => set({ locked: true }),

    onBackground: (now) => set({ backgroundedAt: now }),

    onForeground: (now, canLock) => {
        const away = shouldLock(get().backgroundedAt, now);
        set({ backgroundedAt: null, ...(away && canLock ? { locked: true } : {}) });
    },

    unlockWithPin: async (pin) => {
        try {
            await verifyPin(pin);
            set({ locked: false, failedAttempts: 0 });
            return 'ok';
        } catch {
            const failedAttempts = get().failedAttempts + 1;
            if (failedAttempts >= MAX_PIN_ATTEMPTS) {
                set({ locked: false, failedAttempts: 0 });
                await useSession.getState().signOut();
                return 'signedOut';
            }
            set({ failedAttempts });
            return 'wrong';
        }
    },

    unlockWithBiometrics: async () => {
        const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock WealthAxis', cancelLabel: 'Use PIN' });
        if (result.success) set({ locked: false, failedAttempts: 0 });
        return result.success;
    },

    loadBiometricsSetting: async () => {
        set({ biometricsEnabled: (await SecureStore.getItemAsync(BIOMETRICS_KEY)) === 'true' });
    },

    setBiometricsEnabled: async (enabled) => {
        await SecureStore.setItemAsync(BIOMETRICS_KEY, String(enabled));
        set({ biometricsEnabled: enabled });
    },
}));

/** Device can do fingerprint/face unlock and the user has enrolled one. */
export async function biometricsAvailable(): Promise<boolean> {
    return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
}
