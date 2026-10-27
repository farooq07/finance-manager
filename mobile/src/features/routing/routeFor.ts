import type { User } from '../../api/types';

export type AppRoute = '/(auth)/sign-in' | '/(auth)/first-password' | '/pin-setup' | '/(onboarding)' | '/lock' | '/(tabs)/home';

type RouteInput = { status: 'loading' | 'signedOut' | 'signedIn'; user: User | null; locked: boolean };

/**
 * Is the current screen (expo-router segments) already where `target` wants
 * the user? Any signed-out screen satisfies sign-in (register, OTP, forgot
 * password), any tab or signed-in screen in (app) satisfies home — only
 * first-password and lock are exact.
 */
export function isOnTarget(segments: string[], target: AppRoute): boolean {
    const [group, screen] = segments;
    switch (target) {
        case '/(auth)/sign-in': return group === '(auth)' && screen !== 'first-password';
        case '/(auth)/first-password': return group === '(auth)' && screen === 'first-password';
        case '/(onboarding)': return group === '(onboarding)';
        case '/lock': return group === 'lock';
        case '/pin-setup': return group === 'pin-setup';
        case '/(tabs)/home': return group === '(tabs)' || group === '(app)';
    }
}

/**
 * Where the app should be for this session state; null = stay put (loading).
 * Order matters: signed out → locked → must change password → set a PIN →
 * onboarding → home. Only explicit `hasPin === false` / `onboarded_at === null`
 * count, so an older user object without those fields is never trapped.
 */
export function routeFor({ status, user, locked }: RouteInput): AppRoute | null {
    if (status === 'loading') return null;
    if (status === 'signedOut' || !user) return '/(auth)/sign-in';
    if (locked) return '/lock';
    if (user.must_change_password) return '/(auth)/first-password';
    if (user.hasPin === false) return '/pin-setup';
    if (user.onboarded_at === null) return '/(onboarding)';
    return '/(tabs)/home';
}
