import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import api from '../services/api';
import SocialAuthButtons from '../components/auth/SocialAuthButtons';

/* ─── Light field: gray border, green focus, label above ─── */
function Field({ id, label, type = 'text', value, onChange, placeholder, required, autoComplete, rightSlot }) {
    return (
        <div className="text-left">
            <div className="flex items-baseline justify-between mb-1.5">
                <label htmlFor={id} className="text-[12px] font-medium text-gray-700">{label}</label>
                {rightSlot}
            </div>
            <input
                id={id}
                type={type}
                required={required}
                autoComplete={autoComplete}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                className="w-full h-11 px-3.5 rounded-xl bg-white
                           border border-gray-200 text-[14px] text-gray-900 placeholder-gray-400
                           focus:outline-none focus:border-primary-600 focus:ring-4 focus:ring-primary-600/10
                           transition-all duration-200"
            />
        </div>
    );
}

export default function Login() {
    const { login, verifyOtp, resendVerification } = useAuth();
    const [step, setStep] = useState('CREDENTIALS');
    const [userId, setUserId] = useState(null);

    const [identifier, setIdentifier] = useState('');
    const [emailCache, setEmailCache] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const inputRefs = useRef([]);

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [socialBusy, setSocialBusy] = useState(false);
    const [registrationEnabled, setRegistrationEnabled] = useState(true);

    const [unverifiedEmail, setUnverifiedEmail] = useState('');
    const [resendingVerify, setResendingVerify] = useState(false);
    const [verifyResentNote, setVerifyResentNote] = useState('');

    useEffect(() => {
        api.get('/auth/config')
            .then(({ data }) => setRegistrationEnabled(data.registrationEnabled))
            .catch(() => {});
    }, []);

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setUnverifiedEmail('');
        setVerifyResentNote('');
        setLoading(true);
        try {
            const response = await login(identifier, password);
            if (response.requiresOtp) {
                setUserId(response.userId);
                setEmailCache(response.email);
                setStep('OTP');
            }
        } catch (err) {
            const data = err.response?.data;
            if (data?.requiresVerification && data?.email) {
                setUnverifiedEmail(data.email);
                setError(data.message || 'Please confirm your email before signing in.');
            } else {
                setError(data?.message || 'Failed to login');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResendVerification = async () => {
        if (!unverifiedEmail) return;
        setVerifyResentNote('');
        setResendingVerify(true);
        try {
            await resendVerification(unverifiedEmail);
            setVerifyResentNote('Verification email sent.');
        } catch {
            setVerifyResentNote('Could not resend right now.');
        } finally {
            setResendingVerify(false);
        }
    };

    const handleOtpChange = (index, value) => {
        if (value && !/^\d+$/.test(value)) return;
        const newOtp = [...otp];
        if (value.length > 1) {
            const pastedData = value.slice(0, 6).split('');
            for (let i = 0; i < pastedData.length; i++) {
                if (index + i < 6) newOtp[index + i] = pastedData[i];
            }
            setOtp(newOtp);
            const focusIndex = Math.min(index + pastedData.length, 5);
            inputRefs.current[focusIndex]?.focus();
            return;
        }
        newOtp[index] = value;
        setOtp(newOtp);
        if (value && index < 5) inputRefs.current[index + 1]?.focus();
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleOtpSubmit = async (e) => {
        e.preventDefault();
        const otpString = otp.join('');
        if (otpString.length !== 6) { setError('OTP must be 6 digits'); return; }
        setError('');
        setLoading(true);
        try {
            await verifyOtp(userId, otpString);
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid or expired OTP');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex flex-col items-center px-4"
            style={{ background: '#F2F4EE' }}
        >
            {/* Brand wordmark — top center */}
            <header className="pt-10 sm:pt-14 flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center shadow-sm">
                    <Sparkles className="w-4 h-4 text-primary-100" strokeWidth={2.5} />
                </span>
                <span className="text-[18px] font-semibold tracking-tight text-gray-900">
                    FSWealth <span className="text-primary-600">Axis</span>
                </span>
            </header>

            {/* Centered card */}
            <main className="flex-1 w-full flex items-center justify-center py-10">
                <div className="w-full max-w-[440px]">
                    <div className="bg-white rounded-3xl border border-gray-200/80 shadow-[0_4px_24px_rgba(31,72,66,0.04)] p-7 sm:p-9">

                        {step === 'CREDENTIALS' ? (
                            <>
                                {/* Mint badge */}
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 text-[11px] font-medium mb-6">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                                    Welcome back
                                </div>

                                <h1 className="text-[28px] font-semibold text-gray-900 tracking-tight leading-tight">
                                    Sign in to your account
                                </h1>
                                <p className="mt-2 text-[13.5px] text-gray-500 mb-7">
                                    Enter your details to access your dashboard.
                                </p>

                                {error && (
                                    <div
                                        role="alert"
                                        className="mb-5 px-3.5 py-2.5 rounded-xl bg-error-50 border border-error-100 text-error-700 text-[12.5px] flex items-start gap-2"
                                    >
                                        <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-error-500 mt-1.5" />
                                        {error}
                                    </div>
                                )}

                                {unverifiedEmail && (
                                    <div className="mb-5 px-3.5 py-3 rounded-xl bg-warning-25 border border-warning-100">
                                        <p className="flex items-start gap-2 text-[12.5px] text-warning-800">
                                            <Mail className="w-3.5 h-3.5 mt-0.5 shrink-0 text-warning-600" />
                                            <span>
                                                <span className="font-semibold block">Email not confirmed</span>
                                                <span className="text-warning-700/90">
                                                    Verify <span className="font-medium">{unverifiedEmail}</span> via the link we sent.
                                                </span>
                                            </span>
                                        </p>
                                        <button
                                            type="button"
                                            onClick={handleResendVerification}
                                            disabled={resendingVerify}
                                            className="mt-2 ml-5 text-[11.5px] font-semibold text-warning-700 underline underline-offset-2 hover:no-underline disabled:opacity-50"
                                        >
                                            {resendingVerify ? 'Sending…' : 'Resend link'}
                                        </button>
                                        {verifyResentNote && (
                                            <p className="mt-1.5 ml-5 text-[11px] text-success-700">{verifyResentNote}</p>
                                        )}
                                    </div>
                                )}

                                {/* Social buttons FIRST — fastest path */}
                                <div className="mb-5">
                                    <SocialAuthButtons mode="login" onBusy={setSocialBusy} onError={setError} />
                                </div>

                                <div className="flex items-center gap-3 mb-5">
                                    <div className="flex-1 h-px bg-gray-200" />
                                    <span className="text-[11px] text-gray-400 uppercase tracking-wider">or sign in with email</span>
                                    <div className="flex-1 h-px bg-gray-200" />
                                </div>

                                <form className="space-y-4" onSubmit={handleLoginSubmit}>
                                    <Field
                                        id="login-identifier"
                                        label="Email or username"
                                        value={identifier}
                                        onChange={(e) => setIdentifier(e.target.value)}
                                        placeholder="you@example.com"
                                        required
                                        autoComplete="username"
                                    />

                                    <Field
                                        id="login-password"
                                        label="Password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter your password"
                                        required
                                        autoComplete="current-password"
                                        rightSlot={
                                            <Link
                                                to="/forgot-password"
                                                className="text-[11.5px] font-medium text-primary-600 hover:text-primary-700"
                                            >
                                                Forgot?
                                            </Link>
                                        }
                                    />

                                    <button
                                        id="login-submit"
                                        type="submit"
                                        disabled={loading || socialBusy}
                                        className="group w-full h-11 mt-1 inline-flex items-center justify-center gap-2
                                                   rounded-xl text-[14px] font-semibold text-white
                                                   bg-primary-600 hover:bg-primary-700 active:bg-primary-800
                                                   disabled:opacity-50 disabled:cursor-not-allowed
                                                   transition-all duration-200 shadow-sm hover:shadow"
                                    >
                                        {loading ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.25" />
                                                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                                                </svg>
                                                <span>Signing in…</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Sign in</span>
                                                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.5} />
                                            </>
                                        )}
                                    </button>
                                </form>

                                {registrationEnabled && (
                                    <p className="mt-7 text-center text-[13px] text-gray-500">
                                        New here?{' '}
                                        <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-700">
                                            Create an account
                                        </Link>
                                    </p>
                                )}
                            </>
                        ) : (
                            /* ─── OTP step (same card) ─── */
                            <>
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 text-[11px] font-medium mb-6">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                                    Step 2 of 2
                                </div>

                                <h1 className="text-[28px] font-semibold text-gray-900 tracking-tight leading-tight">
                                    Check your inbox
                                </h1>
                                <p className="mt-2 text-[13.5px] text-gray-500 mb-7">
                                    We sent a 6-digit code to{' '}
                                    <span className="font-medium text-gray-900">{emailCache}</span>.
                                </p>

                                {error && (
                                    <div className="mb-5 px-3.5 py-2.5 rounded-xl bg-error-50 border border-error-100 text-error-700 text-[12.5px]">
                                        {error}
                                    </div>
                                )}

                                <form onSubmit={handleOtpSubmit} className="space-y-6">
                                    <div className="flex gap-2 sm:gap-2.5 justify-between">
                                        {otp.map((digit, index) => (
                                            <input
                                                key={index}
                                                ref={el => inputRefs.current[index] = el}
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={digit ? 1 : 6}
                                                value={digit}
                                                onChange={e => handleOtpChange(index, e.target.value)}
                                                onKeyDown={e => handleOtpKeyDown(index, e)}
                                                className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-semibold
                                                           rounded-xl bg-white border border-gray-200 text-gray-900
                                                           focus:outline-none focus:border-primary-600 focus:ring-4 focus:ring-primary-600/10
                                                           transition-all duration-200 tabular-nums"
                                                disabled={loading}
                                            />
                                        ))}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading || otp.join('').length !== 6}
                                        className="group w-full h-11 inline-flex items-center justify-center gap-2
                                                   rounded-xl text-[14px] font-semibold text-white
                                                   bg-primary-600 hover:bg-primary-700 active:bg-primary-800
                                                   disabled:opacity-40 disabled:cursor-not-allowed
                                                   transition-all duration-200 shadow-sm"
                                    >
                                        {loading ? 'Verifying…' : 'Verify & sign in'}
                                        {!loading && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />}
                                    </button>
                                </form>

                                <div className="mt-6 flex items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={() => { setStep('CREDENTIALS'); setOtp(['', '', '', '', '', '']); setError(''); }}
                                        className="group inline-flex items-center gap-1.5 text-[12.5px] text-gray-500 hover:text-gray-900 transition-colors"
                                    >
                                        <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" strokeWidth={2.5} />
                                        Back
                                    </button>
                                    <button
                                        type="button"
                                        disabled={loading}
                                        onClick={async () => {
                                            try {
                                                await api.post('/auth/resend-otp', { userId });
                                                setError('');
                                            } catch {
                                                setError('Failed to resend code.');
                                            }
                                        }}
                                        className="text-[12.5px] font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50"
                                    >
                                        Resend code
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer below card */}
                    <div className="mt-6 flex items-center justify-center gap-4 text-[11.5px] text-gray-400">
                        <Link to="/terms" className="hover:text-gray-700 transition-colors">Terms</Link>
                        <span className="text-gray-300">·</span>
                        <Link to="/privacy" className="hover:text-gray-700 transition-colors">Privacy</Link>
                        <span className="text-gray-300">·</span>
                        <span>© 2026 FSWealth Axis</span>
                    </div>
                </div>
            </main>
        </div>
    );
}
