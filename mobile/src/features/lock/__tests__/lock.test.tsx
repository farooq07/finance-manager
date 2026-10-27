import { act } from 'react';
import { AppState } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { AxiosError } from 'axios';
import * as auth from '../../../api/auth';
import { useSession } from '../../session/sessionStore';
import { useLock, shouldLock, LOCK_AFTER_MS, MAX_PIN_ATTEMPTS } from '../lockStore';
import { LockScreen } from '../LockScreen';
import { PinSetupScreen } from '../PinSetupScreen';
import { PrivacyCover } from '../PrivacyCover';

jest.mock('../../../api/auth');
jest.mock('expo-local-authentication', () => ({
    hasHardwareAsync: jest.fn(async () => true),
    isEnrolledAsync: jest.fn(async () => true),
    authenticateAsync: jest.fn(),
}));

const api = jest.mocked(auth);
const bio = jest.mocked(LocalAuthentication);
const wrongPin = () => new AxiosError('Invalid PIN', 'ERR_BAD_REQUEST', undefined, {},
    { data: { message: 'Invalid PIN code', code: 'WRONG_PIN', attemptsLeft: 4 }, status: 401, statusText: '', headers: {}, config: {} as never });

const signOut = jest.fn(async () => {});
const refreshUser = jest.fn(async () => {});

beforeEach(() => {
    jest.clearAllMocks();
    useLock.setState({ locked: false, failedAttempts: 0, backgroundedAt: null, biometricsEnabled: false });
    useSession.setState({ signOut, refreshUser });
});

const typePin = async (digits: string) => {
    for (const d of digits) await fireEvent.press(screen.getByRole('button', { name: d }));
};

describe('shouldLock', () => {
    it('locks at exactly 5 minutes in the background, not before', () => {
        expect(LOCK_AFTER_MS).toBe(300000);
        expect(shouldLock(1000, 1000 + 299999)).toBe(false);
        expect(shouldLock(1000, 1000 + 300000)).toBe(true);
        expect(shouldLock(null, 999999999)).toBe(false);
    });
});

describe('lock store', () => {
    it('a correct PIN unlocks and resets the count', async () => {
        api.verifyPin.mockResolvedValue({ success: true });
        useLock.setState({ locked: true, failedAttempts: 2 });
        await expect(useLock.getState().unlockWithPin('1234')).resolves.toBe('ok');
        expect(useLock.getState()).toMatchObject({ locked: false, failedAttempts: 0 });
    });

    it('a wrong PIN counts an attempt and stays locked', async () => {
        api.verifyPin.mockRejectedValue(wrongPin());
        useLock.setState({ locked: true });
        await expect(useLock.getState().unlockWithPin('0000')).resolves.toBe('wrong');
        expect(useLock.getState()).toMatchObject({ locked: true, failedAttempts: 1 });
        expect(signOut).not.toHaveBeenCalled();
    });

    it(`the ${MAX_PIN_ATTEMPTS}th wrong PIN signs out`, async () => {
        expect(MAX_PIN_ATTEMPTS).toBe(5);
        api.verifyPin.mockRejectedValue(wrongPin());
        useLock.setState({ locked: true, failedAttempts: 4 });
        await expect(useLock.getState().unlockWithPin('0000')).resolves.toBe('signedOut');
        expect(signOut).toHaveBeenCalled();
        expect(useLock.getState()).toMatchObject({ locked: false, failedAttempts: 0 });
    });

    it('fingerprint success unlocks; failure stays locked', async () => {
        useLock.setState({ locked: true, biometricsEnabled: true });
        bio.authenticateAsync.mockResolvedValueOnce({ success: false, error: 'user_cancel' } as never);
        await expect(useLock.getState().unlockWithBiometrics()).resolves.toBe(false);
        expect(useLock.getState().locked).toBe(true);
        bio.authenticateAsync.mockResolvedValueOnce({ success: true } as never);
        await expect(useLock.getState().unlockWithBiometrics()).resolves.toBe(true);
        expect(useLock.getState().locked).toBe(false);
    });

    it('locks on return only after 5 minutes away, and only when a lock is possible', () => {
        const s = useLock.getState();
        s.onBackground(1000);
        s.onForeground(1000 + 299999, true);
        expect(useLock.getState().locked).toBe(false);
        s.onBackground(1000);
        s.onForeground(1000 + 300000, true);
        expect(useLock.getState().locked).toBe(true);

        useLock.setState({ locked: false });
        s.onBackground(1000);
        s.onForeground(1000 + 900000, false); // signed out / no PIN → nothing to lock
        expect(useLock.getState().locked).toBe(false);
    });
});

describe('LockScreen', () => {
    it('unlocks after 6 correct digits', async () => {
        api.verifyPin.mockResolvedValue({ success: true });
        useLock.setState({ locked: true });
        await render(<LockScreen />);
        await typePin('123456');
        await waitFor(() => expect(api.verifyPin).toHaveBeenCalledWith('123456'));
        expect(useLock.getState().locked).toBe(false);
    });

    it('says how many tries are left after a wrong PIN', async () => {
        api.verifyPin.mockRejectedValue(wrongPin());
        useLock.setState({ locked: true });
        await render(<LockScreen />);
        await typePin('000000');
        expect(await screen.findByText('Wrong PIN. 4 tries left.')).toBeTruthy();
    });

    it('offers fingerprint only when it is turned on', async () => {
        useLock.setState({ locked: true, biometricsEnabled: false });
        const { rerender } = await render(<LockScreen />);
        expect(screen.queryByRole('button', { name: 'Use fingerprint' })).toBeNull();
        useLock.setState({ biometricsEnabled: true });
        await rerender(<LockScreen />);
        expect(screen.getByRole('button', { name: 'Use fingerprint' })).toBeTruthy();
    });
});

describe('PinSetupScreen', () => {
    it('needs the same 6 digits twice, then saves and reloads the user', async () => {
        api.setPin.mockResolvedValue({});
        await render(<PinSetupScreen />);
        expect(screen.getByText('Choose a 6-digit PIN')).toBeTruthy();
        await typePin('123456');
        expect(await screen.findByText('Enter it again')).toBeTruthy();
        await typePin('999999');
        expect(await screen.findByText("PINs didn't match. Try again.")).toBeTruthy();
        expect(api.setPin).not.toHaveBeenCalled();

        await typePin('123456');
        await typePin('123456');
        await waitFor(() => expect(api.setPin).toHaveBeenCalledWith('123456'));
        expect(await screen.findByRole('button', { name: 'Turn on fingerprint' })).toBeTruthy();
    });

    it('turning on fingerprint (or skipping) finishes setup', async () => {
        api.setPin.mockResolvedValue({});
        bio.authenticateAsync.mockResolvedValue({ success: true } as never);
        await render(<PinSetupScreen />);
        await typePin('123456');
        await screen.findByText('Enter it again');
        await typePin('123456');
        await fireEvent.press(await screen.findByRole('button', { name: 'Turn on fingerprint' }));
        await waitFor(() => expect(refreshUser).toHaveBeenCalled());
        expect(useLock.getState().biometricsEnabled).toBe(true);
    });
});

describe('PrivacyCover', () => {
    it('hides the screen while the app is in the background', async () => {
        let listener: (state: string) => void = () => {};
        jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, fn) => {
            listener = fn as (state: string) => void;
            return { remove: jest.fn() } as never;
        });
        await render(<PrivacyCover />);
        expect(screen.queryByTestId('privacy-cover')).toBeNull();
        await act(async () => listener('background'));
        expect(screen.getByTestId('privacy-cover')).toBeTruthy();
        await act(async () => listener('active'));
        expect(screen.queryByTestId('privacy-cover')).toBeNull();
    });
});
