import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Checkbox } from './ui/checkbox';

export default function LegalAcceptGate() {
    const { user, refreshUser } = useAuth();
    const [agreed, setAgreed] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    if (!user) return null;
    if (user.terms_accepted_at && user.privacy_accepted_at) return null;

    const handleAccept = async () => {
        if (!agreed || submitting) return;
        setSubmitting(true);
        setError('');
        try {
            await api.post('/auth/accept-legal');
            await refreshUser();
        } catch (err) {
            setError(err?.response?.data?.message || 'Could not record your acceptance. Please try again.');
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-neutral-800 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200 dark:border-neutral-800 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            One quick step
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Required before you continue
                        </p>
                    </div>
                </div>

                <div className="px-6 py-5 space-y-4 text-sm text-gray-700 dark:text-gray-300">
                    <p>
                        We've updated our legal documents. Please review and accept our{' '}
                        <Link to="/terms" target="_blank" rel="noreferrer" className="text-emerald-600 dark:text-emerald-400 underline underline-offset-2 hover:opacity-80">
                            Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link to="/privacy" target="_blank" rel="noreferrer" className="text-emerald-600 dark:text-emerald-400 underline underline-offset-2 hover:opacity-80">
                            Privacy Policy
                        </Link>{' '}
                        to continue using FSWealth Axis.
                    </p>

                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Your data stays yours. You can export everything or delete your account anytime
                        from Settings.
                    </p>

                    <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-neutral-800/60">
                        <Checkbox
                            id="legal-agree"
                            checked={agreed}
                            onCheckedChange={(c) => setAgreed(c === true)}
                            className="mt-0.5"
                        />
                        <label htmlFor="legal-agree" className="text-sm text-gray-700 dark:text-gray-300 leading-snug cursor-pointer">
                            I have read and agree to the Terms of Service and Privacy Policy.
                        </label>
                    </div>

                    {error && (
                        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                    )}
                </div>

                <div className="px-6 py-4 bg-gray-50 dark:bg-neutral-900/60 border-t border-gray-200 dark:border-neutral-800 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={handleAccept}
                        disabled={!agreed || submitting}
                        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 dark:disabled:bg-neutral-700 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
                    >
                        {submitting ? 'Saving…' : 'Accept and continue'}
                    </button>
                </div>
            </div>
        </div>
    );
}
