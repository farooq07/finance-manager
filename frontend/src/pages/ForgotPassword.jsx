import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ShieldCheck, Sparkles, Lock } from 'lucide-react';
import { toast } from 'sonner';

function Field({ id, label, type = 'text', value, onChange, placeholder, required, autoComplete }) {
    return (
        <div className="text-left">
            <label htmlFor={id} className="block text-[12px] font-medium text-gray-700 mb-1.5">{label}</label>
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

/* ─── Step pill indicator ─── */
function StepPill({ step }) {
    const labels = ['Email', 'Reset', 'Done'];
    const activeIdx = step === 'EMAIL' ? 0 : step === 'OTP_AND_NEW_PASSWORD' ? 1 : 2;
    return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 text-[11px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
            Step {activeIdx + 1} of 3 · {labels[activeIdx]}
        </div>
    );
}

export default function ForgotPassword() {
    const { forgotPassword, resetPassword } = useAuth();

    const [step, setStep] = useState('EMAIL');

    const [email, setEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const inputRefs = useRef([]);

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        if (!email) {
            setError('Please enter your email address');
            return;
        }
        setError('');
        setLoading(true);
        try {
            await forgotPassword(email);
            setStep('OTP_AND_NEW_PASSWORD');
            toast.success('Verification code sent to your email');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to request reset');
        } finally {
            setLoading(false);
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

    const handleResetSubmit = async (e) => {
        e.preventDefault();
        const otpString = otp.join('');
        if (otpString.length !== 6) { setError('OTP must be 6 digits'); return; }
        if (newPassword.length < 8) { setError('Password must be at least 8 characters long'); return; }
        if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }

        setError('');
        setLoading(true);
        try {
            await resetPassword(email, otpString, newPassword);
            setStep('SUCCESS');
            toast.success('Password reset successfully');
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid or expired OTP');
        } finally {
            setLoading(false);
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

                        {step !== 'SUCCESS' && (
                            <div className="mb-6">
                                <StepPill step={step} />
                            </div>
                        )}

                        {step === 'EMAIL' && (
                            <>
                                <h1 className="text-[26px] font-semibold text-gray-900 tracking-tight leading-tight">
                                    Forgot your password?
                                </h1>
                                <p className="mt-2 text-[13.5px] text-gray-500 mb-7">
                                    Enter your email and we'll send you a 6-digit code to reset it.
                                </p>

                                {error && (
                                    <div role="alert" className="mb-5 px-3.5 py-2.5 rounded-xl bg-error-50 border border-error-100 text-error-700 text-[12.5px] flex items-start gap-2">
                                        <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-error-500 mt-1.5" />
                                        {error}
                                    </div>
                                )}

                                <form className="space-y-4" onSubmit={handleEmailSubmit}>
                                    <Field
                                        id="forgot-email"
                                        label="Email address"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        required
                                        autoComplete="email"
                                    />

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="group w-full h-11 mt-1 inline-flex items-center justify-center gap-2
                                                   rounded-xl text-[14px] font-semibold text-white
                                                   bg-primary-600 hover:bg-primary-700 active:bg-primary-800
                                                   disabled:opacity-50 disabled:cursor-not-allowed
                                                   transition-all duration-200 shadow-sm hover:shadow"
                                    >
                                        {loading ? 'Sending…' : (
                                            <>
                                                <span>Send reset code</span>
                                                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
                                            </>
                                        )}
                                    </button>
                                </form>
                            </>
                        )}

                        {step === 'OTP_AND_NEW_PASSWORD' && (
                            <>
                                <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center mb-5">
                                    <Lock className="w-5 h-5 text-primary-600" />
                                </div>
                                <h1 className="text-[26px] font-semibold text-gray-900 tracking-tight leading-tight">
                                    Create new password
                                </h1>
                                <p className="mt-2 text-[13.5px] text-gray-500 mb-7">
                                    Enter the 6-digit code sent to{' '}
                                    <span className="font-medium text-gray-900">{email}</span>{' '}
                                    and choose a new password.
                                </p>

                                {error && (
                                    <div role="alert" className="mb-5 px-3.5 py-2.5 rounded-xl bg-error-50 border border-error-100 text-error-700 text-[12.5px] flex items-start gap-2">
                                        <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-error-500 mt-1.5" />
                                        {error}
                                    </div>
                                )}

                                <form className="space-y-5" onSubmit={handleResetSubmit}>
                                    <div>
                                        <p className="text-[12px] font-medium text-gray-700 mb-2">Verification code</p>
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
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <Field
                                        id="forgot-new-password"
                                        label="New password"
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="At least 8 characters"
                                        required
                                        autoComplete="new-password"
                                    />
                                    <Field
                                        id="forgot-confirm-password"
                                        label="Confirm password"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Type it once more"
                                        required
                                        autoComplete="new-password"
                                    />

                                    <button
                                        type="submit"
                                        disabled={loading || otp.join('').length !== 6}
                                        className="group w-full h-11 mt-1 inline-flex items-center justify-center gap-2
                                                   rounded-xl text-[14px] font-semibold text-white
                                                   bg-primary-600 hover:bg-primary-700 active:bg-primary-800
                                                   disabled:opacity-40 disabled:cursor-not-allowed
                                                   transition-all duration-200 shadow-sm hover:shadow"
                                    >
                                        {loading ? 'Resetting…' : (
                                            <>
                                                <span>Reset password</span>
                                                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
                                            </>
                                        )}
                                    </button>
                                </form>
                            </>
                        )}

                        {step === 'SUCCESS' && (
                            <div className="text-center">
                                <div className="mx-auto w-14 h-14 rounded-2xl bg-success-50 flex items-center justify-center mb-5">
                                    <ShieldCheck className="w-7 h-7 text-success-600" />
                                </div>
                                <h2 className="text-[26px] font-semibold text-gray-900 tracking-tight leading-tight">
                                    Password reset
                                </h2>
                                <p className="mt-2 text-[13.5px] text-gray-500 mb-7">
                                    Your new password is live. Sign in to continue.
                                </p>
                                <Link
                                    to="/login"
                                    className="group w-full h-11 inline-flex items-center justify-center gap-2
                                               rounded-xl text-[14px] font-semibold text-white
                                               bg-primary-600 hover:bg-primary-700 active:bg-primary-800
                                               transition-all duration-200 shadow-sm hover:shadow"
                                >
                                    <span>Return to sign in</span>
                                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
                                </Link>
                            </div>
                        )}

                        {step !== 'SUCCESS' && (
                            <div className="mt-6 text-center">
                                <Link to="/login" className="group inline-flex items-center gap-1.5 text-[12.5px] text-gray-500 hover:text-gray-900 transition-colors">
                                    <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" strokeWidth={2.5} />
                                    Back to sign in
                                </Link>
                            </div>
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
