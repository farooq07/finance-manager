import { useState, useMemo } from 'react';
import { X, Check, AlertCircle, ArrowRight, Columns3, Loader2 } from 'lucide-react';

/**
 * Column-mapping modal for CSV statement imports.
 *
 * The user maps THEIR bank's columns onto our canonical fields, with a live
 * sample value shown per column. This makes import reliable for any bank format
 * — the human resolves ambiguity once instead of relying on guesswork.
 *
 * props:
 *   preview   = inspectCsv() response { headers, headerRowIndex, sampleRows, rowCount, autoMap, meta }
 *   fileName  = original file name (display only)
 *   onConfirm(mapping) — called with the final mapping object
 *   onCancel()
 *   committing = bool (import in progress)
 */
export default function CsvMappingModal({ preview, fileName, onConfirm, onCancel, committing }) {
    const { headers = [], headerRowIndex = 0, sampleRows = [], rowCount = 0, autoMap = {}, meta = {} } = preview || {};
    const firstSample = sampleRows[0] || [];

    // Start in 'split' if the auto-detect found separate debit/credit columns.
    const initialMode = (autoMap.debit >= 0 || autoMap.credit >= 0) && !(autoMap.amount >= 0) ? 'split' : 'single';
    const [mode, setMode] = useState(initialMode);

    const [map, setMap] = useState({
        date:        autoMap.date ?? -1,
        description: autoMap.description ?? -1,
        amount:      autoMap.amount ?? -1,
        debit:       autoMap.debit ?? -1,
        credit:      autoMap.credit ?? -1,
        balance:     autoMap.balance ?? -1,
        type:        autoMap.type ?? -1,
    });

    const [opening, setOpening] = useState(meta.opening != null ? String(meta.opening) : '');
    const [closing, setClosing] = useState(meta.closing != null ? String(meta.closing) : '');

    const setField = (key, val) => setMap((m) => ({ ...m, [key]: Number(val) }));

    const fields = useMemo(() => {
        const base = [
            { key: 'date',        label: 'Date',        required: true,  hint: 'When it happened' },
            { key: 'description', label: 'Description', required: true,  hint: 'Merchant / details' },
        ];
        if (mode === 'single') {
            base.push({ key: 'amount', label: 'Amount', required: true, hint: 'Negative = money out' });
        } else {
            base.push({ key: 'debit',  label: 'Debit (out)',  required: 'either', hint: 'Money leaving' });
            base.push({ key: 'credit', label: 'Credit (in)',  required: 'either', hint: 'Money coming in' });
        }
        base.push({ key: 'balance', label: 'Balance', hint: 'Running balance — verifies totals' });
        base.push({ key: 'type',    label: 'Type',    hint: 'e.g. POS, Online (optional)' });
        return base;
    }, [mode]);

    const isValid = useMemo(() => {
        if (map.date < 0 || map.description < 0) return false;
        if (mode === 'single') return map.amount >= 0;
        return map.debit >= 0 || map.credit >= 0;
    }, [map, mode]);

    function handleImport() {
        onConfirm({
            headerRowIndex,
            date: map.date,
            description: map.description,
            amount: mode === 'single' ? map.amount : -1,
            debit: mode === 'split' ? map.debit : -1,
            credit: mode === 'split' ? map.credit : -1,
            balance: map.balance,
            type: map.type,
            opening: opening.trim() === '' ? null : opening,
            closing: closing.trim() === '' ? null : closing,
        });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-neutral-800 overflow-hidden">
                {/* Header */}
                <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 dark:border-neutral-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
                            <Columns3 className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Map Statement Columns</h2>
                            <p className="text-xs text-gray-400 dark:text-neutral-500 mt-0.5 truncate max-w-[300px]">
                                {fileName} · <span className="font-medium text-gray-500 dark:text-neutral-400">{rowCount} rows</span>
                            </p>
                        </div>
                    </div>
                    <button onClick={onCancel} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Amount mode toggle */}
                <div className="px-6 pt-4">
                    <div className="flex gap-1 p-1 bg-gray-100 dark:bg-neutral-800 rounded-xl w-full">
                        {[
                            { id: 'single', label: 'Single amount column' },
                            { id: 'split',  label: 'Separate debit / credit' },
                        ].map((m) => (
                            <button
                                key={m.id}
                                onClick={() => setMode(m.id)}
                                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                    mode === m.id
                                        ? 'bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 shadow-sm'
                                        : 'text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-gray-200'
                                }`}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Column header labels */}
                <div className="px-6 pt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-500">Our Field</p>
                    <span className="w-5" />
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-500">Your CSV Column</p>
                </div>

                {/* Mapping rows */}
                <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2.5">
                    {fields.map((f) => {
                        const selected = map[f.key];
                        const sample = selected >= 0 ? firstSample[selected] : '';
                        const ok = selected >= 0;
                        const isReq = f.required === true;
                        return (
                            <div key={f.key} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                                {/* Left: our field */}
                                <div className="px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-neutral-800/60 border border-gray-100 dark:border-neutral-800">
                                    <p className="text-[13px] font-medium text-gray-800 dark:text-gray-200">
                                        {f.label}
                                        {isReq && <span className="text-red-400 ml-0.5">*</span>}
                                    </p>
                                    <p className="text-[10px] text-gray-400 dark:text-neutral-500 mt-0.5">{f.hint}</p>
                                </div>

                                {/* Middle: status */}
                                <div className="flex items-center justify-center w-5">
                                    {ok ? (
                                        <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                        </span>
                                    ) : isReq ? (
                                        <span className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                            <X className="w-3 h-3 text-red-500" />
                                        </span>
                                    ) : (
                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-neutral-600" />
                                    )}
                                </div>

                                {/* Right: dropdown + sample */}
                                <div>
                                    <select
                                        value={selected}
                                        onChange={(e) => setField(f.key, e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-[13px] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400"
                                    >
                                        <option value={-1}>— Not mapped —</option>
                                        {headers.map((h, i) => (
                                            <option key={i} value={i}>{h || `Column ${i + 1}`}</option>
                                        ))}
                                    </select>
                                    {sample !== '' && sample != null && (
                                        <p className="text-[10px] text-gray-400 dark:text-neutral-500 mt-1 px-1 truncate" title={String(sample)}>
                                            e.g. <span className="text-gray-500 dark:text-neutral-400 font-medium">{String(sample)}</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Balances — detected, editable */}
                    <div className="pt-2 mt-2 border-t border-gray-100 dark:border-neutral-800">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-500 mb-2">
                            Statement Balances <span className="font-normal normal-case">(auto-detected — used to verify the math)</span>
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <label className="block">
                                <span className="text-[11px] text-gray-500 dark:text-neutral-400">Opening</span>
                                <input
                                    value={opening}
                                    onChange={(e) => setOpening(e.target.value)}
                                    placeholder="—"
                                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-[13px] text-gray-800 dark:text-gray-200 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                                />
                            </label>
                            <label className="block">
                                <span className="text-[11px] text-gray-500 dark:text-neutral-400">Closing</span>
                                <input
                                    value={closing}
                                    onChange={(e) => setClosing(e.target.value)}
                                    placeholder="—"
                                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-[13px] text-gray-800 dark:text-gray-200 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                                />
                            </label>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-neutral-800 flex items-center justify-between gap-3">
                    {!isValid ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Map Date, Description, and an amount column to continue
                        </span>
                    ) : <span />}
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={!isValid || committing}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
                        >
                            {committing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                            {committing ? 'Importing…' : `Import ${rowCount} rows`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
