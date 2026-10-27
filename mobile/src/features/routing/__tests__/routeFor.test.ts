import { routeFor, isOnTarget } from '../routeFor';

describe('isOnTarget', () => {
    it.each([
        [['(auth)', 'sign-in'], '/(auth)/sign-in', true],
        [['(auth)', 'register'], '/(auth)/sign-in', true],       // other signed-out screens are fine
        [['(auth)', 'otp'], '/(auth)/sign-in', true],
        [['(auth)', 'first-password'], '/(auth)/sign-in', false],
        [['(auth)', 'first-password'], '/(auth)/first-password', true],
        [['(auth)', 'sign-in'], '/(auth)/first-password', false],
        [['(onboarding)'], '/(onboarding)', true],
        [['(tabs)', 'invest'], '/(tabs)/home', true],             // any tab is "home"
        [['lock'], '/lock', true],
        [['(tabs)', 'home'], '/lock', false],
        [[], '/(tabs)/home', false],                               // app index redirects
    ] as const)('%j on %s → %s', (segments, target, expected) => {
        expect(isOnTarget([...segments], target)).toBe(expected);
    });
});

const user = (over: Record<string, unknown> = {}) => ({
    id: 'u1', role: 'user', must_change_password: false, onboarded_at: '2026-10-21T00:00:00Z', ...over,
});

describe('routeFor', () => {
    it('waits while the session loads', () => {
        expect(routeFor({ status: 'loading', user: null, locked: false })).toBeNull();
    });

    it('signed out (incl. expired token) → sign-in', () => {
        expect(routeFor({ status: 'signedOut', user: null, locked: false })).toBe('/(auth)/sign-in');
    });

    it('invited user who must change password → first-password', () => {
        expect(routeFor({ status: 'signedIn', user: user({ must_change_password: true }), locked: false })).toBe('/(auth)/first-password');
    });

    it('not onboarded → onboarding', () => {
        expect(routeFor({ status: 'signedIn', user: user({ onboarded_at: null }), locked: false })).toBe('/(onboarding)');
    });

    it('a user object without onboarded_at (older response) is never trapped', () => {
        expect(routeFor({ status: 'signedIn', user: user({ onboarded_at: undefined }), locked: false })).toBe('/(tabs)/home');
    });

    it('locked beats everything except signed out', () => {
        expect(routeFor({ status: 'signedIn', user: user({ onboarded_at: null }), locked: true })).toBe('/lock');
        expect(routeFor({ status: 'signedOut', user: null, locked: true })).toBe('/(auth)/sign-in');
    });

    it('signed in and onboarded → home', () => {
        expect(routeFor({ status: 'signedIn', user: user(), locked: false })).toBe('/(tabs)/home');
    });
});
