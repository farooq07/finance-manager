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
 */
export default function OnboardingGate({ mode, children }) {
    const { user } = useAuth();
    if (!user) return <Navigate to="/welcome" replace />;
    if (user.must_change_password) return <Navigate to="/change-password" replace />;

    const needsOnboarding = user.onboarded_at === null;
    if (mode === 'app' && needsOnboarding) return <Navigate to="/onboarding" replace />;
    if (mode === 'onboarding' && !needsOnboarding) return <Navigate to="/" replace />;
    return children;
}
