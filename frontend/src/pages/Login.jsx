import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import logo from '../assets/logo.svg';

export default function Login() {
    const { login, verifyOtp } = useAuth();
    const [step, setStep] = useState('CREDENTIALS'); // 'CREDENTIALS' | 'OTP'
    const [userId, setUserId] = useState(null);

    const [identifier, setIdentifier] = useState('');
    const [emailCache, setEmailCache] = useState(''); // Store email for OTP message
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const inputRefs = useRef([]);

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await login(identifier, password);
            if (response.requiresOtp) {
                setUserId(response.userId);
                setEmailCache(response.email); // Store the actual user email returned from backend
                setStep('OTP');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to login');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (index, value) => {
        if (value && !/^\d+$/.test(value)) return;

        const newOtp = [...otp];
        // Handle pasting multiple characters
        if (value.length > 1) {
            const pastedData = value.slice(0, 6).split('');
            for (let i = 0; i < pastedData.length; i++) {
                if (index + i < 6) {
                    newOtp[index + i] = pastedData[i];
                }
            }
            setOtp(newOtp);
            // Focus the last filled input
            const focusIndex = Math.min(index + pastedData.length, 5);
            inputRefs.current[focusIndex]?.focus();
            return;
        }

        newOtp[index] = value;
        setOtp(newOtp);

        // Move to next input if value is entered
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace') {
            if (!otp[index] && index > 0) {
                // Move to previous input on backspace if current is empty
                inputRefs.current[index - 1]?.focus();
            }
        }
    };

    const handleOtpSubmit = async (e) => {
        e.preventDefault();
        const otpString = otp.join('');
        if (otpString.length !== 6) {
            setError('OTP must be 6 digits');
            return;
        }
        setError('');
        setLoading(true);
        try {
            await verifyOtp(userId, otpString);
            // Context handles token and redirects via ProtectedRoute
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid or expired OTP');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
            <div className={`w-full bg-white dark:bg-neutral-800 p-10 rounded-2xl shadow-xl border border-gray-100 dark:border-neutral-700 transition-colors ${step === 'OTP' ? 'max-w-md flex flex-col items-center' : 'max-w-md space-y-8'}`}>

                {step === 'CREDENTIALS' ? (
                    <>
                        <div className="flex flex-col items-center">
                            <img src={logo} alt="WealthAxis Logo" className="h-12 w-auto mb-4" />
                            <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
                                Sign in to WealthAxis
                            </h2>
                            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                                Or{' '}
                                <Link to="/register" className="font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300">
                                    create a new account
                                </Link>
                            </p>
                        </div>

                        <form className="mt-8 space-y-6" onSubmit={handleLoginSubmit}>
                            {error && (
                                <div className="bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 p-3 rounded text-sm text-center border border-red-100 dark:border-red-900/50">
                                    {error}
                                </div>
                            )}
                            <div className=" space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email or Username</label>
                                    <input
                                        type="text"
                                        required
                                        className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-colors"
                                        value={identifier}
                                        onChange={(e) => setIdentifier(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                                    <input
                                        type="password"
                                        required
                                        className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-colors"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors shadow-sm"
                                >
                                    {loading ? 'Checking credentials...' : 'Continue'}
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <>
                        {/* Icon Header */}
                        <div className="w-12 h-12 rounded-xl bg-green-50/50 dark:bg-emerald-900/20 border border-green-100 dark:border-emerald-900/50 flex items-center justify-center shadow-sm mb-6 transition-colors">
                            <Mail className="w-6 h-6 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
                        </div>

                        {/* Text Content */}
                        <div className="text-center space-y-2 mb-8">
                            <h2 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
                                Check your email
                            </h2>
                            <p className="text-base text-gray-500 dark:text-gray-400">
                                We sent a verification code to <br />
                                <span className="font-medium text-gray-900 dark:text-gray-100">{emailCache}</span>
                            </p>
                        </div>

                        {/* Form */}
                        <form className="w-full space-y-6 max-w-[360px]" onSubmit={handleOtpSubmit}>
                            {error && (
                                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm text-center border border-red-100 dark:border-red-900/50">
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
                                        maxLength={digit ? 1 : 6} // Allow pasting
                                        value={digit}
                                        onChange={e => handleOtpChange(index, e.target.value)}
                                        onKeyDown={e => handleOtpKeyDown(index, e)}
                                        className="w-12 h-14 sm:w-14 sm:h-16 text-center text-3xl font-semibold bg-white dark:bg-neutral-900 border border-gray-300 dark:border-neutral-600 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:outline-none transition-all shadow-sm text-emerald-600 dark:text-emerald-400"
                                        placeholder="0"
                                        disabled={loading}
                                    />
                                ))}
                            </div>

                            <button
                                type="submit"
                                disabled={loading || otp.join('').length !== 6}
                                className="w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                                {loading ? 'Verifying...' : 'Verify email'}
                            </button>
                        </form>

                        {/* Resend Link */}
                        <div className="text-sm text-center mt-8">
                            <span className="text-gray-500 dark:text-gray-400">Didn't receive the email? </span>
                            <button
                                type="button"
                                className="font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
                            >
                                Click to resend
                            </button>
                        </div>

                        {/* Back Link */}
                        <div className="mt-8">
                            <button
                                type="button"
                                onClick={() => {
                                    setStep('CREDENTIALS');
                                    setOtp(['', '', '', '', '', '']);
                                    setError('');
                                }}
                                className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors group bg-transparent border-none"
                            >
                                <ArrowLeft className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                                Back to log in
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
