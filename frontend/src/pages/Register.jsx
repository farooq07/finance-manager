import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { ArrowRight, Mail, CheckCircle2, Sparkles } from 'lucide-react';
import SocialAuthButtons from '../components/auth/SocialAuthButtons';

function Field({ id, label, type = 'text', value, onChange, placeholder, required, autoComplete, hint }) {
    return (
        <div className="text-left">
            <div className="mb-1.5">
                <label htmlFor={id} className="text-[12px] font-medium text-gray-700">{label}</label>
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
            {hint && <p className="mt-1 text-[11.5px] text-gray-400">{hint}</p>}
        </div>
    );
}

export default function Register() {
    const { register, resendVerification } = useAuth();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [socialBusy, setSocialBusy] = useState(false);
    const [submittedEmail, setSubmittedEmail] = useState('');
    const [resending, setResending] = useState(false);
    const [resentNote, setResentNote] = useState('');
    const [existingNote, setExistingNote] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setExistingNote('');
        setLoading(true);
        try {
            const data = await register(name, email, password);
            setSubmittedEmail(email);
            if (data?.requiresVerification && data?.message) {
                setExistingNote(data.message);
            }
        } catch (err) {
            const status = err.response?.status;
            const message = err.response?.data?.message;
            if (status === 403) {
                setError(message || 'Registration is currently disabled.');
            } else {
                setError(message || 'Failed to create account');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setResentNote('');
        setResending(true);
        try {
            await resendVerification(submittedEmail);
            setResentNote('A new verification link has been sent.');
        } catch {
            setResentNote('Could not resend right now.');
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center px-4" style={{ background: '#F2F4EE' }}>
            <header className="pt-10 sm:pt-14 flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center shadow-sm">
                    <Sparkles className="w-4 h-4 text-primary-100" strokeWidth={2.5} />
                </span>
                <span className="text-[18px] font-semibold tracking-tight text-gray-900">
                    FSWealth <span className="text-primary-600">Axis</span>
                </span>
            </header>

            <main className="flex-1 w-full flex items-center justify-center py-10">
                <div className="w-full max-w-[440px]">
                    <div className="bg-white rounded-3xl border border-gray-200/80 shadow-[0_4px_24px_rgba(31,72,66,0.04)] p-7 sm:p-9">

                        {submittedEmail ? (
                            /* ─── Email-sent confirmation ─── */
                            <div className="text-center">
                                <div className="mx-auto w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center mb-5">
                                    <Mail className="w-6 h-6 text-primary-600" />
                                </div>
                                <h1 className="text-[26px] font-semibold text-gray-900 tracking-tight leading-tight">
                                    Confirm your email
                                </h1>
                                <p className="mt-2 text-[13.5px] text-gray-500 leading-relaxed">
                                    We sent a verification link to<br />
                                    <span className="font-semibold text-gray-900">{submittedEmail}</span>
                                </p>
                                <p className="mt-3 text-[12px] text-gray-400">
                                    The link expires in 24 hours.
                                </p>

                                {existingNote && (
                                    <div className="mt-5 px-3.5 py-2.5 rounded-xl bg-warning-25 border border-warning-100 text-warning-800 text-[12.5px] text-left">
                                        {existingNote}
                                    </div>
                                )}

                                {resentNote && (
                                    <div className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] text-success-700">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        {resentNote}
                                    </div>
                                )}

                                <div className="mt-7 space-y-2.5">
                                    <button
                                        onClick={handleResend}
                                        disabled={resending}
                                        className="w-full h-11 inline-flex items-center justify-center
                                                   rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300
                                                   text-[14px] font-semibold text-gray-700 transition-all duration-200 disabled:opacity-50"
                                    >
                                        {resending ? 'Sending…' : 'Resend verification email'}
                                    </button>
                                    <Link
                                        to="/login"
                                        className="group w-full h-11 inline-flex items-center justify-center gap-2
                                                   rounded-xl text-[14px] font-semibold text-white
                                                   bg-primary-600 hover:bg-primary-700 active:bg-primary-800
                                                   transition-all duration-200 shadow-sm hover:shadow"
                                    >
                                        Back to sign in
                                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 text-[11px] font-medium mb-6">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                                    Get started
                                </div>

                                <h1 className="text-[28px] font-semibold text-gray-900 tracking-tight leading-tight">
                                    Create your account
                                </h1>
                                <p className="mt-2 text-[13.5px] text-gray-500 mb-7">
                                    Track every rupee across banks, wallets, and investments.
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

                                <div className="mb-5">
                                    <SocialAuthButtons mode="signup" onBusy={setSocialBusy} onError={setError} />
                                </div>

                                <div className="flex items-center gap-3 mb-5">
                                    <div className="flex-1 h-px bg-gray-200" />
                                    <span className="text-[11px] text-gray-400 uppercase tracking-wider">or sign up with email</span>
                                    <div className="flex-1 h-px bg-gray-200" />
                                </div>

                                <form className="space-y-4" onSubmit={handleSubmit}>
                                    <Field
                                        id="register-name"
                                        label="Full name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Andrew Forbist"
                                        required
                                        autoComplete="name"
                                    />
                                    <Field
                                        id="register-email"
                                        label="Email address"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        required
                                        autoComplete="email"
                                    />
                                    <Field
                                        id="register-password"
                                        label="Password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="At least 8 characters"
                                        required
                                        autoComplete="new-password"
                                        hint="Use a mix of letters and numbers."
                                    />

                                    <button
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
                                                <span>Creating…</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Create account</span>
                                                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.5} />
                                            </>
                                        )}
                                    </button>
                                </form>

                                <p className="mt-5 text-[11.5px] text-gray-400 leading-relaxed text-center">
                                    By signing up you agree to our{' '}
                                    <Link to="/terms" className="underline underline-offset-2 hover:text-gray-700">Terms</Link>
                                    {' '}and{' '}
                                    <Link to="/privacy" className="underline underline-offset-2 hover:text-gray-700">Privacy Policy</Link>.
                                </p>

                                <p className="mt-5 text-center text-[13px] text-gray-500">
                                    Already have an account?{' '}
                                    <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700">
                                        Sign in
                                    </Link>
                                </p>
                            </>
                        )}
                    </div>

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
