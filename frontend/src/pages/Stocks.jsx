import { useState } from 'react';
import Papa from 'papaparse';
import ReactECharts from 'echarts-for-react';
import { Upload, Plus, Trash2, TrendingUp, DollarSign, Calendar, Clock, Database, ChevronDown, ChevronRight, Activity, Percent, Eye, EyeOff, Briefcase } from 'lucide-react';
import { usePsxSnapshots, useUploadPsxSnapshot, useBankInvestments, useAddBankInvestment, useDeleteBankInvestment, useUpdatePsxSummary } from '../hooks/usePsx';
import { useBrokerAccounts } from '../hooks/useBrokerAccounts';
import { fmtPKR, pctChange, glColor, fmtGL } from '../utils/currency';
import { fmtDate, fmtDateLong } from '../utils/dates';
import { StatSkeleton, TableSkeleton } from '../components/Skeleton';
import DatePickerInput from '../components/DatePickerInput';
import DatePicker from 'react-datepicker';
import toast from 'react-hot-toast';

export default function Stocks() {
    // ---- Server State ----
    const { data: snapshots = [], isLoading: loadingSnapshots } = usePsxSnapshots();
    const { data: bankData, isLoading: loadingBank } = useBankInvestments();
    const { data: brokerAccounts = [], isLoading: loadingBrokers } = useBrokerAccounts();

    // Mutations
    const uploadSnapshot = useUploadPsxSnapshot();
    const addBankTx = useAddBankInvestment();
    const delBankTx = useDeleteBankInvestment();
    const updateSummary = useUpdatePsxSummary();

    // ---- Local State ----
    const [showBankModal, setShowBankModal] = useState(false);
    const [showSummaryModal, setShowSummaryModal] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    // Security States
    const [revealedSecrets, setRevealedSecrets] = useState([]);

    const toggleSecretReveal = (e, secretKey) => {
        e.preventDefault();
        e.stopPropagation();
        if (revealedSecrets.includes(secretKey)) {
            setRevealedSecrets(prev => prev.filter(key => key !== secretKey));
        } else {
            setRevealedSecrets(prev => [...prev, secretKey]);
        }
    };

    // Forms
    const [bankForm, setBankForm] = useState({ transaction_date: new Date().toISOString().split('T')[0], amount: '', description: '' });
    const [csvDate, setCsvDate] = useState(new Date().toISOString().split('T')[0]);
    const [summaryForm, setSummaryForm] = useState({
        trading_cash: '', market_value: '', working_capital: '', open_position: '',
        margin_req: '', total_worth: '', margin_pct: '', mark_to_market: '', blocked_profit: ''
    });

    if (loadingSnapshots || loadingBank || loadingBrokers) return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 transition-colors">PSX Engine</h1>
                <div className="h-10 w-32 bg-gray-200 dark:bg-neutral-800 animate-pulse rounded-lg" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatSkeleton />
                <StatSkeleton />
                <StatSkeleton />
            </div>
            <TableSkeleton rows={4} />
        </div>
    );

    const totalInvested = bankData?.total_invested || 0;
    const latestSnapshot = snapshots.length > 0 ? snapshots[0] : null;
    const currentCustody = latestSnapshot ? Number(latestSnapshot.total_custody) : 0;

    // Lifetime ROI
    const lifetimeGL = currentCustody - totalInvested;
    const lifetimePct = totalInvested > 0 ? (lifetimeGL / totalInvested) * 100 : 0;

    // ---- Handlers ----
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const data = results.data;
                const holdings = [];
                let totalCSVValue = 0;

                data.forEach(row => {
                    // Adapt strictly to the user's provided CSV keys if needed
                    // User prompt had: symbol, holding, market_rate, custody_val
                    const sym = row.symbol || row.Symbol;
                    const hld = parseFloat(row.holding || row.Holding) || 0;
                    const rate = parseFloat(row.market_rate || row['Market Rate'] || row.marketRate) || 0;
                    const val = parseFloat(row.custody_val || row['Custody Val'] || row.custodyVal) || (hld * rate);

                    if (sym && hld > 0) {
                        holdings.push({ symbol: sym.toUpperCase(), holding: hld, market_rate: rate, custody_val: val });
                        totalCSVValue += val;
                    }
                });

                if (holdings.length === 0) {
                    toast.error("No valid stock data found in CSV. Please ensure columns exist like 'symbol', 'holding', 'market_rate'.");
                    return;
                }

                try {
                    await uploadSnapshot.mutateAsync({
                        snapshot_date: csvDate,
                        total_custody: totalCSVValue,
                        holdings_data: holdings
                    });
                    toast.success(`Snapshot for ${fmtDate(csvDate)} uploaded successfully! Portfolio Value: PKR ${fmtPKR(totalCSVValue)}`);
                } catch (err) {
                    toast.error(err.response?.data?.message || 'Failed to upload snapshot');
                }

                // Reset file input
                e.target.value = null;
            }
        });
    };

    const handleAddBankTx = async (e) => {
        e.preventDefault();
        try {
            await addBankTx.mutateAsync({
                transaction_date: bankForm.transaction_date,
                amount: Number(bankForm.amount),
                description: bankForm.description
            });
            setBankForm({ transaction_date: new Date().toISOString().split('T')[0], amount: '', description: '' });
            toast.success('Bank transaction added successfully');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to add bank transaction');
        }
    };

    const handleDeleteBankTx = async (id) => {
        if (window.confirm('Delete this bank transaction? This alters your "Invested" basis.')) {
            await delBankTx.mutateAsync(id);
        }
    }

    const handleUpdateSummary = async (e) => {
        e.preventDefault();
        try {
            await updateSummary.mutateAsync({
                id: latestSnapshot.id,
                summaryData: {
                    trading_cash: Number(summaryForm.trading_cash || 0),
                    market_value: Number(summaryForm.market_value || 0),
                    working_capital: Number(summaryForm.working_capital || 0),
                    open_position: Number(summaryForm.open_position || 0),
                    margin_req: Number(summaryForm.margin_req || 0),
                    total_worth: Number(summaryForm.total_worth || 0),
                    margin_pct: Number(summaryForm.margin_pct || 0),
                    mark_to_market: Number(summaryForm.mark_to_market || 0),
                    blocked_profit: Number(summaryForm.blocked_profit || 0)
                }
            });
            setShowSummaryModal(false);
            toast.success('Summary stats updated successfully');
        } catch (err) {
            toast.error('Failed to update summary stats');
        }
    }

    // ---- Chart preparation ----
    const chronologicalSnapshots = [...snapshots].reverse();
    const xAxisDates = chronologicalSnapshots.map(s => fmtDateShort(s.snapshot_date));
    const custodySeries = chronologicalSnapshots.map(s => Number(s.total_custody));
    const investedSeries = chronologicalSnapshots.map(s => Number(s.total_invested));

    const chartOptions = {
        tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
        legend: { data: ['Portfolio Value', 'Capital Invested'], bottom: 0 },
        grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
        xAxis: { type: 'category', boundaryGap: false, data: xAxisDates },
        yAxis: { type: 'value', axisLabel: { formatter: (value) => value / 1000 + 'k' } },
        series: [
            {
                name: 'Portfolio Value',
                type: 'line',
                data: custodySeries,
                smooth: true,
                areaStyle: { opacity: 0.1 },
                itemStyle: { color: '#10b981' } // Emerald green
            },
            {
                name: 'Capital Invested',
                type: 'line',
                data: investedSeries,
                smooth: true,
                itemStyle: { color: '#3b82f6' } // Blue
            }
        ]
    };

    return (
        <div className="">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 transition-colors">PSX Portfolio Tracking</h1>

                <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3 w-full md:w-auto">
                    {/* Secondary Outlined Button */}
                    <button
                        onClick={() => {
                            if (latestSnapshot?.summary_data) {
                                setSummaryForm(latestSnapshot.summary_data);
                            }
                            setShowSummaryModal(true);
                        }}
                        disabled={!latestSnapshot}
                        className="flex items-center justify-center h-10 px-4 bg-white dark:bg-neutral-900 justify-center text-sm font-medium text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer w-full sm:w-auto"
                        title={!latestSnapshot ? "Upload a PSX CSV first" : "Log Daily Summary numbers from Broker"}
                    >
                        <Eye className="w-4 h-4 mr-2 text-neutral-500" /> Daily Summary
                    </button>

                    {/* Soft Themed Button */}
                    <button
                        onClick={() => setShowBankModal(true)}
                        className="flex items-center justify-center h-10 px-4 bg-blue-50 dark:bg-blue-900/20 text-sm font-medium text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all shadow-sm cursor-pointer w-full sm:w-auto opacity-90 hover:opacity-100"
                    >
                        <DollarSign className="w-4 h-4 mr-2" /> Bank Transfers
                    </button>

                    {/* Primary Split Button */}
                    <div className="relative flex shadow-sm rounded-lg overflow-hidden h-10 w-full sm:w-auto">
                        <div className="flex w-full bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-emerald-500 dark:focus-within:ring-offset-neutral-900">
                            <DatePicker
                                selected={csvDate ? new Date(csvDate) : null}
                                onChange={(date) => {
                                    if (date) {
                                        const y = date.getFullYear();
                                        const m = String(date.getMonth() + 1).padStart(2, '0');
                                        const d = String(date.getDate()).padStart(2, '0');
                                        setCsvDate(`${y}-${m}-${d}`);
                                    } else {
                                        setCsvDate('');
                                    }
                                }}
                                dateFormat="dd/MM/yyyy"
                                popperPlacement="bottom-end"
                                showPopperArrow={false}
                                customInput={
                                    <button type="button" className="cursor-pointer h-10 px-3 bg-black/15 hover:bg-black/25 border-r border-black/10 flex items-center transition-colors outline-none text-sm font-medium focus:ring-0" title="Upload Date">
                                        <Calendar className="w-4 h-4 mr-1.5 opacity-90" />
                                        {fmtDateShort(csvDate)}
                                    </button>
                                }
                            />
                            <input
                                type="file"
                                accept=".csv"
                                className="hidden"
                                id="csvUpload"
                                onChange={handleFileUpload}
                                disabled={uploadSnapshot.isPending}
                            />
                            <label htmlFor="csvUpload" className={`flex-1 flex justify-center items-center h-10 px-4 text-sm font-medium cursor-pointer transition-colors flex-nowrap whitespace-nowrap ${uploadSnapshot.isPending ? 'opacity-70 cursor-not-allowed' : ''}`}>
                                {uploadSnapshot.isPending ? (
                                    <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Parsing...</>
                                ) : (
                                    <><Upload className="w-4 h-4 mr-1.5" /> Upload CSV</>
                                )}
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* Broker Accounts Header */}
            {brokerAccounts.length > 0 && (
                <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-800 overflow-hidden mb-8 transition-colors">
                    <div className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-gray-200 dark:border-neutral-800 px-6 py-3 flex items-center gap-2 transition-colors">
                        <Briefcase className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                        <h2 className="text-sm font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">Trading Accounts</h2>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-neutral-800">
                        {brokerAccounts.map(broker => (
                            <div key={broker.id} className="p-6 grid grid-cols-2 md:grid-cols-5 gap-6 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50 transition-colors items-start">
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Account Title</p>
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">{broker.account_title}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Client Code / User ID</p>
                                    <div className="flex items-center gap-2">
                                        <p className="font-mono text-blue-700 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">
                                            {revealedSecrets.includes(`client_${broker.id}`) ? broker.client_code : '••••••••'}
                                        </p>
                                        <button onClick={(e) => toggleSecretReveal(e, `client_${broker.id}`)} className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                            {revealedSecrets.includes(`client_${broker.id}`) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Participant Acc No</p>
                                    <p className="font-mono text-gray-700 dark:text-gray-300">{broker.participant_acc_no || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">CDC-Sub Account No</p>
                                    <p className="font-mono text-gray-700 dark:text-gray-300">{broker.cdc_sub_acc_no || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">PIN Code</p>
                                    <div className="flex items-center gap-2">
                                        <p className="font-mono text-red-700 dark:text-red-400 font-bold bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded">
                                            {revealedSecrets.includes(`pin_${broker.id}`) ? (broker.stock_pin_code || 'Not Set') : '••••••••'}
                                        </p>
                                        <button onClick={(e) => toggleSecretReveal(e, `pin_${broker.id}`)} className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                                            {revealedSecrets.includes(`pin_${broker.id}`) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 p-6 transition-colors">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Portfolio Value</p>
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                            <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                        </div>
                    </div>
                    <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">PKR {fmtPKR(currentCustody)}</p>
                    {latestSnapshot && (
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">As of {fmtDateLong(latestSnapshot.snapshot_date)}</p>
                    )}
                </div>

                <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 p-6 transition-colors">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Net Invested (Bank)</p>
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <Database className="w-5 h-5 text-blue-600 dark:text-blue-500" />
                        </div>
                    </div>
                    <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">PKR {fmtPKR(totalInvested)}</p>
                    <p className="mt-1 text-xs text-blue-500 dark:text-blue-400 font-medium">Cash to Brokerage</p>
                </div>

                <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 p-6 relative overflow-hidden transition-colors">
                    <div className="flex items-center justify-between relative z-10">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Lifetime Return</p>
                        <div className={`p-2 rounded-lg ${lifetimeGL >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                            <TrendingUp className={`w-5 h-5 ${lifetimeGL >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-500 dark:text-red-400'}`} />
                        </div>
                    </div>
                    <p className={`mt-2 text-3xl font-bold relative z-10 ${glColor(lifetimeGL)}`}>
                        {fmtGL(lifetimeGL)}
                    </p>
                    <p className={`mt-1 text-sm font-medium relative z-10 ${glColor(lifetimeGL)}`}>
                        {lifetimePct >= 0 ? '+' : ''}{lifetimePct.toFixed(2)}% ROI
                    </p>
                    <div className={`absolute -right-6 -bottom-6 w-32 h-32 rounded-full opacity-10 ${lifetimeGL >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                </div>
            </div>

            {/* Broker Summary Table */}
            {latestSnapshot && latestSnapshot.summary_data && (
                <div className="bg-white mb-4 dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden transition-colors">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center bg-neutral-50/50 dark:bg-neutral-800/50 transition-colors">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 tracking-wider uppercase">Summary</h3>
                            <span className="text-xs text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded font-medium">As of {fmtDateShort(latestSnapshot.snapshot_date)}</span>
                        </div>
                    </div>

                    <div className="p-0 overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100 dark:divide-neutral-800">
                            <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                                {['TRADING CASH BALANCE', 'MARKET VALUE OF CUSTODY', 'WORKING CAPITAL', 'TOTAL WORTH'].map((label, idx) => {
                                    // Map label explicitly to properties for highly robust rendering
                                    const keys = ['trading_cash', 'market_value', 'working_capital', 'total_worth'];
                                    const val = latestSnapshot.summary_data[keys[idx]];
                                    return (
                                        <tr key={idx} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50 transition-colors">
                                            <td className="px-6 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400 uppercase tracking-widest text-[11px] font-semibold">{label}</td>
                                            <td className="px-6 py-3 whitespace-nowrap text-right">
                                                <span className="px-3 py-1 bg-gray-100/80 dark:bg-neutral-800 rounded font-mono text-gray-700 dark:text-gray-200 tracking-tight font-medium transition-colors">
                                                    {fmtPKR(val)} Rs
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Current Holdings Data Table */}
            {latestSnapshot && (
                <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden text-sm transition-colors">
                    <div className="px-6 py-5 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center bg-gray-50 dark:bg-neutral-800/50 transition-colors">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Latest Holdings</h3>
                        <span className="px-3 py-1 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-gray-300 rounded-full text-xs font-medium shadow-sm flex items-center transition-colors">
                            <Clock className="w-3 h-3 mr-1" />
                            {fmtDateLong(latestSnapshot.snapshot_date)}
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-800 transition-colors">
                            <thead className="bg-white dark:bg-neutral-900 tracking-wider text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-left transition-colors">
                                <tr>
                                    <th className="px-6 py-4">Symbol</th>
                                    <th className="px-6 py-4 text-right">Holding Qty</th>
                                    <th className="px-6 py-4 text-right">Market Rate (PKR)</th>
                                    <th className="px-6 py-4 text-right">Custody Value (PKR)</th>
                                    <th className="px-6 py-4 text-right">Weight</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-neutral-900 divide-y divide-gray-100 dark:divide-neutral-800 transition-colors">
                                {latestSnapshot.holdings_data.map((stock, idx) => {
                                    const weight = ((stock.custody_val / latestSnapshot.total_custody) * 100).toFixed(1);
                                    return (
                                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900 dark:text-gray-100">
                                                {stock.symbol}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-gray-600 dark:text-gray-300 font-medium">
                                                {Number(stock.holding).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-gray-600 dark:text-gray-300">
                                                {fmtPKR(stock.market_rate)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-emerald-700 dark:text-emerald-400">
                                                {fmtPKR(stock.custody_val)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <span className="inline-block bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300 px-2 py-1 rounded text-xs font-medium transition-colors">
                                                    {weight}%
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Snapshot History List (Collapsible) */}
            {snapshots.length > 1 && (
                <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden transition-colors">
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500"
                    >
                        <div className="flex items-center">
                            <Clock className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-2" />
                            <h3 className="text-md font-bold text-gray-900 dark:text-gray-100">Snapshot History Log</h3>
                        </div>
                        {showHistory ? <ChevronDown className="w-5 h-5 text-gray-400 dark:text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />}
                    </button>

                    {showHistory && (
                        <div className="border-t border-gray-100 dark:border-neutral-800 p-2 bg-gray-50 dark:bg-neutral-800/50 transition-colors">
                            {snapshots.map(s => (
                                <div key={s.id} className="bg-white dark:bg-neutral-900 p-4 mb-2 border border-gray-100 dark:border-neutral-700 rounded-lg flex justify-between items-center text-sm shadow-sm last:mb-0 transition-colors">
                                    <div className="font-medium text-gray-900 dark:text-gray-100">{fmtDateLong(s.snapshot_date)}</div>
                                    <div className="text-gray-500 dark:text-gray-400 hidden sm:block">Custody: PKR {fmtPKR(s.total_custody)}</div>
                                    <div className="text-gray-500 dark:text-gray-400 hidden md:block">Invested: PKR {fmtPKR(s.total_invested)}</div>
                                    <div className={`font-semibold ${s.total_custody - s.total_invested >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                                        ROI: {((s.total_custody - s.total_invested) / (Number(s.total_invested) || 1) * 100).toFixed(1)}%
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Bank Transactions Modal */}
            {showBankModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center bg-gray-50 dark:bg-neutral-800/50 transition-colors">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                                <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-500 mr-2" />
                                Manage Bank Transfers
                            </h2>
                            <button onClick={() => setShowBankModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 border border-transparent">✕</button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 bg-white dark:bg-neutral-900 transition-colors">
                            <div className="bg-blue-50/50 dark:bg-neutral-800 flex-none p-4 rounded-xl border border-blue-100 dark:border-neutral-700 mb-6 transition-colors">
                                <h3 className="font-semibold text-blue-800 dark:text-blue-400 mb-2">Log Deposit to Brokerage</h3>
                                <form onSubmit={handleAddBankTx} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="col-span-1">
                                        <DatePickerInput
                                            required
                                            selectedDate={bankForm.transaction_date}
                                            onChange={(val) => setBankForm({ ...bankForm, transaction_date: val })}
                                            className="focus:ring-blue-500 focus:border-blue-500 w-full bg-white dark:bg-neutral-900 dark:border-neutral-600 dark:text-gray-100"
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            placeholder="Amount (PKR)"
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-neutral-900 dark:text-gray-100 placeholder-gray-400"
                                            value={bankForm.amount}
                                            onChange={e => setBankForm({ ...bankForm, amount: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-span-1 sm:col-span-2 flex gap-3">
                                        <input
                                            type="text"
                                            placeholder="Description (e.g. IBFT to PSX)"
                                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-neutral-900 dark:text-gray-100 placeholder-gray-400"
                                            value={bankForm.description}
                                            onChange={e => setBankForm({ ...bankForm, description: e.target.value })}
                                        />
                                        <button
                                            type="submit"
                                            disabled={addBankTx.isPending}
                                            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                                        >
                                            Save
                                        </button>
                                    </div>
                                </form>
                            </div>

                            <div className="space-y-3">
                                <h3 className="font-semibold text-gray-700 dark:text-gray-400 mb-2 text-sm uppercase tracking-wider">Transfer History</h3>
                                {(bankData?.investments || []).map(tx => (
                                    <div key={tx.id} className="flex items-center justify-between p-3 border border-gray-100 dark:border-neutral-800 rounded-xl hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors">
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-gray-100">{fmtDateShort(tx.transaction_date)}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{tx.description || 'Deposit'}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <p className={`font-bold ${Number(tx.amount) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                                                {Number(tx.amount) >= 0 ? '+' : ''}PKR {fmtPKR(tx.amount)}
                                            </p>
                                            <button
                                                onClick={() => handleDeleteBankTx(tx.id)}
                                                className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 bg-white dark:bg-neutral-800 hover:bg-red-50 dark:hover:bg-neutral-700 p-2 rounded-lg transition-colors border border-transparent shadow-sm"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {(bankData?.investments || []).length === 0 && (
                                    <div className="text-center p-8 text-gray-400 dark:text-gray-500 border-2 border-dashed rounded-xl border-gray-100 dark:border-neutral-800">
                                        No bank transfers logged yet. Add your first deposit above to calculate ROI.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Chart */}
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 transition-colors">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Portfolio Growth vs Investment</h3>
                {snapshots.length > 0 ? (
                    <ReactECharts option={chartOptions} style={{ height: '350px' }} />
                ) : (
                    <div className="h-[350px] flex items-center justify-center text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-200 dark:border-neutral-700 rounded-xl">
                        Upload your first PSX CSV to see chart
                    </div>
                )}
            </div>

            {/* Daily Summary Entry Modal */}
            {showSummaryModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-800/50 text-neutral-800 dark:text-neutral-200 transition-colors">
                            <h2 className="text-xl font-bold flex items-center">
                                <Activity className="w-5 h-5 mr-2" />
                                Log Daily Summary for {fmtDateShort(latestSnapshot?.snapshot_date)}
                            </h2>
                            <button onClick={() => setShowSummaryModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2">✕</button>
                        </div>

                        <form onSubmit={handleUpdateSummary} className="p-6">
                            <div className="grid grid-cols-2 gap-4">
                                {[{ l: 'Trading Cash', k: 'trading_cash' }, { l: 'Market Value', k: 'market_value' },
                                { l: 'Working Capital', k: 'working_capital' }, { l: 'Total Worth', k: 'total_worth' }].map((fld) => (
                                    <div key={fld.k} className="col-span-1">
                                        <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">{fld.l}</label>
                                        <input
                                            type="number" step="0.01"
                                            className="w-full px-3 py-2 border dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-neutral-500 bg-neutral-50/50 dark:bg-neutral-800/50 font-mono text-sm dark:text-gray-100 transition-colors"
                                            value={summaryForm[fld.k]}
                                            onChange={e => setSummaryForm({ ...summaryForm, [fld.k]: e.target.value })}
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 flex justify-end">
                                <button type="button" onClick={() => setShowSummaryModal(false)} className="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mr-2 border border-transparent">Cancel</button>
                                <button type="submit" disabled={updateSummary.isPending} className="px-6 py-2 bg-neutral-900 dark:bg-neutral-700 text-white font-medium rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-600 disabled:opacity-50 transition-colors">
                                    {updateSummary.isPending ? 'Saving...' : 'Save Summary'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// Inline helper local to page since it's just formatting Mmm DD
function fmtDateShort(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`;
}
