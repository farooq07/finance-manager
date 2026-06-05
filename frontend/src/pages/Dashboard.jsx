import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactECharts from 'echarts-for-react';
import { toast } from 'sonner';
import {
    Camera, Mail, Loader2, TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight,
    Landmark, Wallet, PieChart as PieIcon, ArrowUpCircle, ArrowDownCircle, FileText, Activity,
} from 'lucide-react';
import api from '../services/api';
import { fmtPKR } from '../utils/currency';
import MaskedBalance from '../components/MaskedBalance';

const RANGES = [
    { days: 30, label: '1M' },
    { days: 90, label: '3M' },
    { days: 180, label: '6M' },
    { days: 365, label: '1Y' },
    { days: 730, label: '2Y' },
];

export default function Dashboard() {
    const [days, setDays] = useState(90);
    const qc = useQueryClient();

    const summary = useQuery({
        queryKey: ['dashboard-summary'],
        queryFn: () => api.get('/dashboard/summary').then((r) => r.data),
        staleTime: 30_000,
    });

    const history = useQuery({
        queryKey: ['networth-history', days],
        queryFn: () => api.get('/networth/history', { params: { days } }).then((r) => r.data),
        staleTime: 60_000,
    });

    const snapshot = useMutation({
        mutationFn: () => api.post('/networth/snapshot'),
        onSuccess: () => {
            toast.success('Snapshot captured');
            qc.invalidateQueries({ queryKey: ['networth-history'] });
            qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
        },
        onError: () => toast.error('Could not capture snapshot right now'),
    });

    const emailSummary = useMutation({
        mutationFn: () => api.post('/dashboard/send-summary'),
        onSuccess: () => toast.success('Summary email sent'),
        onError: () => toast.error('Could not send the summary email'),
    });

    return (
        <div className="space-y-10">
            <Header
                lastUpdated={summary.data ? new Date() : null}
                days={days}
                onChangeDays={setDays}
                onSnapshot={() => snapshot.mutate()}
                snapshotting={snapshot.isPending}
                onEmail={() => emailSummary.mutate()}
                emailing={emailSummary.isPending}
            />

            <Hero
                summary={summary.data}
                history={history.data}
                loading={summary.isLoading}
            />

            <Composition
                summary={summary.data}
                history={history.data}
                loading={summary.isLoading}
                historyLoading={history.isLoading}
                onSnapshot={() => snapshot.mutate()}
                snapshotting={snapshot.isPending}
            />

            <SectionDivider label="The numbers" />
            <Metrics summary={summary.data} loading={summary.isLoading} />

            <SectionDivider label="Spending rhythm" />
            <MonthlySpend
                data={summary.data?.charts?.monthlyExpenses}
                loading={summary.isLoading}
            />
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Header
// ─────────────────────────────────────────────────────────────────────────────

function Header({ lastUpdated, days, onChangeDays, onSnapshot, snapshotting, onEmail, emailing }) {
    return (
        <div className="space-y-3">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                    <p className="text-[11px] tracking-[0.16em] uppercase text-gray-400 dark:text-neutral-500 mb-1">Overview</p>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                        Dashboard
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-xl">
                        A snapshot of everything you own, minus what you owe — with the trend underneath.
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <RangeSwitcher days={days} onChange={onChangeDays} />
                    <button
                        onClick={onSnapshot}
                        disabled={snapshotting}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors disabled:opacity-60"
                        title="Capture an instant net-worth snapshot"
                    >
                        {snapshotting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                        Capture
                    </button>
                    <button
                        onClick={onEmail}
                        disabled={emailing}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors disabled:opacity-60"
                        title="Send the weekly summary email now"
                    >
                        {emailing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                        Email
                    </button>
                </div>
            </div>
            {lastUpdated && (
                <p className="text-[11px] text-gray-400 dark:text-neutral-500 tracking-wide">
                    Last refreshed {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
            )}
        </div>
    );
}

function RangeSwitcher({ days, onChange }) {
    return (
        <div className="flex gap-1 bg-gray-100 dark:bg-neutral-800/60 p-1 rounded-xl">
            {RANGES.map((r) => (
                <button
                    key={r.days}
                    onClick={() => onChange(r.days)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${days === r.days
                            ? 'bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 shadow-sm font-medium'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                        }`}
                >
                    {r.label}
                </button>
            ))}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Hero — current net worth + range delta + composition strip
// ─────────────────────────────────────────────────────────────────────────────

function Hero({ summary, history, loading }) {
    if (loading || !summary) {
        return <div className="h-44 rounded-2xl bg-gray-200 dark:bg-neutral-800/60 animate-pulse" />;
    }

    const m = summary.metrics;
    const delta = Number(history?.summary?.delta || 0);
    const deltaPct = history?.summary?.deltaPct;
    const positive = delta >= 0;
    const Trend = delta === 0 ? Minus : positive ? ArrowUpRight : ArrowDownRight;

    return (
        <div
            className="relative p-7 rounded-2xl overflow-hidden text-emerald-50 shadow-lg"
            style={{
                background: 'linear-gradient(135deg, #0a5c3b 0%, #064c30 60%, #03291a 100%)',
            }}
        >
            <div className="absolute -right-16 -top-16 w-60 h-60 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />
            <div className="absolute -left-8 -bottom-16 w-40 h-40 rounded-full bg-emerald-300/5 blur-3xl pointer-events-none" />

            <div className="relative">
                <div className="flex items-start justify-between gap-6 flex-wrap">
                    <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-200/70 mb-2">Total Net Worth</p>
                        <MaskedBalance
                            value={m.netWorth}
                            className="text-4xl md:text-5xl font-bold tracking-tight inline-block tabular-nums"
                            iconClassName="text-emerald-100/70 hover:text-emerald-50 hover:bg-white/10 ml-2"
                        />
                    </div>
                    {(delta !== 0 || deltaPct !== null) && (
                        <div className="text-right">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-200/70 mb-1">Change in {history?.days ?? '90'}d</p>
                            <div className={`inline-flex items-center gap-1.5 text-xl font-semibold tabular-nums ${positive ? 'text-emerald-50' : 'text-rose-200'}`}>
                                <Trend className="w-5 h-5" />
                                {positive && delta !== 0 ? '+' : ''}{fmtPKR(delta)}
                            </div>
                            {deltaPct !== null && deltaPct !== undefined && (
                                <p className="text-xs text-emerald-200/70 mt-0.5">
                                    {positive ? '+' : ''}{Number(deltaPct).toFixed(2)}%
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Composition strip — the four pieces that actually make up Net Worth */}
                <div className="mt-7 pt-5 border-t border-emerald-300/15 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
                    <CompositionPiece label="Bank" value={m.totalBankBalance} />
                    <CompositionPiece label="Wallet" value={m.totalWalletBalance} />
                    <CompositionPiece label="Invested" value={m.totalInvestments} />
                    <CompositionPiece label="Rent" value={m.totalRentBalance} />
                </div>

                {/* Dues row — surfaced separately because they're conditional cash flows,
                    not realised wealth (so they don't move the headline net-worth figure). */}
                {(Number(m.totalReceivable) > 0 || Number(m.totalPayable) > 0) && (
                    <div className="mt-4 pt-4 border-t border-emerald-300/10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                        {Number(m.totalReceivable) > 0 && (
                            <div className="flex items-center gap-1.5">
                                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-300/80" />
                                <span className="uppercase tracking-[0.14em] text-emerald-200/60">To receive</span>
                                <MaskedBalance
                                    value={m.totalReceivable}
                                    className="font-semibold tabular-nums text-emerald-50 inline-block"
                                    iconClassName="text-emerald-100/40 hover:text-emerald-50 ml-1"
                                />
                            </div>
                        )}
                        {Number(m.totalPayable) > 0 && (
                            <div className="flex items-center gap-1.5">
                                <ArrowDownRight className="w-3.5 h-3.5 text-rose-300/80" />
                                <span className="uppercase tracking-[0.14em] text-emerald-200/60">To pay</span>
                                <MaskedBalance
                                    value={m.totalPayable}
                                    className="font-semibold tabular-nums text-rose-200 inline-block"
                                    iconClassName="text-emerald-100/40 hover:text-emerald-50 ml-1"
                                />
                            </div>
                        )}
                        {Number(m.totalDebt) > 0 && (
                            <div className="flex items-center gap-1.5">
                                <ArrowDownRight className="w-3.5 h-3.5 text-rose-300/80" />
                                <span className="uppercase tracking-[0.14em] text-emerald-200/60">Debt</span>
                                <MaskedBalance
                                    value={m.totalDebt}
                                    className="font-semibold tabular-nums text-rose-200 inline-block"
                                    iconClassName="text-emerald-100/40 hover:text-emerald-50 ml-1"
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function CompositionPiece({ label, value }) {
    return (
        <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-emerald-200/60 mb-0.5">{label}</p>
            <MaskedBalance
                value={value}
                className="text-base font-semibold tabular-nums inline-block"
                iconClassName="text-emerald-100/50 hover:text-emerald-50 ml-1"
            />
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Composition — history chart + asset allocation donut (7/5 asymmetric)
// ─────────────────────────────────────────────────────────────────────────────

function Composition({ summary, history, loading, historyLoading, onSnapshot, snapshotting }) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <HistoryChart
                className="lg:col-span-7"
                history={history}
                loading={historyLoading}
                onSnapshot={onSnapshot}
                snapshotting={snapshotting}
            />
            <AllocationDonut
                className="lg:col-span-5"
                data={summary?.charts?.assetAllocation}
                loading={loading}
            />
        </div>
    );
}

function ChartCard({ title, subtitle, children, className = '', height = 280, action = null }) {
    return (
        <div className={`p-5 rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40 ${className}`}>
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

function HistoryChart({ history, loading, className, onSnapshot, snapshotting }) {
    if (loading) {
        return <div className={`h-72 rounded-2xl bg-gray-100 dark:bg-neutral-800/60 animate-pulse ${className}`} />;
    }

    const snapshots = history?.snapshots || [];

    if (snapshots.length === 0) {
        return (
            <ChartCard title="Net worth over time" subtitle="No snapshots yet" className={className} height={280}>
                <div className="h-full flex flex-col items-center justify-center text-center">
                    <Camera className="w-7 h-7 text-gray-400 dark:text-neutral-500" />
                    <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 max-w-xs">
                        Snapshots are captured automatically every night at 23:55 PKT. Capture one now to seed your first data point.
                    </p>
                    <button
                        onClick={onSnapshot}
                        disabled={snapshotting}
                        className="mt-4 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors disabled:opacity-60"
                    >
                        {snapshotting ? 'Capturing…' : 'Capture first snapshot'}
                    </button>
                </div>
            </ChartCard>
        );
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
        xAxis: {
            type: 'category',
            data: snapshots.map((s) => new Date(s.captured_at).toISOString().slice(5, 10)),
            axisLabel: { color: '#9ca3af', fontSize: 10, interval: Math.max(0, Math.floor(snapshots.length / 8) - 1) },
            axisLine: { lineStyle: { color: '#374151' } },
        },
        yAxis: {
            type: 'value', scale: true,
            axisLabel: {
                color: '#9ca3af', fontSize: 10,
                formatter: (v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v,
            },
            splitLine: { lineStyle: { color: '#374151', type: 'dashed' } },
        },
        series: [{
            type: 'line',
            data: snapshots.map((s) => Number(s.net_worth)),
            smooth: true, symbol: 'circle', symbolSize: 4,
            itemStyle: { color: '#0a5c3b' },
            lineStyle: { width: 2.5 },
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
        <ChartCard
            title="Net worth over time"
            subtitle={`${snapshots.length} snapshot${snapshots.length === 1 ? '' : 's'} in this range`}
            className={className}
            height={280}
        >
            <ReactECharts option={option} style={{ height: '100%' }} opts={{ renderer: 'canvas' }} />
        </ChartCard>
    );
}

const ALLOCATION_COLORS = ['#0a5c3b', '#52A397', '#71B7AC', '#c75a2f', '#fbbf24', '#a78bfa', '#60a5fa'];

function AllocationDonut({ data, loading, className }) {
    if (loading) {
        return <div className={`h-72 rounded-2xl bg-gray-100 dark:bg-neutral-800/60 animate-pulse ${className}`} />;
    }
    if (!data || data.length === 0) {
        return (
            <ChartCard title="Asset allocation" subtitle="No assets yet" className={className} height={280}>
                <div className="h-full flex items-center justify-center text-xs text-gray-400 dark:text-neutral-500">No data</div>
            </ChartCard>
        );
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
        color: ALLOCATION_COLORS,
        series: [{
            type: 'pie',
            radius: ['45%', '70%'],
            center: ['50%', '42%'],
            avoidLabelOverlap: true,
            data: data.map((d) => ({ name: d.name, value: d.value })),
            label: { show: false },
            emphasis: { label: { show: true, fontSize: 12, fontWeight: 'bold' }, itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' } },
        }],
    };

    return (
        <ChartCard title="Asset allocation" subtitle="Where your wealth sits today" className={className} height={280}>
            <ReactECharts option={option} style={{ height: '100%' }} opts={{ renderer: 'canvas' }} />
        </ChartCard>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Metrics — eight editorial cards
// ─────────────────────────────────────────────────────────────────────────────

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

function Metrics({ summary, loading }) {
    if (loading || !summary) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="h-24 rounded-2xl bg-gray-100 dark:bg-neutral-800/60 animate-pulse" />
                ))}
            </div>
        );
    }
    const m = summary.metrics;
    const pl = (value, cost) => cost > 0 ? ((Number(value) - Number(cost)) / Number(cost)) * 100 : null;

    const cards = [
        { label: 'Bank', value: m.totalBankBalance, icon: Landmark, tint: 'emerald' },
        { label: 'Wallet', value: m.totalWalletBalance, icon: Wallet, tint: 'teal' },
        { label: 'PSX', value: m.stockValue, icon: TrendingUp, tint: 'emerald', pl: pl(m.stockValue, m.stockCost) },
        { label: 'Mutual Funds', value: m.mutualFundValue, icon: PieIcon, tint: 'teal', pl: pl(m.mutualFundValue, m.mutualFundCost) },
        { label: 'Owed to you', value: m.totalReceivable, icon: ArrowUpCircle, tint: 'emerald' },
        { label: 'You owe', value: m.totalPayable, icon: ArrowDownCircle, tint: 'rose' },
        { label: 'Spent this month', value: m.currentMonthExpenses, icon: FileText, tint: 'amber' },
        { label: 'Total expenses', value: m.totalExpenses, icon: Activity, tint: 'amber' },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {cards.map((c) => <MetricCard key={c.label} {...c} />)}
        </div>
    );
}

const TINT_CLASSES = {
    emerald: { icon: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
    teal: { icon: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-950/30' },
    rose: { icon: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/30' },
    amber: { icon: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30' },
};

function MetricCard({ label, value, icon: Icon, tint, pl }) {
    const t = TINT_CLASSES[tint] || TINT_CLASSES.emerald;
    return (
        <div className="p-4 rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40 transition-colors hover:border-gray-300 dark:hover:border-neutral-700">
            <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400 font-semibold">{label}</p>
                <div className={`w-7 h-7 rounded-lg ${t.bg} flex items-center justify-center`}>
                    <Icon className={`w-3.5 h-3.5 ${t.icon}`} />
                </div>
            </div>
            <div className="flex items-baseline gap-2 flex-wrap">
                <MaskedBalance
                    value={value}
                    className="text-lg font-semibold text-gray-900 dark:text-gray-100 tabular-nums inline-block"
                    iconClassName="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                />
                {pl !== null && pl !== undefined && (
                    <span className={`text-[11px] font-semibold tabular-nums ${pl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {pl >= 0 ? '+' : ''}{pl.toFixed(2)}%
                    </span>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MonthlySpend — full-width bar chart for current-year expenses
// ─────────────────────────────────────────────────────────────────────────────

function MonthlySpend({ data, loading }) {
    if (loading || !data) {
        return <div className="h-64 rounded-2xl bg-gray-100 dark:bg-neutral-800/60 animate-pulse" />;
    }

    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'axis', axisPointer: { type: 'shadow' },
            backgroundColor: '#1f2937', borderColor: '#374151',
            textStyle: { color: '#f9fafb', fontSize: 12 },
            valueFormatter: (v) => fmtPKR(v),
        },
        grid: { left: '3%', right: '3%', bottom: '8%', top: '8%', containLabel: true },
        xAxis: {
            type: 'category',
            data: data.map((d) => d.month),
            axisTick: { alignWithLabel: true },
            axisLabel: { color: '#9ca3af', fontSize: 11 },
            axisLine: { lineStyle: { color: '#374151' } },
        },
        yAxis: {
            type: 'value',
            axisLine: { show: false },
            axisLabel: { color: '#9ca3af', fontSize: 10, formatter: (v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v },
            splitLine: { lineStyle: { color: '#374151', type: 'dashed' } },
        },
        series: [{
            name: 'Expenses',
            type: 'bar',
            barWidth: '50%',
            data: data.map((d) => d.amount),
            itemStyle: { color: '#52A397', borderRadius: [4, 4, 0, 0] },
        }],
    };

    const total = data.reduce((s, d) => s + Number(d.amount || 0), 0);

    return (
        <ChartCard
            title="Monthly expenses · current year"
            subtitle={total > 0 ? `${fmtPKR(total)} spent year-to-date` : 'No expenses logged this year yet'}
            height={260}
        >
            <ReactECharts option={option} style={{ height: '100%' }} opts={{ renderer: 'canvas' }} />
        </ChartCard>
    );
}
