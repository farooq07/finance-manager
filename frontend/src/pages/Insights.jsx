import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import ReactECharts from 'echarts-for-react';
import { TrendingDown, TrendingUp, Calendar, ArrowRight } from 'lucide-react';
import api from '../services/api';
import { fmtPKR } from '../utils/currency';

const PERIOD_LABELS = {
    month:   'This month',
    quarter: 'This quarter',
    year:    'This year',
};

const PREV_LABELS = {
    month:   'vs. last month',
    quarter: 'vs. last quarter',
    year:    'vs. last year',
};

export default function Insights() {
    const [period, setPeriod] = useState('month');

    const { data, isLoading, isError } = useQuery({
        queryKey: ['insights', period],
        queryFn: async () => {
            const { data } = await api.get('/dashboard/insights', { params: { period } });
            return data;
        },
        staleTime: 60_000,
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Spending Insights</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Where your money goes, and how that's changed over time
                    </p>
                </div>
                <div className="flex gap-1 bg-gray-100 dark:bg-neutral-800/60 p-1 rounded-xl w-fit">
                    {['month', 'quarter', 'year'].map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-4 py-1.5 text-sm rounded-lg transition-colors ${
                                period === p
                                    ? 'bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 shadow-sm font-medium'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                            }`}
                        >
                            {p === 'month' ? 'Month' : p === 'quarter' ? 'Quarter' : 'Year'}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading && <SkeletonGrid />}
            {isError && (
                <div className="p-6 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 text-sm text-red-700 dark:text-red-300">
                    Could not load insights. Please try again.
                </div>
            )}

            {data && (
                <>
                    <SummaryCards data={data} period={period} />
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <CategoryBreakdown data={data.categoryBreakdown} />
                        <DailyTrendChart data={data.dailyTrend} />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <WeekdayPattern data={data.weekdayPattern} />
                        <TopMerchants data={data.topMerchants} />
                    </div>
                </>
            )}
        </div>
    );
}

function SkeletonGrid() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-28 rounded-xl bg-gray-100 dark:bg-neutral-800/60" />
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="h-72 rounded-xl bg-gray-100 dark:bg-neutral-800/60 lg:col-span-1" />
                <div className="h-72 rounded-xl bg-gray-100 dark:bg-neutral-800/60 lg:col-span-2" />
            </div>
        </div>
    );
}

function SummaryCards({ data, period }) {
    const { totals } = data;
    const cards = [
        {
            label: 'Spent',
            value: totals.currentSpend,
            delta: totals.spendDelta,
            inverted: true, // less spend is good
            icon: TrendingDown,
            tint: 'text-rose-600 dark:text-rose-400',
        },
        {
            label: 'Earned',
            value: totals.currentIncome,
            delta: totals.incomeDelta,
            inverted: false,
            icon: TrendingUp,
            tint: 'text-emerald-600 dark:text-emerald-400',
        },
        {
            label: 'Net',
            value: totals.net,
            delta: null,
            inverted: false,
            icon: Calendar,
            tint: totals.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {cards.map((c) => {
                const Icon = c.icon;
                let deltaEl = null;
                if (c.delta !== null && c.delta !== undefined) {
                    const positive = c.delta >= 0;
                    const isGood = c.inverted ? !positive : positive;
                    const sign = positive ? '+' : '';
                    deltaEl = (
                        <span className={`text-xs font-medium ${isGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {sign}{c.delta.toFixed(1)}%
                        </span>
                    );
                }
                return (
                    <div
                        key={c.label}
                        className="p-5 rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{c.label}</span>
                            <Icon className={`w-4 h-4 ${c.tint}`} />
                        </div>
                        <div className={`text-2xl font-semibold ${c.tint}`}>{fmtPKR(c.value)}</div>
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                            <span>{PERIOD_LABELS[period]}</span>
                            {deltaEl && (
                                <>
                                    <ArrowRight className="w-3 h-3 opacity-60" />
                                    {deltaEl}
                                    <span>{PREV_LABELS[period]}</span>
                                </>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function ChartShell({ title, subtitle, children, height = 280 }) {
    return (
        <div className="p-5 rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40">
            <div className="mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
                {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
            </div>
            <div style={{ height }}>{children}</div>
        </div>
    );
}

const CATEGORY_COLORS = ['#0a5c3b', '#52A397', '#71B7AC', '#9BCDC5', '#c75a2f', '#fbbf24', '#f87171', '#a78bfa', '#34d399', '#60a5fa', '#fb7185', '#94a3b8'];

function CategoryBreakdown({ data }) {
    if (!data || data.length === 0) {
        return <ChartShell title="By category" subtitle="No spending in this period"><Empty /></ChartShell>;
    }
    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'item',
            formatter: (p) => `${p.name}<br/>${fmtPKR(p.value)} (${p.percent}%)`,
            backgroundColor: '#1f2937',
            borderColor: '#374151',
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
        <ChartShell title="By category" subtitle="Where you spent most">
            <ReactECharts option={option} style={{ height: '100%' }} opts={{ renderer: 'canvas' }} />
        </ChartShell>
    );
}

function DailyTrendChart({ data }) {
    if (!data || data.length === 0) {
        return <ChartShell title="Daily spending" subtitle="No data in this period"><Empty /></ChartShell>;
    }
    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'axis',
            backgroundColor: '#1f2937',
            borderColor: '#374151',
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
            smooth: true,
            symbol: 'circle',
            symbolSize: 4,
            itemStyle: { color: '#0a5c3b' },
            lineStyle: { width: 2 },
            areaStyle: {
                color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
                    { offset: 0, color: 'rgba(10,92,59,0.35)' },
                    { offset: 1, color: 'transparent' },
                ] },
            },
        }],
    };
    return (
        <ChartShell title="Daily spend" subtitle="Trend across the period" height={280}>
            <ReactECharts option={option} style={{ height: '100%' }} opts={{ renderer: 'canvas' }} />
        </ChartShell>
    );
}

function WeekdayPattern({ data }) {
    if (!data || data.every((d) => d.total === 0)) {
        return <ChartShell title="By weekday" subtitle="No data in this period"><Empty /></ChartShell>;
    }
    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'axis',
            backgroundColor: '#1f2937',
            borderColor: '#374151',
            textStyle: { color: '#f9fafb', fontSize: 12 },
            valueFormatter: (v) => fmtPKR(v),
        },
        grid: { left: '3%', right: '3%', bottom: '10%', top: '8%', containLabel: true },
        xAxis: {
            type: 'category',
            data: data.map((d) => d.day),
            axisLabel: { color: '#9ca3af', fontSize: 11 },
            axisLine: { lineStyle: { color: '#374151' } },
        },
        yAxis: {
            type: 'value',
            axisLabel: { color: '#9ca3af', fontSize: 10, formatter: (v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v },
            splitLine: { lineStyle: { color: '#374151', type: 'dashed' } },
        },
        series: [{
            type: 'bar',
            data: data.map((d) => d.total),
            itemStyle: { color: '#52A397', borderRadius: [4, 4, 0, 0] },
        }],
    };
    return (
        <ChartShell title="By weekday" subtitle="When you spend most">
            <ReactECharts option={option} style={{ height: '100%' }} opts={{ renderer: 'canvas' }} />
        </ChartShell>
    );
}

function TopMerchants({ data }) {
    if (!data || data.length === 0) {
        return <ChartShell title="Top destinations" subtitle="No data in this period"><Empty /></ChartShell>;
    }
    return (
        <ChartShell title="Top destinations" subtitle="Where most of your money went" height="auto">
            <ul className="space-y-2">
                {data.map((m, i) => {
                    const max = data[0]?.total || 1;
                    const pct = (m.total / max) * 100;
                    return (
                        <li key={i} className="flex items-center gap-3">
                            <span className="w-5 text-xs text-gray-400 tabular-nums">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{m.merchant}</span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 tabular-nums shrink-0">{fmtPKR(m.total)}</span>
                                </div>
                                <div className="mt-1 h-1.5 rounded-full bg-gray-100 dark:bg-neutral-800 overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-emerald-500/70"
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </ChartShell>
    );
}

function Empty() {
    return (
        <div className="h-full w-full flex items-center justify-center text-xs text-gray-400 dark:text-gray-500">
            No data
        </div>
    );
}
