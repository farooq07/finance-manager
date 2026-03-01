import { useState, useEffect } from 'react';
import api from '../services/api';
import { Download } from 'lucide-react';
import { StatSkeleton } from '../components/Skeleton';

export default function Reports() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Calling dashboard summary for the generic totals report 
        // Ideally this would be a dedicated massive aggregation query in the backend.
        const fetchReportData = async () => {
            try {
                const response = await api.get('/dashboard/summary');
                setData(response.data);
            } catch (err) {
                console.error('Error fetching dashboard summary for report', err);
            } finally {
                setLoading(false);
            }
        };
        fetchReportData();
    }, []);

    if (loading) return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Financial Reports</h1>
                <div className="h-10 w-32 bg-gray-200 dark:bg-neutral-800 animate-pulse rounded-lg" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatSkeleton />
                <StatSkeleton />
            </div>
        </div>
    );

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center print:hidden">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Financial Reports</h1>
                <button
                    onClick={() => window.print()}
                    className="flex items-center px-4 py-2 bg-gray-800 dark:bg-neutral-800 text-white rounded-lg hover:bg-gray-900 dark:hover:bg-neutral-700 transition-colors"
                >
                    <Download className="w-4 h-4 mr-2" /> Export to PDF
                </button>
            </div>

            <div className="bg-white dark:bg-neutral-900 p-8 rounded-xl shadow border border-gray-200 dark:border-neutral-800 print:shadow-none print:border-none print:p-0 transition-colors">
                <div className="text-center mb-8 border-b dark:border-neutral-800 pb-6">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Personal Finance Summary</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">Generated on {new Date().toLocaleDateString()}</p>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 border-b dark:border-neutral-800 pb-2">Assets & Investments</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Total Capital Invested:</span>
                                <span className="font-semibold text-gray-900 dark:text-gray-100">PKR {data?.metrics.totalInvestments.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Current Portfolio Value:</span>
                                <span className="font-semibold text-blue-600 dark:text-blue-400">PKR {data?.metrics.currentPortfolioValue.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between border-t dark:border-neutral-800 pt-2">
                                <span className="text-gray-600 dark:text-gray-400 font-bold">Unrealized P/L:</span>
                                <span className={`font-bold ${data?.metrics.profitLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {data?.metrics.profitLoss >= 0 ? '+' : ''}PKR {data?.metrics.profitLoss.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 border-b dark:border-neutral-800 pb-2">Liabilities & Cashflow</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Total Expenses Logged:</span>
                                <span className="font-semibold text-gray-900 dark:text-gray-100">PKR {data?.metrics.totalExpenses.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Receivables (Money owed to you):</span>
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">PKR {data?.metrics.totalReceivable.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Payables (Money you owe):</span>
                                <span className="font-semibold text-red-600 dark:text-red-400">-PKR {data?.metrics.totalPayable.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50 dark:bg-neutral-800/50 p-6 rounded-lg border border-gray-100 dark:border-neutral-800 mt-8 transition-colors">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2">Net Worth Projection</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Estimated Liquidity Index:
                        <span className="ml-2 font-bold text-xl text-gray-900 dark:text-gray-100">
                            PKR {((data?.metrics.currentPortfolioValue || 0) + (data?.metrics.totalReceivable || 0) - (data?.metrics.totalPayable || 0)).toLocaleString()}
                        </span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1 italic">* Excludes cash savings since they are not tracked comprehensively in the current schema.</p>
                </div>
            </div>
        </div>
    );
}
