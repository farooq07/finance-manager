import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

/* ─── Brand glyphs (multi-color, sized to inherit ink) ───────── */
const GoogleGlyph = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path fill="#EA4335" d="M9 3.48c1.69 0 2.84.73 3.5 1.34l2.55-2.49C13.46.97 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l2.96 2.3C4.66 5.16 6.66 3.48 9 3.48z" />
        <path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.18-1.84H9v3.48h4.84c-.21 1.12-.84 2.07-1.79 2.71l2.89 2.24c1.69-1.56 2.7-3.86 2.7-6.59z" />
        <path fill="#FBBC05" d="M3.92 10.74A5.5 5.5 0 0 1 3.62 9c0-.6.1-1.18.27-1.74L.96 4.96A9.001 9.001 0 0 0 0 9c0 1.45.35 2.82.96 4.04l2.96-2.3z" />
        <path fill="#34A853" d="M9 18c2.43 0 4.46-.8 5.95-2.18l-2.89-2.24c-.8.54-1.86.86-3.06.86-2.34 0-4.34-1.58-5.05-3.71L.96 13.04C2.44 15.98 5.48 18 9 18z" />
    </svg>
);

const AppleGlyph = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.05 12.04c0-2.83 2.31-4.18 2.41-4.24-1.31-1.92-3.36-2.18-4.09-2.21-1.74-.18-3.4 1.03-4.28 1.03-.9 0-2.25-1-3.7-.98-1.9.03-3.65 1.11-4.63 2.81-1.97 3.42-.5 8.47 1.42 11.25.94 1.36 2.06 2.88 3.52 2.82 1.42-.06 1.96-.91 3.68-.91s2.2.91 3.7.88c1.53-.02 2.5-1.37 3.43-2.74 1.08-1.57 1.53-3.09 1.55-3.17-.03-.01-2.97-1.14-3-4.54zM14.39 4.13c.78-.94 1.31-2.25 1.16-3.55-1.13.05-2.49.76-3.3 1.7-.73.83-1.36 2.16-1.19 3.45 1.26.09 2.55-.64 3.33-1.6z" />
    </svg>
);

const BUTTON_BASE = "group relative inline-flex items-center justify-center gap-2.5 h-11 px-4 rounded-xl " +
    "border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 " +
    "text-[13px] font-medium text-gray-700 hover:text-gray-900 " +
    "transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed " +
    "focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600/40";

function GoogleButton({ disabled, onSuccess, onError, label }) {
    const triggerLogin = useGoogleLogin({
        flow: 'implicit',
        scope: 'openid email profile',
        onSuccess: (tokenResponse) => onSuccess(tokenResponse),
        onError: () => onError?.('Google sign-in was cancelled or failed.'),
    });

    return (
        <button type="button" disabled={disabled} onClick={() => triggerLogin()} className={BUTTON_BASE}>
            <GoogleGlyph />
            <span>{label}</span>
        </button>
    );
}

function AppleButton({ disabled, clientId, redirectUri, onSuccess, onError, label }) {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const init = () => {
            if (cancelled) return;
            if (window.AppleID?.auth?.init) {
                window.AppleID.auth.init({
                    clientId,
                    scope: 'name email',
                    redirectURI: redirectUri || window.location.origin + '/login',
                    usePopup: true,
                });
                setReady(true);
            } else {
                setTimeout(init, 200);
            }
        };
        init();
        return () => { cancelled = true; };
    }, [clientId, redirectUri]);

    const handleClick = async () => {
        try {
            const result = await window.AppleID.auth.signIn();
            onSuccess({
                identityToken: result.authorization.id_token,
                user: result.user || null,
            });
        } catch (err) {
            if (err?.error !== 'popup_closed_by_user') {
                onError?.(err?.error || 'Apple sign-in failed.');
            }
        }
    };

    return (
        <button type="button" disabled={disabled || !ready} onClick={handleClick} className={BUTTON_BASE}>
            <AppleGlyph />
            <span>{label}</span>
        </button>
    );
}

/* Stub button — same visual shell, click shows a toast explaining what's missing. */
function StubButton({ provider, label, glyph: Glyph }) {
    const handleClick = () => {
        const envVar = provider === 'google' ? 'GOOGLE_CLIENT_ID' : 'APPLE_CLIENT_ID';
        toast.message(`${provider === 'google' ? 'Google' : 'Apple'} sign-in not yet configured`, {
            description: `Add ${envVar} in Doppler (project fs-wealth-axis · dev) and restart the backend.`,
        });
    };
    return (
        <button type="button" onClick={handleClick} className={BUTTON_BASE}>
            <Glyph />
            <span>{label}</span>
        </button>
    );
}

/**
 * Always renders Google + Apple buttons so the auth UI is consistent.
 * If the backend has the OAuth client IDs configured, clicks trigger real
 * sign-in. Otherwise clicks show a helpful toast naming the missing env var.
 *
 * Pass mode="login" or mode="signup" — only changes the visible label.
 */
export default function SocialAuthButtons({ mode = 'login', onBusy, onError }) {
    const { googleLogin, appleLogin } = useAuth();
    const navigate = useNavigate();
    const [config, setConfig] = useState(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        api.get('/auth/config')
            .then(({ data }) => setConfig(data))
            .catch(() => setConfig({ googleEnabled: false, appleEnabled: false }));
    }, []);

    const setBusyState = (b) => {
        setBusy(b);
        onBusy?.(b);
    };

    const handleGoogle = async (tokenResponse) => {
        setBusyState(true);
        try {
            await googleLogin(tokenResponse.credential || tokenResponse.access_token);
            navigate('/');
        } catch (err) {
            onError?.(err.response?.data?.message || 'Google sign-in failed.');
        } finally {
            setBusyState(false);
        }
    };

    const handleApple = async ({ identityToken, user: appleUser }) => {
        setBusyState(true);
        try {
            await appleLogin({ identityToken, user: appleUser });
            navigate('/');
        } catch (err) {
            onError?.(err.response?.data?.message || 'Apple sign-in failed.');
        } finally {
            setBusyState(false);
        }
    };

    const labelGoogle = mode === 'signup' ? 'Sign up with Google' : 'Google';
    const labelApple = mode === 'signup' ? 'Sign up with Apple' : 'Apple';

    const googleReady = config?.googleEnabled && config?.googleClientId;
    const appleReady = config?.appleEnabled && config?.appleClientId;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {googleReady ? (
                <GoogleOAuthProvider clientId={config.googleClientId}>
                    <GoogleButton
                        disabled={busy}
                        label={labelGoogle}
                        onSuccess={handleGoogle}
                        onError={onError}
                    />
                </GoogleOAuthProvider>
            ) : (
                <StubButton provider="google" label={labelGoogle} glyph={GoogleGlyph} />
            )}

            {appleReady ? (
                <AppleButton
                    disabled={busy}
                    clientId={config.appleClientId}
                    redirectUri={config.appleRedirectUri}
                    label={labelApple}
                    onSuccess={handleApple}
                    onError={onError}
                />
            ) : (
                <StubButton provider="apple" label={labelApple} glyph={AppleGlyph} />
            )}
        </div>
    );
}
