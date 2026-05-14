import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { ArrowLeft, TrendingUp, PieChart, Wallet, ShieldCheck, BarChart3, Landmark, UserPlus, Mail, CheckCircle2 } from 'lucide-react';
import logo from '../assets/logo.svg';

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
                <stop offset="0%" stopColor="#818cf8" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
            </linearGradient>
        </defs>
        <path d="M0 60 Q25 55 40 45 T80 30 T120 35 T160 20 T200 15" stroke="#818cf8" strokeWidth="2" fill="none" />
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

export default function Register() {
    const { register, resendVerification } = useAuth();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [submittedEmail, setSubmittedEmail] = useState('');
    const [resending, setResending] = useState(false);
    const [resentNote, setResentNote] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await register(name, email, password);
            setSubmittedEmail(email);
        } catch (err) {
            const status = err.response?.status;
            const message = err.response?.data?.message;
            if (status === 403) {
                setError(message || 'Registration is currently disabled. Please contact your administrator.');
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
            setResentNote('Could not resend right now. Please try again shortly.');
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-gray-950">

            {/* ─── LEFT: Bento Showcase Panel ─── */}
            <div className="hidden lg:flex lg:w-[55%] xl:w-[58%] relative overflow-hidden flex-col justify-between p-8 xl:p-12"
                style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #1e1b4b 100%)' }}
            >
                <GridPattern />

                {/* Top: Brand */}
                <div className="relative z-10 flex items-center justify-between">
                    <img src={logo} alt="WealthAxis" className="h-8 brightness-0 invert opacity-90" />
                    <span className="px-4 py-1.5 rounded-full bg-white/10 text-white border border-white/20 text-xs font-medium tracking-wide">
                        Join 2,000+ Users
                    </span>
                </div>

                {/* Bento Grid */}
                <div className="relative z-10 flex-1 flex items-center py-8">
                    <div className="w-full max-w-2xl mx-auto grid grid-cols-3 grid-rows-3 gap-4">

                        {/* Card 1 — Large: Growth Overview */}
                        <div className="col-span-2 row-span-1 rounded-2xl p-6 border border-white/10 overflow-hidden"
                            style={{ background: 'linear-gradient(135deg, rgba(129,140,248,0.12) 0%, rgba(30,27,75,0.8) 100%)' }}>
                            <div className="flex items-center justify-between mb-1">
                                <div>
                                    <p className="text-white/50 text-xs font-medium uppercase tracking-wider">Start Growing</p>
                                    <p className="text-white text-2xl font-bold mt-1">Accelerate <span className="text-indigo-400 font-medium ml-2">Wealth</span></p>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                                    <UserPlus className="w-5 h-5 text-indigo-400" />
                                </div>
                            </div>
                            <MiniChart />
                        </div>

                        {/* Card 2 — Small: Security */}
                        <BentoCard icon={ShieldCheck} title="Bank-Level Security" description="256-bit encrypted" gradient="linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(30,27,75,0.8) 100%)" iconColor="bg-indigo-500/80" delay="0.1s" />
                        <BentoCard icon={Wallet} title="Smart Wallets" description="Track every account" gradient="linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(30,27,75,0.8) 100%)" iconColor="bg-amber-500/80" delay="0.2s" />

                        <div className="col-span-2 rounded-2xl p-5 border border-white/10" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(30,27,75,0.8) 100%)' }}>
                            <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-3">Asset Allocation</p>
                            <div className="flex items-center gap-6">
                                <CircularProgress percent={42} color="#34d399" label="Stocks" />
                                <CircularProgress percent={28} color="#818cf8" label="Bonds" />
                                <CircularProgress percent={18} color="#fbbf24" label="Real Estate" />
                                <CircularProgress percent={12} color="#f87171" label="Cash" />
                            </div>
                        </div>

                        <BentoCard icon={BarChart3} title="Live Reports" description="Real-time analytics" gradient="linear-gradient(135deg, rgba(244,63,94,0.12) 0%, rgba(30,27,75,0.8) 100%)" iconColor="bg-rose-500/80" delay="0.3s" />

                        <div className="col-span-3 rounded-2xl p-5 border border-white/10 flex items-center gap-5" style={{ background: 'linear-gradient(135deg, rgba(129,140,248,0.06) 0%, rgba(30,27,75,0.6) 100%)' }}>
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center shrink-0">
                                <Landmark className="w-6 h-6 text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold text-sm">Create your free account today</h3>
                                <p className="text-white/40 text-xs mt-0.5">Start tracking investments, expenses, dues, and rents — all in one unified dashboard.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="absolute top-1/4 -right-20 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-10 left-1/4 w-48 h-48 bg-purple-500/8 rounded-full blur-3xl" />
            </div>

            {/* ─── RIGHT: Register Form ─── */}
            <div className="w-full lg:w-[45%] xl:w-[42%] flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-white dark:bg-gray-950 border-l border-gray-100 dark:border-gray-800">
                <div className="w-full max-w-[420px]">

                    {submittedEmail ? (
                        /* ─── Email-sent success state ─── */
                        <div className="text-center">
                            <img src={logo} alt="WealthAxis Logo" className="h-10 w-auto mb-8 lg:hidden mx-auto" />
                            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center mb-6">
                                <Mail className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                                Confirm your email
                            </h1>
                            <p className="mt-3 text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                                We've sent a verification link to
                                <br />
                                <span className="font-semibold text-gray-900 dark:text-gray-100">{submittedEmail}</span>
                            </p>
                            <p className="mt-2 text-gray-400 dark:text-gray-500 text-xs">
                                Click the link in your inbox to activate your account. The link expires in 24 hours.
                            </p>

                            {resentNote && (
                                <div className="mt-5 inline-flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="w-4 h-4" />
                                    {resentNote}
                                </div>
                            )}

                            <div className="mt-8 space-y-3">
                                <button
                                    onClick={handleResend}
                                    disabled={resending}
                                    className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 border border-primary-200 dark:border-primary-800/40 transition-all disabled:opacity-50"
                                >
                                    {resending ? 'Sending…' : 'Resend verification email'}
                                </button>
                                <Link
                                    to="/login"
                                    className="block w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-all shadow-sm hover:shadow-md"
                                >
                                    Back to sign in
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <>
                    {/* Logo & Header */}
                    <div className="mb-10">
                        <img src={logo} alt="WealthAxis Logo" className="h-10 w-auto mb-8 lg:hidden" />
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                            Create an account
                        </h1>
                        <p className="mt-2 text-gray-500 dark:text-gray-400 text-sm">
                            Join WealthAxis to take control of your financial future.
                        </p>
                    </div>

                    {/* Register Form */}
                    <form className="space-y-5" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3.5 rounded-xl text-sm border border-red-100 dark:border-red-900/40 flex items-center gap-2">
                                <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-red-500" />
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Full Name
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="John Doe"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 text-sm transition-all duration-200"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Email address
                            </label>
                            <input
                                type="email"
                                required
                                placeholder="you@example.com"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 text-sm transition-all duration-200"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Password
                            </label>
                            <input
                                type="password"
                                required
                                placeholder="Create a strong password"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 text-sm transition-all duration-200"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <button
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
                                    Creating account...
                                </span>
                            ) : 'Sign up'}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200 dark:border-gray-800" />
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="px-3 bg-white dark:bg-gray-950 text-gray-400 dark:text-gray-500 font-medium">
                                Already have an account?
                            </span>
                        </div>
                    </div>

                    {/* Login Link */}
                    <Link
                        to="/login"
                        className="w-full flex justify-center py-2.5 px-4 rounded-xl text-sm font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 border border-primary-200 dark:border-primary-800/40 transition-all duration-200"
                    >
                        Sign in instead
                    </Link>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
