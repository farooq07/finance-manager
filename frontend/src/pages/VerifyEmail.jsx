import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, XCircle, Loader2, Mail, ArrowRight } from 'lucide-react';
import logo from '../assets/logo.svg';

export default function VerifyEmail() {
    const [params] = useSearchParams();
    const token = params.get('token');
    const { verifyEmail, resendVerification } = useAuth();

    const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'expired' | 'error'
    const [message, setMessage] = useState('');
    const [expiredEmail, setExpiredEmail] = useState('');
    const [resending, setResending] = useState(false);
    const [resentNote, setResentNote] = useState('');

    useEffect(() => {
        let cancelled = false;
        async function run() {
            if (!token) {
                setStatus('error');
                setMessage('Missing verification token in the link.');
                return;
            }
            try {
                const data = await verifyEmail(token);
                if (cancelled) return;
                setStatus('success');
                setMessage(data.message || 'Email verified successfully.');
            } catch (err) {
                if (cancelled) return;
                const data = err.response?.data;
                if (data?.expired) {
                    setStatus('expired');
                    setExpiredEmail(data.email || '');
                    setMessage(data.message || 'This verification link has expired.');
                } else {
                    setStatus('error');
                    setMessage(data?.message || 'Could not verify this link.');
                }
            }
        }
        run();
        return () => { cancelled = true; };
    }, [token, verifyEmail]);

    const handleResend = async () => {
        if (!expiredEmail) return;
        setResentNote('');
        setResending(true);
        try {
            await resendVerification(expiredEmail);
            setResentNote('A new verification link has been sent. Please check your inbox.');
        } catch {
            setResentNote('Could not resend right now. Please try again shortly.');
        } finally {
            setResending(false);
        }
    };

    const Icon = {
        verifying: Loader2,
        success: CheckCircle2,
        expired: Mail,
        error: XCircle
    }[status];

    const iconBg = {
        verifying: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
        success: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
        expired: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
        error: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
    }[status];

    const title = {
        verifying: 'Verifying your email…',
        success: 'You\'re all set!',
        expired: 'Link has expired',
        error: 'Verification failed'
    }[status];

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
            <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-8 text-center">
                <img src={logo} alt="WealthAxis" className="h-9 mx-auto mb-8" />

                <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-6 ${iconBg}`}>
                    <Icon className={`w-8 h-8 ${status === 'verifying' ? 'animate-spin' : ''}`} />
                </div>

                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {title}
                </h1>
                <p className="mt-3 text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                    {message}
                </p>

                {resentNote && (
                    <div className="mt-5 inline-flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        {resentNote}
                    </div>
                )}

                <div className="mt-8 space-y-3">
                    {status === 'success' && (
                        <Link
                            to="/login"
                            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-all shadow-sm hover:shadow-md"
                        >
                            Continue to sign in
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    )}

                    {status === 'expired' && expiredEmail && (
                        <button
                            onClick={handleResend}
                            disabled={resending}
                            className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-all disabled:opacity-50"
                        >
                            {resending ? 'Sending…' : 'Send a new verification link'}
                        </button>
                    )}

                    {(status === 'error' || status === 'expired') && (
                        <Link
                            to="/login"
                            className="block w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 border border-primary-200 dark:border-primary-800/40 transition-all"
                        >
                            Back to sign in
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
