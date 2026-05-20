import React, { useState, useRef, useEffect } from 'react';
import { Mail, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function OTPVerification() {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const inputRefs = useRef([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [email] = useState('olivia@untitledui.com'); // Placeholder for demonstration

    const handleChange = (index, value) => {
        // Only allow numbers
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

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace') {
            if (!otp[index] && index > 0) {
                // Move to previous input on backspace if current is empty
                inputRefs.current[index - 1]?.focus();
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const otpString = otp.join('');
        if (otpString.length !== 6) {
            setError('Please enter all 6 digits');
            return;
        }

        setError('');
        setLoading(true);

        // Simulate API call
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            // In a real app, you would redirect or handle success here
        } catch (err) {
            setError('Invalid code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = (e) => {
        e.preventDefault();
        // Simulate resend API call
    };

    // Auto-inject OTP in development mode
    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            // Auto-fill with development OTP after a short delay
            const timer = setTimeout(() => {
                const devOtp = ['1', '2', '3', '4', '5', '6'];
                setOtp(devOtp);
                inputRefs.current[5]?.focus();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
            <div className="max-w-md w-full space-y-8 flex flex-col items-center">
                {/* Icon Header */}
                <div className="w-12 h-12 rounded-xl bg-green-50/50 dark:bg-emerald-900/20 border border-green-100 dark:border-emerald-900/50 flex items-center justify-center shadow-sm transition-colors">
                    <Mail className="w-6 h-6 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
                </div>

                {/* Text Content */}
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
                        Check your email
                    </h2>
                    <p className="text-base text-gray-500 dark:text-gray-400">
                        We sent a verification link to <br />
                        <span className="font-medium text-gray-900 dark:text-gray-100">{email}</span>
                    </p>
                </div>

                {/* Form */}
                <form className="mt-8 space-y-6 w-full max-w-[360px]" onSubmit={handleSubmit}>
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm text-center border border-red-100 dark:border-red-900/50">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3 justify-center">
                        {otp.map((digit, index) => (
                            <input
                                key={index}
                                ref={el => inputRefs.current[index] = el}
                                type="text"
                                inputMode="numeric"
                                maxLength={digit ? 1 : 6} // Allow pasting when empty
                                value={digit}
                                onChange={e => handleChange(index, e.target.value)}
                                onKeyDown={e => handleKeyDown(index, e)}
                                className="w-14 h-16 text-center text-3xl font-semibold bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-600 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:outline-none transition-all shadow-sm text-emerald-600 dark:text-emerald-400"
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
                <div className="text-sm text-center">
                    <span className="text-gray-500 dark:text-gray-400">Didn't receive the email? </span>
                    <button
                        type="button"
                        onClick={handleResend}
                        className="font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
                    >
                        Click to resend
                    </button>
                </div>

                {/* Back Link */}
                <div className="mt-8">
                    <Link
                        to="/login"
                        className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors group"
                    >
                        <ArrowLeft className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                        Back to log in
                    </Link>
                </div>
            </div>
        </div>
    );
}
