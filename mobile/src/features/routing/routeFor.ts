import type { User } from '../../api/types';

export type AppRoute = '/(auth)/sign-in' | '/(auth)/first-password' | '/(onboarding)' | '/lock' | '/(tabs)/home';

type RouteInput = { status: 'loading' | 'signedOut' | 'signedIn'; user: User | null; locked: boolean };

/**
 * Is the current screen (expo-router segments) already where `target` wants
 * the user? Any signed-out screen satisfies sign-in (register, OTP, forgot
 * password), any tab satisfies home — only first-password and lock are exact.
 */
export function isOnTarget(segments: string[], target: AppRoute): boolean {
    const [group, screen] = segments;
    switch (target) {
        case '/(auth)/sign-in': return group === '(auth)' && screen !== 'first-password';
        case '/(auth)/first-password': return group === '(auth)' && screen === 'first-password';
        case '/(onboarding)': return group === '(onboarding)';
        case '/lock': return group === 'lock';
        case '/(tabs)/home': return group === '(tabs)';
    }
}

/**
 * Where the app should be for this session state; null = stay put (loading).
 * Order matters: signed out → locked → must change password → onboarding → home.
 * Only an explicit `onboarded_at === null` means "not onboarded", so an older
 * user object without the field is never trapped in onboarding.
 */
export function routeFor({ status, user, locked }: RouteInput): AppRoute | null {
    if (status === 'loading') return null;
    if (status === 'signedOut' || !user) return '/(auth)/sign-in';
    if (locked) return '/lock';
    if (user.must_change_password) return '/(auth)/first-password';
    if (user.onboarded_at === null) return '/(onboarding)';
    return '/(tabs)/home';
}
