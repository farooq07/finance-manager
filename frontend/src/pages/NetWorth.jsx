import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import ReactECharts from 'echarts-for-react';
import { Camera, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import api from '../services/api';
import { fmtPKR } from '../utils/currency';

const RANGES = [
    { key: 30,  label: '1M' },
    { key: 90,  label: '3M' },
    { key: 180, label: '6M' },
    { key: 365, label: '1Y' },
    { key: 730, label: '2Y' },
];

export default function NetWorth() {
    const [days, setDays] = useState(90);
    const qc = useQueryClient();

    const { data, isLoading, isError } = useQuery({
        queryKey: ['networth-history', days],
        queryFn: async () => {
            const { data } = await api.get('/networth/history', { params: { days } });
            return data;
        },
        staleTime: 60_000,
    });

    const snapshot = useMutation({
        mutationFn: () => api.post('/networth/snapshot'),
        onSuccess: () => {
            toast.success('Snapshot captured');
            qc.invalidateQueries({ queryKey: ['networth-history'] });
        },
        onError: () => toast.error('Could not capture snapshot'),
    });

    const summary = data?.summary;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Net Worth</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Your assets minus your liabilities, tracked over time
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex gap-1 bg-gray-100 dark:bg-neutral-800/60 p-1 rounded-xl">
                        {RANGES.map((r) => (
                            <button
                                key={r.key}
                                onClick={() => setDays(r.key)}
                                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                    days === r.key
                                        ? 'bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 shadow-sm font-medium'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                                }`}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => snapshot.mutate()}
                        disabled={snapshot.isPending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50"
                    >
                        <Camera className="w-4 h-4" />
                        {snapshot.isPending ? 'Capturing…' : 'Capture now'}
                    </button>
                </div>
            </div>

            {isLoading && <Skeleton />}
            {isError && (
                <div className="p-6 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 text-sm text-red-700 dark:text-red-300">
                    Could not load history. Please try again.
                </div>
            )}

            {data && (
                <>
                    {data.snapshots.length === 0 ? (
                        <EmptyState onSnapshot={() => snapshot.mutate()} pending={snapshot.isPending} />
                    ) : (
                        <>
                            <SummaryRow summary={summary} count={data.count} />
                            <Chart snapshots={data.snapshots} />
                            <Breakdown snapshot={data.snapshots[data.snapshots.length - 1]} />
                        </>
                    )}
                </>
            )}
        </div>
    );
}

function Skeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="h-28 rounded-2xl bg-gray-100 dark:bg-neutral-800/60" />
            <div className="h-80 rounded-2xl bg-gray-100 dark:bg-neutral-800/60" />
        </div>
    );
}

function EmptyState({ onSnapshot, pending }) {
    return (
        <div className="p-10 text-center rounded-2xl border border-dashed border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900/40">
            <Camera className="w-8 h-8 mx-auto text-gray-400 dark:text-gray-500" />
            <h3 className="mt-3 text-base font-semibold text-gray-900 dark:text-gray-100">
                No snapshots yet
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                Net-worth snapshots are captured automatically every night. Capture one now to
                seed your first data point.
            </p>
            <button
                onClick={onSnapshot}
                disabled={pending}
                className="mt-4 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 dark:disabled:bg-neutral-700 text-white text-sm font-medium transition-colors"
            >
                {pending ? 'Capturing…' : 'Capture first snapshot'}
            </button>
        </div>
    );
}

function SummaryRow({ summary, count }) {
    const delta = Number(summary?.delta || 0);
    const pct   = summary?.deltaPct;
    const positive = delta >= 0;
    const Icon = delta === 0 ? Minus : positive ? TrendingUp : TrendingDown;
    const tint = delta === 0
        ? 'text-gray-500 dark:text-gray-400'
        : positive
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-rose-600 dark:text-rose-400';

    return (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white shadow-lg">
            <div className="flex items-start justify-between gap-6 flex-wrap">
                <div>
                    <p className="text-xs uppercase tracking-wide text-emerald-100/80">Latest net worth</p>
                    <p className="mt-2 text-4xl font-bold tabular-nums">{fmtPKR(summary?.latest)}</p>
                    <p className="mt-1 text-xs text-emerald-100/70">{count} snapshot{count === 1 ? '' : 's'} in this range</p>
                </div>
                <div className="text-right">
                    <p className="text-xs uppercase tracking-wide text-emerald-100/80">Change in range</p>
                    <div className={`mt-2 inline-flex items-center gap-2 text-2xl font-semibold tabular-nums ${tint === 'text-gray-500 dark:text-gray-400' ? 'text-white/80' : 'text-white'}`}>
                        <Icon className="w-5 h-5" />
                        {positive && delta !== 0 ? '+' : ''}{fmtPKR(delta)}
                    </div>
                    {pct !== null && pct !== undefined && (
                        <p className="mt-1 text-xs text-emerald-100/80">{positive ? '+' : ''}{pct.toFixed(2)}%</p>
                    )}
                </div>
            </div>
        </div>
    );
}

function Chart({ snapshots }) {
    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'axis',
            backgroundColor: '#1f2937',
            borderColor: '#374151',
            textStyle: { color: '#f9fafb', fontSize: 12 },
            valueFormatter: (v) => fmtPKR(v),
        },
        grid: { left: '3%', right: '3%', bottom: '10%', top: '6%', containLabel: true },
        xAxis: {
            type: 'category',
            data: snapshots.map((s) => new Date(s.captured_at).toISOString().slice(0, 10)),
            axisLabel: { color: '#9ca3af', fontSize: 10, interval: Math.max(0, Math.floor(snapshots.length / 8) - 1) },
            axisLine: { lineStyle: { color: '#374151' } },
        },
        yAxis: {
            type: 'value',
            scale: true,
            axisLabel: {
                color: '#9ca3af',
                fontSize: 10,
                formatter: (v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v,
            },
            splitLine: { lineStyle: { color: '#374151', type: 'dashed' } },
        },
        series: [{
            type: 'line',
            data: snapshots.map((s) => Number(s.net_worth)),
            smooth: true,
            symbol: 'circle',
            symbolSize: 4,
            itemStyle: { color: '#0a5c3b' },
            lineStyle: { width: 2.5 },
            areaStyle: {
                color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
                    { offset: 0, color: 'rgba(10,92,59,0.4)' },
                    { offset: 1, color: 'transparent' },
                ] },
            },
        }],
    };

    return (
        <div className="p-5 rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">History</h3>
            <ReactECharts option={option} style={{ height: 320 }} opts={{ renderer: 'canvas' }} />
        </div>
    );
}

function Breakdown({ snapshot }) {
    if (!snapshot) return null;
    const rows = [
        { label: 'Bank balances',       value: snapshot.bank_total,         positive: true  },
        { label: 'Wallet balances',     value: snapshot.wallet_total,       positive: true  },
        { label: 'Investments',         value: snapshot.investment_total,   positive: true  },
        { label: 'Physical assets',     value: snapshot.asset_total,        positive: true  },
        { label: 'Money owed to you',   value: snapshot.receivable_total,   positive: true  },
        { label: 'Rent balance',        value: snapshot.rent_balance_total, positive: true  },
        { label: 'Money you owe',       value: snapshot.payable_total,      positive: false },
    ];

    return (
        <div className="p-5 rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Latest breakdown</h3>
            <ul className="divide-y divide-gray-100 dark:divide-neutral-800">
                {rows.map((r) => (
                    <li key={r.label} className="py-2.5 flex items-center justify-between gap-4 text-sm">
                        <span className="text-gray-600 dark:text-gray-400">{r.label}</span>
                        <span className={`font-medium tabular-nums ${r.positive ? 'text-gray-900 dark:text-gray-100' : 'text-rose-600 dark:text-rose-400'}`}>
                            {r.positive ? '' : '−'}{fmtPKR(Math.abs(Number(r.value || 0)))}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
