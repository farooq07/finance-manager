import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, TrendingUp, PieChart, Wallet, ShieldCheck, BarChart3, Landmark, Lock } from 'lucide-react';
import logo from '../assets/logo.svg';
import { toast } from 'sonner';

/* ─── Bento Illustration Cards ─── */
const BentoCard = ({ icon: Icon, title, description, gradient, iconColor, delay }) => (
    <div
        className={`group relative overflow-hidden rounded-2xl p-5 border border-white/10 backdrop-blur-sm
            transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl cursor-default`}
        style={{ background: gradient, animationDelay: delay }}
    >
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${iconColor} shadow-lg`}>
            <Icon className="w-5 h-5 text-white" strokeWidth={2} />
        </div>
        <h3 className="text-white font-semibold text-sm mb-1">{title}</h3>
        <p className="text-white/60 text-xs leading-relaxed">{description}</p>
    </div>
);

/* ─── Animated Dots Background ─── */
const GridPattern = () => (
    <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="white" />
            </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
);

/* ─── Mini Chart SVG Illustration ─── */
const MiniChart = () => (
    <svg viewBox="0 0 200 80" className="w-full h-16 mt-2 opacity-60" fill="none">
        <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
            </linearGradient>
        </defs>
        <path d="M0 60 Q25 55 40 45 T80 30 T120 35 T160 20 T200 15" stroke="#34d399" strokeWidth="2" fill="none" />
        <path d="M0 60 Q25 55 40 45 T80 30 T120 35 T160 20 T200 15 L200 80 L0 80Z" fill="url(#chartGrad)" />
    </svg>
);

/* ─── Circular Progress SVG ─── */
const CircularProgress = ({ percent, color, label }) => {
    const r = 28;
    const circ = 2 * Math.PI * r;
    const offset = circ - (percent / 100) * circ;
    return (
        <div className="flex flex-col items-center gap-1">
            <svg width="68" height="68" viewBox="0 0 68 68">
                <circle cx="34" cy="34" r={r} fill="none" stroke="white" strokeOpacity="0.1" strokeWidth="5" />
                <circle cx="34" cy="34" r={r} fill="none" stroke={color} strokeWidth="5"
                    strokeDasharray={circ} strokeDashoffset={offset}
                    strokeLinecap="round" transform="rotate(-90 34 34)"
                    className="transition-all duration-1000"
                />
                <text x="34" y="38" textAnchor="middle" fill="white" fontSize="13" fontWeight="600">
                    {percent}%
                </text>
            </svg>
            <span className="text-[10px] text-white/50 font-medium">{label}</span>
        </div>
    );
};

export default function ForgotPassword() {
    const { forgotPassword, resetPassword } = useAuth();
    const navigate = useNavigate();

    // Steps: 'EMAIL' -> 'OTP_AND_NEW_PASSWORD' -> 'SUCCESS'
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
            toast.success("Verification code sent to your email");
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
        if (otpString.length !== 6) {
            setError('OTP must be 6 digits');
            return;
        }
        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setError('');
        setLoading(true);
        try {
            await resetPassword(email, otpString, newPassword);
            setStep('SUCCESS');
            toast.success("Password reset successfully!");
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid or expired OTP');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-gray-950 flex-row-reverse">
            {/* ─── RIGHT: Bento Showcase Panel (Reversed for variation) ─── */}
            <div className="hidden lg:flex lg:w-[55%] xl:w-[58%] relative overflow-hidden flex-col justify-between p-8 xl:p-12"
                style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #0f172a 100%)' }}
            >
                <GridPattern />
                <div className="relative z-10 flex justify-end">
                    <img src={logo} alt="WealthAxis" className="h-8 brightness-0 invert opacity-90" />
                </div>

                <div className="relative z-10 flex-1 flex items-center py-8">
                    <div className="w-full max-w-2xl  grid grid-cols-3 grid-rows-3 gap-4">
                        <div className="col-span-2 row-span-1 rounded-2xl p-6 border border-white/10 overflow-hidden"
                            style={{ background: 'linear-gradient(135deg, rgba(56,189,248,0.12) 0%, rgba(15,23,42,0.8) 100%)' }}>
                            <div className="flex items-center justify-between mb-1">
                                <div>
                                    <p className="text-white/50 text-xs font-medium uppercase tracking-wider">Secure Recovery</p>
                                    <p className="text-white text-2xl font-bold mt-1">Bank-Level <span className="text-sky-400 font-medium ml-2">Security</span></p>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center">
                                    <ShieldCheck className="w-5 h-5 text-sky-400" />
                                </div>
                            </div>
                            <MiniChart />
                        </div>
                        <BentoCard icon={Lock} title="Encrypted" description="End-to-end security" gradient="linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(15,23,42,0.8) 100%)" iconColor="bg-indigo-500/80" delay="0.1s" />
                        <BentoCard icon={Wallet} title="Assets Safe" description="Your data is protected" gradient="linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(15,23,42,0.8) 100%)" iconColor="bg-amber-500/80" delay="0.2s" />
                        <div className="col-span-2 rounded-2xl p-5 border border-white/10" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(15,23,42,0.8) 100%)' }}>
                            <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-3">Asset Allocation</p>
                            <div className="flex items-center gap-6">
                                <CircularProgress percent={42} color="#34d399" label="Stocks" />
                                <CircularProgress percent={28} color="#818cf8" label="Bonds" />
                                <CircularProgress percent={18} color="#fbbf24" label="Real Estate" />
                                <CircularProgress percent={12} color="#f87171" label="Cash" />
                            </div>
                        </div>
                        <BentoCard icon={BarChart3} title="Live Tracking" description="Always accurate" gradient="linear-gradient(135deg, rgba(244,63,94,0.12) 0%, rgba(15,23,42,0.8) 100%)" iconColor="bg-rose-500/80" delay="0.3s" />
                        <div className="col-span-3 rounded-2xl p-5 border border-white/10 flex items-center gap-5" style={{ background: 'linear-gradient(135deg, rgba(56,189,248,0.06) 0%, rgba(15,23,42,0.6) 100%)' }}>
                            <div className="w-12 h-12 rounded-2xl bg-sky-500/20 flex items-center justify-center shrink-0">
                                <Landmark className="w-6 h-6 text-sky-400" />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold text-sm">Regain access instantly</h3>
                                <p className="text-white/40 text-xs mt-0.5">Secure OTP verification puts you back in control of your wealth dashboard.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="absolute top-1/4 -left-20 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-10 right-1/4 w-48 h-48 bg-indigo-500/8 rounded-full blur-3xl" />
            </div>

            {/* ─── LEFT: Form Area ─── */}
            <div className="w-full lg:w-[45%] xl:w-[42%] flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-white dark:bg-gray-950 border-r border-gray-100 dark:border-gray-800">
                <div className="w-full max-w-[420px] flex flex-col">

                    {step === 'EMAIL' && (
                        <>
                            <div className="mb-8">
                                <img src={logo} alt="WealthAxis Logo" className="h-10 w-auto mb-8 lg:hidden" />
                                <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800/40 flex items-center justify-center mb-6">
                                    <ShieldCheck className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                                </div>
                                <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                                    Reset Password
                                </h1>
                                <p className="mt-2 text-gray-500 dark:text-gray-400 text-sm">
                                    Enter your email address and we'll send you a verification code to reset your password.
                                </p>
                            </div>

                            <form className="space-y-5" onSubmit={handleEmailSubmit}>
                                {error && (
                                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3.5 rounded-xl text-sm border border-red-100 dark:border-red-900/40 flex items-center gap-2">
                                        <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-red-500" />
                                        {error}
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email address</label>
                                    <input
                                        type="email" required placeholder="you@example.com"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 text-sm transition-all duration-200"
                                        value={email} onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                                <button type="submit" disabled={loading} className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-all shadow-sm">
                                    {loading ? 'Sending code...' : 'Send reset code'}
                                </button>
                            </form>
                        </>
                    )}

                    {step === 'OTP_AND_NEW_PASSWORD' && (
                        <>
                            <div className="mb-8">
                                <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800/40 flex items-center justify-center mb-6">
                                    <Lock className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                                </div>
                                <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                                    Create new password
                                </h1>
                                <p className="mt-2 text-gray-500 dark:text-gray-400 text-sm">
                                    Enter the 6-digit code sent to <span className="font-medium text-gray-900 dark:text-gray-200">{email}</span> and your new password.
                                </p>
                            </div>

                            <form className="space-y-6" onSubmit={handleResetSubmit}>
                                {error && (
                                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3.5 rounded-xl text-sm border border-red-100 dark:border-red-900/40 flex items-center gap-2">
                                        <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-red-500" />
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Verification Code</label>
                                    <div className="flex gap-2 sm:gap-3 justify-between">
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
                                                className="w-12 h-12 sm:w-14 sm:h-14 text-center text-xl font-bold bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary-500 focus:ring-2 focus:outline-none transition-all text-primary-600 dark:text-primary-400"
                                                placeholder="·"
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">New Password</label>
                                        <input
                                            type="password" required placeholder="At least 8 characters"
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 text-sm"
                                            value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confirm Password</label>
                                        <input
                                            type="password" required placeholder="Confirm new password"
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 text-sm"
                                            value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <button type="submit" disabled={loading || otp.join('').length !== 6} className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-all shadow-sm">
                                    {loading ? 'Resetting...' : 'Reset Password'}
                                </button>
                            </form>
                        </>
                    )}

                    {step === 'SUCCESS' && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6">
                                <ShieldCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Password Reset!</h2>
                            <p className="text-gray-500 dark:text-gray-400 mb-8">Your password has been successfully updated. You can now log in securely.</p>
                            <Link to="/login" className="inline-flex justify-center w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-all">
                                Return to login
                            </Link>
                        </div>
                    )}

                    {step !== 'SUCCESS' && (
                        <div className="mt-8 text-center">
                            <Link to="/login" className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 transition-colors group">
                                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                                Back to sign in
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
