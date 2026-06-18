import { useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    Plus, X, ArrowRight, ArrowUpCircle, ArrowDownCircle, Scale,
    User, CreditCard, Car, Home, Wallet, Banknote, ChevronDown, ChevronUp,
    Trash2, Pencil, Check, Mail, Upload, Loader2, Search,
} from 'lucide-react';
import api from '../services/api';
import { fmtPKR } from '../utils/currency';
import { fmtDateLong } from '../utils/dates';
import DatePickerInput from '../components/DatePickerInput';
import Modal from '../components/Modal';
import { useConfirm } from '../components/ui/confirm-dialog';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';

/* ─── Debt-type metadata ───────────────────────────────────── */
const DEBT_TYPES = [
    { value: 'credit_card', label: 'Credit card', icon: CreditCard },
    { value: 'personal_loan', label: 'Personal loan', icon: Banknote },
    { value: 'car_loan', label: 'Car loan', icon: Car },
    { value: 'mortgage', label: 'Mortgage', icon: Home },
    { value: 'other', label: 'Other', icon: Wallet },
];
const debtTypeMeta = (v) => DEBT_TYPES.find((t) => t.value === v) || DEBT_TYPES[4];

const EMPTY_DEBT_FORM = {
    name: '', debt_type: 'credit_card',
    principal: '', outstanding: '',
    interest_rate: '', minimum_payment: '',
    due_day: '', target_payoff: '', notes: '',
    is_active: true,
};

const EMPTY_TX_FORM = {
    transaction_type: 'receivable',
    amount: '',
    transaction_date: new Date().toISOString().split('T')[0],
    description: '',
};

/* ─── Root ──────────────────────────────────────────────────── */
export default function Ledger() {
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = ['all', 'people', 'loans'].includes(searchParams.get('tab'))
        ? searchParams.get('tab')
        : 'all';
    const setTab = (t) => setSearchParams(t === 'all' ? {} : { tab: t });

    const [addOpen, setAddOpen] = useState(null); // 'person' | 'debt' | null

    const peopleQuery = useQuery({
        queryKey: ['dues'],
        queryFn: () => api.get('/dues').then((r) => r.data || []),
    });
    const debtsQuery = useQuery({
        queryKey: ['debts'],
        queryFn: () => api.get('/debts').then((r) => r.data || []),
    });

    const people = peopleQuery.data || [];
    const debts = debtsQuery.data || [];

    const stats = useMemo(() => {
        let recv = 0;
        let payablePeople = 0;
        people.forEach((p) => {
            if (p.netBalance > 0) recv += Number(p.netBalance);
            else if (p.netBalance < 0) payablePeople += Math.abs(Number(p.netBalance));
        });
        const payableDebts = debts
            .filter((d) => d.is_active)
            .reduce((s, d) => s + Number(d.outstanding || 0), 0);
        const payable = payablePeople + payableDebts;
        const net = recv - payable;
        return {
            receivable: recv,
            payable,
            payablePeople,
            payableDebts,
            activeDebts: debts.filter((d) => d.is_active).length,
            peopleOwingMe: people.filter((p) => p.netBalance > 0).length,
            peopleIOwe: people.filter((p) => p.netBalance < 0).length,
            net,
        };
    }, [people, debts]);

    const loading = peopleQuery.isLoading || debtsQuery.isLoading;

    return (
        <div className="space-y-6">
            <Header onAdd={setAddOpen} />

            <StatsRow stats={stats} />

            <Tabs tab={tab} setTab={setTab} counts={{
                people: people.length,
                loans: stats.activeDebts,
            }} />

            {loading ? (
                <SkeletonGrid />
            ) : tab === 'people' ? (
                <PeopleView people={people} refetch={peopleQuery.refetch} />
            ) : tab === 'loans' ? (
                <LoansView debts={debts} refetch={debtsQuery.refetch} onAdd={() => setAddOpen('debt')} />
            ) : (
                <AllView people={people} debts={debts} />
            )}

            {addOpen === 'person' && (
                <AddPersonModal onClose={() => setAddOpen(null)} onSaved={peopleQuery.refetch} />
            )}
            {addOpen === 'debt' && (
                <AddDebtModal onClose={() => setAddOpen(null)} onSaved={debtsQuery.refetch} />
            )}
        </div>
    );
}

/* ─── Header with Add dropdown ──────────────────────────────── */
function Header({ onAdd }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">Ledger</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Money you owe and money owed to you — people and lenders, in one place.
                </p>
            </div>
            <div className="relative">
                <button
                    onClick={() => setOpen((o) => !o)}
                    onBlur={() => setTimeout(() => setOpen(false), 120)}
                    className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white text-sm font-semibold transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Add
                    <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                {open && (
                    <div className="absolute right-0 mt-1.5 w-56 rounded-xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 shadow-lg overflow-hidden z-20">
                        <button
                            type="button"
                            onMouseDown={() => { onAdd('person'); setOpen(false); }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-800 text-left"
                        >
                            <span className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
                                <User className="w-4 h-4 text-primary-700 dark:text-primary-300" />
                            </span>
                            <div>
                                <p className="font-medium">Add a person</p>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400">Track dues with friends, family, or vendors</p>
                            </div>
                        </button>
                        <button
                            type="button"
                            onMouseDown={() => { onAdd('debt'); setOpen(false); }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-800 text-left border-t border-gray-100 dark:border-neutral-800"
                        >
                            <span className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center">
                                <CreditCard className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                            </span>
                            <div>
                                <p className="font-medium">Add a loan or card</p>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400">Credit card, car loan, mortgage…</p>
                            </div>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── Stats Row ────────────────────────────────────────────── */
function StatsRow({ stats }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
                label="Receivable"
                value={`+${fmtPKR(stats.receivable)}`}
                hint={`From ${stats.peopleOwingMe} ${stats.peopleOwingMe === 1 ? 'person' : 'people'}`}
                icon={ArrowUpCircle}
                tone="positive"
            />
            <StatCard
                label="Payable"
                value={`−${fmtPKR(stats.payable)}`}
                hint={[
                    stats.peopleIOwe > 0 && `${stats.peopleIOwe} ${stats.peopleIOwe === 1 ? 'person' : 'people'}`,
                    stats.activeDebts > 0 && `${stats.activeDebts} ${stats.activeDebts === 1 ? 'loan' : 'loans'}`,
                ].filter(Boolean).join(' + ') || 'Nothing owed'}
                icon={ArrowDownCircle}
                tone="danger"
            />
            <StatCard
                label="Net"
                value={`${stats.net >= 0 ? '+' : '−'}${fmtPKR(Math.abs(stats.net))}`}
                hint={stats.net >= 0 ? "You're net positive" : "You're net negative"}
                icon={Scale}
                tone={stats.net >= 0 ? 'positive' : 'danger'}
                emphasis
            />
        </div>
    );
}

function StatCard({ label, value, hint, icon: Icon, tone, emphasis }) {
    const toneClass = {
        positive: 'text-success-700 dark:text-success-400',
        danger: 'text-error-600 dark:text-error-400',
        neutral: 'text-gray-900 dark:text-gray-100',
    }[tone] || 'text-gray-900 dark:text-gray-100';

    const iconBg = {
        positive: 'bg-success-50 text-success-700 dark:bg-success-900/20 dark:text-success-400',
        danger: 'bg-error-50 text-error-600 dark:bg-error-900/20 dark:text-error-400',
        neutral: 'bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-300',
    }[tone] || 'bg-gray-100 text-gray-600';

    return (
        <Card className={`p-5 ${emphasis ? 'border-primary-200 dark:border-primary-900/40 shadow-sm' : 'border-gray-200 dark:border-neutral-800'}`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</span>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center ${iconBg}`}>
                    <Icon className="w-4 h-4" />
                </span>
            </div>
            <p className={`text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>
        </Card>
    );
}

/* ─── Tabs ─────────────────────────────────────────────────── */
function Tabs({ tab, setTab, counts }) {
    const items = [
        { id: 'all', label: 'All' },
        { id: 'people', label: 'People', count: counts.people },
        { id: 'loans', label: 'Loans & Cards', count: counts.loans },
    ];
    return (
        <div className="inline-flex bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 p-1">
            {items.map((it) => {
                const active = tab === it.id;
                return (
                    <button
                        key={it.id}
                        onClick={() => setTab(it.id)}
                        className={`relative px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
                            ${active
                                ? 'bg-primary-600 text-white shadow-sm'
                                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'}`}
                    >
                        {it.label}
                        {typeof it.count === 'number' && it.count > 0 && (
                            <span className={`ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold ${active ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300'}`}>
                                {it.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

function SkeletonGrid() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-32 rounded-2xl bg-gray-100 dark:bg-neutral-800/60 animate-pulse" />
            ))}
        </div>
    );
}

/* ─── ALL view ─ flat combined list ─────────────────────────── */
function AllView({ people, debts }) {
    const [q, setQ] = useState('');
    const rows = useMemo(() => {
        const peopleRows = people.map((p) => ({
            kind: 'person',
            id: p.id,
            name: p.name,
            balance: Number(p.netBalance),
            meta: `${p.transactions.length} ${p.transactions.length === 1 ? 'entry' : 'entries'}`,
            icon: User,
        }));
        const debtRows = debts.filter((d) => d.is_active).map((d) => {
            const m = debtTypeMeta(d.debt_type);
            const principal = Number(d.principal);
            const outstanding = Number(d.outstanding);
            const repaidPct = principal > 0 ? Math.max(0, Math.min(100, ((principal - outstanding) / principal) * 100)) : 0;
            return {
                kind: 'debt',
                id: d.id,
                name: d.name,
                balance: -outstanding, // negative = I owe
                meta: `${m.label} · ${repaidPct.toFixed(0)}% repaid${d.interest_rate ? ` · ${Number(d.interest_rate).toFixed(1)}% APR` : ''}`,
                icon: m.icon,
            };
        });
        const merged = [...peopleRows, ...debtRows];
        const filtered = q
            ? merged.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()))
            : merged;
        return filtered.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
    }, [people, debts, q]);

    if (rows.length === 0 && !q) {
        return <EmptyState />;
    }

    return (
        <div className="space-y-3">
            <SearchInput value={q} onChange={setQ} />
            <Card className="overflow-hidden">
                {rows.length === 0 ? (
                    <div className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                        Nothing matches "{q}".
                    </div>
                ) : (
                    rows.map((r, i) => (
                        <AllRow key={`${r.kind}-${r.id}`} row={r} isLast={i === rows.length - 1} />
                    ))
                )}
            </Card>
        </div>
    );
}

function AllRow({ row, isLast }) {
    const Icon = row.icon;
    const isPositive = row.balance > 0;
    const isZero = row.balance === 0;
    const isPerson = row.kind === 'person';

    const content = (
        <div className={`flex items-center gap-4 px-5 py-4 ${isLast ? '' : 'border-b border-gray-100 dark:border-neutral-800'} hover:bg-gray-50/50 dark:hover:bg-neutral-800/50 transition-colors`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isPerson
                ? 'bg-primary-50 text-primary-700 dark:bg-primary-600/30 dark:text-primary-300'
                : 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
                }`}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{row.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{row.meta}</p>
            </div>
            <div className="text-right shrink-0">
                <p className={`text-base font-semibold tabular-nums ${isZero
                    ? 'text-gray-500 dark:text-gray-400'
                    : isPositive
                        ? 'text-success-700 dark:text-success-400'
                        : 'text-error-600 dark:text-error-400'
                    }`}>
                    {isZero ? fmtPKR(0) : `${isPositive ? '+' : '−'}${fmtPKR(Math.abs(row.balance))}`}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    {isZero ? 'Settled' : isPositive ? 'Owes me' : 'I owe'}
                </p>
            </div>
        </div>
    );

    if (isPerson) {
        return (
            <Link to={`/ledger?tab=people&open=${row.id}`} className="block">
                {content}
            </Link>
        );
    }
    return (
        <Link to={`/debts/${row.id}`} className="block">
            {content}
        </Link>
    );
}

function SearchInput({ value, onChange }) {
    return (
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Search by name…"
                className="w-full pl-9 pr-3 h-10 rounded-xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-primary-600 focus:ring-4 focus:ring-primary-600/10 transition-all"
            />
        </div>
    );
}

function EmptyState() {
    return (
        <div className="px-6 py-16 rounded-2xl border border-dashed border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-center">
            <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-6 h-6 text-primary-600 dark:text-primary-300" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Your ledger is empty</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                Add a person to track dues, or add a loan / credit card to track institutional debt.
                Both show up here.
            </p>
        </div>
    );
}

/* ─── PEOPLE view ─ accordion list ─────────────────────────── */
function PeopleView({ people, refetch }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const openId = searchParams.get('open') || null;
    const [q, setQ] = useState('');
    const qc = useQueryClient();

    const toggle = (id) => {
        const params = new URLSearchParams(searchParams);
        if (params.get('open') === id) params.delete('open');
        else params.set('open', id);
        setSearchParams(params);
    };

    const filtered = useMemo(() => {
        if (!q) return people;
        return people.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
    }, [people, q]);

    if (people.length === 0) {
        return (
            <div className="px-6 py-16 rounded-2xl border border-dashed border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-center">
                <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-4">
                    <User className="w-6 h-6 text-primary-600 dark:text-primary-300" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">No people tracked yet</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                    Click <span className="font-medium text-gray-700 dark:text-gray-200">Add</span> above to track who owes you or who you owe.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <SearchInput value={q} onChange={setQ} />
            <div className="space-y-3">
                {filtered.map((p) => (
                    <PersonCard
                        key={p.id}
                        person={p}
                        open={openId === p.id}
                        onToggle={() => toggle(p.id)}
                        onChanged={() => { qc.invalidateQueries({ queryKey: ['dues'] }); refetch?.(); }}
                    />
                ))}
            </div>
        </div>
    );
}

function PersonCard({ person, open, onToggle, onChanged }) {
    const confirm = useConfirm();
    const balance = Number(person.netBalance);
    const isPositive = balance > 0;
    const isZero = balance === 0;

    const [showAddTx, setShowAddTx] = useState(false);
    const [editPerson, setEditPerson] = useState(false);
    const [editForm, setEditForm] = useState({ name: person.name, email: person.email || '' });

    const updatePerson = useMutation({
        mutationFn: (payload) => api.put(`/dues/${person.id}`, payload),
        onSuccess: () => { onChanged(); setEditPerson(false); toast.success('Person updated'); },
        onError: (e) => toast.error(e.response?.data?.message || 'Failed to update'),
    });
    const deletePerson = useMutation({
        mutationFn: () => api.delete(`/dues/${person.id}`),
        onSuccess: () => { onChanged(); toast.success('Removed'); },
        onError: () => toast.error('Failed to remove'),
    });
    const sendReminder = useMutation({
        mutationFn: () => api.post(`/dues/${person.id}/reminder`),
        onSuccess: (r) => toast.success(r.data.message || 'Reminder sent'),
        onError: (e) => toast.error(e.response?.data?.message || 'Failed to send reminder'),
    });

    return (
        <Card className={`${open ? 'border-primary-200 dark:border-primary-900/40 shadow-sm' : 'border-gray-200 dark:border-neutral-800'} overflow-hidden transition-colors`}>
            <button
                type="button"
                onClick={onToggle}
                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50/50 dark:hover:bg-neutral-800/50 transition-colors"
            >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0 ${isZero ? 'bg-gray-400 dark:bg-neutral-600' : isPositive ? 'bg-success-600' : 'bg-error-500'
                    }`}>
                    {person.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{person.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {person.transactions.length} {person.transactions.length === 1 ? 'entry' : 'entries'}
                        {person.email && <> · {person.email}</>}
                    </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <div className={`px-3 py-1 rounded-full text-sm font-semibold ${isZero
                        ? 'bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-gray-400'
                        : isPositive
                            ? 'bg-success-50 text-success-700 dark:bg-success-900/20 dark:text-success-400'
                            : 'bg-error-50 text-error-700 dark:bg-error-900/20 dark:text-error-400'
                        }`}>
                        {isZero ? fmtPKR(0) : `${isPositive ? '+' : '−'}${fmtPKR(Math.abs(balance))}`}
                    </div>
                    {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
            </button>

            {open && (
                <div className="border-t border-gray-100 dark:border-neutral-800">
                    {/* Action bar */}
                    <div className="px-5 py-3 flex flex-wrap items-center gap-2 bg-gray-50/60 dark:bg-neutral-800/40 border-b border-gray-100 dark:border-neutral-800">
                        <button onClick={() => setShowAddTx(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition-colors">
                            <Plus className="w-3.5 h-3.5" /> Add entry
                        </button>
                        <button onClick={() => { setEditForm({ name: person.name, email: person.email || '' }); setEditPerson((v) => !v); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-gray-700 dark:text-gray-200 text-xs font-medium hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
                            <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                        {person.email && isPositive && (
                            <button onClick={() => sendReminder.mutate()} disabled={sendReminder.isPending} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 text-xs font-medium hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors disabled:opacity-50">
                                <Mail className="w-3.5 h-3.5" /> {sendReminder.isPending ? 'Sending…' : 'Send reminder'}
                            </button>
                        )}
                        <CsvUploadButton personId={person.id} onUploaded={onChanged} />
                        <button
                            onClick={async () => {
                                const ok = await confirm({
                                    title: 'Remove person',
                                    description: `Remove ${person.name} and their entire ledger history? This cannot be undone.`,
                                    confirmText: 'Remove',
                                });
                                if (ok) deletePerson.mutate();
                            }}
                            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-error-600 dark:text-error-400 text-xs font-medium hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors"
                        >
                            <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                    </div>

                    {editPerson && (
                        <form
                            onSubmit={(e) => { e.preventDefault(); updatePerson.mutate(editForm); }}
                            className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-3 bg-primary-50/40 dark:bg-primary-900/10 border-b border-primary-100 dark:border-primary-900/30"
                        >
                            <Field label="Name">
                                <input
                                    type="text" required
                                    value={editForm.name}
                                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                                    className={inputCls}
                                />
                            </Field>
                            <Field label="Email (optional)">
                                <input
                                    type="email"
                                    value={editForm.email}
                                    onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                                    className={inputCls}
                                />
                            </Field>
                            <div className="md:col-span-2 flex justify-end gap-2 mt-1">
                                <button type="button" onClick={() => setEditPerson(false)} className="px-3 py-1.5 rounded-lg text-gray-600 dark:text-gray-300 text-xs font-medium hover:bg-gray-100 dark:hover:bg-neutral-800">Cancel</button>
                                <button type="submit" disabled={updatePerson.isPending} className="px-3 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-semibold hover:bg-primary-700 disabled:opacity-50">
                                    {updatePerson.isPending ? 'Saving…' : 'Save'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Transactions */}
                    {person.transactions.length === 0 ? (
                        <div className="px-6 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
                            No entries yet. Add one above or upload a CSV.
                        </div>
                    ) : (
                        <PersonTransactions person={person} onChanged={onChanged} />
                    )}
                </div>
            )}

            {showAddTx && (
                <AddTxModal
                    person={person}
                    onClose={() => setShowAddTx(false)}
                    onSaved={onChanged}
                />
            )}
        </Card>
    );
}

function PersonTransactions({ person, onChanged }) {
    const qc = useQueryClient();
    const confirm = useConfirm();
    const [editingId, setEditingId] = useState(null);
    const [editTx, setEditTx] = useState({});

    const update = useMutation({
        mutationFn: ({ id, payload }) => api.put(`/dues/transactions/${id}`, payload),
        onSuccess: () => { setEditingId(null); qc.invalidateQueries({ queryKey: ['dues'] }); onChanged?.(); },
        onError: () => toast.error('Failed to update'),
    });
    const remove = useMutation({
        mutationFn: (id) => api.post('/dues/transactions/delete', { ids: [id] }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['dues'] }); onChanged?.(); toast.success('Entry removed'); },
        onError: () => toast.error('Failed to delete'),
    });

    const startEdit = (tx) => {
        setEditingId(tx.id);
        setEditTx({
            description: tx.description || '',
            amount: Math.abs(Number(tx.amount)),
            transaction_date: new Date(tx.transaction_date).toISOString().split('T')[0],
            transaction_type: tx.transaction_type,
        });
    };

    const saveEdit = () => {
        const payload = {
            description: editTx.description,
            amount: editTx.transaction_type === 'payable' ? -Math.abs(Number(editTx.amount)) : Math.abs(Number(editTx.amount)),
            transaction_date: editTx.transaction_date,
            transaction_type: editTx.transaction_type,
        };
        update.mutate({ id: editingId, payload });
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-neutral-800">
                        <th className="px-5 py-3 text-left font-medium">Detail</th>
                        <th className="px-5 py-3 text-left font-medium w-32">Date</th>
                        <th className="px-5 py-3 text-right font-medium w-36">Amount</th>
                        <th className="px-5 py-3 text-right font-medium w-20"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-neutral-800">
                    {person.transactions.map((tx) => {
                        const isRec = tx.transaction_type === 'receivable';
                        const editing = editingId === tx.id;
                        if (editing) {
                            return (
                                <tr key={tx.id} className="bg-primary-50/30 dark:bg-primary-900/10">
                                    <td className="px-5 py-2">
                                        <input
                                            type="text"
                                            value={editTx.description}
                                            onChange={(e) => setEditTx((f) => ({ ...f, description: e.target.value }))}
                                            className={inputCls + ' py-1.5'}
                                            placeholder="Description"
                                        />
                                    </td>
                                    <td className="px-5 py-2">
                                        <DatePickerInput
                                            selectedDate={editTx.transaction_date}
                                            onChange={(v) => setEditTx((f) => ({ ...f, transaction_date: v }))}
                                            className="text-sm"
                                        />
                                    </td>
                                    <td className="px-5 py-2">
                                        <div className="flex items-center gap-2 justify-end">
                                            <div className="inline-flex rounded-lg overflow-hidden border border-gray-200 dark:border-neutral-700">
                                                <button
                                                    type="button"
                                                    onClick={() => setEditTx((f) => ({ ...f, transaction_type: 'receivable' }))}
                                                    className={`px-2.5 py-1.5 text-xs font-semibold ${editTx.transaction_type === 'receivable' ? 'bg-success-600 text-white' : 'bg-white dark:bg-neutral-900 text-gray-400'}`}
                                                >+</button>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditTx((f) => ({ ...f, transaction_type: 'payable' }))}
                                                    className={`px-2.5 py-1.5 text-xs font-semibold border-l border-gray-200 dark:border-neutral-700 ${editTx.transaction_type === 'payable' ? 'bg-error-500 text-white' : 'bg-white dark:bg-neutral-900 text-gray-400'}`}
                                                >−</button>
                                            </div>
                                            <input
                                                type="number" min="0" step="0.01"
                                                value={editTx.amount}
                                                onChange={(e) => setEditTx((f) => ({ ...f, amount: e.target.value }))}
                                                className={inputCls + ' py-1.5 w-28 text-right tabular-nums'}
                                            />
                                        </div>
                                    </td>
                                    <td className="px-5 py-2">
                                        <div className="inline-flex gap-1 justify-end">
                                            <button onClick={saveEdit} className="p-1.5 rounded-lg bg-success-50 text-success-700 hover:bg-success-100 dark:bg-success-900/30 dark:text-success-300">
                                                <Check className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-neutral-800">
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        }
                        return (
                            <tr key={tx.id} className="hover:bg-gray-50/40 dark:hover:bg-neutral-800/40">
                                <td className="px-5 py-3 text-gray-900 dark:text-gray-100 font-medium">{tx.description || '—'}</td>
                                <td className="px-5 py-3 text-gray-500 dark:text-gray-400 text-xs">{fmtDateLong(tx.transaction_date)}</td>
                                <td className={`px-5 py-3 text-right font-semibold tabular-nums ${isRec ? 'text-success-700 dark:text-success-400' : 'text-error-600 dark:text-error-400'}`}>
                                    {isRec ? '+' : '−'}{fmtPKR(Math.abs(Number(tx.amount)))}
                                </td>
                                <td className="px-5 py-3 text-right">
                                    <div className="inline-flex gap-1 justify-end">
                                        <button onClick={() => startEdit(tx)} className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20" title="Edit">
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={async () => { const ok = await confirm({ title: 'Delete entry', description: 'Delete this entry?', confirmText: 'Delete' }); if (ok) remove.mutate(tx.id); }} className="p-1.5 rounded-lg text-gray-400 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20" title="Delete">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function CsvUploadButton({ personId, onUploaded }) {
    const inputRef = useRef(null);
    const [busy, setBusy] = useState(false);

    const handleUpload = async (file) => {
        if (!file) return;
        setBusy(true);
        const formData = new FormData();
        formData.append('duesCSV', file);
        try {
            const res = await api.post(`/dues/${personId}/upload-csv`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success(res.data.message || 'CSV uploaded');
            onUploaded?.();
        } catch (e) {
            toast.error('Failed to upload CSV');
        } finally {
            setBusy(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    return (
        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-gray-700 dark:text-gray-200 text-xs font-medium hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            CSV
            <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={(e) => handleUpload(e.target.files?.[0])} />
        </label>
    );
}

/* ─── LOANS view ───────────────────────────────────────────── */
function LoansView({ debts, refetch, onAdd }) {
    const qc = useQueryClient();
    const confirm = useConfirm();
    const deleteDebt = useMutation({
        mutationFn: (id) => api.delete(`/debts/${id}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['debts'] }); refetch?.(); toast.success('Removed'); },
        onError: () => toast.error('Failed to delete'),
    });

    if (debts.length === 0) {
        return (
            <div className="px-6 py-16 rounded-2xl border border-dashed border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-center">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">No loans or cards tracked</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                    Track credit cards, car loans, mortgages — anything with a payoff schedule.
                    Outstanding balances are subtracted from your net worth automatically.
                </p>
                <button onClick={onAdd} className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold">
                    <Plus className="w-4 h-4" /> Add a loan
                </button>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {debts.map((d) => (
                <DebtCard
                    key={d.id}
                    debt={d}
                    onDelete={async () => {
                        const ok = await confirm({
                            title: 'Delete loan',
                            description: `Delete "${d.name}"? Its payment history will also be removed.`,
                            confirmText: 'Delete',
                        });
                        if (ok) deleteDebt.mutate(d.id);
                    }}
                />
            ))}
        </div>
    );
}

function DebtCard({ debt, onDelete }) {
    const meta = debtTypeMeta(debt.debt_type);
    const Icon = meta.icon;
    const principal = Number(debt.principal);
    const outstanding = Number(debt.outstanding);
    const repaidPct = principal > 0 ? Math.max(0, Math.min(100, ((principal - outstanding) / principal) * 100)) : 0;

    return (
        <Card className={`p-5 transition-colors ${debt.is_active ? '' : 'opacity-70'}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{debt.name}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {meta.label}
                            {debt.interest_rate ? ` · ${Number(debt.interest_rate).toFixed(2)}% APR` : ''}
                        </p>
                    </div>
                </div>
                <button onClick={onDelete} className="p-1.5 rounded-lg text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20" title="Delete">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            <div className="mt-4 flex items-baseline justify-between gap-3">
                <p className="text-2xl font-bold text-error-600 dark:text-error-400 tabular-nums">{fmtPKR(outstanding)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">of {fmtPKR(principal)}</p>
            </div>

            <div className="mt-3 h-2 rounded-full bg-gray-100 dark:bg-neutral-800 overflow-hidden">
                <div className="h-full rounded-full bg-success-500" style={{ width: `${repaidPct}%` }} />
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{repaidPct.toFixed(0)}% repaid</p>

            <Link
                to={`/debts/${debt.id}`}
                className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary-700 dark:text-primary-400 hover:opacity-80"
            >
                View details <ArrowRight className="w-3.5 h-3.5" />
            </Link>
        </Card>
    );
}

/* ─── Add Person Modal ──────────────────────────────────────── */
function AddPersonModal({ onClose, onSaved }) {
    const [form, setForm] = useState({ name: '', email: '' });
    const mut = useMutation({
        mutationFn: (payload) => api.post('/dues', payload),
        onSuccess: () => { toast.success('Person added'); onSaved?.(); onClose(); },
        onError: (e) => toast.error(e.response?.data?.message || 'Failed to add'),
    });

    return (
        <ModalShell title="Add a person" onClose={onClose}>
            <form onSubmit={(e) => { e.preventDefault(); mut.mutate(form); }} className="space-y-4">
                <Field label="Name">
                    <input
                        type="text" required autoFocus
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        className={inputCls}
                        placeholder="e.g. Ahmed Khan"
                    />
                </Field>
                <Field label="Email (optional, enables reminders)">
                    <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                        className={inputCls}
                        placeholder="ahmed@example.com"
                    />
                </Field>
                <ModalFooter onCancel={onClose} submitting={mut.isPending} submitLabel="Add person" />
            </form>
        </ModalShell>
    );
}

/* ─── Add Tx Modal ──────────────────────────────────────────── */
function AddTxModal({ person, onClose, onSaved }) {
    const [form, setForm] = useState(EMPTY_TX_FORM);
    const mut = useMutation({
        mutationFn: (payload) => api.post(`/dues/${person.id}/transactions`, payload),
        onSuccess: () => { toast.success('Entry added'); onSaved?.(); onClose(); },
        onError: (e) => toast.error(e.response?.data?.message || 'Failed to add entry'),
    });

    return (
        <ModalShell title={`Add entry for ${person.name}`} onClose={onClose}>
            <form onSubmit={(e) => { e.preventDefault(); mut.mutate(form); }} className="space-y-4">
                <Field label="Type">
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { v: 'receivable', label: 'They owe me', tone: 'success' },
                            { v: 'payable', label: 'I owe them', tone: 'error' },
                        ].map((opt) => {
                            const active = form.transaction_type === opt.v;
                            return (
                                <button
                                    key={opt.v}
                                    type="button"
                                    onClick={() => setForm((f) => ({ ...f, transaction_type: opt.v }))}
                                    className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${active
                                        ? opt.tone === 'success'
                                            ? 'bg-success-50 border-success-300 text-success-700 dark:bg-success-900/20 dark:border-success-800/40 dark:text-success-300'
                                            : 'bg-error-50 border-error-300 text-error-700 dark:bg-error-900/20 dark:border-error-800/40 dark:text-error-300'
                                        : 'border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800'
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>
                </Field>
                <Field label="Amount (PKR)">
                    <input
                        type="number" required min="0" step="0.01"
                        value={form.amount}
                        onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                        className={inputCls}
                    />
                </Field>
                <Field label="Date">
                    <DatePickerInput
                        selectedDate={form.transaction_date}
                        onChange={(v) => setForm((f) => ({ ...f, transaction_date: v }))}
                        className="w-full text-sm"
                    />
                </Field>
                <Field label="Description (optional)">
                    <input
                        type="text"
                        value={form.description}
                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                        className={inputCls}
                        placeholder="e.g. Lunch on Saturday"
                    />
                </Field>
                <ModalFooter onCancel={onClose} submitting={mut.isPending} submitLabel="Save entry" />
            </form>
        </ModalShell>
    );
}

/* ─── Add Debt Modal ────────────────────────────────────────── */
function AddDebtModal({ onClose, onSaved }) {
    const [form, setForm] = useState(EMPTY_DEBT_FORM);
    const mut = useMutation({
        mutationFn: (payload) => api.post('/debts', payload),
        onSuccess: () => { toast.success('Debt added'); onSaved?.(); onClose(); },
        onError: () => toast.error('Failed to add debt'),
    });

    const submit = (e) => {
        e.preventDefault();
        mut.mutate({
            ...form,
            principal: Number(form.principal),
            outstanding: Number(form.outstanding || form.principal),
            interest_rate: form.interest_rate === '' ? null : Number(form.interest_rate),
            minimum_payment: form.minimum_payment === '' ? null : Number(form.minimum_payment),
            due_day: form.due_day === '' ? null : Number(form.due_day),
            target_payoff: form.target_payoff || null,
            notes: form.notes || null,
        });
    };

    return (
        <ModalShell title="Add a loan or card" onClose={onClose} maxWidth="max-w-xl">
            <form onSubmit={submit} className="space-y-4">
                <Field label="Name">
                    <input
                        type="text" required autoFocus
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        className={inputCls}
                        placeholder="HBL Credit Card, Car Loan…"
                    />
                </Field>
                <Field label="Type">
                    <div className="grid grid-cols-3 gap-2">
                        {DEBT_TYPES.map((t) => {
                            const active = form.debt_type === t.value;
                            const I = t.icon;
                            return (
                                <button
                                    key={t.value}
                                    type="button"
                                    onClick={() => setForm((f) => ({ ...f, debt_type: t.value }))}
                                    className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border text-xs font-medium transition-colors ${active
                                        ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                                        : 'border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-800'
                                        }`}
                                >
                                    <I className="w-4 h-4" />
                                    {t.label}
                                </button>
                            );
                        })}
                    </div>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Original principal">
                        <input
                            type="number" required min="0" step="0.01"
                            value={form.principal}
                            onChange={(e) => setForm((f) => ({ ...f, principal: e.target.value }))}
                            className={inputCls}
                        />
                    </Field>
                    <Field label="Current outstanding">
                        <input
                            type="number" min="0" step="0.01"
                            value={form.outstanding}
                            onChange={(e) => setForm((f) => ({ ...f, outstanding: e.target.value }))}
                            className={inputCls}
                            placeholder="Defaults to principal"
                        />
                    </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Interest rate % (annual)">
                        <input
                            type="number" min="0" step="0.01"
                            value={form.interest_rate}
                            onChange={(e) => setForm((f) => ({ ...f, interest_rate: e.target.value }))}
                            className={inputCls}
                        />
                    </Field>
                    <Field label="Minimum monthly payment">
                        <input
                            type="number" min="0" step="0.01"
                            value={form.minimum_payment}
                            onChange={(e) => setForm((f) => ({ ...f, minimum_payment: e.target.value }))}
                            className={inputCls}
                        />
                    </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Due day of month (1–28)">
                        <input
                            type="number" min="1" max="28"
                            value={form.due_day}
                            onChange={(e) => setForm((f) => ({ ...f, due_day: e.target.value }))}
                            className={inputCls}
                        />
                    </Field>
                    <Field label="Target payoff date">
                        <input
                            type="date"
                            value={form.target_payoff}
                            onChange={(e) => setForm((f) => ({ ...f, target_payoff: e.target.value }))}
                            className={inputCls}
                        />
                    </Field>
                </div>
                <Field label="Notes (optional)">
                    <textarea
                        rows="2"
                        value={form.notes}
                        onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                        className={inputCls}
                    />
                </Field>
                <ModalFooter onCancel={onClose} submitting={mut.isPending} submitLabel="Add loan" />
            </form>
        </ModalShell>
    );
}

/* ─── Shared modal shell / form bits ─────────────────────────── */
function ModalShell({ title, onClose, children, maxWidth = 'max-w-lg' }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className={`w-full ${maxWidth} bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-neutral-800 overflow-hidden`}>
                <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-800 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="px-6 py-5 max-h-[75vh] overflow-y-auto">{children}</div>
            </div>
        </div>
    );
}

function ModalFooter({ onCancel, submitting, submitLabel }) {
    return (
        <div className="pt-2 flex items-center justify-end gap-2">
            <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800">
                Cancel
            </button>
            <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors shadow-sm"
            >
                {submitting ? 'Saving…' : submitLabel}
            </button>
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

const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-primary-600 focus:ring-4 focus:ring-primary-600/10 transition-all';
