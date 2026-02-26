import { useState, useEffect } from 'react';
import api from '../services/api';
import { Download } from 'lucide-react';

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

    if (loading) return <div className="p-6">Preparing reports...</div>;

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center print:hidden">
                <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
                <button
                    onClick={() => window.print()}
                    className="flex items-center px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
                >
                    <Download className="w-4 h-4 mr-2" /> Export to PDF
                </button>
            </div>

            <div className="bg-white p-8 rounded-xl shadow border border-gray-200 print:shadow-none print:border-none print:p-0">
                <div className="text-center mb-8 border-b pb-6">
                    <h2 className="text-3xl font-bold text-gray-900">Personal Finance Summary</h2>
                    <p className="text-gray-500 mt-2">Generated on {new Date().toLocaleDateString()}</p>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Assets & Investments</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Total Capital Invested:</span>
                                <span className="font-semibold text-gray-900">${data?.metrics.totalInvestments.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Current Portfolio Value:</span>
                                <span className="font-semibold text-blue-600">${data?.metrics.currentPortfolioValue.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between border-t pt-2">
                                <span className="text-gray-600 font-bold">Unrealized P/L:</span>
                                <span className={`font-bold ${data?.metrics.profitLoss >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {data?.metrics.profitLoss >= 0 ? '+' : ''}${data?.metrics.profitLoss.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Liabilities & Cashflow</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Total Expenses Logged:</span>
                                <span className="font-semibold text-gray-900">${data?.metrics.totalExpenses.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Receivables (Money owed to you):</span>
                                <span className="font-semibold text-emerald-600">${data?.metrics.totalReceivable.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Payables (Money you owe):</span>
                                <span className="font-semibold text-red-600">-${data?.metrics.totalPayable.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg border border-gray-100 mt-8">
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Net Worth Projection</h3>
                    <p className="text-sm text-gray-600">
                        Estimated Liquidity Index:
                        <span className="ml-2 font-bold text-xl text-gray-900">
                            ${((data?.metrics.currentPortfolioValue || 0) + (data?.metrics.totalReceivable || 0) - (data?.metrics.totalPayable || 0)).toFixed(2)}
                        </span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1 italic">* Excludes cash savings since they are not tracked comprehensively in the current schema.</p>
                </div>
            </div>
        </div>
    );
}
