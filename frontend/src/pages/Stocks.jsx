import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import ReactECharts from 'echarts-for-react';
import { Upload, Plus, Trash2, TrendingUp, DollarSign, Calendar, Clock, Database, ChevronDown, ChevronRight, Activity, Percent, Eye, EyeOff, Briefcase, Loader2, RefreshCw } from 'lucide-react';
import { usePin } from '../context/PinContext';
import { usePsxSnapshots, useUploadPsxSnapshot, useBankInvestments, useAddBankInvestment, useDeleteBankInvestment, useUpdatePsxSummary } from '../hooks/usePsx';
import { useBrokerAccounts } from '../hooks/useBrokerAccounts';
import { fmtPKR, pctChange, glColor, fmtGL } from '../utils/currency';
import { fmtDate, fmtDateLong } from '../utils/dates';
import { StatSkeleton, TableSkeleton } from '../components/Skeleton';
import DatePickerInput from '../components/DatePickerInput';
import DatePicker from 'react-datepicker';
import { toast } from 'sonner';
import MaskedBalance from '../components/MaskedBalance';
import Button from '../components/Button';
import { useDeletePsxSnapshot, useDeleteSymbolFromSnapshot, useSyncPsxData } from '../hooks/usePsx';
import { usePsxStocks, useSyncPsxStocks } from '../hooks/useStocks';
import Modal from '../components/Modal';

const DEFAULT_TARGETS = ['HUBC', 'FFL', 'FFC', 'MEBL', 'OGDC'];

export default function Stocks() {
    const navigate = useNavigate();
    const { isUnlocked } = usePin();
    // ---- Server State ----
    const { data: snapshots = [], isLoading: loadingSnapshots } = usePsxSnapshots();
    const { data: bankData, isLoading: loadingBank } = useBankInvestments();
    const { data: brokerAccounts = [], isLoading: loadingBrokers } = useBrokerAccounts();
    const { data: liveStocks = [], isLoading: loadingLiveStocks } = usePsxStocks();

    // Mutations
    const uploadSnapshot = useUploadPsxSnapshot();
    const addBankTx = useAddBankInvestment();
    const delBankTx = useDeleteBankInvestment();
    const updateSummary = useUpdatePsxSummary();
    const deleteSnapshot = useDeletePsxSnapshot();
    const deleteSymbol = useDeleteSymbolFromSnapshot();
    const syncData = useSyncPsxData();
    const syncLiveStocks = useSyncPsxStocks();

    // ---- Local State ----
    const [showBankModal, setShowBankModal] = useState(false);
    const [showSummaryModal, setShowSummaryModal] = useState(false);
    const [showHtmlModal, setShowHtmlModal] = useState(false);
    const [htmlContent, setHtmlContent] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [openSnapshotId, setOpenSnapshotId] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, title: '', description: '', onConfirm: null, isLoading: false });

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
                    // Normalize keys to support multiple formats
                    const findValue = (...keys) => {
                        const matchedKey = Object.keys(row).find(k => keys.some(search => k.toLowerCase().trim() === search.toLowerCase()));
                        return row[matchedKey];
                    };

                    const sym = findValue('security', 'symbol');
                    const hld = parseFloat((findValue('Quantity', 'holding', 'position') || '0').toString().replace(/,/g, '')) || 0;
                    const rate = parseFloat((findValue('Current Price', 'market_rate', 'marketRate', 'last') || '0').toString().replace(/,/g, '')) || 0;
                    const val = parseFloat((findValue('Current Value', 'custody_val', 'custodyVal') || (hld * rate).toString()).toString().replace(/,/g, '')) || (hld * rate);

                    // New detailed fields
                    const costPerUnit = parseFloat((findValue('Cost/Unit', 'cost_per_unit', 'purchase price') || '0').toString().replace(/,/g, '')) || 0;
                    const totalCost = parseFloat((findValue('Total Cost', 'total_cost') || (hld * costPerUnit).toString()).toString().replace(/,/g, '')) || (hld * costPerUnit);
                    const roiPct = parseFloat((findValue('Return of Investment %', 'roi_pct') || '0').toString().replace(/,/g, '').replace('%', ''));
                    const unrealizedGL = parseFloat((findValue('Unrealized Gain / Loss', 'unrealized_gl') || '0').toString().replace(/,/g, ''));

                    const changeStr = (findValue('Change', 'change') || '').toString().trim();
                    const change = changeStr && changeStr !== '-' ? (parseFloat(changeStr.replace(/,/g, '')) || 0) : (val - totalCost);

                    const todayGlStr = (findValue('Today gain/loss', 'today gain loss', 'today_gl') || '').toString().trim();
                    const todayGl = todayGlStr && todayGlStr !== '-' ? (parseFloat(todayGlStr.replace(/,/g, '')) || 0) : 0;

                    if (sym && hld > 0) {
                        holdings.push({
                            symbol: sym.toUpperCase(),
                            holding: hld,
                            market_rate: rate,
                            custody_val: val,
                            // Store new fields in the JSON blob
                            cost_per_unit: costPerUnit,
                            total_cost: totalCost,
                            roi_pct: roiPct,
                            unrealized_gl: unrealizedGL,
                            change: change,
                            today_gl: todayGl
                        });
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

    const handleDeleteBankTx = (id) => {
        setDeleteModal({
            isOpen: true,
            title: 'Delete Bank Transaction',
            description: 'Are you sure you want to delete this bank transaction? This alters your "Invested" basis.',
            onConfirm: async () => {
                setDeleteModal(prev => ({ ...prev, isLoading: true }));
                try {
                    await delBankTx.mutateAsync(id);
                    toast.success('Transaction deleted');
                } catch (err) {
                    toast.error('Failed to delete transaction');
                } finally {
                    setDeleteModal({ isOpen: false });
                }
            }
        });
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

    const handleHtmlSync = async () => {
        if (!htmlContent.trim()) return;
        setIsSyncing(true);
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');
            const allRows = Array.from(doc.querySelectorAll('tr'));

            if (allRows.length === 0) {
                toast.error('No table rows (<tr>) found in the pasted content.');
                return;
            }

            // Identify header row based on common stock columns
            let headerRowIndex = allRows.findIndex(row => {
                const text = row.textContent.toLowerCase();
                return text.includes('symbol') || text.includes('security') || text.includes('holding');
            });

            if (headerRowIndex === -1) {
                toast.error('Could not identify a header row. Ensure your table contains column names like "Symbol" or "Security".');
                return;
            }

            const headerCells = Array.from(allRows[headerRowIndex].querySelectorAll('th, td'));
            const headers = headerCells.map(el => el.textContent.trim().toLowerCase());

            const holdings = [];
            let totalVal = 0;

            const dataRows = allRows.slice(headerRowIndex + 1);
            dataRows.forEach(row => {
                const cells = Array.from(row.querySelectorAll('td'));
                if (cells.length < 2) return;

                const rowData = {};
                headers.forEach((header, i) => {
                    if (cells[i]) rowData[header] = cells[i].textContent.trim();
                });

                const sym = rowData['security'] || rowData['symbol'];
                const hldStr = (rowData['quantity'] || rowData['holding'] || rowData['position'] || '0').replace(/,/g, '');
                const hld = parseFloat(hldStr) || 0;
                const rateStr = (rowData['current price'] || rowData['market price'] || rowData['market_rate'] || rowData['last'] || '0').replace(/,/g, '');
                const rate = parseFloat(rateStr) || 0;
                const valStr = (rowData['current value'] || rowData['custody value'] || rowData['custody_val'] || '').replace(/,/g, '');
                const val = parseFloat(valStr) || (hld * rate);

                const costStr = (rowData['cost/unit'] || rowData['purchase price'] || '0').replace(/,/g, '');
                const costPerUnit = parseFloat(costStr) || 0;
                const totalCostStr = (rowData['total cost'] || '').replace(/,/g, '');
                const totalCost = parseFloat(totalCostStr) || (hld * costPerUnit);
                const roiStr = (rowData['return of investment %'] || rowData['roi %'] || '0').replace(/,/g, '').replace('%', '');
                const roiPct = parseFloat(roiStr) || 0;
                const glStr = (rowData['unrealized gain / loss'] || rowData['unrealized_gl'] || '0').replace(/,/g, '');
                const unrealizedGL = parseFloat(glStr) || 0;

                const changeStr = (rowData['change'] || '').trim();
                const change = changeStr && changeStr !== '-' ? (parseFloat(changeStr.replace(/,/g, '')) || 0) : (val - totalCost);

                const todayGlStr = (rowData['today gain/loss'] || rowData['today_gl'] || rowData['today gain loss'] || '').trim();
                const todayGl = todayGlStr && todayGlStr !== '-' ? (parseFloat(todayGlStr.replace(/,/g, '')) || 0) : 0;

                if (sym && hld > 0) {
                    holdings.push({
                        symbol: sym.toUpperCase(),
                        holding: hld,
                        market_rate: rate,
                        custody_val: val,
                        cost_per_unit: costPerUnit,
                        total_cost: totalCost,
                        roi_pct: roiPct,
                        unrealized_gl: unrealizedGL,
                        change: change,
                        today_gl: todayGl
                    });
                    totalVal += val;
                }
            });

            if (holdings.length === 0) {
                toast.error('No valid stock data found in pasted content.');
                return;
            }

            await syncData.mutateAsync({
                snapshot_date: csvDate,
                total_custody: totalVal,
                holdings_data: holdings
            });

            toast.success(`Synced ${holdings.length} symbols from HTML! Portfolio: PKR ${fmtPKR(totalVal)}`);
            setShowHtmlModal(false);
            setHtmlContent('');
        } catch (error) {
            console.error('Sync error', error);
            toast.error('Error syncing data: ' + (error.response?.data?.message || error.message));
        } finally {
            setIsSyncing(false);
        }
    };

    const handleDeleteSnapshot = (id, date) => {
        setDeleteModal({
            isOpen: true,
            title: 'Delete Snapshot',
            description: `Are you sure you want to delete the snapshot from ${fmtDate(date)}?`,
            onConfirm: async () => {
                setDeleteModal(prev => ({ ...prev, isLoading: true }));
                try {
                    await deleteSnapshot.mutateAsync(id);
                    toast.success('Snapshot deleted successfully');
                } catch (err) {
                    toast.error('Failed to delete snapshot');
                } finally {
                    setDeleteModal({ isOpen: false });
                }
            }
        });
    };

    const handleDeleteSymbolFromSnapshot = (snapId, symbol) => {
        setDeleteModal({
            isOpen: true,
            title: 'Remove Symbol',
            description: `Are you sure you want to remove ${symbol} from this history log?`,
            onConfirm: async () => {
                setDeleteModal(prev => ({ ...prev, isLoading: true }));
                try {
                    await deleteSymbol.mutateAsync({ snapId, symbol });
                    toast.success(`${symbol} removed from log`);
                } catch (err) {
                    toast.error('Failed to remove symbol');
                } finally {
                    setDeleteModal({ isOpen: false });
                }
            }
        });
    };

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
                    <Button
                        variant="primary"
                        onClick={async () => {
                            try {
                                await syncLiveStocks.mutateAsync();
                                toast.success('Live stock prices synced manually.');
                            } catch (error) {
                                toast.error('Failed to sync live stock prices.');
                            }
                        }}
                        processing={syncLiveStocks.isPending}
                        className="h-10 px-4 w-full sm:w-auto"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" /> Sync Live Data
                    </Button>

                    <Button
                        variant="secondary"
                        onClick={() => setShowBankModal(true)}
                        className="h-10 px-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 hover:bg-blue-100 dark:hover:bg-blue-900/40 shadow-sm w-full sm:w-auto"
                    >
                        <DollarSign className="w-4 h-4 mr-2" /> Bank Transfers
                    </Button>

                    <Button
                        variant="ghost"
                        onClick={() => {
                            setHtmlContent('');
                            setShowHtmlModal(true);
                        }}
                        className="h-10 px-4 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 shadow-sm w-full sm:w-auto"
                    >
                        <Database className="w-4 h-4 mr-2 text-neutral-500" /> Paste HTML
                    </Button>
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
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => toggleSecretReveal(e, `client_${broker.id}`)}
                                            className="h-8 w-8 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                                        >
                                            {revealedSecrets.includes(`client_${broker.id}`) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </Button>
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
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => toggleSecretReveal(e, `pin_${broker.id}`)}
                                            className="h-8 w-8 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                                        >
                                            {revealedSecrets.includes(`pin_${broker.id}`) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Live Tracked Stocks Table */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden text-sm transition-colors mb-8">
                <div className="px-6 py-5 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 transition-colors">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center">
                        <Activity className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" /> Live PSX Tracked Stocks
                    </h3>
                    {liveStocks.length === 0 && (
                        <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-3 py-1 rounded-full animate-pulse border border-blue-200 dark:border-blue-800">
                            Awaiting initial manual sync
                        </span>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-800 transition-colors">
                        <thead className="bg-white dark:bg-neutral-900 tracking-wider text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-left transition-colors">
                            <tr>
                                <th className="px-6 py-4">Symbol</th>
                                <th className="px-6 py-4">Company</th>
                                <th className="px-6 py-4 text-right">Price</th>
                                <th className="px-6 py-4 text-right">Change</th>
                                <th className="px-6 py-4 text-right">Volume</th>
                                <th className="px-6 py-4 text-right">High / Low</th>
                                <th className="px-6 py-4 text-right">Last Updated</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-neutral-900 divide-y divide-gray-100 dark:divide-neutral-800 transition-colors">
                            {liveStocks.length > 0 ? liveStocks.map((stock, idx) => {
                                return (
                                    <tr
                                        key={idx}
                                        onClick={() => navigate(`/stocks/${stock.ticker}`)}
                                        className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer transition-colors"
                                    >
                                        <td className="px-6 py-3 whitespace-nowrap font-bold text-blue-600 dark:text-blue-400 underline underline-offset-2">
                                            {stock.ticker}
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300 font-medium">
                                            {stock.companyName}
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap text-right font-medium text-gray-900 dark:text-gray-100">
                                            {fmtPKR(stock.price)}
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap text-right">
                                            <div className={`font-medium ${glColor(stock.change)} flex flex-col items-end`}>
                                                <span>{fmtPKR(stock.change)}</span>
                                                <span className="text-[10px] opacity-80">{stock.changePct > 0 ? '+' : ''}{stock.changePct}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap text-right text-gray-600 dark:text-gray-300">
                                            {Number(stock.volume).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap text-right text-gray-600 dark:text-gray-300">
                                            {fmtPKR(stock.high)} / {fmtPKR(stock.low)}
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap text-right text-gray-500 dark:text-gray-400 text-xs">
                                            {fmtDateLong(stock.lastUpdated)}
                                        </td>
                                    </tr>
                                );
                            }) : DEFAULT_TARGETS.map(ticker => (
                                <tr
                                    key={ticker}
                                    onClick={() => navigate(`/stocks/${ticker}`)}
                                    className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer transition-colors opacity-70"
                                >
                                    <td className="px-6 py-4 whitespace-nowrap font-bold text-blue-600 dark:text-blue-400 underline underline-offset-2">
                                        {ticker}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-400 dark:text-gray-500 italic">Target Company</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-gray-400">—</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-gray-400">—</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-gray-400">—</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-gray-400">—</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-gray-400 italic text-xs">Awaiting sync...</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                {(() => {
                    const computedTotalCost = latestSnapshot?.holdings_data?.reduce((sum, h) => sum + (h.total_cost || (h.holding * (h.cost_per_unit || 0))), 0) || 0;
                    const totalMarketValue = currentCustody;
                    const totalGL = totalMarketValue - computedTotalCost;
                    const totalGLPct = computedTotalCost > 0 ? (totalGL / computedTotalCost) * 100 : 0;

                    return (
                        <>
                            <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 p-6 transition-colors">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Cost</p>
                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                        <Database className="w-5 h-5 text-blue-600 dark:text-blue-500" />
                                    </div>
                                </div>
                                <div className="mt-2">
                                    <MaskedBalance
                                        value={computedTotalCost}
                                        className="text-3xl font-bold text-gray-900 dark:text-gray-100"
                                    />
                                </div>
                            </div>

                            <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 p-6 transition-colors">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Market Value</p>
                                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                                        <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                                    </div>
                                </div>
                                <div className="mt-2">
                                    <MaskedBalance
                                        value={totalMarketValue}
                                        className="text-3xl font-bold text-gray-900 dark:text-gray-100"
                                    />
                                </div>
                                {latestSnapshot && (
                                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">As of {fmtDateLong(latestSnapshot.snapshot_date)}</p>
                                )}
                            </div>

                            <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 p-6 relative overflow-hidden transition-colors">
                                <div className="flex items-center justify-between relative z-10">
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Gain/Loss</p>
                                    <div className={`p-2 rounded-lg ${totalGL >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                                        <TrendingUp className={`w-5 h-5 ${totalGL >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-500 dark:text-red-400'}`} />
                                    </div>
                                </div>
                                <div className="mt-2 relative z-10">
                                    <MaskedBalance
                                        value={fmtGL(totalGL)}
                                        className={`text-3xl font-bold ${glColor(totalGL)}`}
                                        isCurrency={false}
                                    />
                                    <p className={`mt-1 text-sm font-medium ${glColor(totalGL)}`}>
                                        {isUnlocked ? `${totalGLPct >= 0 ? '+' : ''}${totalGLPct.toFixed(2)}% ROI` : '••••% ROI'}
                                    </p>
                                </div>
                                <div className={`absolute -right-6 -bottom-6 w-32 h-32 rounded-full opacity-10 ${totalGL >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                            </div>
                        </>
                    );
                })()}
            </div>

            {/* Current Holdings Data Table */}
            {latestSnapshot && (
                <div className="bg-white mb-4 dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden text-sm transition-colors">
                    <div className="px-6 py-5 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center bg-gray-50 dark:bg-neutral-800/50 transition-colors">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Latest Holdings</h3>
                        <span className="px-3 py-1 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-gray-300 rounded-full text-xs font-medium shadow-sm flex items-center transition-colors">
                            <Clock className="w-3 h-3 mr-1" />
                            {fmtDateLong(latestSnapshot.snapshot_date)}
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-800 transition-colors">
                            <thead className="bg-white dark:bg-neutral-900 tracking-wider text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-left transition-colors">
                                <tr>
                                    <th className="px-6 py-4">Symbol</th>
                                    <th className="px-6 py-4 text-right">Quantity</th>
                                    <th className="px-6 py-4 text-right">Cost/Unit</th>
                                    <th className="px-6 py-4 text-right">Total Cost</th>
                                    <th className="px-6 py-4 text-right">Market Price</th>
                                    <th className="px-6 py-4 text-right">Change</th>
                                    <th className="px-6 py-4 text-right">Current Value</th>
                                    <th className="px-6 py-4 text-right">Today G/L</th>
                                    <th className="px-6 py-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-neutral-900 divide-y divide-gray-100 dark:divide-neutral-800 transition-colors">
                                {latestSnapshot.holdings_data.map((stock, idx) => {
                                    const computedTotalCost = stock.total_cost || (stock.holding * (stock.cost_per_unit || 0));
                                    const computedChange = stock.custody_val - computedTotalCost;
                                    const changePct = computedTotalCost > 0 ? (computedChange / computedTotalCost) * 100 : 0;
                                    const todayGl = stock.today_gl || 0;
                                    const prevVal = stock.custody_val - todayGl;
                                    const todayPct = prevVal > 0 ? (todayGl / prevVal) * 100 : 0;
                                    return (
                                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors">
                                            <td className="px-6 py-2 whitespace-nowrap font-bold text-gray-900 dark:text-gray-100">
                                                {stock.symbol}
                                            </td>
                                            <td className="px-6 py-2 whitespace-nowrap text-right text-gray-600 dark:text-gray-300 font-medium">
                                                {Number(stock.holding).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-2 whitespace-nowrap text-right text-gray-500 dark:text-gray-400">
                                                {stock.cost_per_unit ? fmtPKR(stock.cost_per_unit) : '—'}
                                            </td>
                                            <td className="px-6 py-2 whitespace-nowrap text-right text-gray-600 dark:text-gray-300">
                                                {stock.total_cost ? fmtPKR(stock.total_cost) : '—'}
                                            </td>
                                            <td className="px-6 py-2 whitespace-nowrap text-right text-gray-600 dark:text-gray-300">
                                                {fmtPKR(stock.market_rate)}
                                            </td>
                                            <td className="px-6 py-2 whitespace-nowrap text-right">
                                                <div className={`font-medium ${glColor(computedChange)} flex flex-col items-end`}>
                                                    <span>{fmtPKR(computedChange)}</span>
                                                    <span className="text-[10px] opacity-80">{changePct > 0 ? '+' : ''}{changePct.toFixed(2)}%</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-2 whitespace-nowrap text-right font-semibold text-emerald-700 dark:text-emerald-400">
                                                {fmtPKR(stock.custody_val)}
                                            </td>
                                            <td className="px-6 py-2 whitespace-nowrap text-right font-medium">
                                                <div className="flex flex-col items-end">
                                                    <MaskedBalance
                                                        value={todayGl}
                                                        className={`text-sm font-semibold ${glColor(todayGl)}`}
                                                    />
                                                    <span className={`text-[10px] ${glColor(todayGl)} opacity-80`}>
                                                        {isUnlocked ? `${todayPct > 0 ? '+' : ''}${todayPct.toFixed(2)}%` : '•••%'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-2 whitespace-nowrap text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteSymbolFromSnapshot(latestSnapshot.id, stock.symbol); }}
                                                    className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                    title={`Remove ${stock.symbol} from today's holding`}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot className="bg-gray-50 dark:bg-neutral-800/50 font-bold text-gray-900 dark:text-gray-100 text-xs text-right">
                                <tr>
                                    <td colSpan={3} className="px-6 py-3 uppercase tracking-wider">Total Cost</td>
                                    <td className="px-6 py-3">{fmtPKR(latestSnapshot.holdings_data.reduce((sum, h) => sum + (h.total_cost || (h.holding * (h.cost_per_unit || 0))), 0))}</td>
                                    <td colSpan={2} className="px-6 py-3 uppercase tracking-wider">Total Market Value</td>
                                    <td className="px-6 py-3 text-emerald-700 dark:text-emerald-400">{fmtPKR(latestSnapshot.total_custody)}</td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="flex justify-end">
                                            <MaskedBalance
                                                value={latestSnapshot.holdings_data.reduce((sum, h) => sum + (h.today_gl || 0), 0)}
                                                className={`font-bold ${glColor(latestSnapshot.holdings_data.reduce((sum, h) => sum + (h.today_gl || 0), 0))}`}
                                            />
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => { e.stopPropagation(); handleDeleteSnapshot(latestSnapshot.id, latestSnapshot.snapshot_date); }}
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 h-7"
                                            title="Delete completely today's log"
                                        >
                                            <Trash2 className="w-4 h-4 mr-1" /> Clear All
                                        </Button>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}


            {/* Snapshot History List (Collapsible) */}
            {snapshots.length > 1 && (
                <div className="bg-white mb-4 dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden transition-colors">
                    <Button
                        variant="ghost"
                        onClick={() => setShowHistory(!showHistory)}
                        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-neutral-800/50 rounded-none"
                    >
                        <div className="flex items-center">
                            <Clock className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-2" />
                            <h3 className="text-md font-bold text-gray-900 dark:text-gray-100">Snapshot History Log</h3>
                        </div>
                        {showHistory ? <ChevronDown className="w-5 h-5 text-gray-400 dark:text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />}
                    </Button>

                    {showHistory && (
                        <div className="border-t border-gray-100 dark:border-neutral-800 bg-gray-50/30 dark:bg-neutral-800/20 transition-colors">
                            {snapshots.map(s => {
                                const isOpen = openSnapshotId === s.id;
                                const holdings = Array.isArray(s.holdings_data) ? s.holdings_data : [];

                                return (
                                    <div key={s.id} className="border-b border-gray-100 dark:border-neutral-800 last:border-0 overflow-hidden">
                                        {/* Snapshot Header Row */}
                                        <div
                                            onClick={() => setOpenSnapshotId(isOpen ? null : s.id)}
                                            className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800/50 bg-white dark:bg-neutral-900 transition-colors"
                                        >
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className="flex items-center gap-2">
                                                    {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                                                    <span className="font-bold text-gray-900 dark:text-gray-100">{fmtDateLong(s.snapshot_date)}</span>
                                                </div>
                                                <div className="hidden sm:flex items-center gap-6 text-xs text-gray-500 dark:text-gray-400">
                                                    <span>Custody: <span className="font-mono text-gray-700 dark:text-gray-300">{fmtPKR(s.total_custody)}</span></span>
                                                    <span>Invested: <span className="font-mono text-gray-700 dark:text-gray-300">{fmtPKR(s.total_invested)}</span></span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className={`text-xs font-bold px-2 py-0.5 rounded ${s.total_custody - s.total_invested >= 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'}`}>
                                                    ROI: {isUnlocked ? `${((s.total_custody - s.total_invested) / (Number(s.total_invested) || 1) * 100).toFixed(1)}%` : '•••%'}
                                                </div>
                                                <div className="pl-3 border-l border-gray-100 dark:border-neutral-800">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteSnapshot(s.id, s.snapshot_date); }}
                                                        className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Detailed Holdings Table (Expanded) */}
                                        {isOpen && (
                                            <div className="border-t border-gray-100 dark:border-neutral-800 transition-colors animate-in slide-in-from-top-2 duration-200">
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-xs text-left whitespace-nowrap">
                                                        <thead>
                                                            <tr className="bg-gray-50/50 dark:bg-neutral-800/30 text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">
                                                                <th className="px-6 py-2.5">Symbol</th>
                                                                <th className="px-6 py-2.5 text-right">Quantity</th>
                                                                <th className="px-6 py-2.5 text-right">Cost/Unit</th>
                                                                <th className="px-6 py-2.5 text-right">Total Cost</th>
                                                                <th className="px-6 py-2.5 text-right">Market Price</th>
                                                                <th className="px-6 py-2.5 text-right">Change</th>
                                                                <th className="px-6 py-2.5 text-right">Current Value</th>
                                                                <th className="px-6 py-2.5 text-right">Today G/L</th>
                                                                <th className="px-6 py-2.5 text-center">Action</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100 dark:divide-neutral-800/50 bg-white dark:bg-neutral-900">
                                                            {holdings.map((h, hi) => {
                                                                const computedTotalCost = h.total_cost || (h.holding * (h.cost_per_unit || 0));
                                                                const computedChange = h.custody_val - computedTotalCost;
                                                                const changePct = computedTotalCost > 0 ? (computedChange / computedTotalCost) * 100 : 0;
                                                                const todayGl = h.today_gl || 0;
                                                                const prevVal = h.custody_val - todayGl;
                                                                const todayPct = prevVal > 0 ? (todayGl / prevVal) * 100 : 0;
                                                                return (
                                                                    <tr key={hi} className="hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors">
                                                                        <td className="px-6 py-3 font-bold text-gray-800 dark:text-gray-200">{h.symbol}</td>
                                                                        <td className="px-6 py-3 text-right text-gray-600 dark:text-gray-300 font-medium">{Number(h.holding).toLocaleString()}</td>
                                                                        <td className="px-6 py-3 text-right text-gray-500 dark:text-gray-400">{h.cost_per_unit ? fmtPKR(h.cost_per_unit) : '—'}</td>
                                                                        <td className="px-6 py-3 text-right text-gray-600 dark:text-gray-300">{h.total_cost ? fmtPKR(h.total_cost) : '—'}</td>
                                                                        <td className="px-6 py-3 text-right text-gray-500 dark:text-gray-400">{fmtPKR(h.market_rate)}</td>
                                                                        <td className="px-6 py-3 text-right font-medium">
                                                                            <div className="flex flex-col items-end">
                                                                                <MaskedBalance
                                                                                    value={computedChange}
                                                                                    className={`text-xs font-semibold ${glColor(computedChange)}`}
                                                                                />
                                                                                <span className={`text-[10px] ${glColor(computedChange)} opacity-80`}>
                                                                                    {isUnlocked ? `${changePct > 0 ? '+' : ''}${changePct.toFixed(2)}%` : '•••%'}
                                                                                </span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-6 py-3 text-right font-semibold text-gray-700 dark:text-gray-200">{fmtPKR(h.custody_val)}</td>
                                                                        <td className="px-6 py-3 text-right font-medium">
                                                                            <div className="flex flex-col items-end">
                                                                                <MaskedBalance
                                                                                    value={todayGl}
                                                                                    className={`text-xs font-semibold ${glColor(todayGl)}`}
                                                                                />
                                                                                <span className={`text-[10px] ${glColor(todayGl)} opacity-80`}>
                                                                                    {isUnlocked ? `${todayPct > 0 ? '+' : ''}${todayPct.toFixed(2)}%` : '•••%'}
                                                                                </span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-6 py-3 text-center">
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                onClick={(e) => { e.stopPropagation(); handleDeleteSymbolFromSnapshot(s.id, h.symbol); }}
                                                                                className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                                                title={`Remove ${h.symbol} from this history log`}
                                                                            >
                                                                                <Trash2 className="w-4 h-4" />
                                                                            </Button>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                        <tfoot className="bg-gray-50/50 dark:bg-neutral-800/30 font-bold text-gray-900 dark:text-gray-100">
                                                            <tr>
                                                                <td colSpan={3} className="px-6 py-3 text-right uppercase tracking-wider">Total:</td>
                                                                <td className="px-6 py-3 text-right">{fmtPKR(holdings.reduce((sum, h) => sum + (h.total_cost || (h.holding * (h.cost_per_unit || 0))), 0))}</td>
                                                                <td colSpan={2} className="px-6 py-3"></td>
                                                                <td className="px-6 py-3 text-right text-emerald-700 dark:text-emerald-400">{fmtPKR(holdings.reduce((sum, h) => sum + (h.custody_val || 0), 0))}</td>
                                                                <td className={`px-6 py-3 text-right ${glColor(holdings.reduce((sum, h) => sum + (h.today_gl || 0), 0))}`}>
                                                                    {fmtPKR(holdings.reduce((sum, h) => sum + (h.today_gl || 0), 0))}
                                                                </td>
                                                                <td className="px-6 py-3"></td>
                                                            </tr>
                                                        </tfoot>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
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
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowBankModal(false)}
                                className="h-8 w-8 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full"
                            >
                                ✕
                            </Button>
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
                                        <Button
                                            type="submit"
                                            processing={addBankTx.isPending}
                                            className="px-6 py-2"
                                        >
                                            Save
                                        </Button>
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
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteBankTx(tx.id)}
                                                className="h-9 w-9 text-gray-400 hover:text-red-600 dark:hover:text-red-400 bg-white dark:bg-neutral-800 hover:bg-red-50 dark:hover:bg-neutral-700 shadow-sm"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
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
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowSummaryModal(false)}
                                className="h-8 w-8 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full"
                            >
                                ✕
                            </Button>
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
                                <Button
                                    variant="outline"
                                    onClick={() => setShowSummaryModal(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    processing={updateSummary.isPending}
                                >
                                    Save Summary
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Paste HTML Modal */}
            {showHtmlModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center bg-gray-50 dark:bg-neutral-800/50 transition-colors">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                                <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-500 mr-2" />
                                Paste PSX Portfolio HTML
                            </h2>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowHtmlModal(false)}
                                className="h-8 w-8 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full"
                            >
                                ✕
                            </Button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                Copy the portfolio table from your broker's portal and paste it below. We'll parse the symbols and current values.
                            </p>
                            <textarea
                                className="w-full h-64 p-4 border border-gray-200 dark:border-neutral-700 rounded-xl bg-gray-50 dark:bg-neutral-800/50 text-xs font-mono dark:text-gray-300 focus:ring-2 focus:ring-emerald-500 transition-colors"
                                placeholder="Pasted <tr>...</tr> or <table> content here..."
                                value={htmlContent}
                                onChange={(e) => setHtmlContent(e.target.value)}
                            />
                            <div className="mt-6 flex justify-end gap-3">
                                <Button variant="outline" onClick={() => setShowHtmlModal(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleHtmlSync}
                                    processing={isSyncing}
                                    className="px-6"
                                >
                                    Sync Data
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Modal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false })}
                title={deleteModal.title}
                description={deleteModal.description}
                type="danger"
                primaryAction={{
                    label: 'Confirm',
                    onClick: deleteModal.onConfirm,
                    isLoading: deleteModal.isLoading,
                    variant: 'danger'
                }}
                secondaryAction={{
                    label: 'Cancel',
                    onClick: () => setDeleteModal({ isOpen: false })
                }}
            />
        </div>
    );
}

// Inline helper local to page since it's just formatting Mmm DD
function fmtDateShort(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`;
}
