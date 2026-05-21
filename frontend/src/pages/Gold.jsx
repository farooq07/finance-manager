import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import { toast } from 'sonner';
import {
    Plus, RefreshCcw, Gem, X, Loader2, ShieldCheck, AlertTriangle, ArrowRight, Trash2, Pencil,
} from 'lucide-react';
import GoldPinGate from '../components/GoldPinGate';
import {
    useGoldItems, useGoldLatestPrice, useGoldPriceHistory, useGoldZakatSummary,
    useAddGoldItem, useUpdateGoldItem, useDeleteGoldItem, useSyncGoldPrice,
} from '../hooks/useGold';
import { fmtPKR } from '../utils/currency';
import { fmtDateLong } from '../utils/dates';

const GOLD_AMBER = '#D4AF37';

export default function Gold() {
    return (
        <GoldPinGate>
            <GoldVault />
        </GoldPinGate>
    );
}

function GoldVault() {
    const [formOpen, setFormOpen] = useState(false);
    const [editing,  setEditing]  = useState(null);

    const items   = useGoldItems();
    const latest  = useGoldLatestPrice();
    const history = useGoldPriceHistory(30);
    const zakat   = useGoldZakatSummary();
    const sync    = useSyncGoldPrice();
    const remove  = useDeleteGoldItem();

    const lastSyncedLabel = useMemo(() => {
        const dt = latest.data?.row?.date;
        return dt ? fmtDateLong(dt) : null;
    }, [latest.data]);

    function openNew()  { setEditing(null); setFormOpen(true); }
    function openEdit(item) { setEditing(item); setFormOpen(true); }

    function handleSync() {
        sync.mutate(undefined, {
            onSuccess: () => toast.success('Gold price synced'),
            onError:  () => toast.error('Could not sync gold price right now'),
        });
    }

    function handleDelete(item) {
        if (!confirm(`Delete "${item.name}"?`)) return;
        remove.mutate(item.id, {
            onSuccess: () => toast.success('Item removed'),
            onError:  () => toast.error('Could not delete'),
        });
    }

    return (
        <div className="space-y-6">
            <Header
                lastSyncedLabel={lastSyncedLabel}
                onSync={handleSync}
                syncing={sync.isPending}
                onAdd={openNew}
            />

            <LivePricesCard
                latest={latest.data}
                loading={latest.isLoading}
                onSync={handleSync}
                syncing={sync.isPending}
            />

            <TrendChart history={history.data} loading={history.isLoading} />

            <ItemsSection
                data={items.data}
                loading={items.isLoading}
                onAdd={openNew}
                onEdit={openEdit}
                onDelete={handleDelete}
            />

            <ZakatPanel summary={zakat.data} loading={zakat.isLoading} />

            {formOpen && (
                <ItemFormModal
                    item={editing}
                    perGram24k={Number(latest.data?.row?.price_24k_per_gram || 0)}
                    onClose={() => { setFormOpen(false); setEditing(null); }}
                />
            )}
        </div>
    );
}

// ── header ──────────────────────────────────────────────────────────

function Header({ lastSyncedLabel, onSync, syncing, onAdd }) {
    return (
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gold Vault</h1>
                    <span
                        className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md"
                        style={{ backgroundColor: 'rgba(212,175,55,0.15)', color: GOLD_AMBER }}
                    >
                        Locked
                    </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {lastSyncedLabel ? `Last synced: ${lastSyncedLabel}` : 'Not synced yet — tap refresh to fetch the latest price'}
                </p>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={onSync}
                    disabled={syncing}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50"
                >
                    {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                    Sync price
                </button>
                <button
                    onClick={onAdd}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-medium transition-colors"
                    style={{ backgroundColor: GOLD_AMBER, color: '#1a1a1a' }}
                >
                    <Plus className="w-4 h-4" />
                    Add item
                </button>
            </div>
        </div>
    );
}

// ── live prices ─────────────────────────────────────────────────────

function LivePricesCard({ latest, loading, onSync, syncing }) {
    if (loading) {
        return <div className="h-44 rounded-2xl bg-gray-100 dark:bg-neutral-800/60 animate-pulse" />;
    }

    if (!latest?.row || !latest?.per_carat) {
        return (
            <div
                className="p-6 rounded-2xl text-center"
                style={{
                    background: 'linear-gradient(135deg, #3a2614 0%, #1a0f08 100%)',
                    border: '1px solid rgba(212,175,55,0.25)',
                }}
            >
                <Gem className="w-8 h-8 mx-auto" style={{ color: GOLD_AMBER }} />
                <h3 className="mt-3 text-base font-semibold" style={{ color: GOLD_AMBER }}>No price data yet</h3>
                <p className="mt-1 text-sm text-amber-100/70">
                    The daily scraper hasn't run yet, or the source is unreachable. Try a manual sync.
                </p>
                <button
                    onClick={onSync}
                    disabled={syncing}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium"
                    style={{ backgroundColor: GOLD_AMBER, color: '#1a1a1a' }}
                >
                    {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                    Sync now
                </button>
            </div>
        );
    }

    const carats = [24, 22, 21, 20, 18];

    return (
        <div
            className="p-6 rounded-2xl"
            style={{
                background: 'linear-gradient(135deg, #3a2614 0%, #1a0f08 100%)',
                border: '1px solid rgba(212,175,55,0.25)',
            }}
        >
            <div className="flex items-center justify-between mb-4">
                <div>
                    <p className="text-xs uppercase tracking-wider text-amber-200/70">Live Gold Price · PKR</p>
                    <p className="text-[10px] text-amber-200/50 mt-0.5">
                        Source: {latest.row.source} · {fmtDateLong(latest.row.date)}
                    </p>
                </div>
                <Gem className="w-5 h-5" style={{ color: GOLD_AMBER }} />
            </div>

            <div className="grid grid-cols-2 gap-x-6 text-amber-50">
                <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-3 text-[11px] uppercase tracking-wider text-amber-200/60 pb-1.5 border-b border-amber-400/15">
                        <span>Carat</span>
                        <span className="text-right">Per gram</span>
                        <span className="text-right">Per tola</span>
                    </div>
                    {carats.map((c) => {
                        const row = latest.per_carat[`${c}k`];
                        if (!row) return null;
                        return (
                            <div key={c} className="grid grid-cols-3 items-center py-1.5 tabular-nums">
                                <span className="font-semibold" style={{ color: GOLD_AMBER }}>{c}K</span>
                                <span className="text-right">{Number(row.per_gram).toLocaleString('en-PK', { maximumFractionDigits: 0 })}</span>
                                <span className="text-right">{Number(row.per_tola).toLocaleString('en-PK', { maximumFractionDigits: 0 })}</span>
                            </div>
                        );
                    })}
                </div>
                <div className="hidden md:flex flex-col items-end justify-end text-right">
                    <p className="text-[11px] uppercase tracking-wider text-amber-200/60">24K Headline</p>
                    <p className="text-3xl font-bold mt-1" style={{ color: GOLD_AMBER }}>
                        {fmtPKR(latest.row.price_24k_per_tola)}
                    </p>
                    <p className="text-xs text-amber-200/70">per tola</p>
                </div>
            </div>
        </div>
    );
}

// ── trend chart ─────────────────────────────────────────────────────

function TrendChart({ history, loading }) {
    if (loading) {
        return <div className="h-72 rounded-2xl bg-gray-100 dark:bg-neutral-800/60 animate-pulse" />;
    }
    if (!history || history.length === 0) {
        return (
            <div className="p-5 rounded-2xl border border-dashed border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900/40 text-center text-sm text-gray-500 dark:text-gray-400">
                Price history will build up here as the daily scraper runs.
            </div>
        );
    }

    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'axis',
            backgroundColor: '#1f2937',
            borderColor: '#374151',
            textStyle: { color: '#f9fafb', fontSize: 12 },
            valueFormatter: (v) => `${fmtPKR(v)} /g`,
        },
        grid: { left: '3%', right: '3%', bottom: '10%', top: '8%', containLabel: true },
        xAxis: {
            type: 'category',
            data: history.map((r) => new Date(r.date).toISOString().slice(5, 10)),
            axisLabel: { color: '#9ca3af', fontSize: 10, interval: Math.max(0, Math.floor(history.length / 8) - 1) },
            axisLine: { lineStyle: { color: '#374151' } },
        },
        yAxis: {
            type: 'value',
            scale: true,
            axisLabel: { color: '#9ca3af', fontSize: 10, formatter: (v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v },
            splitLine: { lineStyle: { color: '#374151', type: 'dashed' } },
        },
        series: [{
            type: 'line',
            smooth: true,
            symbol: 'circle',
            symbolSize: 4,
            data: history.map((r) => Number(r.price_24k_per_gram)),
            itemStyle: { color: GOLD_AMBER },
            lineStyle: { width: 2.5, color: GOLD_AMBER },
            areaStyle: {
                color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
                    { offset: 0, color: 'rgba(212,175,55,0.35)' },
                    { offset: 1, color: 'transparent' },
                ] },
            },
        }],
    };

    return (
        <div className="p-5 rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40">
            <div className="flex items-baseline justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">30-day trend · 24K per gram</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{history.length} day{history.length === 1 ? '' : 's'} of history</p>
            </div>
            <ReactECharts option={option} style={{ height: 240 }} opts={{ renderer: 'canvas' }} />
        </div>
    );
}

// ── items list ──────────────────────────────────────────────────────

const TYPE_LABELS = { ring: 'Ring', set: 'Set', chain: 'Chain', bangle: 'Bangle', earring: 'Earring', other: 'Other' };

function ItemsSection({ data, loading, onAdd, onEdit, onDelete }) {
    if (loading) {
        return <div className="h-40 rounded-2xl bg-gray-100 dark:bg-neutral-800/60 animate-pulse" />;
    }
    const items = data?.items || [];
    const total = data?.total_value_pkr || 0;
    const totalWeight = items.reduce((s, i) => s + Number(i.weight_grams || 0), 0);

    if (items.length === 0) {
        return (
            <div className="p-10 text-center rounded-2xl border border-dashed border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900/40">
                <Gem className="w-8 h-8 mx-auto text-gray-400 dark:text-gray-500" />
                <h3 className="mt-3 text-base font-semibold text-gray-900 dark:text-gray-100">No gold items yet</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                    Add a ring, set, bangle, chain — anything physical. Value updates daily from the latest market rate.
                </p>
                <button
                    onClick={onAdd}
                    className="mt-4 px-4 py-2 rounded-lg text-sm font-medium"
                    style={{ backgroundColor: GOLD_AMBER, color: '#1a1a1a' }}
                >
                    Add your first item
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total value</p>
                    <p className="mt-2 text-2xl font-semibold tabular-nums" style={{ color: GOLD_AMBER }}>{fmtPKR(total)}</p>
                </div>
                <div className="p-5 rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total weight</p>
                    <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                        {totalWeight.toFixed(2)} g
                        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400 font-normal">
                            · {(totalWeight / 11.664).toFixed(2)} tola
                        </span>
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((item) => (
                    <ItemCard key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} />
                ))}
            </div>
        </div>
    );
}

function ItemCard({ item, onEdit, onDelete }) {
    return (
        <div className="p-5 rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(212,175,55,0.12)' }}
                    >
                        <Gem className="w-5 h-5" style={{ color: GOLD_AMBER }} />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{item.name}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {TYPE_LABELS[item.type] || item.type} · {item.carats}K · {Number(item.weight_grams).toFixed(2)} g
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => onEdit(item)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-neutral-800" title="Edit">
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(item)} className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30" title="Delete">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between gap-3">
                <p className="text-xl font-bold tabular-nums" style={{ color: GOLD_AMBER }}>{fmtPKR(item.current_value_pkr)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    {Number(item.equivalent_24k_grams).toFixed(2)} g 24K-eq
                </p>
            </div>
            {item.purchase_date && (
                <p className="mt-2 text-[11px] text-gray-400 dark:text-gray-500">Purchased {fmtDateLong(item.purchase_date)}</p>
            )}
        </div>
    );
}

// ── zakat panel ─────────────────────────────────────────────────────

function ZakatPanel({ summary, loading }) {
    const navigate = useNavigate();

    if (loading) {
        return <div className="h-44 rounded-2xl bg-gray-100 dark:bg-neutral-800/60 animate-pulse" />;
    }
    if (!summary) return null;

    const eligible = summary.is_nisab_met;
    const Icon = eligible ? ShieldCheck : AlertTriangle;
    const tint = eligible ? GOLD_AMBER : '#9ca3af';

    return (
        <div
            className="p-6 rounded-2xl"
            style={{
                background: eligible
                    ? 'linear-gradient(135deg, #3a2614 0%, #1a0f08 100%)'
                    : 'linear-gradient(135deg, #1f2937 0%, #0f1419 100%)',
                border: `1px solid ${eligible ? 'rgba(212,175,55,0.25)' : 'rgba(255,255,255,0.08)'}`,
            }}
        >
            <div className="flex items-start gap-4 text-amber-50">
                <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: eligible ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.05)' }}
                >
                    <Icon className="w-5 h-5" style={{ color: tint }} />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold" style={{ color: tint }}>
                        {eligible ? 'Nisab threshold met' : 'Below Nisab threshold'}
                    </h3>
                    <p className="text-sm text-amber-100/70 mt-1">
                        {eligible
                            ? 'Zakat is due at 2.5% of the total value of your gold.'
                            : `You need ${(summary.nisab_gold_grams - summary.total_24k_equivalent_grams).toFixed(2)}g more 24K-equivalent to reach the ${summary.nisab_gold_grams}g threshold.`}
                    </p>

                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <Stat label="Your gold (24K eq.)" value={`${summary.total_24k_equivalent_grams.toFixed(2)} g`} />
                        <Stat label="Nisab threshold"     value={`${summary.nisab_gold_grams} g`} />
                        <Stat label="Total value"         value={fmtPKR(summary.total_value_pkr)} />
                        <Stat label="Zakat due (2.5%)"    value={fmtPKR(summary.zakat_due_pkr)} highlight={eligible} />
                    </div>

                    {eligible && summary.zakat_due_pkr > 0 && (
                        <button
                            onClick={() => navigate(`/personal?tab=zakat`)}
                            className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            style={{ backgroundColor: GOLD_AMBER, color: '#1a1a1a' }}
                        >
                            Record Zakat payment <ArrowRight className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function Stat({ label, value, highlight }) {
    return (
        <div>
            <p className="text-[11px] uppercase tracking-wider text-amber-200/50">{label}</p>
            <p
                className={`mt-1 tabular-nums ${highlight ? 'text-lg font-semibold' : 'text-base font-medium'}`}
                style={highlight ? { color: GOLD_AMBER } : undefined}
            >
                {value}
            </p>
        </div>
    );
}

// ── add/edit modal ──────────────────────────────────────────────────

const TYPES = ['ring', 'set', 'chain', 'bangle', 'earring', 'other'];
const CARATS = [24, 22, 21, 20, 18];

function ItemFormModal({ item, perGram24k, onClose }) {
    const isEdit = !!item;
    const add    = useAddGoldItem();
    const update = useUpdateGoldItem();

    const [form, setForm] = useState({
        name:          item?.name || '',
        type:          item?.type || 'ring',
        weight_grams:  item ? String(item.weight_grams) : '',
        carats:        item?.carats || 20,
        purchase_date: item?.purchase_date ? new Date(item.purchase_date).toISOString().slice(0, 10) : '',
        notes:         item?.notes || '',
    });

    const livePreview = useMemo(() => {
        const w = Number(form.weight_grams);
        if (!(w > 0) || !perGram24k) return null;
        return Number((w * perGram24k * (Number(form.carats) / 24)).toFixed(2));
    }, [form.weight_grams, form.carats, perGram24k]);

    function field(k, v) { setForm((f) => ({ ...f, [k]: v })); }

    function submit(e) {
        e.preventDefault();
        const payload = {
            ...form,
            weight_grams: Number(form.weight_grams),
            carats: Number(form.carats),
            purchase_date: form.purchase_date || null,
            notes: form.notes || null,
        };
        const mutation = isEdit ? update : add;
        const args = isEdit ? { id: item.id, ...payload } : payload;
        mutation.mutate(args, {
            onSuccess: () => {
                toast.success(isEdit ? 'Updated' : 'Item added');
                onClose();
            },
            onError: (err) => toast.error(err?.response?.data?.message || 'Could not save'),
        });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <form onSubmit={submit} className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-neutral-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-800 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{isEdit ? 'Edit gold item' : 'Add gold item'}</h2>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
                    <Field label="Name">
                        <input type="text" required value={form.name} onChange={(e) => field('name', e.target.value)} className={inputCls} placeholder="Bridal set, Engagement ring…" />
                    </Field>
                    <Field label="Type">
                        <div className="grid grid-cols-3 gap-2">
                            {TYPES.map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => field('type', t)}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition-colors border ${
                                        form.type === t
                                            ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300'
                                            : 'border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-800'
                                    }`}
                                >
                                    {TYPE_LABELS[t]}
                                </button>
                            ))}
                        </div>
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Weight (grams)">
                            <input type="number" required min="0" step="0.001" value={form.weight_grams} onChange={(e) => field('weight_grams', e.target.value)} className={inputCls} placeholder="0.000" />
                        </Field>
                        <Field label="Carats">
                            <select value={form.carats} onChange={(e) => field('carats', Number(e.target.value))} className={inputCls}>
                                {CARATS.map((c) => <option key={c} value={c}>{c}K</option>)}
                            </select>
                        </Field>
                    </div>
                    <Field label="Purchase date (optional)">
                        <input type="date" value={form.purchase_date} onChange={(e) => field('purchase_date', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Notes (optional)">
                        <textarea rows="2" value={form.notes} onChange={(e) => field('notes', e.target.value)} className={inputCls} />
                    </Field>

                    {livePreview !== null && (
                        <div
                            className="p-3 rounded-lg text-sm"
                            style={{
                                background: 'rgba(212,175,55,0.08)',
                                border: '1px solid rgba(212,175,55,0.25)',
                                color: '#a08020',
                            }}
                        >
                            Estimated current value: <strong style={{ color: GOLD_AMBER }}>{fmtPKR(livePreview)}</strong>
                            <span className="text-xs opacity-70"> at today's rate</span>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 bg-gray-50 dark:bg-neutral-900/60 border-t border-gray-200 dark:border-neutral-800 flex items-center justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">Cancel</button>
                    <button
                        type="submit"
                        disabled={add.isPending || update.isPending}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
                        style={{ backgroundColor: GOLD_AMBER, color: '#1a1a1a' }}
                    >
                        {add.isPending || update.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Add item'}
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

const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500';
