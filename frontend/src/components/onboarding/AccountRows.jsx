import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Loader2, Landmark, Wallet } from 'lucide-react';
import api from '../../services/api';
import { fmtPKR } from '../../utils/currency';

const WALLET_SUGGESTIONS = ['JazzCash', 'Easypaisa', 'SadaPay', 'NayaPay', 'Cash'];

const emptyRow = () => ({ id: crypto.randomUUID(), type: 'bank', name: '', balance: '', error: null });
const isTouched = (r) => r.name.trim() !== '' || r.balance.trim() !== '';
const isValid = (r) => r.name.trim() !== '' && r.balance.trim() !== '' && Number.isFinite(Number(r.balance)) && Number(r.balance) >= 0;

// Bank → POST /banks; wallet → POST /wallets (institution = its name).
const saveRow = (r) => (r.type === 'bank'
    ? api.post('/banks', { name: r.name.trim(), starting_balance: Number(r.balance) })
    : api.post('/wallets', { name: r.name.trim(), institution: r.name.trim(), balance: Number(r.balance) }));

/**
 * Onboarding step 2: accounts the user already has (read-only) plus editable
 * rows for new ones. Continue saves new rows one by one — a failing row keeps
 * its error, saved rows join the list — and calls onDone(total) when all saved.
 */
export default function AccountRows({ onDone }) {
    const queryClient = useQueryClient();
    const banks = useQuery({ queryKey: ['banks'], queryFn: async () => (await api.get('/banks')).data });
    const wallets = useQuery({ queryKey: ['wallets'], queryFn: async () => (await api.get('/wallets')).data });

    const [rows, setRows] = useState(() => [emptyRow()]);
    const [saved, setSaved] = useState([]);
    const [saving, setSaving] = useState(false);

    const existing = [
        ...(banks.data || []).map((b) => ({ id: `bank-${b.id}`, kind: 'bank', name: b.name, balance: Number(b.current_balance) || 0 })),
        ...(wallets.data || []).map((w) => ({ id: `wallet-${w.id}`, kind: 'wallet', name: w.name, balance: (Number(w.balance) || 0) * (Number(w.exchange_rate) || 1) })),
        ...saved,
    ];
    const total = existing.reduce((s, a) => s + a.balance, 0)
        + rows.filter(isValid).reduce((s, r) => s + Number(r.balance), 0);
    const canContinue = !saving
        && rows.filter(isTouched).every(isValid)
        && existing.length + rows.filter(isValid).length > 0;

    const update = (id, patch) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch, error: null } : r)));

    async function handleContinue() {
        setSaving(true);
        const remaining = [];
        let savedTotal = 0;
        for (const row of rows.filter(isTouched)) {
            try {
                await saveRow(row);
                savedTotal += Number(row.balance);
                setSaved((s) => [...s, { id: row.id, kind: row.type, name: row.name.trim(), balance: Number(row.balance) }]);
            } catch (err) {
                remaining.push({ ...row, error: err.response?.data?.message || 'Could not save this account' });
            }
        }
        setRows(remaining.length ? remaining : [emptyRow()]);
        setSaving(false);
        queryClient.invalidateQueries({ queryKey: ['banks'] });
        queryClient.invalidateQueries({ queryKey: ['wallets'] });
        if (!remaining.length) onDone(existing.reduce((s, a) => s + a.balance, 0) + savedTotal);
    }

    const cell = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40';

    return (
        <div className="space-y-4">
            {existing.length > 0 && (
                <ul className="divide-y divide-gray-100 dark:divide-neutral-800 rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                    {existing.map((a) => (
                        <li key={a.id} className="flex items-center justify-between px-4 py-3">
                            <span className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
                                {a.kind === 'bank' ? <Landmark className="w-4 h-4 text-gray-400 dark:text-neutral-500" /> : <Wallet className="w-4 h-4 text-gray-400 dark:text-neutral-500" />}
                                <span>{a.name}</span>
                            </span>
                            <span className="text-sm font-medium tabular-nums text-gray-900 dark:text-gray-100">{fmtPKR(a.balance)}</span>
                        </li>
                    ))}
                </ul>
            )}

            <datalist id="wallet-suggestions">
                {WALLET_SUGGESTIONS.map((w) => <option key={w} value={w} />)}
            </datalist>

            {rows.map((r) => (
                <div key={r.id} className="space-y-1.5">
                    <div className="grid grid-cols-[96px_1fr_120px_32px] gap-2 items-center">
                        <select aria-label="Account type" value={r.type} onChange={(e) => update(r.id, { type: e.target.value })} className={cell}>
                            <option value="bank">Bank</option>
                            <option value="wallet">Wallet</option>
                        </select>
                        <input
                            aria-label="Account name"
                            value={r.name}
                            onChange={(e) => update(r.id, { name: e.target.value })}
                            placeholder={r.type === 'bank' ? 'e.g. Meezan Bank' : 'e.g. JazzCash'}
                            list={r.type === 'wallet' ? 'wallet-suggestions' : undefined}
                            className={cell}
                        />
                        <input
                            aria-label="Balance"
                            value={r.balance}
                            onChange={(e) => update(r.id, { balance: e.target.value })}
                            placeholder="0"
                            inputMode="decimal"
                            className={`${cell} text-right tabular-nums`}
                        />
                        <button
                            type="button"
                            aria-label="Remove row"
                            onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((x) => x.id !== r.id) : [emptyRow()]))}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:text-neutral-500 dark:hover:bg-red-900/20"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                    {r.error && <p className="text-xs text-red-600 dark:text-red-400">{r.error}</p>}
                </div>
            ))}

            <button
                type="button"
                onClick={() => setRows((rs) => [...rs, emptyRow()])}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
                <Plus className="w-4 h-4" aria-hidden="true" />+ Add another
            </button>

            <p className="text-sm text-gray-600 dark:text-gray-300">
                Net worth so far: <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">{fmtPKR(total)}</span>
            </p>

            <button
                type="button"
                onClick={handleContinue}
                disabled={!canContinue}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
            >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Continue
            </button>
        </div>
    );
}
