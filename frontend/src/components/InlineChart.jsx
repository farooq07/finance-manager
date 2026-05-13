import ReactECharts from 'echarts-for-react';

const CHART_CONFIGS = {
  getIncomeVsExpense: {
    type: 'bar',
    xKey: 'month',
    series: [
      { key: 'income',   name: 'Income',   color: '#388D80' },
      { key: 'expenses', name: 'Expenses', color: '#f87171' }
    ]
  },
  getCashFlow: {
    type: 'line',
    xKey: 'month',
    series: [{ key: 'net', name: 'Net Cash Flow', color: '#52A397' }]
  },
  getExpenseSummary: {
    type: 'bar',
    xKey: 'category',
    series: [{ key: 'total', name: 'Amount (PKR)', color: '#388D80' }]
  },
  getTopMerchants: {
    type: 'bar',
    xKey: 'merchant',
    series: [{ key: 'total', name: 'Amount (PKR)', color: '#71B7AC' }]
  },
  getMonthlyExpenses: {
    type: 'pie',
    nameKey: 'category',
    valueKey: 'amount'
  }
};

const PIE_COLORS = ['#388D80', '#52A397', '#71B7AC', '#9BCDC5', '#C2E0DB', '#fbbf24', '#f87171', '#a78bfa', '#34d399'];

export default function InlineChart({ toolName, toolData }) {
  const config = CHART_CONFIGS[toolName];
  if (!config) return null;

  const data = toolName === 'getMonthlyExpenses'
    ? toolData?.categories
    : Array.isArray(toolData) ? toolData : null;

  if (!data || data.length === 0) return null;

  const labelColor = '#9ca3af';

  let option;

  if (config.type === 'pie') {
    option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: '{b}<br/>PKR {c} ({d}%)',
        backgroundColor: '#1f2937',
        borderColor: '#374151',
        textStyle: { color: '#f9fafb', fontSize: 12 }
      },
      legend: {
        bottom: 0,
        textStyle: { color: labelColor, fontSize: 11 },
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8
      },
      color: PIE_COLORS,
      series: [{
        type: 'pie',
        radius: ['38%', '65%'],
        center: ['50%', '45%'],
        data: data.map(d => ({ name: d[config.nameKey], value: d[config.valueKey] })),
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 12, fontWeight: 'bold', color: '#f9fafb' },
          itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.3)' }
        }
      }]
    };
  } else {
    const xData = data.map(d => d[config.xKey]);
    option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1f2937',
        borderColor: '#374151',
        textStyle: { color: '#f9fafb', fontSize: 12 },
        valueFormatter: v => `PKR ${Number(v).toLocaleString('en-PK')}`
      },
      legend: {
        bottom: 0,
        textStyle: { color: labelColor, fontSize: 11 },
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8
      },
      grid: { left: '2%', right: '2%', bottom: '18%', top: '8%', containLabel: true },
      xAxis: {
        type: 'category',
        data: xData,
        axisLabel: { color: labelColor, fontSize: 10, rotate: data.length > 5 ? 30 : 0 },
        axisLine: { lineStyle: { color: '#374151' } },
        splitLine: { show: false }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: labelColor,
          fontSize: 10,
          formatter: v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v
        },
        splitLine: { lineStyle: { color: '#374151', type: 'dashed' } }
      },
      series: config.series.map(s => ({
        name: s.name,
        type: config.type,
        data: data.map(d => d[s.key]),
        itemStyle: { color: s.color, borderRadius: config.type === 'bar' ? [4, 4, 0, 0] : 0 },
        areaStyle: config.type === 'line' ? { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: s.color + '40' }, { offset: 1, color: 'transparent' }] } } : undefined,
        smooth: config.type === 'line',
        lineStyle: config.type === 'line' ? { width: 2.5 } : undefined,
        symbol: config.type === 'line' ? 'circle' : undefined,
        symbolSize: 6
      }))
    };
  }

  return (
    <div className="mt-3 rounded-xl overflow-hidden border border-gray-200 dark:border-neutral-700 bg-gray-900">
      <ReactECharts
        option={option}
        style={{ height: 220 }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
}
