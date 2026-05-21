import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Calendar, CheckCircle2, AlertCircle, Pencil, Trash2, RotateCcw, X } from 'lucide-react';
import api from '../services/api';
import { fmtPKR } from '../utils/currency';
import { fmtDateLong } from '../utils/dates';

const FREQUENCIES = [
    { value: 'weekly',  label: 'Weekly'  },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly',  label: 'Yearly'  },
];

const CATEGORIES = [
    'Utilities', 'Subscription', 'Insurance', 'Rent', 'Internet', 'Phone',
    'Entertainment', 'Education', 'Loan EMI', 'Other',
];

function daysUntil(dateStr) {
    const due = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    return Math.round((due - today) / (24 * 60 * 60 * 1000));
}

function statusFor(item) {
    if (!item.is_active) return { label: 'Paused',   tint: 'bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-400' };
    const d = daysUntil(item.next_due_date);
    if (d < 0)  return { label: 'Overdue',   tint: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' };
    if (d === 0) return { label: 'Due today', tint: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' };
    if (d <= 7)  return { label: `Due in ${d}d`, tint: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' };
    if (d <= 30) return { label: `Due in ${d}d`, tint: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300' };
    return { label: `Due in ${d}d`, tint: 'bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-400' };
}

const EMPTY_FORM = {
    name: '', amount: '', currency: 'PKR', category: 'Utilities',
    frequency: 'monthly', next_due_date: '', reminder_days: 3,
    auto_debit: false, is_active: true, notes: '',
};

export default function Bills() {
    const qc = useQueryClient();
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);

    const { data: items = [], isLoading } = useQuery({
        queryKey: ['recurring'],
        queryFn: () => api.get('/recurring').then((r) => r.data),
    });

    const upcoming = useMemo(() => {
        return items
            .filter((i) => i.is_active)
            .map((i) => ({ ...i, _days: daysUntil(i.next_due_date) }))
            .sort((a, b) => a._days - b._days);
    }, [items]);

    const monthlyOutgoings = useMemo(() => {
        return items
            .filter((i) => i.is_active)
            .reduce((sum, i) => {
                const a = Number(i.amount || 0);
                if (i.frequency === 'monthly') return sum + a;
                if (i.frequency === 'weekly')  return sum + (a * 4.333);
                if (i.frequency === 'yearly')  return sum + (a / 12);
                return sum;
            }, 0);
    }, [items]);

    const dueThisWeek = upcoming.filter((i) => i._days >= 0 && i._days <= 7);
    const overdue = upcoming.filter((i) => i._days < 0);

    const createMutation = useMutation({
        mutationFn: (payload) => api.post('/recurring', payload),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['recurring'] }); toast.success('Bill added'); close(); },
        onError:  () => toast.error('Could not add bill'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, ...payload }) => api.patch(`/recurring/${id}`, payload),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['recurring'] }); toast.success('Updated'); close(); },
        onError:  () => toast.error('Could not update'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(`/recurring/${id}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['recurring'] }); toast.success('Deleted'); },
        onError:  () => toast.error('Could not delete'),
    });

    const paidMutation = useMutation({
        mutationFn: (id) => api.post(`/recurring/${id}/paid`, { record_expense: true }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['recurring'] }); toast.success('Marked paid'); },
        onError:  () => toast.error('Could not mark paid'),
    });

    function openNew() {
        setEditing(null);
        setForm({ ...EMPTY_FORM, next_due_date: new Date().toISOString().slice(0, 10) });
        setModalOpen(true);
    }

    function openEdit(item) {
        setEditing(item);
        setForm({
            name: item.name || '',
            amount: String(item.amount ?? ''),
            currency: item.currency || 'PKR',
            category: item.category || 'Utilities',
            frequency: item.frequency,
            next_due_date: new Date(item.next_due_date).toISOString().slice(0, 10),
            reminder_days: item.reminder_days ?? 3,
            auto_debit: !!item.auto_debit,
            is_active:  !!item.is_active,
            notes: item.notes || '',
        });
        setModalOpen(true);
    }

    function close() { setModalOpen(false); setEditing(null); setForm(EMPTY_FORM); }

    function submit(e) {
        e.preventDefault();
        const payload = {
            ...form,
            amount: Number(form.amount),
            reminder_days: Number(form.reminder_days),
        };
        if (editing) updateMutation.mutate({ id: editing.id, ...payload });
        else         createMutation.mutate(payload);
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Bills & Subscriptions</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Recurring payments tracked with reminders sent {form.reminder_days} day{form.reminder_days === 1 ? '' : 's'} before each due date
                    </p>
                </div>
                <button
                    onClick={openNew}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add a bill
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard label="Estimated monthly outgoings" value={fmtPKR(monthlyOutgoings)} tone="neutral" />
                <StatCard label="Due in next 7 days" value={`${dueThisWeek.length} bill${dueThisWeek.length === 1 ? '' : 's'}`} tone={dueThisWeek.length > 0 ? 'warning' : 'neutral'} />
                <StatCard label="Overdue" value={`${overdue.length} bill${overdue.length === 1 ? '' : 's'}`} tone={overdue.length > 0 ? 'danger' : 'neutral'} />
            </div>

            {isLoading ? (
                <div className="h-64 rounded-2xl bg-gray-100 dark:bg-neutral-800/60 animate-pulse" />
            ) : items.length === 0 ? (
                <EmptyState onAdd={openNew} />
            ) : (
                <BillsTable
                    items={items}
                    onEdit={openEdit}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    onMarkPaid={(id) => paidMutation.mutate(id)}
                />
            )}

            {modalOpen && (
                <BillFormModal
                    form={form}
                    setForm={setForm}
                    onSubmit={submit}
                    onClose={close}
                    submitting={createMutation.isPending || updateMutation.isPending}
                    isEdit={!!editing}
                />
            )}
        </div>
    );
}

function StatCard({ label, value, tone }) {
    const toneClasses = {
        neutral: 'border-gray-200 dark:border-neutral-800',
        warning: 'border-amber-200 dark:border-amber-900/60',
        danger:  'border-rose-200 dark:border-rose-900/60',
    };
    return (
        <div className={`p-5 rounded-2xl border bg-white dark:bg-neutral-900/40 ${toneClasses[tone]}`}>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{value}</p>
        </div>
    );
}

function EmptyState({ onAdd }) {
    return (
        <div className="p-10 text-center rounded-2xl border border-dashed border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900/40">
            <Calendar className="w-8 h-8 mx-auto text-gray-400 dark:text-gray-500" />
            <h3 className="mt-3 text-base font-semibold text-gray-900 dark:text-gray-100">No bills tracked yet</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                Add Netflix, K-Electric, your rent — anything that repeats. We'll email you a reminder a few days before each one is due.
            </p>
            <button
                onClick={onAdd}
                className="mt-4 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
            >
                Add your first bill
            </button>
        </div>
    );
}

function BillsTable({ items, onEdit, onDelete, onMarkPaid }) {
    return (
        <div className="rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 dark:divide-neutral-800">
                    <thead className="bg-gray-50 dark:bg-neutral-900/80">
                        <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            <th className="px-4 py-3 font-medium">Name</th>
                            <th className="px-4 py-3 font-medium">Category</th>
                            <th className="px-4 py-3 font-medium">Frequency</th>
                            <th className="px-4 py-3 font-medium text-right">Amount</th>
                            <th className="px-4 py-3 font-medium">Next due</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-neutral-800 text-sm">
                        {items.map((item) => {
                            const status = statusFor(item);
                            return (
                                <tr key={item.id} className={`${item.is_active ? '' : 'opacity-60'} hover:bg-gray-50 dark:hover:bg-neutral-900/60 transition-colors`}>
                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{item.name}</td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.category || '—'}</td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 capitalize">{item.frequency}</td>
                                    <td className="px-4 py-3 text-right tabular-nums text-gray-900 dark:text-gray-100">
                                        {item.currency} {Number(item.amount).toLocaleString('en-PK')}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{fmtDateLong(item.next_due_date)}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${status.tint}`}>
                                            {status.label}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-1">
                                            {item.is_active && (
                                                <button
                                                    onClick={() => onMarkPaid(item.id)}
                                                    title="Mark as paid"
                                                    className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                                >
                                                    <CheckCircle2 className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => onEdit(item)}
                                                title="Edit"
                                                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-neutral-800"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm(`Delete "${item.name}"?`)) onDelete(item.id);
                                                }}
                                                title="Delete"
                                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function BillFormModal({ form, setForm, onSubmit, onClose, submitting, isEdit }) {
    function field(key, value) { setForm((f) => ({ ...f, [key]: value })); }
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <form
                onSubmit={onSubmit}
                className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-neutral-800 overflow-hidden"
            >
                <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-800 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{isEdit ? 'Edit bill' : 'Add a bill'}</h2>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
                    <Field label="Name">
                        <input type="text" required value={form.name} onChange={(e) => field('name', e.target.value)} className={inputCls} placeholder="K-Electric, Netflix, Rent…" />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Amount">
                            <input type="number" required min="0" step="0.01" value={form.amount} onChange={(e) => field('amount', e.target.value)} className={inputCls} />
                        </Field>
                        <Field label="Currency">
                            <select value={form.currency} onChange={(e) => field('currency', e.target.value)} className={inputCls}>
                                <option value="PKR">PKR</option>
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                                <option value="GBP">GBP</option>
                                <option value="AED">AED</option>
                                <option value="SAR">SAR</option>
                            </select>
                        </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Category">
                            <select value={form.category} onChange={(e) => field('category', e.target.value)} className={inputCls}>
                                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </Field>
                        <Field label="Frequency">
                            <select value={form.frequency} onChange={(e) => field('frequency', e.target.value)} className={inputCls}>
                                {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                            </select>
                        </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Next due date">
                            <input type="date" required value={form.next_due_date} onChange={(e) => field('next_due_date', e.target.value)} className={inputCls} />
                        </Field>
                        <Field label="Remind me (days before)">
                            <input type="number" min="0" max="30" value={form.reminder_days} onChange={(e) => field('reminder_days', e.target.value)} className={inputCls} />
                        </Field>
                    </div>
                    <Field label="Notes (optional)">
                        <textarea rows="2" value={form.notes} onChange={(e) => field('notes', e.target.value)} className={inputCls} />
                    </Field>
                    <div className="flex items-center gap-6 pt-1">
                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                            <input type="checkbox" checked={form.auto_debit} onChange={(e) => field('auto_debit', e.target.checked)} className="rounded h-4 w-4 text-emerald-600" />
                            Auto-debit
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                            <input type="checkbox" checked={form.is_active} onChange={(e) => field('is_active', e.target.checked)} className="rounded h-4 w-4 text-emerald-600" />
                            Active
                        </label>
                    </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 dark:bg-neutral-900/60 border-t border-gray-200 dark:border-neutral-800 flex items-center justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
                        Cancel
                    </button>
                    <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 dark:disabled:bg-neutral-700 text-white text-sm font-medium transition-colors">
                        {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add bill'}
                    </button>
                </div>
            </form>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <label className="block">
            <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">{label}</span>
            {children}
        </label>
    );
}

const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500';
