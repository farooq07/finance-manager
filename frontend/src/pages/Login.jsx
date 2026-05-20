import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, TrendingUp, PieChart, Wallet, ShieldCheck, BarChart3, Landmark } from 'lucide-react';
import logo from '../assets/logo.svg';
import api from '../services/api';

/* ─── Bento Illustration Cards ─── */
const BentoCard = ({ icon: Icon, title, description, gradient, iconColor, delay }) => (
    <div
        className={`group relative overflow-hidden rounded-2xl p-5 border border-white/10 backdrop-blur-sm
            transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl cursor-default`}
        style={{
            background: gradient,
            animationDelay: delay,
        }}
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
    const [registrationEnabled, setRegistrationEnabled] = useState(true);

    const [unverifiedEmail, setUnverifiedEmail] = useState('');
    const [resendingVerify, setResendingVerify] = useState(false);
    const [verifyResentNote, setVerifyResentNote] = useState('');

    useEffect(() => {
        api.get('/auth/config')
            .then(({ data }) => setRegistrationEnabled(data.registrationEnabled))
            .catch(() => { }); // silently ignore
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
                setError(data.message || 'Please confirm your email address before logging in.');
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
            setVerifyResentNote('Verification email sent. Please check your inbox.');
        } catch {
            setVerifyResentNote('Could not resend right now. Please try again shortly.');
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
        <div className="min-h-screen flex bg-gray-950">

            {/* ─── LEFT: Bento Showcase Panel ─── */}
            <div className="hidden lg:flex lg:w-[55%] xl:w-[58%] relative overflow-hidden flex-col justify-between p-8 xl:p-12"
                style={{ background: 'linear-gradient(135deg, #0c1a17 0%, #102522 40%, #1A3D38 100%)' }}
            >
                <GridPattern />

                {/* Top: Brand */}
                <div className="relative z-10 w-full max-w-4xl mx-auto grid grid-cols-3 grid-rows-1 gap-4">
                    <span className="text-2xl font-bold text-white tracking-tight">
                        FSWealth <span className="text-emerald-400">Axis</span>
                    </span>
                </div>

                {/* Bento Grid */}
                <div className="relative z-10 flex-1 flex items-center py-8">
                    <div className="w-full max-w-2xl  grid grid-cols-3 grid-rows-3 gap-4">

                        {/* Card 1 — Large: Portfolio Overview */}
                        <div className="col-span-2 row-span-1 rounded-2xl p-6 border border-white/10 overflow-hidden"
                            style={{ background: 'linear-gradient(135deg, rgba(52,211,153,0.12) 0%, rgba(16,37,34,0.8) 100%)' }}>
                            <div className="flex items-center justify-between mb-1">
                                <div>
                                    <p className="text-white/50 text-xs font-medium uppercase tracking-wider">Total Portfolio</p>
                                    <p className="text-white text-2xl font-bold mt-1">$284,520<span className="text-emerald-400 text-sm font-medium ml-2">+12.4%</span></p>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                                </div>
                            </div>
                            <MiniChart />
                        </div>

                        {/* Card 2 — Small: Security */}
                        <BentoCard
                            icon={ShieldCheck}
                            title="Bank-Level Security"
                            description="256-bit encrypted"
                            gradient="linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(16,37,34,0.8) 100%)"
                            iconColor="bg-indigo-500/80"
                            delay="0.1s"
                        />

                        {/* Card 3 — Small: Wallet Tracking */}
                        <BentoCard
                            icon={Wallet}
                            title="Smart Wallets"
                            description="Track every account"
                            gradient="linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(16,37,34,0.8) 100%)"
                            iconColor="bg-amber-500/80"
                            delay="0.2s"
                        />

                        {/* Card 4 — Medium: Allocation Donut */}
                        <div className="col-span-2 rounded-2xl p-5 border border-white/10"
                            style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(16,37,34,0.8) 100%)' }}>
                            <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-3">Asset Allocation</p>
                            <div className="flex items-center gap-6">
                                <CircularProgress percent={42} color="#34d399" label="Stocks" />
                                <CircularProgress percent={28} color="#818cf8" label="Bonds" />
                                <CircularProgress percent={18} color="#fbbf24" label="Real Estate" />
                                <CircularProgress percent={12} color="#f87171" label="Cash" />
                            </div>
                        </div>

                        {/* Card 5 — Small: Reports */}
                        <BentoCard
                            icon={BarChart3}
                            title="Live Reports"
                            description="Real-time analytics"
                            gradient="linear-gradient(135deg, rgba(244,63,94,0.12) 0%, rgba(16,37,34,0.8) 100%)"
                            iconColor="bg-rose-500/80"
                            delay="0.3s"
                        />

                        {/* Card 6 — Tagline (shares last row with Card 5) */}
                        <div className="col-span-2 rounded-2xl p-5 border border-white/10 flex items-center gap-5"
                            style={{ background: 'linear-gradient(135deg, rgba(52,211,153,0.06) 0%, rgba(16,37,34,0.6) 100%)' }}>
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                                <Landmark className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold text-sm">All your finances, one dashboard</h3>
                                <p className="text-white/40 text-xs mt-0.5">Track investments, expenses, dues, rents, and portfolios — all in one place.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom: Testimonial */}
                <div className="relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                            {['bg-emerald-500', 'bg-indigo-500', 'bg-amber-500'].map((bg, i) => (
                                <div key={i} className={`w-8 h-8 rounded-full ${bg} border-2 border-gray-950 flex items-center justify-center text-white text-[10px] font-bold`}>
                                    {['AK', 'MF', 'SR'][i]}
                                </div>
                            ))}
                        </div>
                        <p className="text-white/40 text-xs">Trusted by <span className="text-white/70 font-semibold">2,000+</span> users worldwide</p>
                    </div>
                </div>

                {/* Floating Glow Effects */}
                <div className="absolute top-1/4 -right-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-10 left-1/4 w-48 h-48 bg-indigo-500/8 rounded-full blur-3xl" />
            </div>

            {/* ─── RIGHT: Login Form ─── */}
            <div className="w-full lg:w-[45%] xl:w-[42%] flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-white dark:bg-gray-950">
                <div className={`w-full ${step === 'OTP' ? 'max-w-md flex flex-col items-center' : 'max-w-[420px]'}`}>

                    {step === 'CREDENTIALS' ? (
                        <>
                            {/* Logo & Header */}
                            <div className="mb-10">
                                <img src={logo} alt="WealthAxis Logo" className="h-10 w-auto mb-8" />
                                <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                                    Welcome back
                                </h1>
                                <p className="mt-2 text-gray-500 dark:text-gray-400 text-sm">
                                    Sign in to your WealthAxis account to continue.
                                </p>
                            </div>

                            {/* Login Form */}
                            <form className="space-y-5" onSubmit={handleLoginSubmit}>
                                {error && (
                                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3.5 rounded-xl text-sm border border-red-100 dark:border-red-900/40 flex items-center gap-2">
                                        <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-red-500" />
                                        {error}
                                    </div>
                                )}

                                {unverifiedEmail && (
                                    <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 p-3.5 rounded-xl text-sm border border-amber-200 dark:border-amber-800/40">
                                        <div className="flex items-start gap-2">
                                            <Mail className="w-4 h-4 mt-0.5 shrink-0" />
                                            <div className="flex-1">
                                                <p className="font-medium">Email not confirmed yet</p>
                                                <p className="mt-1 text-xs text-amber-600/90 dark:text-amber-300/80">
                                                    We sent a verification link to <span className="font-semibold">{unverifiedEmail}</span>. Click it to activate your account.
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={handleResendVerification}
                                                    disabled={resendingVerify}
                                                    className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-200 underline underline-offset-2 hover:no-underline disabled:opacity-60"
                                                >
                                                    {resendingVerify ? 'Sending…' : 'Resend verification email'}
                                                </button>
                                                {verifyResentNote && (
                                                    <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">
                                                        {verifyResentNote}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        Email or Username
                                    </label>
                                    <input
                                        id="login-identifier"
                                        type="text"
                                        required
                                        placeholder="you@example.com"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 text-sm transition-all duration-200"
                                        value={identifier}
                                        onChange={(e) => setIdentifier(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Password
                                        </label>
                                        <Link to="/forgot-password" className="text-xs font-medium text-primary-500 hover:text-primary-400 transition-colors">
                                            Forgot password?
                                        </Link>
                                    </div>
                                    <input
                                        id="login-password"
                                        type="password"
                                        required
                                        placeholder="Enter your password"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 text-sm transition-all duration-200"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>

                                <button
                                    id="login-submit"
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Checking credentials...
                                        </span>
                                    ) : 'Sign in'}
                                </button>
                            </form>

                            {/* Register Link — hidden when registration is disabled */}
                            {registrationEnabled && (
                                <>
                                    <div className="relative my-8">
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-gray-200 dark:border-gray-800" />
                                        </div>
                                        <div className="relative flex justify-center text-xs">
                                            <span className="px-3 bg-white dark:bg-gray-950 text-gray-400 dark:text-gray-500 font-medium">
                                                New to WealthAxis?
                                            </span>
                                        </div>
                                    </div>
                                    <Link
                                        to="/register"
                                        className="w-full flex justify-center py-2.5 px-4 rounded-xl text-sm font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 border border-primary-200 dark:border-primary-800/40 transition-all duration-200"
                                    >
                                        Create an account
                                    </Link>
                                </>
                            )}

                            {/* Mobile: Feature pills */}
                            <div className="mt-10 lg:hidden">
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {[
                                        { icon: TrendingUp, label: 'Investments' },
                                        { icon: Wallet, label: 'Wallets' },
                                        { icon: PieChart, label: 'Analytics' },
                                        { icon: ShieldCheck, label: 'Secure' },
                                    ].map(({ icon: Icon, label }) => (
                                        <span key={label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium">
                                            <Icon className="w-3.5 h-3.5" />
                                            {label}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        /* ─── OTP Step ─── */
                        <>
                            <div className="w-14 h-14 rounded-2xl bg-primary-50 dark:bg-emerald-900/20 border border-primary-100 dark:border-emerald-800/40 flex items-center justify-center shadow-sm mb-6">
                                <Mail className="w-7 h-7 text-primary-600 dark:text-emerald-400" strokeWidth={2} />
                            </div>

                            <div className="text-center space-y-2 mb-8">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                                    Check your email
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    We sent a verification code to<br />
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">{emailCache}</span>
                                </p>
                            </div>

                            <form className="w-full space-y-6 max-w-[360px]" onSubmit={handleOtpSubmit}>
                                {error && (
                                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm text-center border border-red-100 dark:border-red-900/50">
                                        {error}
                                    </div>
                                )}

                                <div className="flex gap-2 sm:gap-3 justify-center">
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
                                            className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 focus:outline-none transition-all text-primary-600 dark:text-emerald-400 placeholder-gray-300 dark:placeholder-gray-600"
                                            placeholder="·"
                                            disabled={loading}
                                        />
                                    ))}
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || otp.join('').length !== 6}
                                    className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                                >
                                    {loading ? 'Verifying...' : 'Verify email'}
                                </button>
                            </form>

                            <div className="text-sm text-center mt-8">
                                <span className="text-gray-400 dark:text-gray-500">Didn't receive the email? </span>
                                <button
                                    type="button"
                                    disabled={loading}
                                    onClick={async () => {
                                        try {
                                            await api.post('/auth/resend-otp', { userId });
                                            setError('');
                                        } catch {
                                            setError('Failed to resend OTP. Please try again.');
                                        }
                                    }}
                                    className="font-semibold text-primary-600 dark:text-emerald-400 hover:text-primary-500 transition-colors disabled:opacity-50"
                                >
                                    Click to resend
                                </button>
                            </div>

                            <div className="mt-8">
                                <button
                                    type="button"
                                    onClick={() => { setStep('CREDENTIALS'); setOtp(['', '', '', '', '', '']); setError(''); }}
                                    className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors group bg-transparent border-none"
                                >
                                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                                    Back to sign in
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
