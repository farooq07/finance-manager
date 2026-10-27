import { act } from 'react';
import { AppState, Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { useSession } from '../../session/sessionStore';
import { useLock } from '../lockStore';
import { useAppLock } from '../useAppLock';

jest.mock('../../../api/auth');

function Probe() {
    useAppLock();
    return <Text>probe</Text>;
}

const withPin = { id: 'u1', role: 'user', hasPin: true };

describe('useAppLock', () => {
    let appStateListener: (s: string) => void;

    beforeEach(() => {
        useLock.setState({ locked: false, failedAttempts: 0, backgroundedAt: null });
        jest.spyOn(AppState, 'addEventListener').mockImplementation((_t, fn) => {
            appStateListener = fn as (s: string) => void;
            return { remove: jest.fn() } as never;
        });
    });
    afterEach(() => jest.restoreAllMocks());

    it('locks when the app opens with a restored session that has a PIN', async () => {
        useSession.setState({ status: 'loading', user: null });
        await render(<Probe />);
        await act(async () => useSession.setState({ status: 'signedIn', user: withPin }));
        expect(useLock.getState().locked).toBe(true);
    });

    it('does not lock right after a fresh sign-in', async () => {
        useSession.setState({ status: 'loading', user: null });
        await render(<Probe />);
        await act(async () => useSession.setState({ status: 'signedOut', user: null }));
        await act(async () => useSession.setState({ status: 'signedIn', user: withPin }));
        expect(useLock.getState().locked).toBe(false);
    });

    it('does not lock a user who has no PIN yet', async () => {
        useSession.setState({ status: 'loading', user: null });
        await render(<Probe />);
        await act(async () => useSession.setState({ status: 'signedIn', user: { ...withPin, hasPin: false } }));
        expect(useLock.getState().locked).toBe(false);
    });

    it('locks on return after 5 minutes in the background', async () => {
        const now = jest.spyOn(Date, 'now');
        useSession.setState({ status: 'signedIn', user: withPin });
        await render(<Probe />);
        useLock.setState({ locked: false });
        now.mockReturnValue(1_000);
        await act(async () => appStateListener('background'));
        now.mockReturnValue(1_000 + 300_000);
        await act(async () => appStateListener('active'));
        expect(useLock.getState().locked).toBe(true);
    });

    it('signing out clears the lock', async () => {
        useSession.setState({ status: 'signedIn', user: withPin });
        await render(<Probe />);
        useLock.setState({ locked: true });
        await act(async () => useSession.setState({ status: 'signedOut', user: null }));
        expect(useLock.getState().locked).toBe(false);
    });
});
