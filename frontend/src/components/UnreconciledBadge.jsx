/**
 * Small warning pill for a statement the user imported even though its
 * balances didn't reconcile (statement.processing_status === 'unreconciled').
 */
export default function UnreconciledBadge({ status }) {
    if (status !== 'unreconciled') return null;
    return (
        <span
            title="Imported even though its balances didn't reconcile — check its transactions."
            className="inline-block ml-1.5 px-1.5 py-px rounded-full text-[9px] font-semibold uppercase tracking-wide bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        >
            Didn't add up
        </span>
    );
}
