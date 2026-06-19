import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, CreditCard, Car, Home, Wallet, Banknote, X, ArrowRight, Trash2 } from 'lucide-react';
import api from '../services/api';
import { fmtPKR } from '../utils/currency';
import MaskedBalance from '../components/MaskedBalance';
import { useConfirm } from '../components/ui/confirm-dialog';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';

const DEBT_TYPES = [
    { value: 'credit_card',   label: 'Credit card',   icon: CreditCard },
    { value: 'personal_loan', label: 'Personal loan', icon: Banknote   },
    { value: 'car_loan',      label: 'Car loan',      icon: Car        },
    { value: 'mortgage',      label: 'Mortgage',      icon: Home       },
    { value: 'other',         label: 'Other',         icon: Wallet     },
];

const EMPTY_FORM = {
    name: '', debt_type: 'credit_card',
    principal: '', outstanding: '',
    interest_rate: '', minimum_payment: '',
    due_day: '', target_payoff: '', notes: '',
    is_active: true,
};

export default function Debts() {
    const qc = useQueryClient();
    const confirm = useConfirm();
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);

    const { data: debts = [], isLoading } = useQuery({
        queryKey: ['debts'],
        queryFn: () => api.get('/debts').then((r) => r.data),
    });

    const totals = useMemo(() => {
        const active = debts.filter((d) => d.is_active);
        const outstanding = active.reduce((s, d) => s + Number(d.outstanding || 0), 0);
        const principal   = active.reduce((s, d) => s + Number(d.principal   || 0), 0);
        const minMonthly  = active.reduce((s, d) => s + Number(d.minimum_payment || 0), 0);
        const repaid = principal - outstanding;
        const repaidPct = principal > 0 ? Math.max(0, Math.min(100, (repaid / principal) * 100)) : 0;
        return { outstanding, principal, repaid, repaidPct, minMonthly, activeCount: active.length };
    }, [debts]);

    const createMutation = useMutation({
        mutationFn: (payload) => api.post('/debts', payload),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['debts'] }); toast.success('Debt added'); close(); },
        onError: () => toast.error('Could not add debt'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(`/debts/${id}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['debts'] }); toast.success('Deleted'); },
        onError: () => toast.error('Could not delete'),
    });

    function openNew() {
        setForm(EMPTY_FORM);
        setModalOpen(true);
    }
    function close() { setModalOpen(false); setForm(EMPTY_FORM); }

    function submit(e) {
        e.preventDefault();
        const payload = {
            ...form,
            principal:        Number(form.principal),
            outstanding:      Number(form.outstanding || form.principal),
            interest_rate:    form.interest_rate    === '' ? null : Number(form.interest_rate),
            minimum_payment:  form.minimum_payment  === '' ? null : Number(form.minimum_payment),
            due_day:          form.due_day          === '' ? null : Number(form.due_day),
            target_payoff:    form.target_payoff    || null,
            notes:            form.notes            || null,
        };
        createMutation.mutate(payload);
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Debts</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Credit cards, loans, and other institutional debts you owe
                    </p>
                </div>
                <button
                    onClick={openNew}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add a debt
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SummaryCard label="Total outstanding" value={fmtPKR(totals.outstanding)} sub={`${totals.activeCount} active debt${totals.activeCount === 1 ? '' : 's'}`} tone="danger" mask />
                <SummaryCard label="Repaid so far"     value={fmtPKR(totals.repaid)}      sub={`${totals.repaidPct.toFixed(0)}% of original`} tone="positive" mask />
                <SummaryCard label="Minimum monthly"   value={fmtPKR(totals.minMonthly)}  sub="Sum of minimum payments" tone="neutral" mask />
            </div>

            {isLoading ? (
                <div className="h-48 rounded-2xl bg-gray-100 dark:bg-neutral-800/60 animate-pulse" />
            ) : debts.length === 0 ? (
                <EmptyState onAdd={openNew} />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {debts.map((d) => (
                        <DebtCard key={d.id} debt={d} onDelete={async () => {
                            const ok = await confirm({
                                title: 'Delete debt',
                                description: `Delete "${d.name}"? Its payment history will also be removed.`,
                                confirmText: 'Delete',
                            });
                            if (ok) deleteMutation.mutate(d.id);
                        }} />
                    ))}
                </div>
            )}

            {modalOpen && (
                <DebtFormModal form={form} setForm={setForm} onSubmit={submit} onClose={close} submitting={createMutation.isPending} />
            )}
        </div>
    );
}

function SummaryCard({ label, value, sub, tone, mask }) {
    const toneText = {
        neutral:  'text-gray-900 dark:text-gray-100',
        positive: 'text-emerald-600 dark:text-emerald-400',
        danger:   'text-rose-600 dark:text-rose-400',
    }[tone];
    return (
        <Card className="p-5">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
            {mask ? (
                <MaskedBalance
                    value={value}
                    isCurrency={false}
                    className={`mt-2 text-2xl font-semibold tabular-nums ${toneText} inline-block`}
                    iconClassName="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-1"
                />
            ) : (
                <p className={`mt-2 text-2xl font-semibold tabular-nums ${toneText}`}>{value}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{sub}</p>
        </Card>
    );
}

function DebtCard({ debt, onDelete }) {
    const typeInfo = DEBT_TYPES.find((t) => t.value === debt.debt_type) || DEBT_TYPES[4];
    const Icon = typeInfo.icon;
    const principal = Number(debt.principal);
    const outstanding = Number(debt.outstanding);
    const paidPct = principal > 0 ? Math.max(0, Math.min(100, ((principal - outstanding) / principal) * 100)) : 0;

    return (
        <Card className={`p-5 ${debt.is_active ? '' : 'opacity-70'}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{debt.name}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{typeInfo.label}{debt.interest_rate ? ` · ${Number(debt.interest_rate).toFixed(2)}% APR` : ''}</p>
                    </div>
                </div>
                <button onClick={onDelete} className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30" title="Delete">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            <div className="mt-4 flex items-baseline justify-between gap-3">
                <MaskedBalance
                    value={outstanding}
                    className="text-2xl font-bold text-rose-600 dark:text-rose-400 tabular-nums inline-block"
                    iconClassName="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-1"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">of {fmtPKR(principal)}</p>
            </div>

            <div className="mt-3 h-2 rounded-full bg-gray-100 dark:bg-neutral-800 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500/70" style={{ width: `${paidPct}%` }} />
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{paidPct.toFixed(0)}% repaid</p>

            <Link
                to={`/debts/${debt.id}`}
                className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:opacity-80"
            >
                View details <ArrowRight className="w-3.5 h-3.5" />
            </Link>
        </Card>
    );
}

function EmptyState({ onAdd }) {
    return (
        <div className="p-10 text-center rounded-2xl border border-dashed border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-850">
            <CreditCard className="w-8 h-8 mx-auto text-gray-400 dark:text-gray-500" />
            <h3 className="mt-3 text-base font-semibold text-gray-900 dark:text-gray-100">No debts tracked yet</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                Track credit cards, car loans, mortgages — anything with a payoff schedule. Outstanding balances are subtracted from your net worth automatically.
            </p>
            <button onClick={onAdd} className="mt-4 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors">
                Add your first debt
            </button>
        </div>
    );
}

function DebtFormModal({ form, setForm, onSubmit, onClose, submitting }) {
    function field(k, v) { setForm((f) => ({ ...f, [k]: v })); }
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <form onSubmit={onSubmit} className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-neutral-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-800 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Add a debt</h2>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
                    <Field label="Name">
                        <input type="text" required value={form.name} onChange={(e) => field('name', e.target.value)} className={inputCls} placeholder="HBL Credit Card, Car Loan…" />
                    </Field>
                    <Field label="Type">
                        <select value={form.debt_type} onChange={(e) => field('debt_type', e.target.value)} className={inputCls}>
                            {DEBT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Original principal">
                            <input type="number" required min="0" step="0.01" value={form.principal} onChange={(e) => field('principal', e.target.value)} className={inputCls} />
                        </Field>
                        <Field label="Current outstanding">
                            <input type="number" min="0" step="0.01" value={form.outstanding} onChange={(e) => field('outstanding', e.target.value)} className={inputCls} placeholder="Defaults to principal" />
                        </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Interest rate % (annual)">
                            <input type="number" min="0" step="0.01" value={form.interest_rate} onChange={(e) => field('interest_rate', e.target.value)} className={inputCls} />
                        </Field>
                        <Field label="Minimum monthly payment">
                            <input type="number" min="0" step="0.01" value={form.minimum_payment} onChange={(e) => field('minimum_payment', e.target.value)} className={inputCls} />
                        </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Due day of month (1-28)">
                            <input type="number" min="1" max="28" value={form.due_day} onChange={(e) => field('due_day', e.target.value)} className={inputCls} />
                        </Field>
                        <Field label="Target payoff date">
                            <input type="date" value={form.target_payoff} onChange={(e) => field('target_payoff', e.target.value)} className={inputCls} />
                        </Field>
                    </div>
                    <Field label="Notes">
                        <textarea rows="2" value={form.notes} onChange={(e) => field('notes', e.target.value)} className={inputCls} />
                    </Field>
                </div>
                <div className="px-6 py-4 bg-gray-50 dark:bg-neutral-900/60 border-t border-gray-200 dark:border-neutral-800 flex items-center justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">Cancel</button>
                    <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 dark:disabled:bg-neutral-700 text-white text-sm font-medium transition-colors">
                        {submitting ? 'Saving…' : 'Add debt'}
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
