import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactECharts from 'echarts-for-react';
import { toast } from 'sonner';
import {
    Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Receipt, X, ArrowRight,
    TrendingDown, TrendingUp, Calendar, Sparkles,
} from 'lucide-react';
import api from '../services/api';
import { useBanks } from '../hooks/useBanks';
import { useWallets } from '../hooks/useWallets';
import { fmtPKR } from '../utils/currency';
import { fmtDate } from '../utils/dates';
import { useConfirm } from '../components/ui/confirm-dialog';
import MaskedBalance from '../components/MaskedBalance';

// ─────────────────────────────────────────────────────────────────────────────
//  Period helpers — client computes the anchor date for the insights call so
//  Month / Quarter / Year all flow off the same single source of truth.
// ─────────────────────────────────────────────────────────────────────────────

function anchorForPeriod(period, baseDate = new Date()) {
    const d = new Date(baseDate);
    if (period === 'month') return new Date(d.getFullYear(), d.getMonth(), 1);
    if (period === 'quarter') return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1);
    return new Date(d.getFullYear(), 0, 1);
}

function shiftPeriod(period, anchor, direction) {
    const d = new Date(anchor);
    const step = direction === 'prev' ? -1 : 1;
    if (period === 'month') d.setMonth(d.getMonth() + step);
    if (period === 'quarter') d.setMonth(d.getMonth() + step * 3);
    if (period === 'year') d.setFullYear(d.getFullYear() + step);
    return d;
}

function periodEnd(period, anchor) {
    const d = new Date(anchor);
    if (period === 'month') d.setMonth(d.getMonth() + 1);
    if (period === 'quarter') d.setMonth(d.getMonth() + 3);
    if (period === 'year') d.setFullYear(d.getFullYear() + 1);
    return d;
}

function labelForRange(period, anchor) {
    const a = new Date(anchor);
    if (period === 'month') {
        return a.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    if (period === 'quarter') {
        const q = Math.floor(a.getMonth() / 3) + 1;
        return `Q${q} ${a.getFullYear()}`;
    }
    return String(a.getFullYear());
}

function isCurrentPeriod(period, anchor) {
    const today = anchorForPeriod(period);
    return today.getTime() === new Date(anchor).getTime();
}

const DEFAULT_BILLS = [
    { category: 'Gas Bill', amount: '', notes: '' },
    { category: 'Electricity Bill', amount: '', notes: '' },
    { category: 'Water Bill', amount: '', notes: '' },
    { category: 'Mobile Bill', amount: '', notes: '' },
    { category: 'Internet Bill', amount: '', notes: '' },
    { category: 'Gardener', amount: '', notes: '' },
    { category: 'School', amount: '', notes: '' },
];

// ─────────────────────────────────────────────────────────────────────────────
//  Page
// ─────────────────────────────────────────────────────────────────────────────

export default function Expenses() {
    const [period, setPeriod] = useState('month');
    const [anchor, setAnchor] = useState(() => anchorForPeriod('month'));

    const anchorISO = useMemo(() => {
        const y = anchor.getFullYear();
        const m = String(anchor.getMonth() + 1).padStart(2, '0');
        const d = String(anchor.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }, [anchor]);

    const insights = useQuery({
        queryKey: ['insights', period, anchorISO],
        queryFn: () => api.get('/dashboard/insights', { params: { period, anchor: anchorISO } }).then((r) => r.data),
        staleTime: 30_000,
    });

    const spending = useQuery({
        queryKey: ['spending', period, anchorISO],
        queryFn: () => api.get('/dashboard/spending', { params: { period, anchor: anchorISO } }).then((r) => r.data),
    });

    // Filter expenses to the active period.
    const entriesInRange = spending.data?.rows || [];

    return (
        <div className="space-y-10">
            <Lens
                period={period}
                anchor={anchor}
                onChangePeriod={(p) => { setPeriod(p); setAnchor(anchorForPeriod(p)); }}
                onShift={(dir) => setAnchor((a) => shiftPeriod(period, a, dir))}
                onReset={() => setAnchor(anchorForPeriod(period))}
            />

            <Story insights={insights} period={period} />

            <Transactions
                entries={entriesInRange}
                loading={spending.isLoading}
                periodLabel={labelForRange(period, anchor)}
            />
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Lens — header with period switcher + anchor navigator + actions
// ─────────────────────────────────────────────────────────────────────────────

function Lens({ period, anchor, onChangePeriod, onShift, onReset }) {
    const [addOpen, setAddOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [batchOpen, setBatchOpen] = useState(false);

    return (
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-3">
            {/* Title block */}
            <div className="min-w-0">
                <p className="text-[11px] tracking-[0.16em] uppercase text-gray-400 dark:text-neutral-500 mb-1">Money out</p>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                    Spending
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-xl">
                    Aggregated analytics across your bank statements, wallet transactions, and manual entries — and a journal for the things you log by hand.
                </p>
            </div>

            {/* Unified toolbar: anchor · period · actions */}
            <div className="flex items-center gap-2 shrink-0 p-1 rounded-xl bg-gray-50 dark:bg-neutral-900/60 border border-gray-200 dark:border-neutral-800">
                <AnchorControl period={period} anchor={anchor} onShift={onShift} onReset={onReset} />
                <Separator />
                <PeriodSwitcher period={period} onChange={onChangePeriod} />
                <Separator />
                <button
                    onClick={() => setBatchOpen(true)}
                    className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-white dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors"
                    title="Log monthly bills in a batch"
                >
                    <Receipt className="w-4 h-4" />
                    Log bills
                </button>
                <button
                    onClick={() => { setEditing(null); setAddOpen(true); }}
                    className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add entry
                </button>
            </div>

            {addOpen && (
                <EntryFormModal
                    item={editing}
                    onClose={() => { setAddOpen(false); setEditing(null); }}
                />
            )}
            {batchOpen && (
                <BatchModal onClose={() => setBatchOpen(false)} />
            )}
        </div>
    );
}

function Separator() {
    return <span aria-hidden className="hidden sm:block w-px h-5 bg-gray-200 dark:bg-neutral-800" />;
}

function PeriodSwitcher({ period, onChange }) {
    return (
        <div className="flex gap-0.5 p-0.5 rounded-lg bg-gray-100 dark:bg-neutral-800/60">
            {['month', 'quarter', 'year'].map((p) => (
                <button
                    key={p}
                    onClick={() => onChange(p)}
                    className={`px-3 py-1 text-sm rounded-md transition-colors capitalize ${period === p
                        ? 'bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 shadow-sm font-medium'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                        }`}
                >
                    {p}
                </button>
            ))}
        </div>
    );
}

function AnchorControl({ period, anchor, onShift, onReset }) {
    const isNow = isCurrentPeriod(period, anchor);
    return (
        <div className="flex items-center gap-1">
            <div className="inline-flex items-center rounded-lg overflow-hidden">
                <button
                    onClick={() => onShift('prev')}
                    className="px-2 py-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-white dark:hover:bg-neutral-800 transition-colors rounded-md"
                    title="Previous"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="px-3 py-1 text-sm font-medium text-gray-900 dark:text-gray-100 min-w-[110px] text-center tabular-nums">
                    {labelForRange(period, anchor)}
                </div>
                <button
                    onClick={() => onShift('next')}
                    disabled={isNow}
                    className="px-2 py-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-white dark:hover:bg-neutral-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed rounded-md"
                    title="Next"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
            {!isNow && (
                <button
                    onClick={onReset}
                    className="px-2 py-1 text-[11px] text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 underline underline-offset-2 transition-colors"
                    title="Back to current period"
                >
                    today
                </button>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Story — stats + charts. Asymmetric to break the dashboard template.
// ─────────────────────────────────────────────────────────────────────────────

function Story({ insights, period }) {
    if (insights.isLoading) return <StorySkeleton />;
    if (insights.isError) {
        return (
            <div className="p-6 rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 text-sm text-rose-700 dark:text-rose-300">
                Could not load insights. Try refreshing.
            </div>
        );
    }
    if (!insights.data) return null;

    return (
        <div className="space-y-8">
            <StatsRow data={insights.data} period={period} />
            <SectionDivider label="The story" />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <DailyTrend data={insights.data.dailyTrend} className="lg:col-span-7" />
                <CategoryBreakdown data={insights.data.categoryBreakdown} className="lg:col-span-5" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <TopDestinations data={insights.data.topMerchants} className="lg:col-span-5" />
                <WeekdayRhythm data={insights.data.weekdayPattern} className="lg:col-span-7" />
            </div>
        </div>
    );
}

function StorySkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-12 gap-4">
                <div className="col-span-6 h-32 rounded-2xl bg-gray-100 dark:bg-neutral-800/60" />
                <div className="col-span-3 h-32 rounded-2xl bg-gray-100 dark:bg-neutral-800/60" />
                <div className="col-span-3 h-32 rounded-2xl bg-gray-100 dark:bg-neutral-800/60" />
            </div>
            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-7 h-72 rounded-2xl bg-gray-100 dark:bg-neutral-800/60" />
                <div className="col-span-5 h-72 rounded-2xl bg-gray-100 dark:bg-neutral-800/60" />
            </div>
        </div>
    );
}

function SectionDivider({ label }) {
    return (
        <div className="flex items-center gap-4">
            <span className="text-[10px] tracking-[0.18em] uppercase text-gray-400 dark:text-neutral-500 font-semibold">
                {label}
            </span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-neutral-800" />
        </div>
    );
}

const PERIOD_NOUN = { month: 'month', quarter: 'quarter', year: 'year' };

function StatsRow({ data, period }) {
    const { totals } = data;
    const spendDelta = totals.spendDelta;
    const incomeDelta = totals.incomeDelta;

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Hero — Spent */}
            <div className="md:col-span-6 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40 relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-rose-50 dark:bg-rose-950/30 opacity-60" />
                <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                        <p className="text-[11px] uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400 font-semibold">Spent</p>
                    </div>
                    <MaskedBalance
                        value={totals.currentSpend}
                        className="text-4xl md:text-5xl font-bold text-rose-600 dark:text-rose-400 tracking-tight tabular-nums"
                    />
                    <div className="mt-3 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-gray-500 dark:text-gray-400">
                        <span>this {PERIOD_NOUN[period]}</span>
                        <DeltaPill delta={spendDelta} inverted />
                        <span>vs last {PERIOD_NOUN[period]}</span>
                    </div>
                </div>
            </div>

            {/* Earned */}
            <SecondaryStat
                className="md:col-span-3"
                icon={TrendingUp}
                label="Earned"
                value={totals.currentIncome}
                tint="emerald"
                delta={incomeDelta}
                period={period}
            />

            {/* Net */}
            <SecondaryStat
                className="md:col-span-3"
                icon={Calendar}
                label="Net"
                value={totals.net}
                tint={totals.net >= 0 ? 'emerald' : 'rose'}
                period={period}
            />
        </div>
    );
}

function SecondaryStat({ className = '', icon: Icon, label, value, tint, delta, period }) {
    const colorMap = {
        emerald: 'text-emerald-600 dark:text-emerald-400',
        rose: 'text-rose-600 dark:text-rose-400',
    };
    return (
        <div className={`p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40 ${className}`}>
            <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${colorMap[tint]}`} />
                <p className="text-[11px] uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400 font-semibold">{label}</p>
            </div>
            <MaskedBalance value={value} className={`text-2xl font-semibold tabular-nums ${colorMap[tint]}`} />
            <div className="mt-2 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-gray-500 dark:text-gray-400">
                <span>this {PERIOD_NOUN[period]}</span>
                {delta !== null && delta !== undefined && (
                    <>
                        <DeltaPill delta={delta} inverted={false} />
                    </>
                )}
            </div>
        </div>
    );
}

function DeltaPill({ delta, inverted }) {
    if (delta === null || delta === undefined) return null;
    const positive = delta >= 0;
    const isGood = inverted ? !positive : positive;
    const sign = positive ? '+' : '';
    const tint = isGood
        ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
        : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40';
    return (
        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold tabular-nums ${tint}`}>
            {sign}{delta.toFixed(1)}%
        </span>
    );
}

// ── charts ──────────────────────────────────────────────────────────

function ChartCard({ title, subtitle, children, className = '', height = 280, action = null }) {
    return (
        <div className={`p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40 ${className}`}>
            <div className="flex items-start justify-between mb-3 gap-3">
                <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
                    {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
                </div>
                {action}
            </div>
            <div style={{ height: typeof height === 'number' ? `${height}px` : height }}>{children}</div>
        </div>
    );
}

const CATEGORY_COLORS = ['#0a5c3b', '#52A397', '#71B7AC', '#9BCDC5', '#c75a2f', '#fbbf24', '#f87171', '#a78bfa', '#34d399', '#60a5fa', '#fb7185', '#94a3b8'];

function DailyTrend({ data, className }) {
    if (!data || data.length === 0) {
        return <ChartCard title="Day by day" subtitle="No spending in this period" className={className}><Empty /></ChartCard>;
    }
    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'axis',
            backgroundColor: '#1f2937', borderColor: '#374151',
            textStyle: { color: '#f9fafb', fontSize: 12 },
            valueFormatter: (v) => fmtPKR(v),
        },
        grid: { left: '3%', right: '3%', bottom: '12%', top: '8%', containLabel: true },
        xAxis: {
            type: 'category',
            data: data.map((d) => d.day.slice(5)),
            axisLabel: { color: '#9ca3af', fontSize: 10, interval: Math.max(0, Math.floor(data.length / 8) - 1) },
            axisLine: { lineStyle: { color: '#374151' } },
        },
        yAxis: {
            type: 'value',
            axisLabel: { color: '#9ca3af', fontSize: 10, formatter: (v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v },
            splitLine: { lineStyle: { color: '#374151', type: 'dashed' } },
        },
        series: [{
            type: 'line',
            data: data.map((d) => d.total),
            smooth: true, symbol: 'circle', symbolSize: 4,
            itemStyle: { color: '#0a5c3b' },
            lineStyle: { width: 2 },
            areaStyle: {
                color: {
                    type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
                        { offset: 0, color: 'rgba(10,92,59,0.35)' },
                        { offset: 1, color: 'transparent' },
                    ]
                },
            },
        }],
    };
    return (
        <ChartCard title="Day by day" subtitle="Daily spend across the period" className={className}>
            <ReactECharts option={option} style={{ height: '100%' }} opts={{ renderer: 'canvas' }} />
        </ChartCard>
    );
}

function CategoryBreakdown({ data, className }) {
    if (!data || data.length === 0) {
        return <ChartCard title="By category" subtitle="No spending in this period" className={className}><Empty /></ChartCard>;
    }
    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'item',
            formatter: (p) => `${p.name}<br/>${fmtPKR(p.value)} (${p.percent}%)`,
            backgroundColor: '#1f2937', borderColor: '#374151',
            textStyle: { color: '#f9fafb', fontSize: 12 },
        },
        legend: { type: 'scroll', bottom: 0, textStyle: { color: '#9ca3af', fontSize: 11 }, icon: 'circle', itemWidth: 8, itemHeight: 8 },
        color: CATEGORY_COLORS,
        series: [{
            type: 'pie',
            radius: ['45%', '70%'],
            center: ['50%', '42%'],
            avoidLabelOverlap: true,
            data: data.map((d) => ({ name: d.category, value: d.total })),
            label: { show: false },
            emphasis: { label: { show: true, fontSize: 12, fontWeight: 'bold' }, itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' } },
        }],
    };
    return (
        <ChartCard title="By category" subtitle="Where most of it went" className={className}>
            <ReactECharts option={option} style={{ height: '100%' }} opts={{ renderer: 'canvas' }} />
        </ChartCard>
    );
}

function TopDestinations({ data, className }) {
    if (!data || data.length === 0) {
        return <ChartCard title="Top destinations" subtitle="No data" className={className}><Empty /></ChartCard>;
    }
    const max = data[0]?.total || 1;
    return (
        <ChartCard
            title="Top destinations"
            subtitle="Where most of your money went"
            height="auto"
            className={className}
        >
            <ul className="space-y-1.5">
                {data.map((m, i) => {
                    const pct = (m.total / max) * 100;
                    const isTop = i === 0;
                    return (
                        <li
                            key={i}
                            className="relative overflow-hidden rounded-lg group"
                            title={m.merchant}
                        >
                            {/* Tinted bar IS the visualisation — fills proportional to spend */}
                            <span
                                aria-hidden
                                className={`absolute inset-y-0 left-0 transition-[width] duration-500 ${isTop
                                    ? 'bg-emerald-100/80 dark:bg-emerald-900/40'
                                    : 'bg-emerald-50/80 dark:bg-emerald-950/30'
                                    }`}
                                style={{ width: `${Math.max(pct, 3)}%` }}
                            />
                            <div className="relative flex items-center gap-3 px-3 py-2.5">
                                <span
                                    className="text-[10px] font-mono tabular-nums text-gray-400 dark:text-neutral-500 w-5 shrink-0"
                                    aria-label={`Rank ${i + 1}`}
                                >
                                    {String(i + 1).padStart(2, '0')}
                                </span>
                                <span className="flex-1 min-w-0 text-[13px] font-medium text-gray-900 dark:text-gray-100 truncate">
                                    {m.merchant}
                                </span>
                                {m.count > 1 && (
                                    <span className="hidden sm:inline-flex text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 tabular-nums shrink-0">
                                        {m.count}×
                                    </span>
                                )}
                                <span className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 tabular-nums shrink-0">
                                    {fmtPKR(m.total)}
                                </span>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </ChartCard>
    );
}

function WeekdayRhythm({ data, className }) {
    if (!data || data.every((d) => d.total === 0)) {
        return <ChartCard title="Weekday rhythm" subtitle="No data" className={className}><Empty /></ChartCard>;
    }
    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'axis',
            backgroundColor: '#1f2937', borderColor: '#374151',
            textStyle: { color: '#f9fafb', fontSize: 12 },
            valueFormatter: (v) => fmtPKR(v),
        },
        grid: { left: '3%', right: '3%', bottom: '10%', top: '8%', containLabel: true },
        xAxis: { type: 'category', data: data.map((d) => d.day), axisLabel: { color: '#9ca3af', fontSize: 11 }, axisLine: { lineStyle: { color: '#374151' } } },
        yAxis: { type: 'value', axisLabel: { color: '#9ca3af', fontSize: 10, formatter: (v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v }, splitLine: { lineStyle: { color: '#374151', type: 'dashed' } } },
        series: [{ type: 'bar', data: data.map((d) => d.total), itemStyle: { color: '#52A397', borderRadius: [4, 4, 0, 0] } }],
    };
    return (
        <ChartCard title="Weekday rhythm" subtitle="When you spend most" className={className}>
            <ReactECharts option={option} style={{ height: '100%' }} opts={{ renderer: 'canvas' }} />
        </ChartCard>
    );
}

function Empty() {
    return (
        <div className="h-full w-full flex items-center justify-center text-xs text-gray-400 dark:text-gray-500">No data</div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Journal — manual entries for the period
// ─────────────────────────────────────────────────────────────────────────────

function Transactions({ entries, loading, periodLabel }) {
    const [editing, setEditing] = useState(null);
    const [editOpen, setEditOpen] = useState(false);
    const qc = useQueryClient();
    const confirm = useConfirm();

    const removeMutation = useMutation({
        mutationFn: (id) => api.delete(`/expenses/${String(id).replace('manual:', '')}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['expenses'] });
            qc.invalidateQueries({ queryKey: ['spending'] });
            qc.invalidateQueries({ queryKey: ['insights'] });
            toast.success('Entry deleted');
            onChanged?.();
        },
        onError: () => toast.error('Could not delete entry'),
    });

    const total = entries.reduce((s, e) => s + Number(e.amount || 0), 0);

    return (
        <div className="space-y-4">
            <SectionDivider label="All Transactions" />
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Transactions</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {loading
                            ? 'Loading…'
                            : entries.length === 0
                                ? `No entries logged for ${periodLabel}.`
                                : `${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} in ${periodLabel} — ${fmtPKR(total)} total.`}
                    </p>
                </div>

            </div>

            {loading ? (
                <div className="h-40 rounded-2xl bg-gray-100 dark:bg-neutral-800/60 animate-pulse" />
            ) : entries.length > 0 ? (
                <EntryList
                    entries={entries}
                    onEdit={(e) => { setEditing(e); setEditOpen(true); }}
                    onDelete={async (id) => {
                        const ok = await confirm({ title: 'Delete entry', description: 'Delete this entry?', confirmText: 'Delete' });
                        if (ok) removeMutation.mutate(id);
                    }}
                />
            ) : null}

            {editOpen && (
                <EntryFormModal
                    item={editing}
                    onClose={() => { setEditOpen(false); setEditing(null); }}
                />
            )}
        </div>
    );
}



function EntryList({ entries, onEdit, onDelete }) {
    return (
        <div className="rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40 shadow-sm overflow-hidden">
            <ul className="divide-y divide-gray-100 dark:divide-neutral-800">
                {entries.map((e) => (
                    <li
                        key={e.id}
                        className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-neutral-900/60 transition-colors group"
                    >
                        <div className="w-16 text-xs text-gray-400 dark:text-neutral-500 uppercase tracking-wider tabular-nums shrink-0">
                            {fmtDate(e.date).split(' ').slice(0, 2).join(' ')}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{e.category}</p>
                                <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${e.source === 'bank' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                    e.source === 'wallet' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                    }`}>
                                    {e.sourceLabel}
                                </span>
                            </div>
                            {e.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {e.description}
                                </p>
                            )}
                        </div>
                        <div className="text-right shrink-0">
                            <p className={`text-sm font-bold tabular-nums ${e.kind === 'credit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {e.kind === 'credit' ? '+' : '−'}{fmtPKR(e.amount)}
                            </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 sm:w-16 justify-end">
                            {e.source === 'manual' && (
                                <>
                                    <button
                                        onClick={() => onEdit(e)}
                                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-neutral-800 transition-colors"
                                        title="Edit"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => onDelete(e.id)}
                                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Forms — single entry + batch bills
// ─────────────────────────────────────────────────────────────────────────────

function toLocalDateStr(d = new Date()) {
    const dt = d instanceof Date ? d : new Date(d);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function paymentMethods(banks = [], wallets = []) {
    return [...banks.map((b) => b.name), ...wallets.map((w) => w.name || w.institution), 'Cash']
        .filter(Boolean)
        .filter((v, i, arr) => arr.indexOf(v) === i);
}

function EntryFormModal({ item, onClose }) {
    const isEdit = !!item;
    const qc = useQueryClient();
    const { data: banks = [] } = useBanks();
    const { data: wallets = [] } = useWallets();
    const methods = paymentMethods(banks, wallets);

    const [form, setForm] = useState({
        amount: item ? String(item.amount) : '',
        category: item?.category || '',
        expense_date: item?.date ? toLocalDateStr(new Date(item.date)) : toLocalDateStr(),
        payment_method: item?.source === 'manual' ? item?.sourceLabel : '',
        notes: item?.description || '',
    });

    const save = useMutation({
        mutationFn: (payload) => isEdit
            ? api.put(`/expenses/${String(item.id).replace('manual:', '')}`, payload)
            : api.post('/expenses', payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['expenses'] });
            qc.invalidateQueries({ queryKey: ['spending'] });
            qc.invalidateQueries({ queryKey: ['insights'] });
            toast.success(isEdit ? 'Entry updated' : 'Entry added');
            onClose();
        },
        onError: () => toast.error('Could not save entry'),
    });

    function field(k, v) { setForm((f) => ({ ...f, [k]: v })); }

    function submit(e) {
        e.preventDefault();
        save.mutate({ ...form, amount: Number(form.amount) });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <form onSubmit={submit} className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-neutral-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-800 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{isEdit ? 'Edit entry' : 'Add entry'}</h2>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="px-6 py-5 space-y-4">
                    <Field label="Category">
                        <input type="text" required value={form.category} onChange={(e) => field('category', e.target.value)} className={inputCls} placeholder="Groceries, Fuel, Coffee…" />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Amount (PKR)">
                            <input type="number" required min="0" step="0.01" value={form.amount} onChange={(e) => field('amount', e.target.value)} className={inputCls} />
                        </Field>
                        <Field label="Date">
                            <input type="date" required value={form.expense_date} onChange={(e) => field('expense_date', e.target.value)} className={inputCls} />
                        </Field>
                    </div>
                    <Field label="Paid via">
                        <select value={form.payment_method} onChange={(e) => field('payment_method', e.target.value)} className={inputCls}>
                            <option value="">Select method</option>
                            {methods.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </Field>
                    <Field label="Notes">
                        <input type="text" value={form.notes} onChange={(e) => field('notes', e.target.value)} className={inputCls} placeholder="Optional" />
                    </Field>
                </div>
                <div className="px-6 py-4 bg-gray-50 dark:bg-neutral-900/60 border-t border-gray-200 dark:border-neutral-800 flex items-center justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">Cancel</button>
                    <button type="submit" disabled={save.isPending} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 dark:disabled:bg-neutral-700 text-white text-sm font-medium transition-colors">
                        {save.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Add entry'}
                    </button>
                </div>
            </form>
        </div>
    );
}

function BatchModal({ onClose }) {
    const today = toLocalDateStr();
    const [rows, setRows] = useState(() => DEFAULT_BILLS.map((b) => ({ ...b, expense_date: today, payment_method: '' })));
    const qc = useQueryClient();
    const { data: banks = [] } = useBanks();
    const { data: wallets = [] } = useWallets();
    const methods = paymentMethods(banks, wallets);

    const save = useMutation({
        mutationFn: (validRows) => api.post('/expenses/batch', validRows),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['expenses'] });
            qc.invalidateQueries({ queryKey: ['spending'] });
            qc.invalidateQueries({ queryKey: ['insights'] });
            toast.success('Bills logged');
            onClose();
        },
        onError: () => toast.error('Could not save the batch'),
    });

    function update(i, k, v) {
        setRows((r) => r.map((row, idx) => idx === i ? { ...row, [k]: v } : row));
    }
    function addRow() { setRows((r) => [...r, { category: '', amount: '', expense_date: today, payment_method: '', notes: '' }]); }
    function removeRow(i) { setRows((r) => r.filter((_, idx) => idx !== i)); }

    const validCount = rows.filter((r) => r.amount && Number(r.amount) > 0).length;

    function submit(e) {
        e.preventDefault();
        const valid = rows.filter((r) => r.amount && Number(r.amount) > 0 && r.category).map((r) => ({ ...r, amount: Number(r.amount) }));
        if (valid.length === 0) { toast.error('Nothing to save — every row is blank.'); return; }
        save.mutate(valid);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <form onSubmit={submit} className="w-full max-w-4xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-800 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Log monthly bills</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Fill amounts for the bills you want to record — blank rows are skipped.</p>
                    </div>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4">
                    <div className="hidden md:grid md:grid-cols-12 gap-3 px-2 py-2 text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-neutral-800">
                        <div className="col-span-3">Category</div>
                        <div className="col-span-2">Amount</div>
                        <div className="col-span-2">Date</div>
                        <div className="col-span-2">Paid via</div>
                        <div className="col-span-2">Notes</div>
                        <div className="col-span-1"></div>
                    </div>

                    <ul className="divide-y divide-gray-100 dark:divide-neutral-800">
                        {rows.map((row, i) => (
                            <li key={i} className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 py-2.5 md:items-center">
                                <input type="text" required value={row.category} onChange={(e) => update(i, 'category', e.target.value)} className={`${inputCls} md:col-span-3`} placeholder="Category" />
                                <input type="number" min="0" step="0.01" value={row.amount} onChange={(e) => update(i, 'amount', e.target.value)} className={`${inputCls} md:col-span-2`} placeholder="0" />
                                <input type="date" value={row.expense_date} onChange={(e) => update(i, 'expense_date', e.target.value)} className={`${inputCls} md:col-span-2`} />
                                <select value={row.payment_method} onChange={(e) => update(i, 'payment_method', e.target.value)} className={`${inputCls} md:col-span-2`}>
                                    <option value="">—</option>
                                    {methods.map((m) => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <input type="text" value={row.notes} onChange={(e) => update(i, 'notes', e.target.value)} className={`${inputCls} md:col-span-2`} placeholder="Notes" />
                                <button type="button" onClick={() => removeRow(i)} className="md:col-span-1 justify-self-end md:justify-self-center p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30" title="Remove">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </li>
                        ))}
                    </ul>

                    <button type="button" onClick={addRow} className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors">
                        <Plus className="w-4 h-4" />
                        Add row
                    </button>
                </div>

                <div className="px-6 py-4 bg-gray-50 dark:bg-neutral-900/60 border-t border-gray-200 dark:border-neutral-800 flex items-center justify-between gap-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {validCount} valid entr{validCount === 1 ? 'y' : 'ies'} ready
                    </p>
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">Discard</button>
                        <button type="submit" disabled={save.isPending || validCount === 0} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 dark:disabled:bg-neutral-700 text-white text-sm font-medium transition-colors">
                            {save.isPending ? 'Saving…' : `Save ${validCount} ${validCount === 1 ? 'entry' : 'entries'}`}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}

// ── primitives ──────────────────────────────────────────────────────

function Field({ label, children }) {
    return (
        <label className="block">
            <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">{label}</span>
            {children}
        </label>
    );
}

const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500';
