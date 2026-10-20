import { useState, useMemo } from 'react';
import { X, Plus, Trash2, CheckCircle, AlertTriangle, FileText, Loader2 } from 'lucide-react';
import { fmtPKR } from '../utils/currency';

/**
 * Review/edit grid for PDF statement imports.
 *
 * PDF text extraction is inherently lossy, so instead of trusting it blindly we
 * show the best-effort rows in an editable table and let the user fix anything
 * wrong before importing. A live reconciliation banner (opening + Σ = closing)
 * tells them at a glance whether the numbers add up.
 *
 * props:
 *   preview   = { transactions, opening, closing } from previewStatement (PDF)
 *   fileName  = display only
 *   onConfirm({ transactions, opening, closing })
 *   onCancel()
 *   committing = bool
 */
function toDateInput(d) {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt)) return '';
    return dt.toISOString().slice(0, 10);
}

export default function StatementReviewModal({ preview, fileName, onConfirm, onCancel, committing }) {
    const [rows, setRows] = useState(() =>
        (preview?.transactions || []).map((t, i) => ({
            _id: i,
            date: toDateInput(t.transaction_date),
            description: t.description || '',
            debit: t.debit_amount != null ? String(t.debit_amount) : '',
            credit: t.credit_amount != null ? String(t.credit_amount) : '',
            balance: t.balance != null ? String(t.balance) : '',
        }))
    );
    const [opening, setOpening] = useState(preview?.opening != null ? String(preview.opening) : '');
    const [closing, setClosing] = useState(preview?.closing != null ? String(preview.closing) : '');

    const num = (v) => {
        const n = parseFloat(String(v).replace(/[,\s]/g, ''));
        return isNaN(n) ? 0 : n;
    };

    const updateRow = (id, field, value) =>
        setRows((rs) => rs.map((r) => (r._id === id ? { ...r, [field]: value } : r)));
    const deleteRow = (id) => setRows((rs) => rs.filter((r) => r._id !== id));
    const addRow = () =>
        setRows((rs) => [...rs, { _id: Date.now(), date: '', description: '', debit: '', credit: '', balance: '' }]);

    // Live reconciliation (totals)
    const recon = useMemo(() => {
        const sumNet = rows.reduce((s, r) => s + (num(r.credit) - num(r.debit)), 0);
        const hasOpen = opening.trim() !== '';
        const hasClose = closing.trim() !== '';
        if (!hasOpen || !hasClose) return { verifiable: false };
        const computed = num(opening) + sumNet;
        const diff = Math.abs(computed - num(closing));
        return { verifiable: true, ok: diff < 0.01, computed, expected: num(closing), diff };
    }, [rows, opening, closing]);

    // Per-row check: a row's balance must equal the previous balance (or the
    // opening, for the first row) plus its credit minus its debit. Rows without
    // a balance can't be checked and reset the chain.
    // Newest-first statements are checked in reverse; whichever order holds wins.
    const brokenRows = useMemo(() => {
        const chain = (ordered) => {
            const broken = new Set();
            let prev = opening.trim() !== '' ? num(opening) : null;
            for (const r of ordered) {
                if (r.balance.trim() === '') { prev = null; continue; }
                const bal = num(r.balance);
                if (prev != null && Math.abs(prev + num(r.credit) - num(r.debit) - bal) >= 0.01) broken.add(r._id);
                prev = bal;
            }
            return broken;
        };
        const forward = chain(rows);
        if (forward.size === 0) return forward;
        const backward = chain([...rows].reverse());
        return backward.size === 0 ? backward : forward;
    }, [rows, opening]);

    const mismatched = (recon.verifiable && !recon.ok) || brokenRows.size > 0;
    const [acceptMismatch, setAcceptMismatch] = useState(false);
    const canImport = !mismatched || acceptMismatch;

    const totalIn = rows.reduce((s, r) => s + num(r.credit), 0);
    const totalOut = rows.reduce((s, r) => s + num(r.debit), 0);

    function handleImport() {
        const transactions = rows
            .filter((r) => r.date && (num(r.debit) > 0 || num(r.credit) > 0))
            .map((r) => {
                const debit = num(r.debit);
                const credit = num(r.credit);
                return {
                    transaction_date: r.date,
                    description: r.description,
                    debit_amount: debit > 0 ? debit : null,
                    credit_amount: credit > 0 ? credit : null,
                    net_amount: credit - debit,
                    balance: r.balance.trim() === '' ? null : num(r.balance),
                };
            });
        onConfirm({
            transactions,
            opening: opening.trim() === '' ? null : num(opening),
            closing: closing.trim() === '' ? null : num(closing),
            acceptMismatch: mismatched && acceptMismatch,
        });
    }

    const cell = "px-2 py-1.5 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-[12px] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 w-full";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-neutral-800 overflow-hidden">
                {/* Header */}
                <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 dark:border-neutral-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                            <FileText className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Review Transactions</h2>
                            <p className="text-xs text-gray-400 dark:text-neutral-500 mt-0.5 truncate max-w-[320px]">
                                {fileName} · <span className="font-medium text-gray-500 dark:text-neutral-400">{rows.length} rows</span> · check & fix before importing
                            </p>
                        </div>
                    </div>
                    <button onClick={onCancel} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Reconciliation banner */}
                <div className="px-6 pt-4">
                    {recon.verifiable ? (
                        recon.ok ? (
                            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                                <CheckCircle className="w-4 h-4 shrink-0" />
                                Balances reconcile — opening {fmtPKR(num(opening))} + transactions = closing {fmtPKR(num(closing))}.
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                Off by {fmtPKR(recon.diff)} — opening + transactions = {fmtPKR(recon.computed)}, but closing = {fmtPKR(recon.expected)}. Fix a row before importing.
                            </div>
                        )
                    ) : (
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-neutral-800 text-gray-500 dark:text-neutral-400 text-xs">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            Enter opening &amp; closing balances below to verify the math.
                        </div>
                    )}
                </div>

                {/* Editable grid */}
                <div className="flex-1 overflow-auto px-6 py-3">
                    <table className="w-full border-separate border-spacing-y-1">
                        <thead className="sticky top-0 bg-white dark:bg-neutral-900">
                            <tr className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-500 text-left">
                                <th className="px-2 py-1 w-[120px]">Date</th>
                                <th className="px-2 py-1">Description</th>
                                <th className="px-2 py-1 w-[110px] text-right">Debit (out)</th>
                                <th className="px-2 py-1 w-[110px] text-right">Credit (in)</th>
                                <th className="px-2 py-1 w-[110px] text-right">Balance</th>
                                <th className="px-2 py-1 w-8" />
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => (
                                <tr key={r._id} className="group">
                                    <td><input type="date" value={r.date} onChange={(e) => updateRow(r._id, 'date', e.target.value)} className={cell} /></td>
                                    <td><input value={r.description} onChange={(e) => updateRow(r._id, 'description', e.target.value)} className={cell} placeholder="Description" /></td>
                                    <td><input value={r.debit} onChange={(e) => updateRow(r._id, 'debit', e.target.value)} className={`${cell} text-right tabular-nums`} placeholder="0" inputMode="decimal" /></td>
                                    <td><input value={r.credit} onChange={(e) => updateRow(r._id, 'credit', e.target.value)} className={`${cell} text-right tabular-nums`} placeholder="0" inputMode="decimal" /></td>
                                    <td>
                                        <input
                                            value={r.balance}
                                            onChange={(e) => updateRow(r._id, 'balance', e.target.value)}
                                            className={`${cell} text-right tabular-nums ${brokenRows.has(r._id) ? 'ring-2 ring-red-400 dark:ring-red-500 border-red-300 dark:border-red-700' : ''}`}
                                            title={brokenRows.has(r._id) ? "Balance doesn't follow from the previous row" : undefined}
                                            placeholder="—"
                                            inputMode="decimal"
                                        />
                                    </td>
                                    <td className="text-center">
                                        <button onClick={() => deleteRow(r._id)} className="p-1 rounded-md text-gray-300 dark:text-neutral-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {rows.length === 0 && (
                                <tr><td colSpan={6} className="text-center py-8 text-sm text-gray-400 dark:text-neutral-500">
                                    No transactions detected. Add rows manually below.
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                    <button onClick={addRow} className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300">
                        <Plus className="w-3.5 h-3.5" /> Add row
                    </button>
                </div>

                {/* Balances + totals */}
                <div className="px-6 py-3 border-t border-gray-100 dark:border-neutral-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <label className="block">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-neutral-500">Opening</span>
                        <input value={opening} onChange={(e) => setOpening(e.target.value)} className={`${cell} mt-1 tabular-nums`} placeholder="—" inputMode="decimal" />
                    </label>
                    <label className="block">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-neutral-500">Closing</span>
                        <input value={closing} onChange={(e) => setClosing(e.target.value)} className={`${cell} mt-1 tabular-nums`} placeholder="—" inputMode="decimal" />
                    </label>
                    <div>
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-neutral-500">Total In</span>
                        <p className="mt-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{fmtPKR(totalIn)}</p>
                    </div>
                    <div>
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-neutral-500">Total Out</span>
                        <p className="mt-1.5 text-sm font-semibold text-red-500 dark:text-red-400 tabular-nums">{fmtPKR(totalOut)}</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-neutral-800 flex items-center justify-end gap-2">
                    {mismatched && (
                        <label className="mr-auto inline-flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={acceptMismatch}
                                onChange={(e) => setAcceptMismatch(e.target.checked)}
                                className="rounded border-gray-300 dark:border-neutral-600 text-red-500 focus:ring-red-500/40"
                            />
                            I've checked these rows — import anyway
                        </label>
                    )}
                    <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={committing || rows.length === 0 || !canImport}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                    >
                        {committing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        {committing ? 'Importing…' : 'Import transactions'}
                    </button>
                </div>
            </div>
        </div>
    );
}
