import { Check } from 'lucide-react';
import { INTERESTS } from '../../utils/interests';

/**
 * Tick-cards for the six optional interests. Controlled: `value` is the list
 * of picked keys, `onChange` receives the new list.
 */
export default function InterestPicker({ value, onChange }) {
    const toggle = (key) => onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key]);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {INTERESTS.map(({ key, label, description }) => {
                const checked = value.includes(key);
                return (
                    <label
                        key={key}
                        className={`relative flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${checked
                            ? 'border-emerald-400 bg-emerald-50/70 dark:border-emerald-600 dark:bg-emerald-900/20'
                            : 'border-gray-200 bg-white hover:border-gray-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700'}`}
                    >
                        <input type="checkbox" className="sr-only peer" checked={checked} onChange={() => toggle(key)} />
                        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500/40 ${checked
                            ? 'border-emerald-500 bg-emerald-500 text-white dark:border-emerald-500'
                            : 'border-gray-300 dark:border-neutral-600'}`}
                        >
                            {checked && <Check className="w-3.5 h-3.5" />}
                        </span>
                        <span>
                            <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">{label}</span>
                            <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</span>
                        </span>
                    </label>
                );
            })}
        </div>
    );
}
