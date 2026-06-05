import { useParams, useNavigate } from 'react-router-dom';
import { Activity, ArrowLeft, RefreshCw, TrendingUp, TrendingDown, Clock, BarChart2, Newspaper, ExternalLink, Loader2 } from 'lucide-react';
import { usePsxStocks, useSyncPsxStocks, useStockNews } from '../hooks/useStocks';
import { usePsxSnapshots } from '../hooks/usePsx';
import { fmtPKR, glColor, fmtGL } from '../utils/currency';
import { fmtDateLong, fmtDateShort } from '../utils/dates';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import MaskedBalance from '../components/MaskedBalance';
import { usePin } from '../context/PinContext';
import ReactECharts from 'echarts-for-react';
import TradingViewChart from '../components/TradingViewChart';

export default function StockDetail() {
    const { id: ticker } = useParams();
    const navigate = useNavigate();

    const { data: liveStocks = [], isLoading } = usePsxStocks();
    const { data: snapshots = [], isLoading: loadingSnapshots } = usePsxSnapshots();
    const syncLiveStocks = useSyncPsxStocks();
    const { data: news = [], isLoading: loadingNews } = useStockNews(ticker);
    const { isUnlocked } = usePin();

    // Find the current stock in the cached list
    const stock = liveStocks.find(s => s.ticker === ticker);

    const handleSync = async () => {
        try {
            await syncLiveStocks.mutateAsync();
            toast.success(`Live data synced for PSX Tracked Stocks.`);
        } catch (error) {
            toast.error('Failed to sync live stock prices.');
        }
    };

    if (isLoading || loadingSnapshots) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // Filter snapshots where this user holds this stock
    const holdingHistory = snapshots.filter(snap =>
        snap.holdings_data?.some(h => h.symbol === ticker)
    ).reverse(); // Oldest to newest for charts

    const latestSnapshotWithStock = snapshots.find(snap =>
        snap.holdings_data?.some(h => h.symbol === ticker)
    );
    const currentHolding = latestSnapshotWithStock?.holdings_data?.find(h => h.symbol === ticker);

    // Chart Options for history
    const chartDates = holdingHistory.map(s => fmtDateShort(s.snapshot_date));
    const chartValues = holdingHistory.map(s => {
        const h = s.holdings_data.find(x => x.symbol === ticker);
        return h ? Number(h.custody_val) : 0;
    });
    const chartCosts = holdingHistory.map(s => {
        const h = s.holdings_data.find(x => x.symbol === ticker);
        return h ? Number(h.total_cost || (h.holding * (h.cost_per_unit || 0))) : 0;
    });

    const chartOptions = {
        tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
        legend: { data: ['Market Value', 'Total Cost'], bottom: 0 },
        grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
        xAxis: { type: 'category', boundaryGap: false, data: chartDates },
        yAxis: { type: 'value', axisLabel: { formatter: (value) => value / 1000 + 'k' } },
        series: [
            {
                name: 'Market Value',
                type: 'line',
                data: chartValues,
                smooth: true,
                areaStyle: { opacity: 0.1 },
                itemStyle: { color: '#10b981' } // Emerald green
            },
            {
                name: 'Total Cost',
                type: 'line',
                data: chartCosts,
                smooth: true,
                itemStyle: { color: '#3b82f6' } // Blue
            }
        ]
    };

    // Calculate historical returns from snapshots
    const getReturn = (daysAgo) => {
        if (holdingHistory.length < 2) return null;
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() - daysAgo);

        const pastSnap = holdingHistory.find(s => new Date(s.snapshot_date) >= targetDate);
        if (!pastSnap) return null;

        const pastHolding = pastSnap.holdings_data.find(h => h.symbol === ticker);
        const currentPrice = stock?.price || 0;
        const pastPrice = Number(pastHolding?.market_rate) || 0;

        if (pastPrice === 0 || currentPrice === 0) return null;
        return ((currentPrice - pastPrice) / pastPrice) * 100;
    };

    const perfData = [
        { label: '1 Month', value: getReturn(30) },
        { label: '3 Months', value: getReturn(90) },
        { label: '6 Months', value: getReturn(180) },
        { label: '1 Year', value: getReturn(365) },
    ];

    return (
        <div className=" mx-auto">


            {/* Stock Detail Card */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 p-8 transition-colors">
                {!stock ? (
                    <div className="text-center py-12">
                        <div className="inline-flex items-center justify-center p-4 bg-gray-50 dark:bg-neutral-800 rounded-full mb-4">
                            <Activity className="w-8 h-8 text-gray-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{ticker}</h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">Data has not been synced for this target yet.</p>
                        <Button
                            variant="primary"
                            onClick={handleSync}
                            disabled={syncLiveStocks.isPending}
                        >
                            {syncLiveStocks.isPending ? (
                                <Loader2 data-icon="inline-start" className="animate-spin" />
                            ) : (
                                <RefreshCw data-icon="inline-start" />
                            )}
                            Sync Now
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6 border-b border-gray-100 dark:border-neutral-800 pb-8">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h1 className="text-4xl font-black text-gray-900 dark:text-gray-100 tracking-tight">{stock.ticker}</h1>
                                    <span className="px-3 py-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-bold rounded-full uppercase tracking-wider border border-blue-100 dark:border-blue-800">
                                        PSX
                                    </span>
                                    {/* Header Actions — back to portfolio now lives in the global Header */}
                                    <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4 ">
                                        <Button
                                            variant="primary"
                                            onClick={handleSync}
                                            disabled={syncLiveStocks.isPending}
                                            className="h-10 px-4 w-full sm:w-auto"
                                        >
                                            {syncLiveStocks.isPending ? (
                                                <Loader2 data-icon="inline-start" className="animate-spin" />
                                            ) : (
                                                <RefreshCw data-icon="inline-start" />
                                            )}
                                            Force Live Sync
                                        </Button>
                                    </div>
                                </div>
                                <h2 className="text-lg text-gray-500 dark:text-gray-400 font-medium">{stock.companyName}</h2>

                            </div>

                            <div className="text-left md:text-right w-full md:w-auto bg-gray-50/50 dark:bg-neutral-800/30 p-4 rounded-2xl">
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Current Price</p>
                                <div className="flex items-end gap-3 md:justify-end">
                                    <span className="text-4xl font-bold text-gray-900 dark:text-gray-100 leading-none">{fmtPKR(stock.price)}</span>
                                    <div className={`flex items-center mb-1 font-bold ${glColor(stock.change)}`}>
                                        {stock.change >= 0 ? <TrendingUp className="w-5 h-5 mr-1" /> : <TrendingDown className="w-5 h-5 mr-1" />}
                                        <span className="text-lg">{stock.change >= 0 ? '+' : ''}{fmtPKR(stock.change)}</span>
                                        <span className="text-sm ml-1 opacity-80">({stock.changePct}%)</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                            <div>
                                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Volume</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{Number(stock.volume).toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Day High</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{fmtPKR(stock.high)}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Day Low</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{fmtPKR(stock.low)}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Last Updated
                                </p>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">{fmtDateLong(stock.lastUpdated)}</p>
                            </div>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl p-5 border border-blue-100 dark:border-blue-900/30 flex items-start gap-4">
                            <BarChart2 className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-blue-900 dark:text-blue-200">Live API Connection</h4>
                                <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                                    Prices are synced directly from the Pakistan Stock Exchange data portal.
                                    Click "Force Live Sync" at any time to refresh the rates on-demand.
                                </p>
                            </div>
                        </div>

                        {/* Live Technical Chart */}
                        <div className="mt-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                    <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-500" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Live Technical Chart</h3>
                            </div>
                            <TradingViewChart symbol={ticker} />
                        </div>

                        {/* Performance Grid */}
                        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
                            {perfData.map((item, idx) => (
                                <div key={idx} className="bg-gray-50 dark:bg-neutral-800/50 p-4 rounded-xl border border-gray-100 dark:border-neutral-800 flex flex-col items-center">
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">{item.label}</span>
                                    {item.value !== null ? (
                                        <div className={`text-lg font-bold ${glColor(item.value)}`}>
                                            {item.value >= 0 ? '+' : ''}{item.value.toFixed(2)}%
                                        </div>
                                    ) : (
                                        <span className="text-sm text-gray-400">No Data</span>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* User Holding Specifics */}
                        {currentHolding && (
                            <div className="mt-10 pt-10 border-t border-gray-100 dark:border-neutral-800">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                                        <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">My Position</h3>
                                </div>

                                {(() => {
                                    const qty = Number(currentHolding.holding);
                                    const avgCost = Number(currentHolding.cost_per_unit) || 0;
                                    const totalCost = Number(currentHolding.total_cost) || (qty * avgCost);

                                    // Use live PSX price to calculate real-time value if available, else fallback to snapshot rate
                                    const livePrice = stock?.price > 0 ? stock.price : (currentHolding.market_rate || 0);
                                    const marketValue = qty * livePrice;

                                    const unrealizedGL = marketValue - totalCost;
                                    const roiPct = totalCost > 0 ? (unrealizedGL / totalCost) * 100 : 0;

                                    return (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                            <div className="bg-gray-50 dark:bg-neutral-800/50 rounded-2xl p-5 border border-gray-100 dark:border-neutral-800">
                                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Quantity Details</p>
                                                <div className="flex flex-col">
                                                    <MaskedBalance value={qty} isCurrency={false} className="text-2xl font-bold text-gray-900 dark:text-gray-100" />
                                                    <span className="text-sm text-gray-500 mt-1">Shares</span>
                                                </div>
                                            </div>

                                            <div className="bg-gray-50 dark:bg-neutral-800/50 rounded-2xl p-5 border border-gray-100 dark:border-neutral-800">
                                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Average Cost</p>
                                                <div className="flex flex-col">
                                                    <MaskedBalance value={avgCost} className="text-2xl font-bold text-gray-900 dark:text-gray-100" />
                                                    <span className="text-sm text-gray-500 mt-1">Per Share</span>
                                                </div>
                                            </div>

                                            <div className="bg-gray-50 dark:bg-neutral-800/50 rounded-2xl p-5 border border-gray-100 dark:border-neutral-800">
                                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Cost</p>
                                                <MaskedBalance value={totalCost} className="text-2xl font-bold text-gray-900 dark:text-gray-100" />
                                            </div>

                                            <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl p-5 border border-emerald-100 dark:border-emerald-900/30">
                                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Unrealized G/L</p>
                                                <MaskedBalance value={fmtGL(unrealizedGL)} isCurrency={false} className={`text-2xl font-bold ${glColor(unrealizedGL)}`} />
                                                <p className={`text-sm font-bold mt-1 ${glColor(unrealizedGL)}`}>
                                                    {isUnlocked ? `${roiPct > 0 ? '+' : ''}${roiPct.toFixed(2)}% ROI` : '•••% ROI'}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {/* Holding History Chart */}
                        {holdingHistory.length > 1 && (
                            <div className="mt-10 pt-10 border-t border-gray-100 dark:border-neutral-800">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                        <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-500" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Performance Over Time</h3>
                                </div>
                                <div className="h-[350px] w-full">
                                    <ReactECharts option={chartOptions} style={{ height: '100%', width: '100%' }} />
                                </div>
                            </div>
                        )}

                        {/* Latest News Section */}
                        <div className="mt-10 pt-10 border-t border-gray-100 dark:border-neutral-800">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                                        <Newspaper className="w-5 h-5 text-orange-600 dark:text-orange-500" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Latest News</h3>
                                </div>
                                <span className="text-xs font-medium text-gray-400 uppercase tracking-widest">TradingView Crawler</span>
                            </div>

                            {loadingNews ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="h-28 bg-gray-50 dark:bg-neutral-800/50 rounded-xl animate-pulse" />
                                    ))}
                                </div>
                            ) : news.length === 0 ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8 bg-gray-50/50 dark:bg-neutral-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-neutral-800">
                                    No recent news found for this ticker. Click "Sync News" on the main stocks page to refresh.
                                </p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {news.map((item, idx) => (
                                        <a
                                            key={idx}
                                            href={item.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group p-4 bg-white dark:bg-neutral-900/50 border border-gray-100 dark:border-neutral-800 rounded-xl hover:border-orange-200 dark:hover:border-orange-900/30 hover:shadow-md transition-all flex flex-col justify-between"
                                        >
                                            <div className="flex justify-between items-start gap-3">
                                                <h4 className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors line-clamp-2">
                                                    {item.title}
                                                </h4>
                                                <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-orange-500 shrink-0" />
                                            </div>
                                            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-50 dark:border-neutral-800">
                                                <span className="text-xs font-bold text-orange-600 dark:text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded">
                                                    {item.source}
                                                </span>
                                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> {new Date(item.publishedAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
