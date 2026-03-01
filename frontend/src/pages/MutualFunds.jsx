import { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import { Upload, Plus, ChevronDown, ChevronRight, Loader2, Trash2, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { StatSkeleton, ChartSkeleton, TableSkeleton } from '../components/Skeleton';
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
    const [formData, setFormData] = useState({
        fund_name: '', fund_symbol: '', units: '', current_nav: '', invested_amount: ''
    });

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
            setSnapshots(res.data || []);
        } catch (error) {
            console.error('Error fetching snapshots', error);
        }
    };

    useEffect(() => { fetchFunds(); fetchSnapshots(); }, []);

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

    const handleCreateManually = async (e) => {
        e.preventDefault();
        try {
            await api.post('/mutual-funds', formData);
            setShowForm(false);
            setFormData({ fund_name: '', fund_symbol: '', units: '', current_nav: '', invested_amount: '' });
            fetchFunds();
        } catch (error) {
            console.error('Error adding fund', error);
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Delete "${name}" from your portfolio?`)) return;
        try {
            await api.delete(`/mutual-funds/${id}`);
            setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
            fetchFunds();
        } catch (error) {
            console.error('Error deleting fund', error);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!window.confirm(`Delete ${selectedIds.size} selected fund(s)?`)) return;
        try {
            await api.post('/mutual-funds/bulk-delete', { ids: Array.from(selectedIds) });
            setSelectedIds(new Set());
            fetchFunds();
        } catch (error) {
            console.error('Error bulk deleting', error);
        }
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    };
    const toggleSelectAll = () => {
        setSelectedIds(prev => prev.size === funds.length ? new Set() : new Set(funds.map(f => f.id)));
    };

    // Computed
    const funds = data?.funds || [];
    const totalValue = funds.reduce((s, f) => s + Number(f.current_value), 0);
    const totalToDate = funds.reduce((s, f) => s + Number(f.gain_loss_since_inception), 0);
    const totalInvested = funds.reduce((s, f) => s + Number(f.invested_amount), 0);

    const theme = { primary: "bg-[#7c2889] dark:bg-[#a855f7]", textPrimary: "text-[#7c2889] dark:text-[#a855f7]" };
    const fmtPKR = (v) => Number(v).toLocaleString('en-PK', { maximumFractionDigits: 0 });
    const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const pctChange = (curr, prev) => prev === 0 ? 0 : (((curr - prev) / Math.abs(prev)) * 100).toFixed(2);

    // --- ECharts: Bar Chart (value vs invested per fund) ---
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

    // --- ECharts: Pie Chart (allocation) ---
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

    // --- ECharts: Portfolio Timeline (from snapshots) ---
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
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <div className="h-8 w-48 bg-gray-200 dark:bg-neutral-800 rounded animate-pulse mb-2"></div>
                    <div className="h-4 w-64 bg-gray-200 dark:bg-neutral-800 rounded animate-pulse"></div>
                </div>
                <div className="h-10 w-32 bg-gray-200 dark:bg-neutral-800 rounded animate-pulse"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <StatSkeleton />
                <StatSkeleton />
                <StatSkeleton />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <ChartSkeleton />
                <ChartSkeleton />
            </div>
            <TableSkeleton rows={4} />
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mutual Funds</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Portfolio Tracker</p>
                </div>
                <div className="flex items-center gap-3">
                    <input type="file" accept=".csv,.xlsx,.xls" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                    <button onClick={() => fileInputRef.current?.click()} disabled={isUploading}
                        className="flex items-center px-4 py-2.5 bg-gray-900 dark:bg-neutral-800 text-white text-sm font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-neutral-700 disabled:opacity-70 transition-all shadow-sm">
                        {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                        Upload File
                    </button>
                    <button onClick={() => setShowForm(!showForm)}
                        className="flex items-center px-4 py-2.5 border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 transition-all">
                        <Plus className="w-4 h-4 mr-2" /> Add Manual
                    </button>
                </div>
            </div>

            {uploadMessage && (
                <div className="px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm font-medium rounded-lg border border-emerald-200 dark:border-emerald-800/50">{uploadMessage}</div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-100 dark:border-neutral-800 shadow-sm p-5 transition-colors">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Portfolio Value</span>
                    <div className={`text-2xl font-bold mt-1 ${theme.textPrimary}`}>PKR {fmtPKR(totalValue)}</div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{funds.length} active funds</p>
                </div>
                <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-100 dark:border-neutral-800 shadow-sm p-5 transition-colors">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Gain/Loss (To Date)</span>
                    <div className={`text-2xl font-bold mt-1 ${totalToDate >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                        {totalToDate >= 0 ? '+' : ''}PKR {fmtPKR(totalToDate)}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{totalInvested > 0 ? `${pctChange(totalValue, totalInvested)}% return` : 'Since inception'}</p>
                </div>
                <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-100 dark:border-neutral-800 shadow-sm p-5 transition-colors">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Invested</span>
                    <div className="text-2xl font-bold mt-1 text-gray-900 dark:text-gray-100">PKR {fmtPKR(totalInvested)}</div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{snapshots.length} upload(s) recorded</p>
                </div>
            </div>

            {/* Charts Row */}
            {funds.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

            {/* Portfolio Timeline Chart */}
            {timelineOption && (
                <div className="bg-white dark:bg-neutral-900 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-800 transition-colors">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Portfolio Timeline</h3>
                    <ReactECharts option={timelineOption} style={{ height: 300 }} />
                </div>
            )}

            {/* Manual Entry Form */}
            {showForm && (
                <form onSubmit={handleCreateManually} className="bg-blue-50/70 dark:bg-neutral-800/50 p-5 rounded-xl border border-blue-200 dark:border-neutral-700 transition-colors">
                    <h3 className="font-semibold text-blue-800 dark:text-blue-400 mb-4 text-sm">Manual Portfolio Entry</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
                        <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Fund Name</label>
                            <input required placeholder="Meezan Sovereign Fund" type="text" value={formData.fund_name} onChange={e => setFormData({ ...formData, fund_name: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Symbol</label>
                            <input required placeholder="MSF" type="text" value={formData.fund_symbol} onChange={e => setFormData({ ...formData, fund_symbol: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Units</label>
                            <input required placeholder="1500.55" type="number" step="0.0001" value={formData.units} onChange={e => setFormData({ ...formData, units: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">NAV (PKR)</label>
                            <input required placeholder="55.18" type="number" step="0.0001" value={formData.current_nav} onChange={e => setFormData({ ...formData, current_nav: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Invested (PKR)</label>
                            <input required placeholder="100000" type="number" step="0.01" value={formData.invested_amount} onChange={e => setFormData({ ...formData, invested_amount: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" />
                        </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors">Cancel</button>
                        <button type="submit" className={`px-4 py-2 ${theme.primary} text-white text-sm font-medium rounded-lg hover:opacity-90 transition-colors`}>Save Record</button>
                    </div>
                </form>
            )}

            {/* Current Holdings Table */}
            <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden transition-colors">
                <div className="bg-gray-50 dark:bg-neutral-800/50 px-5 py-3 flex justify-between items-center border-b border-gray-100 dark:border-neutral-800 transition-colors">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Current Holdings</span>
                        {selectedIds.size > 0 && (
                            <button onClick={handleBulkDelete}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-lg hover:bg-red-600 transition-colors">
                                <Trash2 className="w-3 h-3" /> Delete {selectedIds.size} selected
                            </button>
                        )}
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{fmtDate(new Date())}</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead>
                            <tr className={`border-b border-gray-100 dark:border-neutral-800 ${theme.textPrimary} font-medium transition-colors`}>
                                <th className="px-5 py-3 w-10">
                                    <input type="checkbox" checked={funds.length > 0 && selectedIds.size === funds.length} onChange={toggleSelectAll}
                                        className="w-4 h-4 rounded border-gray-300 dark:border-neutral-600 text-purple-600 dark:bg-neutral-900 focus:ring-purple-500 cursor-pointer" />
                                </th>
                                <th className="px-5 py-3 font-medium">Funds</th>
                                <th className="px-5 py-3 font-medium">Type</th>
                                <th className="px-5 py-3 font-medium">Units</th>
                                <th className="px-5 py-3 font-medium">NAV</th>
                                <th className="px-5 py-3 font-medium text-right">Investment Value</th>
                                <th className="px-5 py-3 font-medium text-right">Gain/Loss (To Date)</th>
                                <th className="px-5 py-3 w-14"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-neutral-800/50">
                            {funds.map((fund) => {
                                const isSelected = selectedIds.has(fund.id);
                                const gl = Number(fund.gain_loss_since_inception);
                                const inv = Number(fund.invested_amount);
                                const glPct = inv > 0 ? ((gl / inv) * 100).toFixed(1) : '0.0';
                                return (
                                    <tr key={fund.id} className={`hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors group ${isSelected ? 'bg-purple-50/40 dark:bg-purple-900/20' : ''}`}>
                                        <td className="px-5 py-3">
                                            <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(fund.id)}
                                                className="w-4 h-4 rounded border-gray-300 dark:border-neutral-600 text-purple-600 dark:bg-neutral-900 focus:ring-purple-500 cursor-pointer" />
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className={`${theme.primary} text-white px-3 py-1 rounded-md inline-flex items-center text-xs font-medium min-w-[4.5rem] justify-between`}>
                                                {fund.fund_symbol}
                                                <ChevronDown className="w-3 h-3 -rotate-90 opacity-70 ml-1" />
                                            </div>
                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 truncate max-w-[140px]">{fund.fund_name}</p>
                                        </td>
                                        <td className="px-5 py-3 text-gray-500 dark:text-gray-400 text-xs">
                                            {fund.fund_name?.includes(',') ? fund.fund_name.split(',')[1]?.trim() : '—'}
                                        </td>
                                        <td className="px-5 py-3 text-gray-600 dark:text-gray-300 font-medium">{Number(fund.units).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                                        <td className="px-5 py-3 text-gray-600 dark:text-gray-300 font-medium">{Number(fund.current_nav).toFixed(4)}</td>
                                        <td className="px-5 py-3 text-right text-gray-700 dark:text-gray-200 font-semibold">{Number(fund.current_value).toLocaleString()}</td>
                                        <td className="px-5 py-3 text-right font-medium">
                                            <span className={gl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}>
                                                {gl >= 0 ? '+' : ''}{gl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </span>
                                            <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-1">({glPct}%)</span>
                                        </td>
                                        <td className="px-5 py-3 text-center">
                                            <button onClick={() => handleDelete(fund.id, fund.fund_symbol)}
                                                className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors opacity-0 group-hover:opacity-100" title="Delete">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {funds.length === 0 && (
                                <tr><td colSpan="8" className="px-5 py-12 text-center text-gray-400 dark:text-gray-500">No portfolio data. Upload a file to get started.</td></tr>
                            )}
                        </tbody>
                        {funds.length > 0 && (
                            <tfoot>
                                <tr className="border-t-2 border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800/80 transition-colors">
                                    <td></td>
                                    <td colSpan="4" className="px-5 py-3 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Portfolio Total</td>
                                    <td className="px-5 py-3 text-right font-bold text-gray-900 dark:text-gray-100">{totalValue.toLocaleString()}</td>
                                    <td className="px-5 py-3 text-right font-bold">
                                        <span className={totalToDate >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}>
                                            {totalToDate >= 0 ? '+' : ''}{totalToDate.toLocaleString()}
                                        </span>
                                        <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-1">({pctChange(totalValue, totalInvested)}%)</span>
                                    </td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* Date-wise Snapshot History */}
            {snapshots.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-[#7c2889] dark:text-[#a855f7]" /> Upload History
                    </h2>
                    {snapshots.map((snap, idx) => {
                        const prevSnap = idx < snapshots.length - 1 ? snapshots[idx + 1] : null; // snapshots are desc
                        const isOpen = expandedSnap === snap.id;
                        const snapValue = Number(snap.total_value);
                        const snapGain = Number(snap.total_gain);
                        const snapInvested = Number(snap.total_invested);

                        // Compute changes vs previous snapshot
                        const prevValue = prevSnap ? Number(prevSnap.total_value) : null;
                        const valueChange = prevValue !== null ? snapValue - prevValue : null;
                        const valuePct = prevValue ? pctChange(snapValue, prevValue) : null;
                        const prevGain = prevSnap ? Number(prevSnap.total_gain) : null;
                        const gainChange = prevGain !== null ? snapGain - prevGain : null;

                        const fundsData = Array.isArray(snap.funds_data) ? snap.funds_data : [];
                        const prevFunds = prevSnap && Array.isArray(prevSnap.funds_data) ? prevSnap.funds_data : [];

                        return (
                            <div key={snap.id} className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden transition-colors">
                                {/* Snapshot Header */}
                                <button
                                    onClick={() => setExpandedSnap(isOpen ? null : snap.id)}
                                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
                                        <div className="text-left">
                                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{fmtDate(snap.upload_date)}</p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500">{fundsData.length} funds</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6 text-right">
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Value</p>
                                            <p className={`text-sm font-bold ${theme.textPrimary}`}>PKR {fmtPKR(snapValue)}</p>
                                            {valueChange !== null && (
                                                <p className={`text-[10px] font-medium flex items-center justify-end gap-0.5 ${valueChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                                                    {valueChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                    {valueChange >= 0 ? '+' : ''}{fmtPKR(valueChange)} ({valuePct}%)
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Gain/Loss</p>
                                            <p className={`text-sm font-bold ${snapGain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                                                {snapGain >= 0 ? '+' : ''}PKR {fmtPKR(snapGain)}
                                            </p>
                                            {gainChange !== null && (
                                                <p className={`text-[10px] font-medium ${gainChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                                                    {gainChange >= 0 ? '↑' : '↓'} {fmtPKR(Math.abs(gainChange))} vs prev
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Return</p>
                                            <p className={`text-sm font-bold ${snapGain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                                                {pctChange(snapValue, snapInvested)}%
                                            </p>
                                        </div>
                                    </div>
                                </button>

                                {/* Expanded Fund Details */}
                                {isOpen && (
                                    <div className="border-t border-gray-100 dark:border-neutral-800 transition-colors">
                                        <table className="w-full text-xs text-left whitespace-nowrap">
                                            <thead>
                                                <tr className="bg-gray-50 dark:bg-neutral-800/50 text-gray-500 dark:text-gray-400 transition-colors">
                                                    <th className="px-5 py-2 font-medium">Fund</th>
                                                    <th className="px-5 py-2 font-medium">Units</th>
                                                    <th className="px-5 py-2 font-medium">NAV</th>
                                                    <th className="px-5 py-2 font-medium text-right">Value</th>
                                                    <th className="px-5 py-2 font-medium text-right">Gain/Loss</th>
                                                    {prevSnap && <th className="px-5 py-2 font-medium text-right">Δ Value</th>}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50 dark:divide-neutral-800/50">
                                                {fundsData.map((f, fi) => {
                                                    const pf = prevFunds.find(p => p.fund_name === f.fund_name);
                                                    const dv = pf ? f.value - pf.value : null;
                                                    return (
                                                        <tr key={fi} className="hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors">
                                                            <td className="px-5 py-2.5">
                                                                <span className="font-semibold text-gray-800 dark:text-gray-200">{f.fund_symbol}</span>
                                                                <span className="text-gray-400 dark:text-gray-500 ml-1">{f.fund_name?.includes(',') ? f.fund_name.split(',')[1]?.trim() : ''}</span>
                                                            </td>
                                                            <td className="px-5 py-2.5 text-gray-600 dark:text-gray-400">{Number(f.units).toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                                                            <td className="px-5 py-2.5 text-gray-600 dark:text-gray-400">{Number(f.nav).toFixed(4)}</td>
                                                            <td className="px-5 py-2.5 text-right font-medium text-gray-700 dark:text-gray-200">{Number(f.value).toLocaleString()}</td>
                                                            <td className="px-5 py-2.5 text-right font-medium">
                                                                <span className={f.gain_loss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}>
                                                                    {f.gain_loss >= 0 ? '+' : ''}{Number(f.gain_loss).toLocaleString()}
                                                                </span>
                                                            </td>
                                                            {prevSnap && (
                                                                <td className="px-5 py-2.5 text-right font-medium">
                                                                    {dv !== null ? (
                                                                        <span className={dv >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}>
                                                                            {dv >= 0 ? '+' : ''}{dv.toLocaleString()}
                                                                        </span>
                                                                    ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                                                                </td>
                                                            )}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
