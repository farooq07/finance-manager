import { Fragment, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import ReactECharts from 'echarts-for-react';
import {
    Upload, Plus, Trash2, TrendingUp, TrendingDown, Calendar, Clock, Database,
    ChevronDown, ChevronRight, ChevronUp, Activity, Percent, Eye, EyeOff, Briefcase,
    Loader2, RefreshCw, Gift, Newspaper, Search, MoreHorizontal, Info
} from 'lucide-react';
import { usePin } from '../context/PinContext';
import {
    usePsxSnapshots, useUploadPsxSnapshot, useUpdatePsxSummary,
    useDeletePsxSnapshot, useDeleteSymbolFromSnapshot, useSyncPsxData
} from '../hooks/usePsx';
import { useDividends, useSyncDividends, useDeleteDividend } from '../hooks/useDividends';
import { useBrokerAccounts } from '../hooks/useBrokerAccounts';
import { fmtPKR, pctChange, glColor, fmtGL } from '../utils/currency';
import { fmtDate, fmtDateLong } from '../utils/dates';
import { StatSkeleton, TableSkeleton } from '../components/Skeleton';
import DatePickerInput from '../components/DatePickerInput';
import DatePicker from 'react-datepicker';
import { toast } from 'sonner';
import MaskedBalance from '../components/MaskedBalance';
import Sparkline from '../components/Sparkline';
import { Button } from '@/components/ui/button';
import {
    usePsxStocks, useSyncPsxStocks, useSyncStockNews,
    usePsxSyncStatus, useBulkTickerHistory, useStockNews
} from '../hooks/useStocks';
import { useWatchlist, useAddToWatchlist, useRemoveFromWatchlist } from '../hooks/useWatchlist';
import { derivePositions, withWeights, groupSmallSlices, snapshotsInRange, widestUsableRange } from '../utils/portfolio';
import { colorsForSeries } from '../utils/tickerColors';
import Modal from '../components/Modal';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Slices below this share of the portfolio collapse into "Other" so the donut
// stays legible with 20+ holdings.
const SMALL_SLICE_THRESHOLD_PCT = 3;

// Prices older than this are flagged as stale. One trading day plus a margin
// for a sync that ran late.
const STALE_AFTER_HOURS = 30;

const RANGES = ['1M', '3M', '6M', '1Y', 'ALL'];

function relativeTime(date) {
    if (!date) return null;
    const minutes = Math.round((Date.now() - new Date(date).getTime()) / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} hr ago`;
    const days = Math.round(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
}

export default function Stocks() {
    const navigate = useNavigate();
    const { isUnlocked } = usePin();
    // ---- Server State ----
    const { data: snapshots = [], isLoading: loadingSnapshots } = usePsxSnapshots();
    const { data: brokerAccounts = [], isLoading: loadingBrokers } = useBrokerAccounts();
    const { data: liveStocks = [], isLoading: loadingLiveStocks } = usePsxStocks();

    // Mutations
    const uploadSnapshot = useUploadPsxSnapshot();
    const updateSummary = useUpdatePsxSummary();
    const deleteSnapshot = useDeletePsxSnapshot();
    const deleteSymbol = useDeleteSymbolFromSnapshot();
    const syncData = useSyncPsxData();
    const syncLiveStocks = useSyncPsxStocks();
    const syncStockNews = useSyncStockNews();
    const { data: dividends = [] } = useDividends();
    const syncDividendsMutation = useSyncDividends();
    const deleteDividendMutation = useDeleteDividend();
    const { data: syncStatus } = usePsxSyncStatus();
    const { data: watchlist = [] } = useWatchlist();
    const addToWatchlist = useAddToWatchlist();
    const removeFromWatchlist = useRemoveFromWatchlist();

    // ---- Derived portfolio state ----
    // Holdings come from the latest snapshot; watchlist tickers are kept in a
    // separate list. They used to be merged together with zero quantities,
    // which put ~14 zero-value slices in the allocation donut and rows with no
    // position in the holdings table.
    const latestSnapshot = snapshots.length > 0 ? snapshots[0] : null;
    const { positions, watchlistOnly } = derivePositions(snapshots, liveStocks, watchlist);
    const weightedPositions = withWeights(positions);

    // 30-day close series for everything shown on the page — holdings and
    // watchlist alike — in a single request rather than one per row.
    const historyTickers = [
        ...weightedPositions.map(p => p.symbol),
        ...watchlistOnly.map(w => w.symbol),
    ];
    const { data: priceHistory = {} } = useBulkTickerHistory(historyTickers, 30);

    /**
     * Real 30-day move, from stored daily closes. The previous version compared
     * against whichever snapshot happened to be ~30 days old, so it measured
     * "change since your last upload" rather than a 30-day move.
     */
    const get30dChange = (symbol) => {
        const series = priceHistory[symbol];
        if (!Array.isArray(series) || series.length < 2) return null;
        const first = Number(series[0].close);
        const last = Number(series[series.length - 1].close);
        if (!first || !last) return null;
        return ((last - first) / first) * 100;
    };

    /**
     * Trailing-twelve-month dividends per symbol, net of withholding tax.
     * The Dividend model carries both gross and net; net is what actually
     * reached the account, so that is what the yield is measured on.
     */
    const ttmDividendsBySymbol = (() => {
        const cutoff = new Date();
        cutoff.setFullYear(cutoff.getFullYear() - 1);
        const totals = {};
        for (const div of dividends) {
            if (!div.payment_date || new Date(div.payment_date) < cutoff) continue;
            const symbol = String(div.security_symbol || '').trim().toUpperCase();
            if (!symbol) continue;
            totals[symbol] = (totals[symbol] || 0) + Number(div.net_dividend_amount || 0);
        }
        return totals;
    })();

    const dividendYieldFor = (symbol, marketValue) => {
        const received = ttmDividendsBySymbol[symbol];
        if (!received || !marketValue) return null;
        return (received / marketValue) * 100;
    };

    // Legacy field names, kept so the rest of this page keeps working while the
    // derivation itself now lives in utils/portfolio.js.
    const consolidatedHoldings = weightedPositions.map(p => ({
        symbol: p.symbol,
        holding: p.quantity,
        cost_per_unit: p.avgCost,
        total_cost: p.totalCost,
        market_rate: p.marketPrice,
        custody_val: p.marketValue,
        today_gl: p.dayChange,
        weight_pct: p.weightPct,
        unrealised_gain: p.unrealisedGain,
        unrealised_gain_pct: p.unrealisedGainPct,
        live_data: p.isLive ? { companyName: p.companyName } : null,
    }));

    // ---- Local State ----
    const [showSummaryModal, setShowSummaryModal] = useState(false);
    const [showHtmlModal, setShowHtmlModal] = useState(false);
    const [htmlContent, setHtmlContent] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'custody_val', direction: 'desc' });
    const [isSyncing, setIsSyncing] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [openSnapshotId, setOpenSnapshotId] = useState(null);
    const [showDividendsModal, setShowDividendsModal] = useState(false);
    const [divHtmlContent, setDivHtmlContent] = useState('');
    const [isSyncingDividends, setIsSyncingDividends] = useState(false);
    const [showSyncForm, setShowSyncForm] = useState(false);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, title: '', description: '', onConfirm: null, isLoading: false });
    const [chartRange, setChartRange] = useState(null); // null = auto-pick
    const [showOtherBreakdown, setShowOtherBreakdown] = useState(false);
    const [expandedRow, setExpandedRow] = useState(null);
    const [activeTab, setActiveTab] = useState('holdings');
    const [newTicker, setNewTicker] = useState('');

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
    const [csvDate, setCsvDate] = useState(new Date().toISOString().split('T')[0]);
    const [summaryForm, setSummaryForm] = useState({
        trading_cash: '', market_value: '', working_capital: '', open_position: '',
        margin_req: '', total_worth: '', margin_pct: '', mark_to_market: '', blocked_profit: ''
    });

    if (loadingSnapshots || loadingBrokers) return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 transition-colors">PSX Engine</h1>
                <Skeleton className="h-10 w-32" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Skeleton className="h-32 rounded-2xl" />
                <Skeleton className="h-32 rounded-2xl" />
                <Skeleton className="h-32 rounded-2xl" />
            </div>
            <div className="flex flex-col gap-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        </div>
    );

    const currentCustody = latestSnapshot ? Number(latestSnapshot.total_custody) : 0;

    // ---- Filter & Sort Logic ----
    const handleSort = (key) => {
        let direction = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const renderSortIcon = (key) => {
        if (sortConfig.key !== key) return <ChevronDown className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-50" />;
        return sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />;
    };

    const filteredAndSortedHoldings = consolidatedHoldings.filter(stock => {
        const term = searchTerm.toLowerCase();
        const symbolMatch = stock.symbol.toLowerCase().includes(term);
        const nameMatch = stock.live_data?.companyName?.toLowerCase().includes(term) || false;
        return symbolMatch || nameMatch;
    }).sort((a, b) => {
        if (!sortConfig.key) return 0;
        
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        // Specific handling for derived keys
        if (sortConfig.key === 'total_gl') {
            aVal = a.custody_val - a.total_cost;
            bVal = b.custody_val - b.total_cost;
        } else if (sortConfig.key === 'change_pct') {
            const aCost = a.total_cost || 1;
            const bCost = b.total_cost || 1;
            aVal = (a.custody_val - a.total_cost) / aCost;
            bVal = (b.custody_val - b.total_cost) / bCost;
        } else if (sortConfig.key === 'perf_30d') {
            // Missing data sorts last in both directions rather than pretending
            // to be a very large loss.
            aVal = get30dChange(a.symbol) ?? -Infinity;
            bVal = get30dChange(b.symbol) ?? -Infinity;
        } else if (sortConfig.key === 'div_yield') {
            aVal = dividendYieldFor(a.symbol, a.custody_val) ?? -Infinity;
            bVal = dividendYieldFor(b.symbol, b.custody_val) ?? -Infinity;
        } else if (sortConfig.key === 'today_pct') {
             const aPrev = a.custody_val - (a.today_gl || 0);
             const bPrev = b.custody_val - (b.today_gl || 0);
             aVal = aPrev > 0 ? (a.today_gl || 0) / aPrev : 0;
             bVal = bPrev > 0 ? (b.today_gl || 0) / bPrev : 0;
        } else if (sortConfig.key === 'symbol') {
            // String comparison for symbol
            return sortConfig.direction === 'asc' 
                ? a.symbol.localeCompare(b.symbol) 
                : b.symbol.localeCompare(a.symbol);
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

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

    const handleDividendSync = async () => {
        if (!divHtmlContent.trim()) return;
        setIsSyncingDividends(true);

        try {
            const parser = new DOMParser();
            // Wrap in table to ensure it's valid HTML for parser if only rows are pasted
            const doc = parser.parseFromString(`<table>${divHtmlContent}</table>`, 'text/html');
            const rows = doc.querySelectorAll('tr.mat-row');

            const parsedDividends = Array.from(rows).map(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length < 9) return null;

                const eventId = cells[0].textContent.trim();
                const symbol = cells[1].textContent.trim();
                const securityName = cells[2].textContent.trim();
                const iban = cells[3].textContent.trim();
                const financialYear = cells[4].textContent.trim();
                const grossAmount = parseFloat(cells[5].textContent.trim().replace(/,/g, ''));
                const netAmount = parseFloat(cells[6].textContent.trim().replace(/,/g, ''));
                const status = cells[7].textContent.trim();

                // Parse date DD/MM/YYYY to YYYY-MM-DD
                const dateParts = cells[8].textContent.trim().split('/');
                const paymentDate = dateParts.length === 3 ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}` : null;

                const reason = cells[9]?.textContent.trim() || '';

                return {
                    event_id: eventId,
                    security_symbol: symbol,
                    security_name: securityName,
                    iban,
                    financial_year: financialYear,
                    gross_dividend_amount: grossAmount,
                    net_dividend_amount: netAmount,
                    status,
                    payment_date: paymentDate,
                    reason
                };
            }).filter(d => d !== null);

            if (parsedDividends.length === 0) {
                toast.error('No dividend records found in the pasted HTML');
                return;
            }

            await syncDividendsMutation.mutateAsync(parsedDividends);
            toast.success(`Successfully synced ${parsedDividends.length} dividend records`);
            setDivHtmlContent('');
            setShowSyncForm(false);
        } catch (error) {
            console.error('Dividend Sync Error:', error);
            toast.error('Failed to parse dividend HTML');
        } finally {
            setIsSyncingDividends(false);
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

    return (
        <div className="">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 transition-colors">Stocks Tracker</h1>

                <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3 w-full md:w-auto">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="h-10 px-4 shadow-none w-full sm:w-auto">
                                Sync Actions <ChevronDown className="w-4 h-4 ml-2 opacity-70" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-48 p-1.5 shadow-xl border-neutral-100 dark:border-neutral-800 rounded-xl">
                            <div className="flex flex-col space-y-0.5">
                                <Button
                                    variant="ghost"
                                    onClick={async () => {
                                        try {
                                            const result = await syncLiveStocks.mutateAsync();
                                            if (result?.success) {
                                                toast.success(`✓ ${result.message}`);
                                            } else if (result?.message) {
                                                toast.warning(result.message);
                                            } else {
                                                toast.success('Live stock prices synced.');
                                            }
                                        } catch (error) {
                                            toast.error(error.response?.data?.message || error.message || 'Failed to sync live stock prices');
                                        }
                                    }}
                                    disabled={syncLiveStocks.isPending}
                                    className="justify-start w-full text-sm h-9 px-2.5 font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                >
                                    {syncLiveStocks.isPending ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                    )}
                                    Sync Live Data
                                </Button>

                                <Button
                                    variant="ghost"
                                    onClick={async () => {
                                        try {
                                            const result = await syncStockNews.mutateAsync();
                                            if (result?.success) {
                                                toast.success(result.message || '✓ News synced successfully');
                                                if (result.details?.failed?.length > 0) {
                                                    const failedList = result.details.failed.map(f => `${f.ticker} (${f.reason})`).join(', ');
                                                    toast.info(`⚠ Could not fetch news for: ${failedList}`, { duration: 5000 });
                                                }
                                            } else if (result?.message) {
                                                toast.warning(result.message);
                                            } else {
                                                toast.success('News sync completed');
                                            }
                                        } catch (error) {
                                            const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to sync stock news';
                                            toast.error(errorMsg);
                                        }
                                    }}
                                    disabled={syncStockNews.isPending}
                                    className="justify-start w-full text-sm h-9 px-2.5 font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                >
                                    {syncStockNews.isPending ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Newspaper className="w-4 h-4 mr-2" />
                                    )}
                                    Sync News
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>

                    <Button
                        variant="outline"
                        onClick={() => {
                            setHtmlContent('');
                            setShowHtmlModal(true);
                        }}
                        className="h-10 px-4 w-full sm:w-auto shadow-none"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Add Stocks
                    </Button>

                    <Button
                        variant="outline"
                        onClick={() => setShowDividendsModal(true)}
                        className="h-10 px-4 w-full sm:w-auto shadow-none"
                    >
                        Dividends
                    </Button>
                </div>
            </div>

            {/* Broker Accounts Header */}
            {brokerAccounts.length > 0 && (
                <Card className="overflow-hidden mb-8 transition-colors">
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
                </Card>
            )}


            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                {(() => {
                    const totalMarketValue = consolidatedHoldings.reduce((sum, h) => sum + h.custody_val, 0);
                    const computedTotalCost = consolidatedHoldings.reduce((sum, h) => sum + h.total_cost, 0);
                    const totalGL = totalMarketValue - computedTotalCost;
                    const totalGLPct = computedTotalCost > 0 ? (totalGL / computedTotalCost) * 100 : 0;
                    const todayTotalGL = consolidatedHoldings.reduce((sum, h) => sum + (h.today_gl || 0), 0);
                    const liveCoverageCount = liveStocks.length;

                    // Dividends received on holdings, net of withholding tax. The
                    // price-only gain above ignores these entirely, which
                    // materially understates return on a high-yield PSX book.
                    const totalDividendsNet = dividends.reduce(
                        (sum, d) => sum + Number(d.net_dividend_amount || 0), 0,
                    );
                    const totalReturnWithDivs = totalGL + totalDividendsNet;
                    const totalReturnPct = computedTotalCost > 0
                        ? (totalReturnWithDivs / computedTotalCost) * 100
                        : null;

                    // Annualised return over the snapshot history. Needs a start
                    // date and both directions of cashflow, so it stays null
                    // until there is enough history to mean anything.
                    const annualisedReturnPct = (() => {
                        if (snapshots.length < 2 || computedTotalCost <= 0) return null;
                        const oldest = [...snapshots].sort(
                            (a, b) => new Date(a.snapshot_date) - new Date(b.snapshot_date),
                        )[0];
                        const years = (Date.now() - new Date(oldest.snapshot_date).getTime())
                            / (1000 * 60 * 60 * 24 * 365);
                        // Under a couple of months, annualising amplifies noise
                        // into a number that looks authoritative and isn't.
                        if (years < 0.15) return null;
                        const growth = (totalMarketValue + totalDividendsNet) / computedTotalCost;
                        if (growth <= 0) return null;
                        return (growth ** (1 / years) - 1) * 100;
                    })();

                    const lastSyncedAt = syncStatus?.lastSyncedAt;
                    const syncAgeHours = lastSyncedAt
                        ? (Date.now() - new Date(lastSyncedAt).getTime()) / 3_600_000
                        : null;
                    const isStale = syncAgeHours === null || syncAgeHours > STALE_AFTER_HOURS;

                    // Compute chronological data for sparklines
                    const chronSnapshots = [...snapshots].reverse();
                    
                    const marketValueSparkline = {
                        grid: { left: 0, right: 0, top: 5, bottom: 0 },
                        xAxis: { type: 'category', show: false, data: chronSnapshots.map(s => s.snapshot_date) },
                        yAxis: { type: 'value', show: false, scale: true },
                        series: [{
                            data: chronSnapshots.map(s => Number(s.total_custody)),
                            type: 'line', smooth: true, symbol: 'none',
                            lineStyle: { width: 2, color: '#10b981' },
                            areaStyle: { color: 'rgba(16, 185, 129, 0.1)' }
                        }],
                        tooltip: { show: false }
                    };

                    const glSparkline = {
                        grid: { left: 0, right: 0, top: 5, bottom: 0 },
                        xAxis: { type: 'category', show: false, data: chronSnapshots.map(s => s.snapshot_date) },
                        yAxis: { type: 'value', show: false, scale: true },
                        series: [{
                            data: chronSnapshots.map(s => Number(s.total_custody) - Number(s.total_invested)),
                            type: 'line', smooth: true, symbol: 'none',
                            lineStyle: { width: 2, color: totalGL >= 0 ? '#10b981' : '#ef4444' },
                            areaStyle: { color: totalGL >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }
                        }],
                        tooltip: { show: false }
                    };

                    return (
                        <>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Cost</CardTitle>
                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                        <Database className="w-4 h-4 text-blue-600 dark:text-blue-500" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <MaskedBalance 
                                        value={computedTotalCost} 
                                        className="text-2xl font-bold text-gray-900 dark:text-gray-100" 
                                        iconClassName="!opacity-100"
                                    />
                                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                                        All-time capital invested
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Market Value</CardTitle>
                                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                                        <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex justify-between items-end gap-2">
                                        <div>
                                            <MaskedBalance 
                                                value={totalMarketValue} 
                                                className="text-2xl font-bold text-gray-900 dark:text-gray-100" 
                                                iconClassName="!opacity-100"
                                            />
                                            <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1 flex-wrap">
                                                {liveCoverageCount > 0 ? (
                                                    <>Live · {liveCoverageCount} tickers</>
                                                ) : (
                                                    <>Based on latest snapshot</>
                                                )}
                                                {lastSyncedAt && (
                                                    <>
                                                        <span className="text-gray-300 dark:text-gray-600">·</span>
                                                        <span className={isStale ? 'text-amber-600 dark:text-amber-500 font-medium' : ''}>
                                                            updated {relativeTime(lastSyncedAt)}
                                                        </span>
                                                    </>
                                                )}
                                                {isStale && (
                                                    <Badge variant="outline" className="h-4 px-1 text-[9px] border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-500">
                                                        {lastSyncedAt ? 'stale' : 'never synced'}
                                                    </Badge>
                                                )}
                                            </p>
                                        </div>
                                        <div className="w-24 h-10">
                                            {chronSnapshots.length > 1 && (
                                                <ReactECharts option={marketValueSparkline} style={{ height: '100%', width: '100%' }} />
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="relative overflow-hidden">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                                    <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                        Total Gain/Loss
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <Info className="w-3.5 h-3.5 text-gray-400" />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p className="text-xs max-w-[220px]">
                                                        Unrealised profit/loss on price alone. Total return adds
                                                        dividends received, net of withholding tax.
                                                    </p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </CardTitle>
                                    <div className={`p-2 rounded-lg ${totalGL >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                                        {totalGL >= 0 ? (
                                            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                                        ) : (
                                            <TrendingDown className="w-4 h-4 text-red-500 dark:text-red-400" />
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="relative z-10">
                                    <div className="flex justify-between items-end gap-2">
                                        <div>
                                            <MaskedBalance 
                                                value={fmtGL(totalGL)} 
                                                className={`text-2xl font-bold ${glColor(totalGL)}`} 
                                                iconClassName="!opacity-100"
                                                isCurrency={false}
                                            />
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className={`text-[10px] font-medium ${glColor(totalGL)} flex items-center gap-0.5`}>
                                                    {totalGLPct >= 0 ? '+' : ''}{totalGLPct.toFixed(2)}% ROI
                                                </p>
                                                <span className="text-[10px] text-gray-300 dark:text-gray-600">|</span>
                                                <p className={`text-[10px] font-medium ${glColor(todayTotalGL)} flex items-center gap-0.5`}>
                                                    {todayTotalGL >= 0 ? '+' : ''}{fmtPKR(todayTotalGL)} Today
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                {totalDividendsNet > 0 && (
                                                    <p className={`text-[10px] font-medium ${glColor(totalReturnWithDivs)}`}>
                                                        {totalReturnPct >= 0 ? '+' : ''}{totalReturnPct.toFixed(2)}% incl. dividends
                                                    </p>
                                                )}
                                                {annualisedReturnPct !== null && (
                                                    <>
                                                        {totalDividendsNet > 0 && <span className="text-[10px] text-gray-300 dark:text-gray-600">|</span>}
                                                        <p className={`text-[10px] font-medium ${glColor(annualisedReturnPct)}`}>
                                                            {annualisedReturnPct >= 0 ? '+' : ''}{annualisedReturnPct.toFixed(2)}% p.a.
                                                        </p>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="w-24 h-10">
                                            {chronSnapshots.length > 1 && (
                                                <ReactECharts option={glSparkline} style={{ height: '100%', width: '100%' }} />
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                                <div className={`absolute -right-6 -bottom-6 w-32 h-32 rounded-full opacity-10 ${totalGL >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                            </Card>
                        </>
                    );
                })()}
            </div>

            {/* Visual Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {(() => {
                    // A line needs two points. Pick the narrowest range that has
                    // them; if no range does, show an empty state rather than a
                    // single dot floating on an axis.
                    const autoRange = widestUsableRange(snapshots, RANGES);
                    const activeRange = chartRange || autoRange;
                    const rangeSnapshots = activeRange ? snapshotsInRange(snapshots, activeRange) : [];
                    const hasTrend = rangeSnapshots.length >= 2;

                    const performanceOptions = {
                        tooltip: {
                            trigger: 'axis',
                            axisPointer: { type: 'cross' },
                            valueFormatter: (value) => fmtPKR(value),
                        },
                        legend: { data: ['Market Value', 'Total Cost'], bottom: 0 },
                        grid: { left: '3%', right: '4%', bottom: '12%', top: '10%', containLabel: true },
                        xAxis: {
                            type: 'category', boundaryGap: false,
                            data: rangeSnapshots.map(s => fmtDateShort(s.snapshot_date)),
                        },
                        yAxis: {
                            type: 'value',
                            axisLabel: {
                                formatter: (value) => (Math.abs(value) >= 1_000_000
                                    ? `${(value / 1_000_000).toFixed(1)}M`
                                    : `${Math.round(value / 1000)}k`),
                            },
                        },
                        series: [
                            {
                                name: 'Market Value', type: 'line', smooth: true,
                                data: rangeSnapshots.map(s => Number(s.total_custody)),
                                areaStyle: { opacity: 0.1 },
                                itemStyle: { color: '#10b981' },
                            },
                            {
                                name: 'Total Cost', type: 'line', smooth: true,
                                data: rangeSnapshots.map(s => Number(s.total_invested)),
                                itemStyle: { color: '#3b82f6' },
                            },
                        ],
                    };

                    const { slices, otherMembers } = groupSmallSlices(weightedPositions, SMALL_SLICE_THRESHOLD_PCT);
                    const allocationOptions = {
                        color: colorsForSeries(slices),
                        tooltip: {
                            trigger: 'item',
                            formatter: (p) => `${p.name}<br/>${fmtPKR(p.value)} · ${p.percent.toFixed(1)}%`,
                        },
                        legend: {
                            type: 'scroll', orient: 'vertical', right: 0, top: 'center',
                            itemWidth: 10, itemHeight: 10,
                            textStyle: { fontSize: 11, color: '#6b7280' },
                            formatter: (name) => {
                                const slice = slices.find(s => s.name === name);
                                return slice ? `${name}  ${slice.weightPct.toFixed(1)}%` : name;
                            },
                        },
                        series: [{
                            name: 'Allocation',
                            type: 'pie',
                            radius: ['40%', '70%'],
                            center: ['35%', '50%'],
                            avoidLabelOverlap: false,
                            itemStyle: { borderRadius: 8, borderColor: 'transparent', borderWidth: 2 },
                            label: { show: false, position: 'center' },
                            emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold' } },
                            labelLine: { show: false },
                            data: slices.map(s => ({ value: s.value, name: s.name })),
                        }],
                    };

                    return (
                        <>
                            <Card className="border border-gray-100 dark:border-neutral-800 shadow-sm transition-colors bg-white dark:bg-neutral-900">
                                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                                    <CardTitle className="text-sm font-bold text-gray-900 dark:text-gray-100">Portfolio Performance</CardTitle>
                                    {autoRange && (
                                        <div className="flex gap-1">
                                            {RANGES.map(range => {
                                                const enabled = snapshotsInRange(snapshots, range).length >= 2;
                                                return (
                                                    <button
                                                        key={range}
                                                        type="button"
                                                        disabled={!enabled}
                                                        onClick={() => setChartRange(range)}
                                                        className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${
                                                            activeRange === range
                                                                ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                                                                : enabled
                                                                    ? 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-neutral-800'
                                                                    : 'text-gray-300 dark:text-neutral-700 cursor-not-allowed'
                                                        }`}
                                                    >
                                                        {range}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </CardHeader>
                                <CardContent>
                                    {hasTrend ? (
                                        <ReactECharts option={performanceOptions} style={{ height: '300px', width: '100%' }} notMerge />
                                    ) : (
                                        <div className="h-[300px] flex flex-col items-center justify-center text-center px-6">
                                            <Activity className="w-8 h-8 text-gray-300 dark:text-neutral-700 mb-3" />
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Not enough history to chart yet
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
                                                Portfolio history starts after your second snapshot. One is captured
                                                automatically each trading day — or upload a CDC statement to add one now.
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="border border-gray-100 dark:border-neutral-800 shadow-sm transition-colors bg-white dark:bg-neutral-900">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-bold text-gray-900 dark:text-gray-100">Asset Allocation</CardTitle>
                                    <CardDescription className="text-xs text-gray-500 dark:text-gray-400">
                                        By holding · {weightedPositions.length} position{weightedPositions.length === 1 ? '' : 's'}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {weightedPositions.length > 0 ? (
                                        <>
                                            <ReactECharts option={allocationOptions} style={{ height: '300px', width: '100%' }} notMerge />
                                            {otherMembers.length > 0 && (
                                                <div className="mt-2 border-t border-gray-100 dark:border-neutral-800 pt-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowOtherBreakdown(v => !v)}
                                                        className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                                                    >
                                                        {showOtherBreakdown ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                                        Other — {otherMembers.length} holdings under {SMALL_SLICE_THRESHOLD_PCT}%
                                                    </button>
                                                    {showOtherBreakdown && (
                                                        <ul className="mt-2 space-y-1">
                                                            {otherMembers.map(member => (
                                                                <li key={member.name} className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                                                                    <span className="font-medium">{member.name}</span>
                                                                    <span className="tabular-nums">
                                                                        {fmtPKR(member.value)} · {member.weightPct.toFixed(2)}%
                                                                    </span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="h-[300px] flex flex-col items-center justify-center text-center px-6">
                                            <Briefcase className="w-8 h-8 text-gray-300 dark:text-neutral-700 mb-3" />
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No holdings yet</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                Upload a CDC snapshot to see your allocation.
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </>
                    );
                })()}
            </div>

            {/* Holdings / Watchlist tabs */}
            <div className="flex items-center gap-1 mb-4 border-b border-gray-200 dark:border-neutral-800">
                {[
                    { id: 'holdings', label: 'Holdings', count: consolidatedHoldings.length },
                    { id: 'watchlist', label: 'Watchlist', count: watchlistOnly.length },
                ].map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                            activeTab === tab.id
                                ? 'border-gray-900 text-gray-900 dark:border-gray-100 dark:text-gray-100'
                                : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                        }`}
                    >
                        {tab.label}
                        <span className="ml-1.5 text-xs text-gray-400 dark:text-gray-500">{tab.count}</span>
                    </button>
                ))}
            </div>

            {/* Watchlist — tickers tracked but not held. These used to be mixed
                into the holdings table as zero-quantity rows. */}
            {activeTab === 'watchlist' && (
                <Card className="mb-4 overflow-hidden text-sm transition-colors">
                    <CardHeader className="px-6 py-5 border-b border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-800/50 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                        <div>
                            <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100">Watchlist</CardTitle>
                            <CardDescription className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Tickers you track but do not hold. Excluded from portfolio totals and allocation.
                            </CardDescription>
                        </div>
                        <form
                            className="flex items-center gap-2"
                            onSubmit={(e) => {
                                e.preventDefault();
                                const ticker = newTicker.trim().toUpperCase();
                                if (!ticker) return;
                                addToWatchlist.mutate({ ticker }, {
                                    onSuccess: () => { setNewTicker(''); toast.success(`${ticker} added to watchlist`); },
                                    onError: () => toast.error('Could not add that ticker'),
                                });
                            }}
                        >
                            <Input
                                value={newTicker}
                                onChange={(e) => setNewTicker(e.target.value)}
                                placeholder="Add ticker (e.g. HUBC)"
                                className="h-9 w-44 uppercase"
                                maxLength={20}
                            />
                            <Button type="submit" size="sm" disabled={addToWatchlist.isPending || !newTicker.trim()}>
                                {addToWatchlist.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            </Button>
                        </form>
                    </CardHeader>
                    <CardContent className="p-0">
                        {watchlistOnly.length === 0 ? (
                            <div className="px-6 py-12 text-center">
                                <Eye className="w-8 h-8 text-gray-300 dark:text-neutral-700 mx-auto mb-3" />
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Nothing on your watchlist</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Add a ticker above to follow its price without holding it.
                                </p>
                            </div>
                        ) : (
                            <table className="min-w-full">
                                <thead className="bg-gray-50 dark:bg-neutral-800/50 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    <tr>
                                        <th className="px-6 py-3 text-left">Symbol</th>
                                        <th className="px-6 py-3 text-right">Price</th>
                                        <th className="px-6 py-3 text-right">Day Change</th>
                                        <th className="px-6 py-3 text-right">30d</th>
                                        <th className="px-6 py-3 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                                    {watchlistOnly.map(item => (
                                        <tr key={item.symbol} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors">
                                            <td className="px-6 py-3">
                                                <button
                                                    type="button"
                                                    onClick={() => navigate(`/stocks/${item.symbol}`)}
                                                    className="flex flex-col items-start text-left"
                                                >
                                                    <span className="font-bold text-blue-600 dark:text-blue-400 underline underline-offset-2">{item.symbol}</span>
                                                    {item.companyName && (
                                                        <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[180px]">
                                                            {item.companyName}
                                                        </span>
                                                    )}
                                                </button>
                                            </td>
                                            <td className="px-6 py-3 text-right font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                                                {item.marketPrice !== null ? fmtPKR(item.marketPrice) : <span className="text-gray-400 text-xs">no quote</span>}
                                            </td>
                                            <td className={`px-6 py-3 text-right tabular-nums ${glColor(item.dayChangePct ?? 0)}`}>
                                                {item.dayChangePct !== null && item.dayChangePct !== undefined
                                                    ? `${item.dayChangePct >= 0 ? '+' : ''}${item.dayChangePct.toFixed(2)}%`
                                                    : <span className="text-gray-400 text-xs">—</span>}
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="flex justify-end">
                                                    <Sparkline data={priceHistory[item.symbol] || []} width={72} height={24} />
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-gray-400 hover:text-red-600 h-8 px-2"
                                                    disabled={removeFromWatchlist.isPending}
                                                    onClick={() => removeFromWatchlist.mutate(item.symbol, {
                                                        onSuccess: () => toast.success(`${item.symbol} removed`),
                                                        onError: () => toast.error('Could not remove that ticker'),
                                                    })}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Current Holdings Data Table */}
            {activeTab === 'holdings' && latestSnapshot && (
                <Card className="mb-4 overflow-hidden text-sm transition-colors">
                    <CardHeader className="px-6 py-5 border-b border-gray-100 dark:border-neutral-800 flex flex-col sm:flex-row justify-between sm:items-center bg-gray-50 dark:bg-neutral-800/50 transition-colors space-y-4 sm:space-y-0">
                        <div className="flex items-center gap-3">
                            <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100">Latest Holdings</CardTitle>
                            <span className="px-3 py-1 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-gray-300 rounded-full text-xs font-medium flex items-center transition-colors">
                                <Clock className="w-3 h-3 mr-1" />
                                {fmtDateLong(latestSnapshot.snapshot_date)}
                            </span>
                        </div>
                        <div className="relative w-full sm:w-64">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <Input 
                                placeholder="Search symbol or company..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 h-9 text-xs shadow-none border-gray-200 dark:border-neutral-700"
                            />
                        </div>
                    </CardHeader>

                    <CardContent className="p-0 overflow-x-auto max-h-[600px] overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-800 transition-colors relative">
                            <thead className="bg-white dark:bg-neutral-900 tracking-wider text-xs font-bold text-gray-900 dark:text-gray-100 uppercase text-left transition-colors sticky top-0 z-20 shadow-sm">
                                <tr>
                                    <th className="px-6 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors group" onClick={() => handleSort('symbol')}>
                                        <div className="flex items-center">Symbol {renderSortIcon('symbol')}</div>
                                    </th>
                                    <th className="px-6 py-4 text-right cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors group" onClick={() => handleSort('holding')}>
                                        <div className="flex items-center justify-end">Quantity {renderSortIcon('holding')}</div>
                                    </th>
                                    <th className="px-6 py-4 text-right cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors group" onClick={() => handleSort('cost_per_unit')}>
                                        <div className="flex items-center justify-end">Cost/Unit {renderSortIcon('cost_per_unit')}</div>
                                    </th>
                                    <th className="px-6 py-4 text-right cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors group" onClick={() => handleSort('total_cost')}>
                                        <div className="flex items-center justify-end">Total Cost {renderSortIcon('total_cost')}</div>
                                    </th>
                                    <th className="px-6 py-4 text-right cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors group" onClick={() => handleSort('market_rate')}>
                                        <div className="flex items-center justify-end">Market Price {renderSortIcon('market_rate')}</div>
                                    </th>
                                    <th className="px-6 py-4 text-right cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors group" onClick={() => handleSort('total_gl')}>
                                        <div className="flex items-center justify-end gap-1">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        <span className="border-b border-dotted border-gray-400">Total G/L</span>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p className="text-xs">Unrealized profit/loss based on total cost</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                            {renderSortIcon('total_gl')}
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-right cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors group" onClick={() => handleSort('custody_val')}>
                                        <div className="flex items-center justify-end">Current Value {renderSortIcon('custody_val')}</div>
                                    </th>
                                    <th className="px-6 py-4 text-right cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors group" onClick={() => handleSort('weight_pct')}>
                                        <div className="flex items-center justify-end gap-1">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        <span className="border-b border-dotted border-gray-400">Weight</span>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p className="text-xs">Share of total portfolio market value</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                            {renderSortIcon('weight_pct')}
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-right cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors group" onClick={() => handleSort('div_yield')}>
                                        <div className="flex items-center justify-end gap-1">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        <span className="border-b border-dotted border-gray-400">Yield</span>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p className="text-xs max-w-[220px]">
                                                            Trailing 12-month dividends received, net of withholding tax,
                                                            over current market value.
                                                        </p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                            {renderSortIcon('div_yield')}
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-right cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors group" onClick={() => handleSort('today_gl')}>
                                        <div className="flex items-center justify-end">Today G/L {renderSortIcon('today_gl')}</div>
                                    </th>
                                    <th className="px-6 py-4 text-right cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors group" onClick={() => handleSort('perf_30d')}>
                                        <div className="flex items-center justify-end gap-1">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        <span className="border-b border-dotted border-gray-400">30d</span>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p className="text-xs">30-day move from stored daily closing prices</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                            {renderSortIcon('perf_30d')}
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-neutral-900 divide-y divide-gray-100 dark:divide-neutral-800 transition-colors">
                                {(() => {
                                    const canHighlight = filteredAndSortedHoldings.length > 3;
                                    const topGainerSymbol = canHighlight ? [...filteredAndSortedHoldings].reduce((prev, curr) => (curr.custody_val - curr.total_cost) > (prev.custody_val - prev.total_cost) ? curr : prev).symbol : null;
                                    const topLoserSymbol = canHighlight ? [...filteredAndSortedHoldings].reduce((prev, curr) => (curr.custody_val - curr.total_cost) < (prev.custody_val - prev.total_cost) ? curr : prev).symbol : null;
                                    const topValueSymbol = canHighlight ? [...filteredAndSortedHoldings].reduce((prev, curr) => curr.custody_val > prev.custody_val ? curr : prev).symbol : null;

                                    return filteredAndSortedHoldings.map((stock) => {
                                        const computedChange = stock.custody_val - stock.total_cost;
                                        const changePct = stock.total_cost > 0 ? (computedChange / stock.total_cost) * 100 : 0;
                                        const todayGl = stock.today_gl || 0;
                                        const prevVal = stock.custody_val - todayGl;
                                        const todayPct = prevVal > 0 ? (todayGl / prevVal) * 100 : 0;

                                        let rowBgClass = 'hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer transition-colors';
                                        if (stock.symbol === topGainerSymbol) rowBgClass += ' bg-emerald-50/30 dark:bg-emerald-900/10';
                                        else if (stock.symbol === topLoserSymbol) rowBgClass += ' bg-red-50/30 dark:bg-red-900/10';
                                        else if (stock.symbol === topValueSymbol) rowBgClass += ' bg-blue-50/30 dark:bg-blue-900/10';

                                        return (
                                            <Fragment key={stock.symbol}>
                                            <tr
                                                onClick={() => navigate(`/stocks/${stock.symbol.trim()}`)}
                                                className={`${rowBgClass} ${stock.holding === 0 ? 'opacity-60 grayscale-[0.5]' : ''}`}
                                            >
                                            <td className="px-6 py-3 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        aria-label={expandedRow === stock.symbol ? 'Collapse details' : 'Expand details'}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setExpandedRow(expandedRow === stock.symbol ? null : stock.symbol);
                                                        }}
                                                        className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                                                    >
                                                        {expandedRow === stock.symbol
                                                            ? <ChevronDown className="w-4 h-4" />
                                                            : <ChevronRight className="w-4 h-4" />}
                                                    </button>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-blue-600 dark:text-blue-400 underline underline-offset-2">{stock.symbol}</span>
                                                        {stock.live_data?.companyName && (
                                                            <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
                                                                {stock.live_data.companyName}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 whitespace-nowrap text-right text-gray-600 dark:text-gray-300 font-medium">
                                                {Number(stock.holding).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-3 whitespace-nowrap text-right text-gray-500 dark:text-gray-400">
                                                {fmtPKR(stock.cost_per_unit)}
                                            </td>
                                            <td className="px-6 py-3 whitespace-nowrap text-right text-gray-600 dark:text-gray-300">
                                                {fmtPKR(stock.total_cost)}
                                            </td>
                                            <td className="px-6 py-3 whitespace-nowrap text-right font-bold text-gray-900 dark:text-gray-100">
                                                {fmtPKR(stock.market_rate)}
                                                {stock.live_data && (
                                                    <div className="flex items-center justify-end gap-1">
                                                        <span className="size-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-normal uppercase tracking-tighter">Live</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-3 whitespace-nowrap text-right">
                                                <div className={`font-medium ${glColor(computedChange)} flex flex-col items-end`}>
                                                    <span>{fmtPKR(computedChange)}</span>
                                                    <span className="text-[10px] opacity-80">{changePct > 0 ? '+' : ''}{changePct.toFixed(2)}% Total</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 whitespace-nowrap text-right font-semibold text-emerald-700 dark:text-emerald-400">
                                                {fmtPKR(stock.custody_val)}
                                            </td>
                                            <td className="px-6 py-3 whitespace-nowrap text-right text-gray-600 dark:text-gray-300 tabular-nums">
                                                {(stock.weight_pct ?? 0).toFixed(1)}%
                                            </td>
                                            <td className="px-6 py-3 whitespace-nowrap text-right tabular-nums">
                                                {(() => {
                                                    const yieldPct = dividendYieldFor(stock.symbol, stock.custody_val);
                                                    if (yieldPct === null) {
                                                        return <span className="text-gray-400 text-[10px]">—</span>;
                                                    }
                                                    return (
                                                        <span className="text-gray-700 dark:text-gray-300">{yieldPct.toFixed(2)}%</span>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-6 py-3 whitespace-nowrap text-right font-medium">
                                                <div className="flex flex-col items-end">
                                                    <span className={`text-sm font-semibold ${glColor(todayGl)}`}>
                                                        {todayGl > 0 ? '+' : ''}{fmtPKR(todayGl)}
                                                    </span>
                                                    <span className={`text-[10px] ${glColor(todayGl)} opacity-80`}>
                                                        {todayPct > 0 ? '+' : ''}{todayPct.toFixed(2)}% Today
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 whitespace-nowrap text-right">
                                                {(() => {
                                                    const perf = get30dChange(stock.symbol);
                                                    const series = priceHistory[stock.symbol] || [];
                                                    return (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Sparkline data={series} width={56} height={24} />
                                                            {perf === null ? (
                                                                <span className="text-gray-400 text-[10px] w-12 text-right">—</span>
                                                            ) : (
                                                                <span className={`text-xs font-bold ${glColor(perf)} w-12 text-right`}>
                                                                    {perf >= 0 ? '+' : ''}{perf.toFixed(1)}%
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-6 py-3 whitespace-nowrap text-center">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500" onClick={(e) => e.stopPropagation()}>
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-40 border-gray-200 dark:border-neutral-800">
                                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/stocks/${stock.symbol.trim()}`); }}>
                                                            <Eye className="w-4 h-4 mr-2" /> View Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowDividendsModal(true); }}>
                                                            <Gift className="w-4 h-4 mr-2" /> Dividends
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator className="bg-gray-100 dark:bg-neutral-800" />
                                                        <DropdownMenuItem 
                                                            className="text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteSymbolFromSnapshot(latestSnapshot.id, stock.symbol); }}
                                                        >
                                                            <Trash2 className="w-4 h-4 mr-2" /> Remove Log
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                        {expandedRow === stock.symbol && (
                                            <tr className="bg-gray-50/70 dark:bg-neutral-800/30">
                                                <td colSpan={12} className="px-6 py-4">
                                                    <HoldingDetail
                                                        ticker={stock.symbol}
                                                        position={stock}
                                                        ttmDividend={ttmDividendsBySymbol[stock.symbol] || 0}
                                                    />
                                                </td>
                                            </tr>
                                        )}
                                        </Fragment>
                                    );
                                });
                                })()}
                                {filteredAndSortedHoldings.length === 0 && (
                                    <tr>
                                        <td colSpan={12} className="px-6 py-8 text-center text-gray-500">
                                            {consolidatedHoldings.length === 0
                                                ? 'No holdings yet — upload a CDC snapshot to get started.'
                                                : 'No stocks found matching your search.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot className="bg-gray-50 dark:bg-neutral-800/50 font-bold text-gray-900 dark:text-gray-100 text-xs text-right">
                                <tr>
                                    <td colSpan={3} className="px-6 py-3 uppercase tracking-wider">Total Cost</td>
                                    <td className="px-6 py-3">{fmtPKR(consolidatedHoldings.reduce((sum, h) => sum + h.total_cost, 0))}</td>
                                    <td colSpan={2} className="px-6 py-3 uppercase tracking-wider">Total Market Value</td>
                                    <td className="px-6 py-3 text-emerald-700 dark:text-emerald-400">{fmtPKR(consolidatedHoldings.reduce((sum, h) => sum + h.custody_val, 0))}</td>
                                    <td colSpan={2} className="px-6 py-3"></td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="flex justify-end">
                                            <span className={`font-bold ${glColor(consolidatedHoldings.reduce((sum, h) => sum + h.today_gl, 0))}`}>
                                                {fmtPKR(consolidatedHoldings.reduce((sum, h) => sum + h.today_gl, 0))}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3"></td>
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
                    </CardContent>
                </Card>
            )}


            {/* Snapshot History List (Collapsible) */}
            {snapshots.length > 1 && (
                <Card className="mb-4 overflow-hidden transition-colors">
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
                </Card>
            )}



            {/* The "Portfolio Growth vs Investment" chart that used to sit here
                plotted the same two series from the same snapshots as the
                Portfolio Performance chart above, just without range controls.
                Removed rather than maintained in two places. */}

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

            {/* Dividends Modal */}
            {showDividendsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                                    <Gift className="w-6 h-6 text-emerald-600 dark:text-emerald-500" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Stock Dividends</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage and sync your dividend payouts</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setShowSyncForm(!showSyncForm)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${showSyncForm
                                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                                        : 'bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-neutral-700'
                                        }`}
                                >
                                    <RefreshCw className={`w-4 h-4 ${showSyncForm ? 'rotate-180' : ''} transition-transform duration-500`} />
                                    {showSyncForm ? 'Close Sync' : 'Sync New Dividends'}
                                </button>
                                <button onClick={() => setShowDividendsModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                    <Plus className="w-6 h-6 rotate-45" />
                                </button>
                            </div>
                        </div>
                        {/* Sync Area with Smooth Grid Transition */}
                        <div className={`grid transition-all duration-500 ease-in-out ${showSyncForm ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                            <div className="overflow-hidden">
                                <div className="p-6 pb-2">
                                    <Card className="bg-gray-50/50 dark:bg-neutral-800/30 border-dashed">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-sm font-bold">Sync New Dividends</CardTitle>
                                            <CardDescription className="text-xs">
                                                Paste the dividends table HTML from your broker portal to sync records.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <textarea
                                                className="w-full h-32 p-3 border border-gray-200 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-900 text-xs font-mono dark:text-gray-300 focus:ring-2 focus:ring-emerald-500 transition-colors mb-3"
                                                placeholder="Paste <tr>...</tr> or <table> content here..."
                                                value={divHtmlContent}
                                                onChange={(e) => setDivHtmlContent(e.target.value)}
                                            />
                                            <div className="flex justify-end">
                                                <Button
                                                    onClick={handleDividendSync}
                                                    disabled={isSyncingDividends}
                                                    size="sm"
                                                    className="px-6"
                                                >
                                                    {isSyncingDividends ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                                                    Sync Records
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                                <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/20">
                                    <p className="text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-bold mb-1">Total Dividends</p>
                                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                                        {fmtPKR(dividends.reduce((sum, d) => sum + Number(d.net_dividend_amount), 0))}
                                    </p>
                                    <p className="text-[10px] text-emerald-500 mt-1">{dividends.length} Records Total</p>
                                </div>
                                {Array.from(new Set(dividends.map(d => d.security_symbol))).slice(0, 3).map(symbol => {
                                    const symbolDivs = dividends.filter(d => d.security_symbol === symbol);
                                    const symbolTotal = symbolDivs.reduce((sum, d) => sum + Number(d.net_dividend_amount), 0);
                                    return (
                                        <div key={symbol} className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-gray-100 dark:border-neutral-700">
                                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold mb-1">{symbol}</p>
                                            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{fmtPKR(symbolTotal)}</p>
                                            <p className="text-[10px] text-gray-400 mt-1">{symbolDivs.length} Payouts</p>
                                        </div>
                                    );
                                })}
                            </div>



                            {/* Dividends Table */}
                            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-100 dark:border-neutral-800 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs text-left whitespace-nowrap">
                                        <thead>
                                            <tr className="bg-gray-50 dark:bg-neutral-800/50 text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold">
                                                <th className="px-4 py-3">Event ID</th>
                                                <th className="px-4 py-3">Symbol</th>
                                                <th className="px-4 py-3">Year</th>
                                                <th className="px-4 py-3 text-right">Gross (PKR)</th>
                                                <th className="px-4 py-3 text-right">Net (PKR)</th>
                                                <th className="px-4 py-3">Status</th>
                                                <th className="px-4 py-3">Payment Date</th>
                                                <th className="px-4 py-3 text-center">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                                            {dividends.map((div) => (
                                                <tr key={div.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors">
                                                    <td className="px-4 py-3 font-mono text-gray-500">{div.event_id}</td>
                                                    <td className="px-4 py-3 font-bold text-gray-900 dark:text-gray-100">{div.security_symbol}</td>
                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{div.financial_year}</td>
                                                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{fmtPKR(div.gross_dividend_amount)}</td>
                                                    <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{fmtPKR(div.net_dividend_amount)}</td>
                                                    <td className="px-4 py-3">
                                                        <Badge
                                                            variant={div.status?.toLowerCase() === 'paid' ? 'default' : 'secondary'}
                                                            className={`text-[10px] font-bold uppercase ${div.status?.toLowerCase() === 'paid'
                                                                ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                                                : 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                                                                }`}
                                                        >
                                                            {div.status}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{fmtDate(div.payment_date)}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => deleteDividendMutation.mutate(div.id)}
                                                            className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {dividends.length === 0 && (
                                                <tr>
                                                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400 italic">No dividend records found. Paste HTML to sync.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-800/30 flex justify-end">
                            <Button onClick={() => setShowDividendsModal(false)} variant="outline">Close</Button>
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

/**
 * Expanded detail for one holding: position summary plus recent news.
 *
 * News was already being scraped into StockNews and surfaced on StockDetail,
 * but nothing on this page displayed it — there was only a "Sync News" button
 * that fetched data the user then had to navigate away to read.
 *
 * Per-lot buy/sell breakdown belongs here too, but StockTransaction is not
 * written by the web app yet, so there are no lots to show.
 */
function HoldingDetail({ ticker, position, ttmDividend }) {
    const { data: news = [], isLoading } = useStockNews(ticker);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                    Position
                </h4>
                <dl className="space-y-1 text-xs">
                    {[
                        ['Quantity', Number(position.holding).toLocaleString()],
                        ['Average cost', fmtPKR(position.cost_per_unit)],
                        ['Market price', fmtPKR(position.market_rate)],
                        ['Portfolio weight', `${(position.weight_pct ?? 0).toFixed(2)}%`],
                        ['Dividends (12m, net)', ttmDividend > 0 ? fmtPKR(ttmDividend) : '—'],
                    ].map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-4">
                            <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
                            <dd className="font-medium text-gray-900 dark:text-gray-100 tabular-nums">{value}</dd>
                        </div>
                    ))}
                </dl>
                <p className="mt-3 text-[10px] text-gray-400 dark:text-gray-500 leading-relaxed">
                    Individual buy and sell lots are not tracked yet, so average cost
                    comes from your latest CDC snapshot.
                </p>
            </div>

            <div className="lg:col-span-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                    <Newspaper className="w-3.5 h-3.5" /> Recent news
                </h4>
                {isLoading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-2/3" />
                    </div>
                ) : news.length === 0 ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        No news stored for {ticker}. Use Sync Actions → Sync News to fetch the latest.
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {news.slice(0, 5).map(item => (
                            <li key={item.link}>
                                <a
                                    href={item.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline line-clamp-2"
                                >
                                    {item.title}
                                </a>
                                <p className="text-[10px] text-gray-400 dark:text-gray-500">
                                    {item.source || 'Unknown source'} · {fmtDateLong(item.publishedAt)}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
