import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2, Plus } from 'lucide-react';
import api from '../../services/api';
import { fmtDateLong } from '../../utils/dates';

const CATEGORIES = ['Food & Dining', 'Groceries', 'Utilities', 'Transportation', 'Shopping', 'Entertainment', 'Education',
    'Healthcare', 'Travel', 'Subscription', 'Insurance', 'Bank Charges', 'Salary', 'Profit/Dividend', 'Transfer',
    'Self Transfer', 'ATM Withdrawal', 'Investment', 'Loan Repayment', 'Refund', 'Other'];
const input = 'rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-2.5 py-1.5 text-sm text-gray-900 dark:text-gray-100';

/** Rules learned from approvals ("KFC" → Food & Dining): fix, add or delete them. */
export default function CategoryRules() {
    const qc = useQueryClient();
    const rules = useQuery({ queryKey: ['category-rules'], queryFn: () => api.get('/category-rules').then((r) => r.data) });
    const refresh = () => qc.invalidateQueries({ queryKey: ['category-rules'] });
    const onError = (err) => toast.error(err?.response?.data?.message || 'Could not save');
    const update = useMutation({ mutationFn: ({ id, assigned_category }) => api.put(`/category-rules/${id}`, { assigned_category }), onSuccess: refresh, onError });
    const remove = useMutation({ mutationFn: (id) => api.delete(`/category-rules/${id}`), onSuccess: refresh, onError });
    const create = useMutation({ mutationFn: (rule) => api.post('/category-rules', rule), onSuccess: refresh, onError });
    const [draft, setDraft] = useState({ keyword: '', assigned_category: 'Food & Dining' });

    return (
        <div className="max-w-3xl space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
                When you approve a transaction, its words are remembered with the category you chose, so the next import sorts
                it for you. Fix a wrong one here; changes apply to future imports.
            </p>

            <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => {
                e.preventDefault();
                create.mutate(draft, { onSuccess: () => setDraft({ ...draft, keyword: '' }) });
            }}>
                <label className="sr-only" htmlFor="rule-keyword">Word in the description</label>
                <input id="rule-keyword" required minLength={3} placeholder="Word in the description, e.g. FOODPANDA" className={input}
                    value={draft.keyword} onChange={(e) => setDraft({ ...draft, keyword: e.target.value })} />
                <label className="sr-only" htmlFor="rule-category">Category</label>
                <select id="rule-category" className={input} value={draft.assigned_category} onChange={(e) => setDraft({ ...draft, assigned_category: e.target.value })}>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
                <button type="submit" className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white">
                    <Plus className="w-4 h-4" aria-hidden="true" /> Add rule
                </button>
            </form>

            {rules.isLoading ? <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p> : (rules.data || []).length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No rules yet — approve a few imported transactions and they appear here.</p>
            ) : (
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            <th className="py-2">Word</th><th className="py-2">Category</th><th className="py-2">Last used</th><th className="py-2 sr-only">Delete</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                        {rules.data.map((r) => (
                            <tr key={r.id}>
                                <td className="py-2 font-mono text-gray-800 dark:text-gray-200">{r.keyword}</td>
                                <td className="py-2">
                                    <label className="sr-only" htmlFor={`rule-${r.id}`}>Category for {r.keyword}</label>
                                    <select id={`rule-${r.id}`} className={input} value={r.assigned_category}
                                        onChange={(e) => update.mutate({ id: r.id, assigned_category: e.target.value })}>
                                        {[...new Set([r.assigned_category, ...CATEGORIES])].map((c) => <option key={c}>{c}</option>)}
                                    </select>
                                </td>
                                <td className="py-2 text-gray-500 dark:text-gray-400">{fmtDateLong(r.last_used)}</td>
                                <td className="py-2 text-right">
                                    <button type="button" aria-label={`Delete rule for ${r.keyword}`} onClick={() => remove.mutate(r.id)}
                                        className="p-1 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400"><Trash2 className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
