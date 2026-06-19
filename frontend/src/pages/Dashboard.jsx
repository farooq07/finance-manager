import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import { toast } from 'sonner';
import {
    Camera, Mail, Loader2, TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight,
    Landmark, Wallet, PieChart as PieIcon, ArrowUpCircle, ArrowDownCircle, FileText, Activity,
    Scale, RefreshCw, CheckCircle2, AlertTriangle, Receipt, Users, FileBarChart, ChevronRight,
} from 'lucide-react';
import api from '../services/api';
import { fmtPKR } from '../utils/currency';
import { fmtDate } from '../utils/dates';
import MaskedBalance from '../components/MaskedBalance';

const RANGES = [
    { days: 30, label: '1M', phrase: 'past month' },
    { days: 90, label: '3M', phrase: 'past 3 months' },
    { days: 180, label: '6M', phrase: 'past 6 months' },
    { days: 365, label: '1Y', phrase: 'past year' },
    { days: 730, label: '2Y', phrase: 'past 2 years' },
];

const STALE_DAYS = 7; // an imported source older than this is flagged in the trust strip

export default function Dashboard() {
    const [days, setDays] = useState(90);
    const qc = useQueryClient();
    const navigate = useNavigate();

    const summary = useQuery({
        queryKey: ['dashboard-summary'],
        queryFn: () => api.get('/dashboard/summary').then((r) => r.data),
        staleTime: 30_000,
    });

    // Pull up to double the selected window so the recent half is the chart and the
    // earlier half powers a genuine prior-period comparison (capped at the API's 730d).
    const span = Math.min(days * 2, 730);
    const history = useQuery({
        queryKey: ['networth-history', span],
        queryFn: () => api.get('/networth/history', { params: { days: span } }).then((r) => r.data),
        staleTime: 60_000,
    });

    const trend = useMemo(() => computeTrend(history.data?.snapshots, days), [history.data, days]);
    const range = RANGES.find((r) => r.days === days) || RANGES[1];

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
        <div className="space-y-6">
            <Header
                days={days}
                onChangeDays={setDays}
                onSnapshot={() => snapshot.mutate()}
                snapshotting={snapshot.isPending}
                onEmail={() => emailSummary.mutate()}
                emailing={emailSummary.isPending}
            />

            <OverviewStrip
                summary={summary.data}
                trend={trend}
                phrase={range.phrase}
                loading={summary.isLoading}
            />

            <TrustStrip
                summary={summary.data}
                lastSnapshotAt={trend?.lastCapturedAt}
                isError={summary.isError}
                isFetching={summary.isFetching}
                onRefresh={() => summary.refetch()}
            />

            <QuickActions
                onNavigate={navigate}
                onSnapshot={() => snapshot.mutate()}
                snapshotting={snapshot.isPending}
            />

            <Composition
                summary={summary.data}
                trend={trend}
                range={range}
                loading={summary.isLoading}
                historyLoading={history.isLoading}
                onSnapshot={() => snapshot.mutate()}
                snapshotting={snapshot.isPending}
            />

            <SectionDivider label="The numbers" />
            <Metrics summary={summary.data} loading={summary.isLoading} />

            <SectionDivider label="Spending rhythm" />
            <Spending summary={summary.data} loading={summary.isLoading} />
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Trend maths — split the fetched window into current / prior halves
// ─────────────────────────────────────────────────────────────────────────────

function computeTrend(snapshots, days) {
    if (!snapshots || snapshots.length === 0) return null;

    const nw = (s) => Number(s.net_worth);
    const sorted = [...snapshots].sort((a, b) => new Date(a.captured_at) - new Date(b.captured_at));
    const cutoff = Date.now() - days * 86_400_000;

    const recent = sorted.filter((s) => new Date(s.captured_at).getTime() >= cutoff);
    const prior = sorted.filter((s) => new Date(s.captured_at).getTime() < cutoff);
    const chartSnaps = recent.length ? recent : sorted;

    const cFirst = chartSnaps[0];
    const cLast = chartSnaps[chartSnaps.length - 1];
    // Use the last prior value as the baseline so the change is continuous across the boundary.
    const baseline = prior.length ? prior[prior.length - 1] : cFirst;
    const currentDelta = nw(cLast) - nw(baseline);
    const currentPct = nw(baseline) !== 0 ? (currentDelta / Math.abs(nw(baseline))) * 100 : null;

    let priorTrend = null;
    if (prior.length >= 2) {
        const pFirst = prior[0];
        const pLast = prior[prior.length - 1];
        const pd = nw(pLast) - nw(pFirst);
        priorTrend = { delta: pd, pct: nw(pFirst) !== 0 ? (pd / Math.abs(nw(pFirst))) * 100 : null };
    }

    // Largest single move between consecutive snapshots — the "major jump / drop".
    let biggestRise = null;
    let biggestDrop = null;
    for (let i = 1; i < chartSnaps.length; i++) {
        const d = nw(chartSnaps[i]) - nw(chartSnaps[i - 1]);
        if (d > 0 && (!biggestRise || d > biggestRise.delta)) biggestRise = { delta: d, at: chartSnaps[i].captured_at };
        if (d < 0 && (!biggestDrop || d < biggestDrop.delta)) biggestDrop = { delta: d, at: chartSnaps[i].captured_at };
    }

    const avg = chartSnaps.reduce((s, x) => s + nw(x), 0) / chartSnaps.length;

    return {
        chartSnaps,
        current: { first: cFirst, last: cLast, delta: currentDelta, pct: currentPct },
        prior: priorTrend,
        biggestRise,
        biggestDrop,
        avg,
        lastCapturedAt: cLast?.captured_at,
    };
}

function relativeFromNow(d) {
    if (!d) return null;
    const diff = Date.now() - new Date(d).getTime();
    if (diff < 0) return 'just now';
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const dys = Math.floor(hrs / 24);
    if (dys === 1) return 'yesterday';
    if (dys < 30) return `${dys}d ago`;
    const mos = Math.floor(dys / 30);
    return `${mos}mo ago`;
}

const kFmt = (v) => {
    const n = Number(v);
    if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(0)}k`;
    return `${Math.round(n)}`;
};

// ─────────────────────────────────────────────────────────────────────────────
//  Header
// ─────────────────────────────────────────────────────────────────────────────

function Header({ days, onChangeDays, onSnapshot, snapshotting, onEmail, emailing }) {
    return (
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
                <p className="text-[11px] tracking-[0.16em] uppercase text-gray-400 dark:text-neutral-500 mb-1">Overview</p>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                    Dashboard
                </h1>
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
//  Overview strip — compact, neutral, decision-ordered headline numbers
//  Answers: "How much do I have, where is it, and what changed?"
// ─────────────────────────────────────────────────────────────────────────────

function OverviewStrip({ summary, trend, phrase, loading }) {
    if (loading || !summary) {
        return <div className="h-32 rounded-2xl bg-gray-100 dark:bg-neutral-800/60 animate-pulse" />;
    }

    const m = summary.metrics;
    const cash = Number(m.totalBankBalance) + Number(m.totalWalletBalance);
    const liabilities = Number(m.totalDebt) + Number(m.totalPayable);
    const delta = trend?.current?.delta ?? null;
    const pct = trend?.current?.pct ?? null;

    return (
        <div className="rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-850 overflow-hidden">
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-y divide-x divide-gray-100 dark:divide-neutral-800/80">
                {/* Primary — net worth + change */}
                <div className="col-span-2 lg:col-span-1 p-5 relative">
                    <span className="absolute left-0 top-5 bottom-5 w-1 rounded-full bg-emerald-500/80" />
                    <p className="text-[10px] uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400 font-semibold mb-1.5">
                        Total net worth
                    </p>
                    <MaskedBalance
                        value={m.netWorth}
                        className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50 tabular-nums inline-block"
                        iconClassName="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-1"
                    />
                    <div className="mt-2">
                        <DeltaPill delta={delta} pct={pct} />
                        <p className="text-[11px] text-gray-400 dark:text-neutral-500 mt-1">
                            {delta == null ? 'No trend data yet' : `vs ${phrase}`}
                        </p>
                    </div>
                </div>

                <StripCell
                    label="Cash"
                    sub="Bank + wallet"
                    value={cash}
                    icon={Wallet}
                    tint="teal"
                />
                <StripCell
                    label="Invested"
                    sub="Stocks + funds"
                    value={m.totalInvestments}
                    icon={TrendingUp}
                    tint="emerald"
                />
                <StripCell
                    label="Liabilities"
                    sub="Debt + payables"
                    value={liabilities}
                    icon={Scale}
                    tint="rose"
                    muted={liabilities === 0}
                />
            </div>
        </div>
    );
}

const STRIP_TINT = {
    teal: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30',
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30',
    rose: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30',
};

function StripCell({ label, sub, value, icon: Icon, tint, muted }) {
    return (
        <div className="p-5">
            <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400 font-semibold">{label}</p>
                <span className={`w-6 h-6 rounded-lg flex items-center justify-center ${muted ? 'text-gray-400 bg-gray-100 dark:bg-neutral-800 dark:text-neutral-500' : STRIP_TINT[tint]}`}>
                    <Icon className="w-3.5 h-3.5" />
                </span>
            </div>
            <MaskedBalance
                value={value}
                className="text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100 tabular-nums inline-block"
                iconClassName="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-1"
            />
            <p className="text-[11px] text-gray-400 dark:text-neutral-500 mt-1">{sub}</p>
        </div>
    );
}

function DeltaPill({ delta, pct }) {
    if (delta == null) return <span className="text-sm text-gray-400 dark:text-neutral-500">—</span>;
    const pos = delta >= 0;
    const zero = delta === 0;
    const Icon = zero ? Minus : pos ? ArrowUpRight : ArrowDownRight;
    const cls = zero
        ? 'text-gray-500 bg-gray-100 dark:bg-neutral-800 dark:text-gray-400'
        : pos
            ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/40'
            : 'text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-950/40';
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-semibold tabular-nums ${cls}`}>
            <Icon className="w-3.5 h-3.5" />
            {pos && !zero ? '+' : ''}{fmtPKR(delta)}
            {pct != null && <span className="font-medium opacity-80">({pos ? '+' : ''}{pct.toFixed(1)}%)</span>}
        </span>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Trust strip — freshness, source status, stale / error signals
// ─────────────────────────────────────────────────────────────────────────────

function TrustStrip({ summary, lastSnapshotAt, isError, isFetching, onRefresh }) {
    if (isError) {
        return (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 px-4 py-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span className="text-sm text-rose-700 dark:text-rose-300 font-medium">
                    Couldn’t load your latest figures — they may be out of date.
                </span>
                <button
                    onClick={onRefresh}
                    className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-rose-700 dark:text-rose-300 hover:underline"
                >
                    <RefreshCw className="w-3.5 h-3.5" /> Retry
                </button>
            </div>
        );
    }

    const sources = summary?.sources || {};
    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50/60 dark:bg-neutral-900/40 px-4 py-2.5 text-xs">
            <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Live balances refreshed{' '}
                <span className="font-medium text-gray-900 dark:text-gray-100">
                    {relativeFromNow(summary?.generatedAt) || 'now'}
                </span>
            </span>
            <span className="hidden sm:inline text-gray-300 dark:text-neutral-700">·</span>
            <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                <Camera className="w-3.5 h-3.5 text-gray-400" />
                Net-worth snapshot{' '}
                <span className="font-medium text-gray-900 dark:text-gray-100">
                    {lastSnapshotAt ? fmtDate(lastSnapshotAt) : 'none yet'}
                </span>
            </span>
            <span className="hidden sm:inline text-gray-300 dark:text-neutral-700">·</span>
            <SourceChip label="PSX" syncedAt={sources.psxSyncedAt} />
            <SourceChip label="Mutual funds" syncedAt={sources.mutualFundsSyncedAt} />

            <button
                onClick={onRefresh}
                disabled={isFetching}
                className="ml-auto inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors disabled:opacity-60"
                title="Refresh figures"
            >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                {isFetching ? 'Refreshing' : 'Refresh'}
            </button>
        </div>
    );
}

function SourceChip({ label, syncedAt }) {
    if (!syncedAt) {
        return (
            <span className="inline-flex items-center gap-1.5 text-gray-400 dark:text-neutral-500">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-neutral-600" />
                {label} · not connected
            </span>
        );
    }
    const ageDays = (Date.now() - new Date(syncedAt).getTime()) / 86_400_000;
    const stale = ageDays > STALE_DAYS;
    return (
        <span className={`inline-flex items-center gap-1.5 ${stale ? 'text-amber-600 dark:text-amber-400' : 'text-gray-600 dark:text-gray-300'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${stale ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            {label} · {stale ? 'stale, ' : ''}synced {relativeFromNow(syncedAt)}
        </span>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Quick actions — fast paths to common money tasks
// ─────────────────────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
    { label: 'Add expense', icon: Receipt, to: '/expenses' },
    { label: 'Record a due', icon: Users, to: '/ledger?tab=people' },
    { label: 'Update balances', icon: Wallet, to: '/accounts' },
    { label: 'Import PSX', icon: TrendingUp, to: '/stocks' },
    { label: 'Full report', icon: FileBarChart, to: '/reports' },
];

function QuickActions({ onNavigate, onSnapshot, snapshotting }) {
    return (
        <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((a) => (
                <button
                    key={a.label}
                    onClick={() => onNavigate(a.to)}
                    className="group inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-emerald-300 dark:hover:border-emerald-800 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
                >
                    <a.icon className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
                    {a.label}
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-neutral-600 group-hover:text-emerald-500 transition-colors" />
                </button>
            ))}
            <button
                onClick={onSnapshot}
                disabled={snapshotting}
                className="group inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-emerald-300 dark:hover:border-emerald-800 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-60"
            >
                {snapshotting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />}
                Capture snapshot
            </button>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Composition — annotated history chart + asset allocation donut (7/5)
// ─────────────────────────────────────────────────────────────────────────────

function Composition({ summary, trend, range, loading, historyLoading, onSnapshot, snapshotting }) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <HistoryChart
                className="lg:col-span-7"
                trend={trend}
                range={range}
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

function ChartCard({ title, subtitle, children, className = '', height = 280, action = null, footer = null }) {
    return (
        <div className={`p-5 rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-850 ${className}`}>
            <div className="flex items-start justify-between mb-3 gap-3">
                <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
                    {subtitle && <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</div>}
                </div>
                {action}
            </div>
            <div style={{ height: typeof height === 'number' ? `${height}px` : height }}>{children}</div>
            {footer}
        </div>
    );
}

function HistoryChart({ trend, range, loading, className, onSnapshot, snapshotting }) {
    if (loading) {
        return (
            <ChartCard title="Net worth over time" className={className} height={300}>
                <div className="h-full rounded-xl bg-gray-100 dark:bg-neutral-800/60 animate-pulse" />
            </ChartCard>
        );
    }

    const snapshots = trend?.chartSnaps || [];

    if (snapshots.length === 0) {
        return (
            <ChartCard title="Net worth over time" subtitle="No snapshots yet" className={className} height={300}>
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
        grid: { left: '3%', right: '4%', bottom: '10%', top: '14%', containLabel: true },
        xAxis: {
            type: 'category',
            data: snapshots.map((s) => new Date(s.captured_at).toISOString().slice(5, 10)),
            axisLabel: { color: '#9ca3af', fontSize: 10, interval: Math.max(0, Math.floor(snapshots.length / 8) - 1) },
            axisLine: { lineStyle: { color: '#374151' } },
        },
        yAxis: {
            type: 'value', scale: true,
            axisLabel: { color: '#9ca3af', fontSize: 10, formatter: kFmt },
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
                        { offset: 0, color: 'rgba(10,92,59,0.28)' },
                        { offset: 1, color: 'transparent' },
                    ],
                },
            },
            // Average line + peak / low annotations so jumps and drops are obvious.
            markLine: {
                silent: true, symbol: 'none',
                lineStyle: { color: '#9ca3af', type: 'dashed', width: 1, opacity: 0.7 },
                label: { formatter: `avg ${kFmt(trend.avg)}`, position: 'insideEndTop', color: '#9ca3af', fontSize: 10 },
                data: [{ yAxis: trend.avg }],
            },
            markPoint: {
                symbol: 'pin', symbolSize: 42,
                label: { color: '#fff', fontSize: 9, fontWeight: 'bold', formatter: (p) => kFmt(p.value) },
                data: [
                    { type: 'max', name: 'Peak', itemStyle: { color: '#0a5c3b' } },
                    { type: 'min', name: 'Low', itemStyle: { color: '#c75a2f' } },
                ],
            },
        }],
    };

    const cur = trend.current;
    const prior = trend.prior;
    const subtitle = (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>
                {fmtPKR(cur.first?.net_worth)} → {fmtPKR(cur.last?.net_worth)} over the {range.phrase}
            </span>
            {prior && (
                <span className="inline-flex items-center gap-1 text-gray-400 dark:text-neutral-500">
                    · prior period{' '}
                    <span className={prior.delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                        {prior.delta >= 0 ? '+' : ''}{fmtPKR(prior.delta)}
                    </span>
                </span>
            )}
        </div>
    );

    return (
        <ChartCard
            title="Net worth over time"
            subtitle={subtitle}
            className={className}
            height={300}
            footer={<ChartAnnotations trend={trend} />}
        >
            <ReactECharts option={option} style={{ height: '100%' }} opts={{ renderer: 'canvas' }} notMerge />
        </ChartCard>
    );
}

function ChartAnnotations({ trend }) {
    const { biggestRise, biggestDrop } = trend;
    if (!biggestRise && !biggestDrop) return null;
    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-gray-500 dark:text-neutral-400">
            {biggestRise && (
                <span className="inline-flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                    Biggest rise <span className="font-medium text-emerald-600 dark:text-emerald-400">+{fmtPKR(biggestRise.delta)}</span> on {fmtDate(biggestRise.at)}
                </span>
            )}
            {biggestDrop && (
                <span className="inline-flex items-center gap-1">
                    <TrendingDown className="w-3 h-3 text-rose-500" />
                    Biggest drop <span className="font-medium text-rose-600 dark:text-rose-400">{fmtPKR(biggestDrop.delta)}</span> on {fmtDate(biggestDrop.at)}
                </span>
            )}
        </div>
    );
}

const ALLOCATION_COLORS = ['#0a5c3b', '#52A397', '#71B7AC', '#c75a2f', '#fbbf24', '#a78bfa', '#60a5fa'];

function AllocationDonut({ data, loading, className }) {
    if (loading) {
        return (
            <ChartCard title="Asset allocation" className={className} height={300}>
                <div className="h-full rounded-xl bg-gray-100 dark:bg-neutral-800/60 animate-pulse" />
            </ChartCard>
        );
    }
    if (!data || data.length === 0) {
        return (
            <ChartCard title="Asset allocation" subtitle="No assets yet" className={className} height={300}>
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
        <ChartCard title="Asset allocation" subtitle="Where your wealth sits today" className={className} height={300}>
            <ReactECharts option={option} style={{ height: '100%' }} opts={{ renderer: 'canvas' }} />
        </ChartCard>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Metrics — eight editorial cards
// ─────────────────────────────────────────────────────────────────────────────

function SectionDivider({ label }) {
    return (
        <div className="flex items-center gap-4 pt-2">
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
        <div className="p-4 rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-850 transition-colors hover:border-gray-300 dark:hover:border-neutral-700">
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
//  Spending — pace insight + monthly bars + category breakdown
// ─────────────────────────────────────────────────────────────────────────────

function Spending({ summary, loading }) {
    if (loading || !summary) {
        return (
            <div className="space-y-6">
                <div className="h-16 rounded-2xl bg-gray-100 dark:bg-neutral-800/60 animate-pulse" />
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-7 h-64 rounded-2xl bg-gray-100 dark:bg-neutral-800/60 animate-pulse" />
                    <div className="lg:col-span-5 h-64 rounded-2xl bg-gray-100 dark:bg-neutral-800/60 animate-pulse" />
                </div>
            </div>
        );
    }

    const m = summary.metrics;
    return (
        <div className="space-y-6">
            <PaceInsight
                current={Number(m.currentMonthExpenses)}
                last={Number(m.lastMonthExpenses)}
                avg={Number(m.avgMonthlyExpenses)}
            />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <MonthlySpend className="lg:col-span-7" data={summary.charts?.monthlyExpenses} />
                <CategoryBreakdown className="lg:col-span-5" data={summary.charts?.currentMonthCategories} />
            </div>
        </div>
    );
}

function PaceInsight({ current, last, avg }) {
    // Lightweight "are you on track?" signal — compares this month's spend to the
    // average of completed months (the baseline) and to last month.
    const hasBaseline = avg > 0;
    const pct = hasBaseline ? ((current - avg) / avg) * 100 : null;
    const over = pct != null && pct > 5;
    const under = pct != null && pct < -5;

    const tone = over
        ? 'border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20'
        : under
            ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/20'
            : 'border-gray-200 dark:border-neutral-800 bg-gray-50/60 dark:bg-neutral-900/40';
    const Icon = over ? TrendingUp : under ? TrendingDown : Activity;
    const iconCls = over ? 'text-amber-600 dark:text-amber-400' : under ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400';

    let message;
    if (!hasBaseline) {
        message = 'Not enough history yet to judge your spending pace — keep logging expenses.';
    } else if (over) {
        message = `You're spending ${Math.abs(pct).toFixed(0)}% faster than your monthly average.`;
    } else if (under) {
        message = `You're spending ${Math.abs(pct).toFixed(0)}% below your monthly average — nicely paced.`;
    } else {
        message = 'Your spending is right around your monthly average.';
    }

    return (
        <div className={`rounded-2xl border ${tone} px-5 py-4`}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className={`w-9 h-9 rounded-xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 flex items-center justify-center shrink-0 ${iconCls}`}>
                        <Icon className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400 font-semibold mb-0.5">Spending pace</p>
                        <p className="text-sm text-gray-800 dark:text-gray-200">{message}</p>
                    </div>
                </div>
                <div className="flex items-center gap-5 sm:gap-6 sm:pl-5 sm:border-l border-gray-200 dark:border-neutral-800">
                    <PaceStat label="This month" value={current} strong />
                    <PaceStat label="Last month" value={last} />
                    <PaceStat label="Avg / month" value={avg} />
                </div>
            </div>
        </div>
    );
}

function PaceStat({ label, value, strong }) {
    return (
        <div>
            <p className="text-[10px] uppercase tracking-[0.12em] text-gray-400 dark:text-neutral-500 font-semibold mb-0.5">{label}</p>
            <MaskedBalance
                value={value}
                className={`tabular-nums inline-block ${strong ? 'text-base font-bold text-gray-900 dark:text-gray-100' : 'text-sm font-semibold text-gray-600 dark:text-gray-300'}`}
                iconClassName="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            />
        </div>
    );
}

function MonthlySpend({ data, className }) {
    if (!data) {
        return <div className={`h-64 rounded-2xl bg-gray-100 dark:bg-neutral-800/60 animate-pulse ${className}`} />;
    }

    const currentMonthIdx = new Date().getMonth();
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
            axisLabel: { color: '#9ca3af', fontSize: 10, formatter: kFmt },
            splitLine: { lineStyle: { color: '#374151', type: 'dashed' } },
        },
        series: [{
            name: 'Expenses',
            type: 'bar',
            barWidth: '50%',
            // Highlight the current month so "where am I now" reads at a glance.
            data: data.map((d, i) => ({
                value: d.amount,
                itemStyle: { color: i === currentMonthIdx ? '#0a5c3b' : '#52A397', borderRadius: [4, 4, 0, 0] },
            })),
        }],
    };

    const total = data.reduce((s, d) => s + Number(d.amount || 0), 0);

    return (
        <ChartCard
            title="Monthly expenses · current year"
            subtitle={total > 0 ? `${fmtPKR(total)} spent year-to-date · this month highlighted` : 'No expenses logged this year yet'}
            height={260}
            className={className}
        >
            <ReactECharts option={option} style={{ height: '100%' }} opts={{ renderer: 'canvas' }} />
        </ChartCard>
    );
}

function CategoryBreakdown({ data, className }) {
    if (!data || data.length === 0) {
        return (
            <ChartCard title="Where it went · this month" subtitle="No spending logged this month" height={260} className={className}>
                <div className="h-full flex items-center justify-center text-xs text-gray-400 dark:text-neutral-500">No data</div>
            </ChartCard>
        );
    }

    // Collapse the long tail into "Other" so the donut stays readable.
    const top = data.slice(0, 6);
    const rest = data.slice(6).reduce((s, d) => s + Number(d.value || 0), 0);
    const slices = rest > 0 ? [...top, { name: 'Other', value: rest }] : top;
    const total = data.reduce((s, d) => s + Number(d.value || 0), 0);

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
            data: slices.map((d) => ({ name: d.name, value: d.value })),
            label: { show: false },
            emphasis: { label: { show: true, fontSize: 12, fontWeight: 'bold' }, itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' } },
        }],
    };

    return (
        <ChartCard title="Where it went · this month" subtitle={`${fmtPKR(total)} across ${data.length} categor${data.length === 1 ? 'y' : 'ies'}`} height={260} className={className}>
            <ReactECharts option={option} style={{ height: '100%' }} opts={{ renderer: 'canvas' }} />
        </ChartCard>
    );
}
