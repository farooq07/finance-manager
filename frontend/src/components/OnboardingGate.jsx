import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Route guard for signed-in pages.
 *
 * mode="app"        — the main app: signed out → /welcome, must change
 *                     password → /change-password, not onboarded → /onboarding.
 * mode="onboarding" — the /onboarding page itself: signed out → /welcome,
 *                     already onboarded → /.
 *
 * Only an explicit `onboarded_at === null` counts as "not onboarded", so a
 * user object from an older response (field missing) is never trapped.
 *
 * On /onboarding the "already onboarded" check uses the state when the page
 * opened: finishing mid-flow flips onboarded_at, and redirecting then would
 * race the page's own navigation to the link the user picked.
 */
export default function OnboardingGate({ mode, children }) {
    const { user } = useAuth();
    const [onboardedWhenOpened] = useState(() => user?.onboarded_at != null);
    if (!user) return <Navigate to="/welcome" replace />;
    if (user.must_change_password) return <Navigate to="/change-password" replace />;

    if (mode === 'app' && user.onboarded_at === null) return <Navigate to="/onboarding" replace />;
    if (mode === 'onboarding' && onboardedWhenOpened) return <Navigate to="/" replace />;
    return children;
}
