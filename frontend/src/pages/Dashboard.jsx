import { useState, useEffect } from 'react';
import api from '../services/api';
import ReactECharts from 'echarts-for-react';
import { TrendingUp, PieChart as PieIcon, Activity, FileText, ArrowUpCircle, ArrowDownCircle, Wallet, Landmark, Mail, Loader2 } from 'lucide-react';
import { fmtPKR } from '../utils/currency';
import { StatSkeleton, ChartSkeleton } from '../components/Skeleton';
import MaskedBalance from '../components/MaskedBalance';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { Card, CardContent } from '../components/ui/card';

export default function Dashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sendingEmail, setSendingEmail] = useState(false);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const response = await api.get('/dashboard/summary');
                setData(response.data);
            } catch (err) {
                console.error('Failed to load dashboard', err);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, []);

    const handleSendEmail = async () => {
        setSendingEmail(true);
        try {
            await api.post('/dashboard/send-summary');
            toast.success('Summary email sent successfully to farooqibex@gmail.com');
        } catch (error) {
            console.error('Failed to send summary email:', error);
            toast.error('Failed to send email. Check console.');
        } finally {
            setSendingEmail(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 transition-colors">Dashboard Overview</h1>
            </div>
            <Skeleton className="h-48 w-full rounded-2xl shadow-sm" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Skeleton className="h-96 rounded-xl" />
                <Skeleton className="h-96 rounded-xl" />
            </div>
        </div>
    );
    if (!data) return <div className="flex h-full items-center justify-center text-red-500">Error loading data.</div>;

    const { metrics, charts } = data;

    // ECharts Configurations
    const expensesChartOption = {
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: [
            {
                type: 'category',
                data: charts.monthlyExpenses.map(d => d.month),
                axisTick: { alignWithLabel: true },
                axisLine: { lineStyle: { color: '#9ca3af' } }
            }
        ],
        yAxis: [
            {
                type: 'value',
                axisLine: { show: false },
                splitLine: { lineStyle: { type: 'dashed', color: '#e5e7eb' } }
            }
        ],
        series: [
            {
                name: 'Expenses',
                type: 'bar',
                barWidth: '60%',
                data: charts.monthlyExpenses.map(d => d.amount),
                itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] }
            }
        ]
    };

    const assetAllocationOption = {
        tooltip: { trigger: 'item', formatter: '{b}: Rs {c} ({d}%)' },
        legend: { bottom: '0%', left: 'center' },
        series: [
            {
                name: 'Asset Allocation',
                type: 'pie',
                radius: ['45%', '70%'],
                avoidLabelOverlap: false,
                itemStyle: {
                    borderRadius: 10,
                    borderColor: '#fff',
                    borderWidth: 2
                },
                label: { show: false, position: 'center' },
                emphasis: {
                    label: { show: true, fontSize: 18, fontWeight: 'bold' }
                },
                labelLine: { show: false },
                data: charts.assetAllocation,
                color: ['#3b82f6', '#8b5cf6', '#10b981'] // Blue (Cash), Purple (Investments), Emerald (Receivables)
            }
        ]
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 transition-colors">Dashboard Overview</h1>
                <div className="flex items-center gap-4">
                    <Button
                        variant="default"
                        onClick={handleSendEmail}
                        disabled={sendingEmail}
                        className="shadow-sm"
                        title="Send Weekly Summary Email Now"
                    >
                        {sendingEmail ? (
                            <Loader2 data-icon="inline-start" className="animate-spin" />
                        ) : (
                            <Mail data-icon="inline-start" />
                        )}
                        Email Summary
                    </Button>
                    <div className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
                        Last Updated: {new Date().toLocaleTimeString()}
                    </div>
                </div>
            </div>

            {/* Net Worth Highlight Card */}
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                <div className="relative z-10">
                    <p className="text-blue-200 font-medium mb-1">Total Comprehensive Net Worth</p>
                    <MaskedBalance
                        value={metrics.netWorth}
                        className="text-4xl md:text-5xl font-bold tracking-tight inline-block mr-2"
                        iconClassName="text-white hover:text-white bg-white/10 hover:bg-white/20 p-2"
                    />
                    <div className="flex items-center gap-4 mt-6">
                        <div>
                            <p className="text-sm text-blue-300">Liquid Cash</p>
                            <MaskedBalance value={metrics.totalBankBalance} className="text-lg font-semibold inline-block mr-1" iconClassName="text-white/60 hover:text-white hover:bg-white/10" />
                        </div>
                        <div className="h-8 w-px bg-blue-700/50"></div>
                        <div>
                            <p className="text-sm text-blue-300">Total Invested Assets</p>
                            <MaskedBalance value={metrics.totalInvestments} className="text-lg font-semibold inline-block mr-1" iconClassName="text-white/60 hover:text-white hover:bg-white/10" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard title=" Bank Balance" value={metrics.totalBankBalance} icon={Landmark} color="primary" />
                <MetricCard title=" Wallet Balance " value={metrics.totalWalletBalance} icon={Wallet} color="cyan" />
                <MetricCard
                    title="PSX Balance"
                    value={metrics.stockValue}
                    icon={TrendingUp}
                    color="indigo"
                    subText={
                        metrics.stockCost > 0
                            ? (() => {
                                const pct = ((metrics.stockValue - metrics.stockCost) / metrics.stockCost) * 100;
                                return <span className={`font-semibold ${pct >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{pct >= 0 ? '+' : ''}{pct.toFixed(2)}%</span>;
                            })()
                            : null
                    }
                />
                <MetricCard
                    title="Mutual Fund Total"
                    value={metrics.mutualFundValue}
                    icon={PieIcon}
                    color="purple"
                    subText={
                        metrics.mutualFundCost > 0
                            ? (() => {
                                const pct = ((metrics.mutualFundValue - metrics.mutualFundCost) / metrics.mutualFundCost) * 100;
                                return <span className={`font-semibold ${pct >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{pct >= 0 ? '+' : ''}{pct.toFixed(2)}%</span>;
                            })()
                            : null
                    }
                />
                <MetricCard title="Payment to Receive" value={metrics.totalReceivable} icon={ArrowUpCircle} color="emerald" />
                <MetricCard title="Payment to Send" value={metrics.totalPayable} icon={ArrowDownCircle} color="red" />
                <MetricCard title="Expenses (This Month)" value={metrics.currentMonthExpenses} icon={FileText} color="amber" />
                <MetricCard title="Total Expenses" value={metrics.totalExpenses} icon={Activity} color="orange" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Expenses Chart */}
                <div className="bg-white dark:bg-neutral-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-800 hidden md:block transition-colors">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Monthly Expenses (Current Year)</h2>
                    <div className="h-80 w-full">
                        <ReactECharts option={expensesChartOption} style={{ height: '100%', width: '100%' }} />
                    </div>
                </div>

                {/* Asset Allocation Chart */}
                <div className="bg-white dark:bg-neutral-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-800 hidden md:block transition-colors">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Asset Allocation</h2>
                    {charts.assetAllocation && charts.assetAllocation.length > 0 ? (
                        <div className="h-80 w-full">
                            <ReactECharts option={assetAllocationOption} style={{ height: '100%', width: '100%' }} />
                        </div>
                    ) : (
                        <div className="h-80 w-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                            No asset data to display.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    function MetricCard({ title, value, icon: Icon, color, subText }) {
        const colorClasses = {
            emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
            blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
            red: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
            amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
            purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
            cyan: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400',
            indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
            orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
        };

        const themeClasses = colorClasses[color] || colorClasses.blue;

        return (
            <Card className="bg-white dark:bg-neutral-900 p-2 border-gray-100 dark:border-neutral-800 group relative overflow-hidden">
                <CardContent className="p-0 flex items-start gap-4 transition-colors">
                    <div className={`p-2 rounded-md ${themeClasses} transition-colors group-hover:scale-110 duration-300`}>
                        <Icon data-icon="inline-start" />
                    </div>
                    <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 transition-colors uppercase tracking-wider">{title}</h4>
                        <div className="flex items-baseline gap-2 mt-1">
                            <MaskedBalance value={value} className="text-md font-bold text-gray-900 dark:text-gray-100 transition-colors tracking-tight" />
                            {subText && (
                                <span className="text-xs bg-gray-50 dark:bg-neutral-800/80 px-2 py-0.5 rounded-full border border-gray-200 dark:border-neutral-700">
                                    {subText}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className={`absolute -right-6 -top-6 size-24 rounded-full opacity-[0.03] pointer-events-none transition-transform group-hover:scale-150 duration-500 ${themeClasses.split(' ')[0]}`}></div>
                </CardContent>
            </Card>
        );
    }
}
