import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { useUpdatePreferences } from '../../hooks/usePreferences';
import { INTERESTS } from '../../utils/interests';
import InterestPicker from '../onboarding/InterestPicker';

const ALL_KEYS = INTERESTS.map((i) => i.key);

/**
 * Settings → "What I track". Same picker as onboarding. A user who never
 * picked (interests null) sees everything ticked; "Show everything" resets
 * to null so pages added later appear too.
 */
export default function WhatITrack() {
    const { user } = useAuth();
    const preferences = useUpdatePreferences();
    const [picked, setPicked] = useState(() => (Array.isArray(user?.interests) ? user.interests : ALL_KEYS));

    async function save(interests) {
        try {
            await preferences.mutateAsync({ interests });
            toast.success('Your menu has been updated');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not save your preferences');
        }
    }

    return (
        <div className="flex-1 overflow-y-auto px-8 py-6">
            <div className="max-w-2xl space-y-5">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">What I track</h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Choose what appears in your menu. Accounts, expenses, Zakat and reports are always included.
                    </p>
                </div>
                <InterestPicker value={picked} onChange={setPicked} />
                <div className="flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={() => save(picked)}
                        disabled={preferences.isPending}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
                    >
                        Save
                    </button>
                    <button
                        type="button"
                        onClick={() => { setPicked(ALL_KEYS); save(null); }}
                        disabled={preferences.isPending}
                        className="px-5 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 dark:border-neutral-700 dark:hover:bg-neutral-800 disabled:opacity-50 text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors"
                    >
                        Show everything
                    </button>
                </div>
            </div>
        </div>
    );
}
