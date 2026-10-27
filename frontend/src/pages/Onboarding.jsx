import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowRight, FileText, HeartHandshake, SlidersHorizontal } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useUpdatePreferences } from '../hooks/usePreferences';
import { fmtPKR } from '../utils/currency';
import InterestPicker from '../components/onboarding/InterestPicker';
import AccountRows from '../components/onboarding/AccountRows';
import { qk } from '../lib/queryKeys';

const errorMessage = (err) => err.response?.data?.message || 'Could not save your preferences';

/**
 * First-run setup: what to track → accounts with balances → net worth.
 * Every step can be skipped; finishing or skipping stamps onboarded_at.
 */
export default function Onboarding() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const preferences = useUpdatePreferences();
    const [step, setStep] = useState(1);
    const [interests, setInterests] = useState(() => (Array.isArray(user?.interests) ? user.interests : []));
    const [typedTotal, setTypedTotal] = useState(0);

    // Finish (or skip) onboarding, then go where the user asked.
    async function finish(to = '/') {
        try {
            await preferences.mutateAsync({ completeOnboarding: true });
            navigate(to, { replace: true });
        } catch (err) {
            toast.error(errorMessage(err));
        }
    }

    async function saveInterests() {
        try {
            await preferences.mutateAsync({ interests });
            setStep(2);
        } catch (err) {
            toast.error(errorMessage(err));
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-white to-white dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-950 px-4 py-10">
            <div className="mx-auto w-full max-w-lg">
                <div className="flex items-center justify-between mb-6">
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-neutral-500">Step {step} of 3</p>
                    {step < 3 && (
                        <button
                            type="button"
                            onClick={() => finish('/')}
                            className="text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                            Skip setup
                        </button>
                    )}
                </div>
                <div className="flex gap-1.5 mb-8" aria-hidden="true">
                    {[1, 2, 3].map((n) => (
                        <span key={n} className={`h-1 flex-1 rounded-full ${n <= step ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-neutral-800'}`} />
                    ))}
                </div>

                {step === 1 && (
                    <section className="space-y-5">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">What do you want to track?</h1>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Accounts, expenses, Zakat and reports are always included.</p>
                        </div>
                        <InterestPicker value={interests} onChange={setInterests} />
                        <button
                            type="button"
                            onClick={saveInterests}
                            disabled={preferences.isPending}
                            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
                        >
                            Continue
                        </button>
                    </section>
                )}

                {step === 2 && (
                    <section className="space-y-5">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Add your accounts</h1>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Your banks and wallets with today&apos;s balance. You can import statements later.</p>
                        </div>
                        <AccountRows onDone={(total) => { setTypedTotal(total); setStep(3); }} />
                    </section>
                )}

                {step === 3 && <SetUpStep typedTotal={typedTotal} onFinish={finish} busy={preferences.isPending} />}
            </div>
        </div>
    );
}

function SetUpStep({ typedTotal, onFinish, busy }) {
    const summary = useQuery({
        queryKey: qk.dashboardSummary,
        queryFn: async () => (await api.get('/dashboard/summary')).data,
        retry: false,
    });
    // Fall back to what the user typed if the summary can't load.
    const netWorth = summary.data?.metrics?.netWorth ?? (summary.isError ? typedTotal : null);

    const next = [
        { to: '/accounts', label: 'Import a statement for history', icon: FileText },
        { to: '/personal?tab=zakat', label: 'Check your Zakat', icon: HeartHandshake },
        { to: '/settings?tab=tracking', label: 'Change what you track', icon: SlidersHorizontal },
    ];

    return (
        <section className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">You&apos;re set up</h1>
                <p className="mt-3 text-lg text-gray-600 dark:text-gray-300">
                    Your net worth:{' '}
                    <span className="font-bold tabular-nums text-gray-900 dark:text-gray-100">{netWorth == null ? '…' : fmtPKR(netWorth)}</span>
                </p>
            </div>
            <ul className="space-y-2">
                {next.map(({ to, label, icon }) => {
                    const Icon = icon;
                    return (
                    <li key={to}>
                        <button
                            type="button"
                            onClick={() => onFinish(to)}
                            disabled={busy}
                            className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-gray-200 bg-white hover:border-gray-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 text-left"
                        >
                            <span className="flex items-center gap-3 text-sm text-gray-800 dark:text-gray-200">
                                <Icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                {label}
                            </span>
                            <ArrowRight className="w-4 h-4 text-gray-400 dark:text-neutral-500" />
                        </button>
                    </li>
                    );
                })}
            </ul>
            <button
                type="button"
                onClick={() => onFinish('/')}
                disabled={busy}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
            >
                Go to dashboard
            </button>
        </section>
    );
}
