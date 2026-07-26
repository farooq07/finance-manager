import ReactECharts from 'echarts-for-react';

/**
 * Minimal inline trend chart — no axes, no grid, no tooltip by default.
 *
 * Stocks.jsx, BankDetail.jsx and Accounts.jsx each had their own copy of this
 * ECharts config. One component keeps them consistent and gives the holdings
 * table a per-row price trend without a fourth copy.
 *
 * Colour defaults to green/red on the direction of travel, matching the
 * gain/loss semantics used across the app.
 */
export default function Sparkline({
    data = [],
    color,
    height = 32,
    width = '100%',
    showTooltip = false,
    className = '',
}) {
    const points = data
        .map(d => (typeof d === 'object' && d !== null ? Number(d.value ?? d.close) : Number(d)))
        .filter(Number.isFinite);

    // One point cannot describe a trend; render nothing rather than a stray dot.
    if (points.length < 2) {
        return (
            <div
                className={`flex items-center justify-center text-[10px] text-gray-400 dark:text-gray-600 ${className}`}
                style={{ height, width }}
            >
                —
            </div>
        );
    }

    const rising = points[points.length - 1] >= points[0];
    const strokeColor = color || (rising ? '#059669' : '#dc2626'); // emerald-600 / red-600

    const option = {
        animation: false,
        grid: { left: 0, right: 0, top: 2, bottom: 2, containLabel: false },
        xAxis: { type: 'category', show: false, boundaryGap: false, data: points.map((_, i) => i) },
        yAxis: { type: 'value', show: false, min: 'dataMin', max: 'dataMax' },
        tooltip: showTooltip
            ? { trigger: 'axis', formatter: (params) => Number(params[0].value).toLocaleString('en-PK') }
            : undefined,
        series: [{
            type: 'line',
            data: points,
            showSymbol: false,
            smooth: true,
            lineStyle: { width: 1.5, color: strokeColor },
            areaStyle: { color: strokeColor, opacity: 0.12 },
        }],
    };

    return (
        <div className={className} style={{ height, width }}>
            <ReactECharts
                option={option}
                style={{ height: '100%', width: '100%' }}
                opts={{ renderer: 'svg' }}
                notMerge
            />
        </div>
    );
}
