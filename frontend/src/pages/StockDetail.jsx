import { useParams, useNavigate } from 'react-router-dom';
import { Activity, ArrowLeft, RefreshCw, TrendingUp, TrendingDown, Clock, BarChart2 } from 'lucide-react';
import { usePsxStocks, useSyncPsxStocks } from '../hooks/useStocks';
import { fmtPKR, glColor } from '../utils/currency';
import { fmtDateLong } from '../utils/dates';
import Button from '../components/Button';
import { toast } from 'sonner';

export default function StockDetail() {
    const { id: ticker } = useParams();
    const navigate = useNavigate();

    const { data: liveStocks = [], isLoading } = usePsxStocks();
    const syncLiveStocks = useSyncPsxStocks();

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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <Button variant="ghost" className="text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 px-0" onClick={() => navigate('/stocks')}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Portfolio
                </Button>

                <Button
                    variant="primary"
                    onClick={handleSync}
                    processing={syncLiveStocks.isPending}
                    className="h-10 px-4 w-full sm:w-auto"
                >
                    <RefreshCw className="w-4 h-4 mr-2" /> Force Live Sync
                </Button>
            </div>

            {/* Stock Detail Card */}
            <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-sm border border-gray-100 dark:border-neutral-800 p-8 transition-colors">
                {!stock ? (
                    <div className="text-center py-12">
                        <div className="inline-flex items-center justify-center p-4 bg-gray-50 dark:bg-neutral-800 rounded-full mb-4">
                            <Activity className="w-8 h-8 text-gray-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{ticker}</h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">Data has not been synced for this target yet.</p>
                        <Button variant="primary" onClick={handleSync} processing={syncLiveStocks.isPending}>
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
                    </>
                )}
            </div>
        </div>
    );
}
