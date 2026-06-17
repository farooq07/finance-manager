import { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'sonner';
import { Upload, Plus, ChevronDown, ChevronRight, Loader2, Trash2, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import Modal from '../components/Modal';
import ReactECharts from 'echarts-for-react';
import { StatSkeleton, ChartSkeleton, TableSkeleton } from '../components/Skeleton';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import MaskedBalance from '../components/MaskedBalance';
const COLORS = ['#7c2889', '#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

export default function MutualFunds() {
    const [data, setData] = useState({ funds: [], portfolioSummary: {} });
    const [snapshots, setSnapshots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadMessage, setUploadMessage] = useState('');
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [expandedSnap, setExpandedSnap] = useState(null);
    const fileInputRef = useRef(null);

    const [showForm, setShowForm] = useState(false);
    const [isSavingManual, setIsSavingManual] = useState(false);
    const [formData, setFormData] = useState({
        fund_name: '', fund_symbol: '', units: '', current_nav: '', invested_amount: ''
    });

    const [showHtmlModal, setShowHtmlModal] = useState(false);
    const [htmlContent, setHtmlContent] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    const [selectedSnapIds, setSelectedSnapIds] = useState(new Set());
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, title: '', description: '', onConfirm: null, isLoading: false });

    const fetchFunds = async () => {
        try {
            const res = await api.get('/mutual-funds');
            if (Array.isArray(res.data)) {
                setData({ funds: res.data, portfolioSummary: {} });
            } else {
                setData(res.data || { funds: [], portfolioSummary: {} });
            }
        } catch (error) {
            console.error('Error fetching funds', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSnapshots = async () => {
        try {
            const res = await api.get('/mutual-funds/snapshots');
            const snaps = res.data || [];
            setSnapshots(snaps);
            if (snaps.length > 0 && expandedSnap === null) {
                setExpandedSnap(snaps[0].id);
            }
        } catch (error) {
            console.error('Error fetching snapshots', error);
        }
    };

    useEffect(() => { fetchFunds(); fetchSnapshots(); }, []);

    // Close the manual-entry modal on Escape
    useEffect(() => {
        if (!showForm) return;
        const onKey = (e) => { if (e.key === 'Escape' && !isSavingManual) resetManualForm(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [showForm, isSavingManual]);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsUploading(true);
        setUploadMessage('');
        const form = new FormData();
        form.append('portfolioCSV', file);
        try {
            const res = await api.post('/mutual-funds/upload', form, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setUploadMessage(res.data.message);
            fetchFunds();
            fetchSnapshots();
        } catch (error) {
            setUploadMessage('Error uploading file.');
            console.error('Upload error', error);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const resetManualForm = () => {
        setShowForm(false);
        setFormData({ fund_name: '', fund_symbol: '', units: '', current_nav: '', invested_amount: '' });
    };

    const handleCreateManually = async (e) => {
        e.preventDefault();
        if (isSavingManual) return;
        setIsSavingManual(true);
        try {
            await api.post('/mutual-funds', formData);
            toast.success(`${formData.fund_name?.trim() || 'Fund'} added to your portfolio`);
            resetManualForm();
            fetchFunds();
        } catch (error) {
            console.error('Error adding fund', error);
            const msg = error.response?.data?.errors?.[0]?.message
                || error.response?.data?.message
                || 'Failed to add fund. Check the values and try again.';
            toast.error(msg);
        } finally {
            setIsSavingManual(false);
        }
    };

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
            let headerRowIndex = allRows.findIndex(row => {
                const text = row.textContent.toLowerCase();
                return text.includes('fund') || text.includes('units') || text.includes('nav');
            });
            if (headerRowIndex === -1) {
                toast.error('Could not identify a header row. Ensure your table contains column names like "Funds", "Units", or "NAV".');
                return;
            }
            const headerCells = Array.from(allRows[headerRowIndex].querySelectorAll('th, td'));
            const headers = headerCells.map(el => el.textContent.trim());
            const dataRows = allRows.slice(headerRowIndex + 1).map(row => {
                const cells = Array.from(row.querySelectorAll('td'));
                if (cells.length === 0) return null;
                const rowData = {};
                headers.forEach((header, i) => {
                    if (cells[i]) rowData[header] = cells[i].textContent.trim();
                });
                return rowData;
            }).filter(r => r !== null && Object.keys(r).length > 2);
            if (dataRows.length === 0) {
                toast.error(`Found headers: [${headers.join(', ')}], but no valid data rows below them.`);
                return;
            }
            const res = await api.post('/mutual-funds/sync-data', { rows: dataRows });
            setUploadMessage(res.data.message);
            setShowHtmlModal(false);
            setHtmlContent('');
            fetchFunds();
            fetchSnapshots();
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
                    await api.delete(`/mutual-funds/snapshots/${id}`);
                    setSelectedSnapIds(prev => { const n = new Set(prev); n.delete(id); return n; });
                    fetchSnapshots();
                    toast.success('Snapshot deleted');
                } catch (error) {
                    toast.error('Failed to delete snapshot');
                } finally {
                    setDeleteModal({ isOpen: false });
                }
            }
        });
    };

    const handleBulkDeleteSnapshots = () => {
        if (selectedSnapIds.size === 0) return;
        setDeleteModal({
            isOpen: true,
            title: 'Bulk Delete Snapshots',
            description: `Are you sure you want to delete ${selectedSnapIds.size} selected snapshot(s)?`,
            onConfirm: async () => {
                setDeleteModal(prev => ({ ...prev, isLoading: true }));
                try {
                    await api.post('/mutual-funds/snapshots/bulk-delete', { ids: Array.from(selectedSnapIds) });
                    setSelectedSnapIds(new Set());
                    fetchSnapshots();
                    toast.success('Snapshots deleted');
                } catch (error) {
                    toast.error('Failed to bulk delete snapshots');
                } finally {
                    setDeleteModal({ isOpen: false });
                }
            }
        });
    };

    const handleDeleteFundFromSnapshot = (snapId, symbol) => {
        setDeleteModal({
            isOpen: true,
            title: 'Remove Fund',
            description: `Are you sure you want to remove ${symbol} from this snapshot?`,
            onConfirm: async () => {
                setDeleteModal(prev => ({ ...prev, isLoading: true }));
                try {
                    await api.delete(`/mutual-funds/snapshots/${snapId}/funds/${symbol}`);
                    fetchSnapshots();
                    toast.success('Fund removed from snapshot');
                } catch (error) {
                    toast.error('Failed to remove fund');
                } finally {
                    setDeleteModal({ isOpen: false });
                }
            }
        });
    };

    const toggleSnapSelect = (id, e) => {
        e.stopPropagation();
        setSelectedSnapIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    };

    const handleDelete = (id, name) => {
        setDeleteModal({
            isOpen: true,
            title: 'Delete Fund',
            description: `Are you sure you want to delete "${name}" from your portfolio?`,
            onConfirm: async () => {
                setDeleteModal(prev => ({ ...prev, isLoading: true }));
                try {
                    await api.delete(`/mutual-funds/${id}`);
                    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
                    fetchFunds();
                    toast.success('Fund deleted');
                } catch (error) {
                    toast.error('Failed to delete fund');
                } finally {
                    setDeleteModal({ isOpen: false });
                }
            }
        });
    };

    const handleBulkDelete = () => {
        if (selectedIds.size === 0) return;
        setDeleteModal({
            isOpen: true,
            title: 'Bulk Delete Funds',
            description: `Are you sure you want to delete ${selectedIds.size} selected fund(s)?`,
            onConfirm: async () => {
                setDeleteModal(prev => ({ ...prev, isLoading: true }));
                try {
                    await api.post('/mutual-funds/bulk-delete', { ids: Array.from(selectedIds) });
                    setSelectedIds(new Set());
                    fetchFunds();
                    toast.success('Funds deleted');
                } catch (error) {
                    toast.error('Failed to bulk delete');
                } finally {
                    setDeleteModal({ isOpen: false });
                }
            }
        });
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    };
    const toggleSelectAll = () => {
        setSelectedIds(prev => prev.size === funds.length ? new Set() : new Set(funds.map(f => f.id)));
    };

    const funds = data?.funds || [];
    const latestSnap = snapshots[0] || null;
    const totalValue = latestSnap ? Number(latestSnap.total_value) : funds.reduce((s, f) => s + Number(f.current_value), 0);
    const totalToDate = latestSnap ? Number(latestSnap.total_gain) : funds.reduce((s, f) => s + Number(f.gain_loss_since_inception), 0);
    const totalInvested = latestSnap ? Number(latestSnap.total_invested) : funds.reduce((s, f) => s + Number(f.invested_amount), 0);

    const theme = { primary: "bg-[#7c2889] dark:bg-[#a855f7]", textPrimary: "text-[#7c2889] dark:text-[#a855f7]" };
    const fmtPKR = (v) => Number(v).toLocaleString('en-PK', { maximumFractionDigits: 0 });
    const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const pctChange = (curr, prev) => prev === 0 ? 0 : (((curr - prev) / Math.abs(prev)) * 100).toFixed(2);

    // Live preview for the manual-entry modal
    const mUnits = parseFloat(formData.units) || 0;
    const mNav = parseFloat(formData.current_nav) || 0;
    const mInvested = parseFloat(formData.invested_amount) || 0;
    const mValue = mUnits * mNav;
    const mGain = mValue - mInvested;
    const showManualPreview = mUnits > 0 && mNav > 0;
    const manualInputClass = "w-full px-3 py-2 border border-gray-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c2889] transition-colors";
    const manualLabelClass = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5";

    const barOption = {
        tooltip: { trigger: 'axis', formatter: (p) => p.map(s => `${s.marker} ${s.seriesName}: PKR ${Number(s.value).toLocaleString()}`).join('<br/>') },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: { type: 'category', data: funds.filter(f => Number(f.current_value) > 0).map(f => f.fund_symbol), axisLine: { show: false }, axisTick: { show: false } },
        yAxis: { type: 'value', axisLabel: { formatter: (v) => `${(v / 1000).toFixed(0)}k` }, splitLine: { lineStyle: { type: 'dashed', color: '#E5E7EB' } } },
        series: [
            { name: 'Invested', type: 'bar', data: funds.filter(f => Number(f.current_value) > 0).map(f => Number(f.invested_amount)), itemStyle: { color: '#D1D5DB', borderRadius: [4, 4, 0, 0] }, barGap: '20%' },
            { name: 'Current Value', type: 'bar', data: funds.filter(f => Number(f.current_value) > 0).map(f => Number(f.current_value)), itemStyle: { color: '#7c2889', borderRadius: [4, 4, 0, 0] } }
        ]
    };

    const pieOption = {
        tooltip: { formatter: (p) => `${p.marker} ${p.name}: PKR ${Number(p.value).toLocaleString()} (${p.percent}%)` },
        series: [{
            type: 'pie', radius: ['45%', '70%'], center: ['50%', '50%'], padAngle: 2,
            label: { formatter: '{b} {d}%', fontSize: 11 },
            data: funds.filter(f => Number(f.current_value) > 0).map((f, i) => ({
                name: f.fund_symbol, value: Number(f.current_value), itemStyle: { color: COLORS[i % COLORS.length] }
            }))
        }]
    };

    const sortedSnaps = [...snapshots].sort((a, b) => new Date(a.upload_date) - new Date(b.upload_date));
    const timelineOption = sortedSnaps.length > 1 ? {
        tooltip: { trigger: 'axis', formatter: (p) => `${p[0].axisValue}<br/>` + p.map(s => `${s.marker} ${s.seriesName}: PKR ${Number(s.value).toLocaleString()}`).join('<br/>') },
        legend: { data: ['Portfolio Value', 'Total Invested', 'Gain/Loss'], bottom: 0, textStyle: { fontSize: 11 } },
        grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
        xAxis: { type: 'category', data: sortedSnaps.map(s => fmtDate(s.upload_date)), axisLine: { show: false }, axisTick: { show: false } },
        yAxis: { type: 'value', axisLabel: { formatter: (v) => `${(v / 1000).toFixed(0)}k` }, splitLine: { lineStyle: { type: 'dashed', color: '#E5E7EB' } } },
        series: [
            { name: 'Portfolio Value', type: 'line', data: sortedSnaps.map(s => Number(s.total_value)), smooth: true, lineStyle: { width: 3, color: '#7c2889' }, itemStyle: { color: '#7c2889' }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(124,40,137,0.25)' }, { offset: 1, color: 'rgba(124,40,137,0.02)' }] } } },
            { name: 'Total Invested', type: 'line', data: sortedSnaps.map(s => Number(s.total_invested)), smooth: true, lineStyle: { width: 2, color: '#9CA3AF', type: 'dashed' }, itemStyle: { color: '#9CA3AF' } },
            { name: 'Gain/Loss', type: 'bar', data: sortedSnaps.map(s => Number(s.total_gain)), itemStyle: { color: (p) => p.value >= 0 ? '#10b981' : '#ef4444', borderRadius: [4, 4, 0, 0] } }
        ]
    } : null;

    if (loading) return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-6">
                <div className="flex flex-col gap-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-10 w-32" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-32 rounded-xl" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Skeleton className="h-[300px] rounded-xl" />
                <Skeleton className="h-[300px] rounded-xl" />
            </div>
            <Skeleton className="h-64 w-full rounded-xl" />
        </div>
    );

    return (
        <div className="">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mutual Funds</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Portfolio Tracker</p>
                </div>
                <div className="flex items-center gap-3">
                    <input type="file" accept=".csv,.xlsx,.xls" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                    <Button
                        variant="secondary"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="shadow-sm"
                    >
                        {isUploading ? (
                            <Loader2 data-icon="inline-start" className="animate-spin" />
                        ) : (
                            <Upload data-icon="inline-start" />
                        )}
                        Upload File
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setShowHtmlModal(true)}
                        className="shadow-sm"
                    >
                        <Plus data-icon="inline-start" /> Paste HTML
                    </Button>
                    <Button variant="default" onClick={() => setShowForm(true)}>
                        <Plus data-icon="inline-start" /> Add Manual
                    </Button>
                </div>
            </div>

            {uploadMessage && (
                <div className="px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm font-medium rounded-lg border border-emerald-200 dark:border-emerald-800/50 mb-6">{uploadMessage}</div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-100 dark:border-neutral-800 shadow-sm p-5 transition-colors">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Portfolio Value</span>
                    <div className="mt-1">
                        <MaskedBalance value={totalValue} className={`text-2xl font-bold ${theme.textPrimary}`} />
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{funds.length} active funds</p>
                </div>
                <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-100 dark:border-neutral-800 shadow-sm p-5 transition-colors">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Gain/Loss (To Date)</span>
                    <div className="mt-1">
                        <MaskedBalance
                            value={totalToDate}
                            className={`text-2xl font-bold ${totalToDate >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}
                        />
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{totalInvested > 0 ? `${pctChange(totalValue, totalInvested)}% return` : 'Since inception'}</p>
                </div>
                <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-100 dark:border-neutral-800 shadow-sm p-5 transition-colors">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Invested</span>
                    <div className="mt-1">
                        <MaskedBalance value={totalInvested} className="text-2xl font-bold text-gray-900 dark:text-gray-100" />
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{snapshots.length} upload(s) recorded</p>
                </div>
            </div>

            {/* Charts Row */}
            {funds.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="bg-white dark:bg-neutral-900 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-800 transition-colors">
                        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Fund Value vs Invested</h3>
                        <ReactECharts option={barOption} style={{ height: 280 }} />
                    </div>
                    <div className="bg-white dark:bg-neutral-900 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-800 transition-colors">
                        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Portfolio Allocation</h3>
                        <ReactECharts option={pieOption} style={{ height: 280 }} />
                    </div>
                </div>
            )}

            {timelineOption && (
                <div className="bg-white dark:bg-neutral-900 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-800 transition-colors mb-6">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Portfolio Timeline</h3>
                    <ReactECharts option={timelineOption} style={{ height: 300 }} />
                </div>
            )}

            {showForm && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={resetManualForm}
                >
                    <Card
                        className="w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <CardHeader className="border-b border-gray-100 dark:border-neutral-800 flex flex-row justify-between items-center">
                            <div>
                                <CardTitle className="text-lg font-bold">Add Fund Manually</CardTitle>
                                <CardDescription>Enter a fund's holdings to add it to your portfolio.</CardDescription>
                            </div>
                            <Button variant="ghost" size="icon" onClick={resetManualForm} className="size-8 rounded-full" aria-label="Close">&times;</Button>
                        </CardHeader>
                        <CardContent className="p-6">
                            <form onSubmit={handleCreateManually} className="space-y-4">
                                <div>
                                    <label htmlFor="mf-name" className={manualLabelClass}>Fund Name</label>
                                    <input id="mf-name" required autoFocus placeholder="e.g. Meezan Islamic Fund" type="text" value={formData.fund_name} onChange={e => setFormData({ ...formData, fund_name: e.target.value })} className={manualInputClass} />
                                </div>
                                <div>
                                    <label htmlFor="mf-symbol" className={manualLabelClass}>Symbol</label>
                                    <input id="mf-symbol" required placeholder="e.g. MIF" type="text" value={formData.fund_symbol} onChange={e => setFormData({ ...formData, fund_symbol: e.target.value })} className={manualInputClass} />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label htmlFor="mf-units" className={manualLabelClass}>Units</label>
                                        <input id="mf-units" required min="0" placeholder="0.0000" type="number" step="0.0001" value={formData.units} onChange={e => setFormData({ ...formData, units: e.target.value })} className={manualInputClass} />
                                    </div>
                                    <div>
                                        <label htmlFor="mf-nav" className={manualLabelClass}>NAV (PKR)</label>
                                        <input id="mf-nav" required min="0" placeholder="0.0000" type="number" step="0.0001" value={formData.current_nav} onChange={e => setFormData({ ...formData, current_nav: e.target.value })} className={manualInputClass} />
                                    </div>
                                    <div>
                                        <label htmlFor="mf-invested" className={manualLabelClass}>Invested (PKR)</label>
                                        <input id="mf-invested" required min="0" placeholder="0.00" type="number" step="0.01" value={formData.invested_amount} onChange={e => setFormData({ ...formData, invested_amount: e.target.value })} className={manualInputClass} />
                                    </div>
                                </div>

                                {showManualPreview && (
                                    <div className="flex items-center justify-between gap-4 rounded-lg bg-gray-50 dark:bg-neutral-800/50 border border-gray-100 dark:border-neutral-800 px-4 py-3">
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium">Current Value</p>
                                            <p className="text-sm font-bold text-[#7c2889] dark:text-[#a855f7]">PKR {fmtPKR(mValue)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium">Gain / Loss</p>
                                            <p className={`text-sm font-bold flex items-center gap-1 justify-end ${mGain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                                                {mInvested > 0 && (mGain >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />)}
                                                {mGain >= 0 ? '+' : ''}{fmtPKR(mGain)}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-1">
                                    <Button variant="outline" type="button" onClick={resetManualForm} className="flex-1">Cancel</Button>
                                    <Button type="submit" disabled={isSavingManual} className="flex-1">
                                        {isSavingManual ? (
                                            <Loader2 data-icon="inline-start" className="animate-spin" />
                                        ) : (
                                            <Plus data-icon="inline-start" />
                                        )}
                                        Save Record
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}

            {showHtmlModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <Card className="w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
                        <CardHeader className="border-b border-gray-100 dark:border-neutral-800 flex flex-row justify-between items-center">
                            <div>
                                <CardTitle className="text-lg font-bold">Paste Table HTML</CardTitle>
                                <CardDescription>Paste the HTML code of the portfolio table from your statement.</CardDescription>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setShowHtmlModal(false)} className="size-8 rounded-full">&times;</Button>
                        </CardHeader>
                        <CardContent className="p-6">
                            <textarea value={htmlContent} onChange={(e) => setHtmlContent(e.target.value)} placeholder="<table>...</table>" className="w-full h-64 px-4 py-3 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl text-gray-900 dark:text-gray-100 text-sm font-mono focus:ring-2 focus:ring-[#7c2889] outline-none transition-all resize-none" />
                            <div className="flex gap-3 mt-6">
                                <Button variant="outline" onClick={() => setShowHtmlModal(false)} className="flex-1">Cancel</Button>
                                <Button
                                    onClick={handleHtmlSync}
                                    disabled={isSyncing || !htmlContent.trim()}
                                    className="flex-1"
                                >
                                    {isSyncing ? (
                                        <Loader2 data-icon="inline-start" className="animate-spin" />
                                    ) : (
                                        <TrendingUp data-icon="inline-start" />
                                    )}
                                    Sync Portfolio
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {snapshots.length > 0 && (
                <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-[#7c2889] dark:text-[#a855f7]" /> Upload History
                        </h2>
                        {selectedSnapIds.size > 0 && (
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleBulkDeleteSnapshots}
                                className="h-8 gap-1.5"
                            >
                                <Trash2 className="w-3.5 h-3.5" /> Delete Selected ({selectedSnapIds.size})
                            </Button>
                        )}
                    </div>

                    {snapshots.map((snap, idx) => {
                        const prevSnap = idx < snapshots.length - 1 ? snapshots[idx + 1] : null;
                        const isOpen = expandedSnap === snap.id;
                        const isSelected = selectedSnapIds.has(snap.id);
                        const snapValue = Number(snap.total_value);
                        const snapGain = Number(snap.total_gain);
                        const snapInvested = Number(snap.total_invested);
                        const prevValue = prevSnap ? Number(prevSnap.total_value) : null;
                        const valueChange = prevValue !== null ? snapValue - prevValue : null;
                        const valuePct = prevValue ? pctChange(snapValue, prevValue) : null;
                        const prevGain = prevSnap ? Number(prevSnap.total_gain) : null;
                        const gainChange = prevGain !== null ? snapGain - prevGain : null;

                        const fundsData = Array.isArray(snap.funds_data) ? snap.funds_data : [];
                        const prevFunds = prevSnap && Array.isArray(prevSnap.funds_data) ? prevSnap.funds_data : [];

                        return (
                            <div key={snap.id} className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden transition-colors">
                                <div className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer" onClick={() => setExpandedSnap(isOpen ? null : snap.id)}>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <input type="checkbox" checked={isSelected} onChange={(e) => toggleSnapSelect(snap.id, e)} onClick={(e) => e.stopPropagation()} className="w-4 h-4 rounded border-gray-300 text-[#7c2889] focus:ring-[#7c2889] cursor-pointer" />
                                            {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{fmtDate(snap.upload_date)}</p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500">{fundsData.length} funds</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8">
                                        <div className="hidden sm:block">
                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-medium">Value</p>
                                            <p className={`text-sm font-bold ${theme.textPrimary}`}>PKR {fmtPKR(snapValue)}</p>
                                            {valueChange !== null && (
                                                <p className={`text-[10px] font-medium flex items-center gap-0.5 ${valueChange >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                    {valueChange >= 0 ? '↑' : '↓'} {fmtPKR(Math.abs(valueChange))} ({valuePct}%)
                                                </p>
                                            )}
                                        </div>
                                        <div className="hidden sm:block">
                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-medium">Gain/Loss</p>
                                            <p className={`text-sm font-bold ${snapGain >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                {snapGain >= 0 ? '+' : ''}{fmtPKR(snapGain)}
                                            </p>
                                            {gainChange !== null && (
                                                <p className={`text-[10px] font-medium ${gainChange >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                    {gainChange >= 0 ? '↑' : '↓'} {fmtPKR(Math.abs(gainChange))}
                                                </p>
                                            )}
                                        </div>
                                        <div className="pl-4 border-l border-gray-100 dark:border-neutral-800 flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => { e.stopPropagation(); handleDeleteSnapshot(snap.id, snap.upload_date); }}
                                                className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {isOpen && (
                                    <div className="border-t border-gray-100 dark:border-neutral-800 transition-colors animate-in slide-in-from-top-2 duration-200">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs text-left whitespace-nowrap">
                                                <thead>
                                                    <tr className="bg-gray-50/50 dark:bg-neutral-800/30 text-gray-500 dark:text-gray-400">
                                                        <th className="px-5 py-2.5 font-medium">Fund</th>
                                                        <th className="px-5 py-2.5 font-medium">Units</th>
                                                        <th className="px-5 py-2.5 font-medium">NAV</th>
                                                        <th className="px-5 py-2.5 font-medium text-right">Value</th>
                                                        <th className="px-5 py-2.5 font-medium text-right">Gain/Loss</th>
                                                        <th className="px-5 py-2.5 font-medium text-center">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50 dark:divide-neutral-800/50">
                                                    {fundsData.map((f, fi) => (
                                                        <tr key={fi} className="hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors">
                                                            <td className="px-5 py-3">
                                                                <p className="font-semibold text-gray-800 dark:text-gray-200">{f.fund_symbol}</p>
                                                                <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate max-w-[150px]">{f.fund_name}</p>
                                                            </td>
                                                            <td className="px-5 py-3 text-gray-600 dark:text-gray-400">{Number(f.units).toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                                                            <td className="px-5 py-3 text-gray-600 dark:text-gray-400">{Number(f.nav).toFixed(4)}</td>
                                                            <td className="px-5 py-3 text-right font-medium text-gray-700 dark:text-gray-200">{Number(f.value).toLocaleString()}</td>
                                                            <td className="px-5 py-3 text-right font-medium">
                                                                <span className={f.gain_loss >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                                                                    {f.gain_loss >= 0 ? '+' : ''}{Number(f.gain_loss).toLocaleString()}
                                                                </span>
                                                            </td>
                                                            <td className="px-5 py-3 text-center">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={(e) => { e.stopPropagation(); handleDeleteFundFromSnapshot(snap.id, f.fund_symbol); }}
                                                                    className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                                    title={`Remove ${f.fund_symbol} from this history record`}
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
            {/* Global Delete Modal */}
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
