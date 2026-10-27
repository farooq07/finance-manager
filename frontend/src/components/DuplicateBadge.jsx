import { Copy } from 'lucide-react';

/**
 * Shows the import's duplicate verdict on a transaction:
 *  - 'possible' → kept and counted, but flagged so the user can decide
 *  - 'certain'  → already imported; rejected and not counted
 */
export default function DuplicateBadge({ tx }) {
    if (tx?.duplicate_match === 'possible') {
        return (
            <span
                title="Same amount and a similar description on a nearby date as a transaction already imported. Delete it if it's a repeat; approve it if it's real."
                className="ml-2 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
            >
                <Copy className="w-3 h-3" aria-hidden="true" />
                Possible duplicate
            </span>
        );
    }
    if (tx?.is_duplicate) {
        return (
            <span
                title="Already imported from another statement — not counted in your totals."
                className="ml-2 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            >
                <Copy className="w-3 h-3" aria-hidden="true" />
                Duplicate
            </span>
        );
    }
    return null;
}
