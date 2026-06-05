import { useState, useMemo } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import Papa from 'papaparse';
import {
    FileText, Calendar, PieChart, TrendingUp, ChevronRight,
    ChevronLeft, Download, Printer, Search, Filter,
    ArrowUpRight, ArrowDownRight, Loader2, AlertCircle,
    ChevronDown, ChevronUp, ChevronsLeft, ChevronsRight,
} from 'lucide-react';
import api from '../services/api';
import { fmtPKR } from '../utils/currency';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function anchorISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function fmtDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-PK', {
        day: '2-digit', month: 'short', year: 'numeric',
    });
}

function fmtMonth(year, month) {
    return new Date(year, month, 1).toLocaleDateString('en-PK', { month: 'short', year: 'numeric' });
}

function exportCSV(filename, fields, rows) {
    const csv = Papa.unparse({ fields, data: rows });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function exportPDF(title, subtitle, headers, rows) {
    const tableRows = rows
        .map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`)
        .join('');
    const html = `<!DOCTYPE html><html><head><title>${title}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 24px; }
  h1 { font-size: 18px; font-weight: 700; color: #065f46; }
  .meta { color: #6b7280; font-size: 10px; margin: 4px 0 16px; }
  table { width: 100%; border-collapse: collapse; }
  thead th { background: #059669; color: #fff; padding: 7px 10px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
  tbody td { padding: 6px 10px; border-bottom: 1px solid #e5e7eb; }
  tbody tr:nth-child(even) td { background: #f9fafb; }
  tfoot td { padding: 7px 10px; font-weight: 700; border-top: 2px solid #059669; }
  @media print { body { padding: 0; } }
</style></head><body>
<h1>${title}</h1>
<p class="meta">${subtitle} · Exported ${new Date().toLocaleString('en-PK')}</p>
<table>
  <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
  <tbody>${tableRows}</tbody>
</table>
</body></html>`;
    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
}

// ─── Shared UI ───────────────────────────────────────────────────────────────

function ExportBar({ onCSV, onPDF, count }) {
    return (
        <div className="flex items-center gap-2">
            {count !== undefined && (
                <span className="text-xs text-gray-400 dark:text-neutral-500 mr-1">{count} rows</span>
            )}
            <button
                onClick={onCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-neutral-700 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
            >
                <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button
                onClick={onPDF}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-neutral-700 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
            >
                <Printer className="w-3.5 h-3.5" /> PDF
            </button>
        </div>
    );
}

function MonthNav({ anchor, onPrev, onNext, onToday, label }) {
    return (
        <div className="flex items-center gap-1">
            <button onClick={onPrev} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-500 dark:text-neutral-400 transition-colors">
                <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 min-w-[110px] text-center">{label}</span>
            <button onClick={onNext} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-500 dark:text-neutral-400 transition-colors">
                <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={onToday} className="ml-1 text-xs px-2.5 py-1 rounded-lg border border-gray-200 dark:border-neutral-700 text-gray-500 dark:text-neutral-400 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
                Today
            </button>
        </div>
    );
}

function PeriodTabs({ period, onChange }) {
    return (
        <div className="flex gap-0.5 p-0.5 rounded-lg bg-gray-100 dark:bg-neutral-800">
            {['month', 'quarter', 'year'].map(p => (
                <button
                    key={p}
                    onClick={() => onChange(p)}
                    className={`px-3 py-1 text-xs rounded-md transition-colors capitalize font-medium ${period === p
                        ? 'bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                >
                    {p}
                </button>
            ))}
        </div>
    );
}

function SortIcon({ col, sortCol, sortDir }) {
    if (col !== sortCol) return <span className="opacity-20 text-gray-400"><ChevronDown className="w-3 h-3" /></span>;
    return sortDir === 'asc'
        ? <ChevronUp className="w-3 h-3 text-emerald-500" />
        : <ChevronDown className="w-3 h-3 text-emerald-500" />;
}

function Th({ col, label, sortCol, sortDir, onSort, right }) {
    return (
        <th
            onClick={() => onSort(col)}
            className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400 cursor-pointer select-none hover:text-gray-800 dark:hover:text-gray-200 transition-colors ${right ? 'text-right' : 'text-left'}`}
        >
            <span className="inline-flex items-center gap-1">
                {label}
                <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />
            </span>
        </th>
    );
}

function Pagination({ page, total, perPage, onChange }) {
    const totalPages = Math.ceil(total / perPage);
    if (totalPages <= 1) return null;
    return (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-neutral-800">
            <span className="text-xs text-gray-400 dark:text-neutral-500">
                Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
            </span>
            <div className="flex items-center gap-1">
                <button onClick={() => onChange(1)} disabled={page === 1} className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors text-gray-500 dark:text-neutral-400">
                    <ChevronsLeft className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => onChange(page - 1)} disabled={page === 1} className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors text-gray-500 dark:text-neutral-400">
                    <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let p;
                    if (totalPages <= 5) p = i + 1;
                    else if (page <= 3) p = i + 1;
                    else if (page >= totalPages - 2) p = totalPages - 4 + i;
                    else p = page - 2 + i;
                    return (
                        <button
                            key={p}
                            onClick={() => onChange(p)}
                            className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${page === p
                                ? 'bg-emerald-500 text-white'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800'
                            }`}
                        >
                            {p}
                        </button>
                    );
                })}
                <button onClick={() => onChange(page + 1)} disabled={page === totalPages} className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors text-gray-500 dark:text-neutral-400">
                    <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => onChange(totalPages)} disabled={page === totalPages} className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors text-gray-500 dark:text-neutral-400">
                    <ChevronsRight className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}

function LoadingRows({ cols }) {
    return Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="animate-pulse">
            {Array.from({ length: cols }).map((_, j) => (
                <td key={j} className="px-4 py-3">
                    <div className="h-3.5 bg-gray-300 dark:bg-neutral-700 rounded" style={{ width: `${60 + (j * 13) % 40}%` }} />
                </td>
            ))}
        </tr>
    ));
}

function EmptyRows({ cols, label = 'No data for this period.' }) {
    return (
        <tr>
            <td colSpan={cols} className="px-4 py-16 text-center text-sm text-gray-400 dark:text-neutral-500">
                <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-neutral-600" />
                {label}
            </td>
        </tr>
    );
}

// ─── Report 1: Transaction Log ────────────────────────────────────────────────

const PER_PAGE = 20;

function shiftDate(date, period, dir) {
    const d = new Date(date);
    const step = dir === 'prev' ? -1 : 1;
    if (period === 'month') d.setMonth(d.getMonth() + step);
    else if (period === 'quarter') d.setMonth(d.getMonth() + step * 3);
    else d.setFullYear(d.getFullYear() + step);
    return d;
}

function periodLabel(period, anchor) {
    const d = new Date(anchor);
    if (period === 'month') return d.toLocaleDateString('en-PK', { month: 'long', year: 'numeric' });
    if (period === 'quarter') {
        const q = Math.floor(d.getMonth() / 3) + 1;
        return `Q${q} ${d.getFullYear()}`;
    }
    return String(d.getFullYear());
}

function anchorStart(period, date = new Date()) {
    const d = new Date(date);
    if (period === 'month') return new Date(d.getFullYear(), d.getMonth(), 1);
    if (period === 'quarter') return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1);
    return new Date(d.getFullYear(), 0, 1);
}

function TransactionLogReport() {
    const [period, setPeriod] = useState('month');
    const [anchor, setAnchor] = useState(() => anchorStart('month'));
    const [search, setSearch] = useState('');
    const [catFilter, setCatFilter] = useState('');
    const [sourceFilter, setSourceFilter] = useState('');
    const [sortCol, setSortCol] = useState('date');
    const [sortDir, setSortDir] = useState('desc');
    const [page, setPage] = useState(1);

    const { data, isLoading, isError } = useQuery({
        queryKey: ['report-spending', period, anchorISO(anchor)],
        queryFn: () => api.get('/dashboard/spending', { params: { period, anchor: anchorISO(anchor) } }).then(r => r.data),
        staleTime: 60_000,
    });

    const allRows = data?.rows || [];

    const categories = useMemo(() => [...new Set(allRows.map(r => r.category))].sort(), [allRows]);
    const sources = useMemo(() => [...new Set(allRows.map(r => r.source))].sort(), [allRows]);

    const filtered = useMemo(() => {
        let rows = allRows;
        if (search) rows = rows.filter(r =>
            r.description?.toLowerCase().includes(search.toLowerCase()) ||
            r.category?.toLowerCase().includes(search.toLowerCase())
        );
        if (catFilter) rows = rows.filter(r => r.category === catFilter);
        if (sourceFilter) rows = rows.filter(r => r.source === sourceFilter);
        rows = [...rows].sort((a, b) => {
            let va, vb;
            if (sortCol === 'date') { va = new Date(a.date); vb = new Date(b.date); }
            else if (sortCol === 'amount') { va = a.amount; vb = b.amount; }
            else { va = (a[sortCol] || '').toString(); vb = (b[sortCol] || '').toString(); }
            return (va < vb ? -1 : va > vb ? 1 : 0) * (sortDir === 'asc' ? 1 : -1);
        });
        return rows;
    }, [allRows, search, catFilter, sourceFilter, sortCol, sortDir]);

    const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    function handleSort(col) {
        if (col === sortCol) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortCol(col); setSortDir('desc'); }
        setPage(1);
    }

    function handlePeriodChange(p) {
        setPeriod(p);
        setAnchor(anchorStart(p));
        setPage(1);
    }

    function handleCSV() {
        const fields = ['Date', 'Description', 'Source', 'Category', 'Type', 'Amount (PKR)'];
        const rows = filtered.map(r => [
            fmtDate(r.date), r.description, r.sourceLabel, r.category,
            r.kind === 'credit' ? 'Credit' : 'Debit', r.amount.toFixed(2),
        ]);
        exportCSV(`transaction-log-${anchorISO(anchor)}.csv`, fields, rows);
    }

    function handlePDF() {
        const headers = ['Date', 'Description', 'Source', 'Category', 'Type', 'Amount (PKR)'];
        const rows = filtered.map(r => [
            fmtDate(r.date), r.description || '—', r.sourceLabel, r.category,
            r.kind === 'credit' ? 'Credit' : 'Debit',
            Number(r.amount).toLocaleString('en-PK', { minimumFractionDigits: 2 }),
        ]);
        exportPDF('Transaction Log', periodLabel(period, anchor), headers, rows);
    }

    const totalDebit = filtered.filter(r => r.kind === 'debit').reduce((s, r) => s + r.amount, 0);
    const totalCredit = filtered.filter(r => r.kind === 'credit').reduce((s, r) => s + r.amount, 0);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-800 shrink-0 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Transaction Log</h2>
                        <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">All bank, wallet, and manual transactions</p>
                    </div>
                    <ExportBar count={filtered.length} onCSV={handleCSV} onPDF={handlePDF} />
                </div>

                {/* Controls row */}
                <div className="flex flex-wrap items-center gap-2">
                    <PeriodTabs period={period} onChange={handlePeriodChange} />
                    <MonthNav
                        label={periodLabel(period, anchor)}
                        onPrev={() => { setAnchor(a => shiftDate(a, period, 'prev')); setPage(1); }}
                        onNext={() => { setAnchor(a => shiftDate(a, period, 'next')); setPage(1); }}
                        onToday={() => { setAnchor(anchorStart(period)); setPage(1); }}
                    />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                            placeholder="Search description or category…"
                            className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 w-56"
                        />
                    </div>
                    <select
                        value={catFilter}
                        onChange={e => { setCatFilter(e.target.value); setPage(1); }}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    >
                        <option value="">All Categories</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select
                        value={sourceFilter}
                        onChange={e => { setSourceFilter(e.target.value); setPage(1); }}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    >
                        <option value="">All Sources</option>
                        {sources.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                    </select>
                </div>

                {/* Summary pills */}
                {!isLoading && (
                    <div className="flex gap-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                            <ArrowDownRight className="w-3 h-3" />
                            Out {fmtPKR(totalDebit)}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                            <ArrowUpRight className="w-3 h-3" />
                            In {fmtPKR(totalCredit)}
                        </span>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50 dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800">
                        <tr>
                            <Th col="date" label="Date" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                            <Th col="description" label="Description" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                            <Th col="sourceLabel" label="Source" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                            <Th col="category" label="Category" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400 text-center">Type</th>
                            <Th col="amount" label="Amount" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} right />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                        {isLoading ? <LoadingRows cols={6} />
                            : isError ? (
                                <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-red-500">Failed to load data.</td></tr>
                            ) : paginated.length === 0 ? <EmptyRows cols={6} />
                            : paginated.map(row => (
                                <tr key={row.id} className="hover:bg-gray-50/60 dark:hover:bg-neutral-800/40 transition-colors">
                                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-neutral-400 whitespace-nowrap">{fmtDate(row.date)}</td>
                                    <td className="px-4 py-3 text-xs text-gray-800 dark:text-gray-200 max-w-[240px] truncate" title={row.description}>{row.description || '—'}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${
                                            row.source === 'bank' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                            : row.source === 'wallet' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                                            : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-400'
                                        }`}>{row.sourceLabel}</span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{row.category}</td>
                                    <td className="px-4 py-3 text-center">
                                        {row.kind === 'credit'
                                            ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500 mx-auto" />
                                            : <ArrowDownRight className="w-3.5 h-3.5 text-red-400 mx-auto" />
                                        }
                                    </td>
                                    <td className={`px-4 py-3 text-xs font-semibold text-right whitespace-nowrap ${row.kind === 'credit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                        {fmtPKR(row.amount)}
                                    </td>
                                </tr>
                            ))
                        }
                    </tbody>
                </table>
            </div>

            <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
        </div>
    );
}

// ─── Report 2: Category Breakdown ────────────────────────────────────────────

function CategoryBreakdownReport() {
    const [period, setPeriod] = useState('month');
    const [anchor, setAnchor] = useState(() => anchorStart('month'));

    const { data, isLoading, isError } = useQuery({
        queryKey: ['report-insights', period, anchorISO(anchor)],
        queryFn: () => api.get('/dashboard/insights', { params: { period, anchor: anchorISO(anchor) } }).then(r => r.data),
        staleTime: 60_000,
    });

    const rows = data?.categoryBreakdown || [];
    const total = rows.reduce((s, r) => s + r.total, 0);

    function handleCSV() {
        const fields = ['Rank', 'Category', 'Amount (PKR)', '% of Total'];
        const csvRows = rows.map((r, i) => [
            i + 1, r.category,
            r.total.toFixed(2),
            total > 0 ? ((r.total / total) * 100).toFixed(1) + '%' : '0%',
        ]);
        exportCSV(`category-breakdown-${anchorISO(anchor)}.csv`, fields, csvRows);
    }

    function handlePDF() {
        const headers = ['Rank', 'Category', 'Amount (PKR)', '% of Total'];
        const pdfRows = rows.map((r, i) => [
            i + 1, r.category,
            r.total.toLocaleString('en-PK', { minimumFractionDigits: 2 }),
            total > 0 ? ((r.total / total) * 100).toFixed(1) + '%' : '0%',
        ]);
        exportPDF('Category Breakdown', periodLabel(period, anchor), headers, pdfRows);
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-800 shrink-0 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Category Breakdown</h2>
                        <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">Spending distribution by category</p>
                    </div>
                    <ExportBar count={rows.length} onCSV={handleCSV} onPDF={handlePDF} />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <PeriodTabs period={period} onChange={p => { setPeriod(p); setAnchor(anchorStart(p)); }} />
                    <MonthNav
                        label={periodLabel(period, anchor)}
                        onPrev={() => setAnchor(a => shiftDate(a, period, 'prev'))}
                        onNext={() => setAnchor(a => shiftDate(a, period, 'next'))}
                        onToday={() => setAnchor(anchorStart(period))}
                    />
                </div>
                {!isLoading && total > 0 && (
                    <span className="text-xs text-gray-500 dark:text-neutral-400">
                        Total spend: <strong className="text-gray-800 dark:text-gray-100">{fmtPKR(total)}</strong>
                    </span>
                )}
            </div>

            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50 dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800">
                        <tr>
                            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400 text-left w-12">#</th>
                            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400 text-left">Category</th>
                            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400 text-right">Amount</th>
                            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400 text-right w-24">Share</th>
                            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400 text-left w-48">Distribution</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                        {isLoading ? <LoadingRows cols={5} />
                            : isError ? <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-red-500">Failed to load.</td></tr>
                            : rows.length === 0 ? <EmptyRows cols={5} />
                            : rows.map((row, i) => {
                                const pct = total > 0 ? (row.total / total) * 100 : 0;
                                return (
                                    <tr key={row.category} className="hover:bg-gray-50/60 dark:hover:bg-neutral-800/40 transition-colors">
                                        <td className="px-4 py-3 text-xs text-gray-400 dark:text-neutral-500 font-mono">{i + 1}</td>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-200">{row.category}</td>
                                        <td className="px-4 py-3 text-sm font-semibold text-right text-gray-900 dark:text-gray-100 whitespace-nowrap">{fmtPKR(row.total)}</td>
                                        <td className="px-4 py-3 text-xs text-right text-gray-500 dark:text-neutral-400 font-mono">{pct.toFixed(1)}%</td>
                                        <td className="px-4 py-3">
                                            <div className="h-1.5 bg-gray-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-emerald-500 rounded-full transition-all"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        }
                    </tbody>
                    {!isLoading && rows.length > 0 && (
                        <tfoot className="border-t-2 border-gray-200 dark:border-neutral-700">
                            <tr className="bg-gray-50 dark:bg-neutral-900">
                                <td colSpan={2} className="px-4 py-3 text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">Total</td>
                                <td className="px-4 py-3 text-sm font-bold text-right text-gray-900 dark:text-gray-100">{fmtPKR(total)}</td>
                                <td className="px-4 py-3 text-xs font-bold text-right text-gray-500 dark:text-neutral-400">100%</td>
                                <td />
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
}

// ─── Report 3: Annual Summary ─────────────────────────────────────────────────

function AnnualSummaryReport() {
    const [year, setYear] = useState(new Date().getFullYear());

    const months = useMemo(() =>
        Array.from({ length: 12 }, (_, i) => ({
            year,
            month: i,
            anchor: `${year}-${String(i + 1).padStart(2, '0')}-01`,
            label: new Date(year, i, 1).toLocaleDateString('en-PK', { month: 'short' }),
        })),
    [year]);

    const results = useQueries({
        queries: months.map(m => ({
            queryKey: ['report-annual', m.anchor],
            queryFn: () => api.get('/dashboard/insights', { params: { period: 'month', anchor: m.anchor } }).then(r => r.data),
            staleTime: 5 * 60_000,
        })),
    });

    const isLoading = results.some(r => r.isLoading);

    const tableData = useMemo(() => months.map((m, i) => {
        const d = results[i]?.data;
        return {
            month: m.label,
            income: d?.totals?.currentIncome ?? null,
            spending: d?.totals?.currentSpend ?? null,
            net: d?.totals?.net ?? null,
            topCat: d?.categoryBreakdown?.[0]?.category ?? '—',
        };
    }), [results, months]);

    const totIncome   = tableData.filter(r => r.income !== null).reduce((s, r) => s + r.income, 0);
    const totSpending = tableData.filter(r => r.spending !== null).reduce((s, r) => s + r.spending, 0);
    const totNet      = totIncome - totSpending;

    function handleCSV() {
        const fields = ['Month', 'Income (PKR)', 'Spending (PKR)', 'Net (PKR)', 'Savings Rate', 'Top Category'];
        const rows = tableData.map(r => [
            r.month,
            r.income !== null ? r.income.toFixed(2) : '—',
            r.spending !== null ? r.spending.toFixed(2) : '—',
            r.net !== null ? r.net.toFixed(2) : '—',
            (r.income && r.income > 0) ? ((r.net / r.income) * 100).toFixed(1) + '%' : '—',
            r.topCat,
        ]);
        exportCSV(`annual-summary-${year}.csv`, fields, rows);
    }

    function handlePDF() {
        const headers = ['Month', 'Income', 'Spending', 'Net', 'Savings Rate', 'Top Category'];
        const rows = tableData.map(r => [
            r.month,
            r.income !== null ? r.income.toLocaleString('en-PK', { minimumFractionDigits: 0 }) : '—',
            r.spending !== null ? r.spending.toLocaleString('en-PK', { minimumFractionDigits: 0 }) : '—',
            r.net !== null ? r.net.toLocaleString('en-PK', { minimumFractionDigits: 0 }) : '—',
            (r.income && r.income > 0) ? ((r.net / r.income) * 100).toFixed(1) + '%' : '—',
            r.topCat,
        ]);
        exportPDF(`Annual Summary ${year}`, `Full year overview`, headers, rows);
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-800 shrink-0 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Annual Summary</h2>
                        <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">Month-by-month income, spending, and net</p>
                    </div>
                    <ExportBar onCSV={handleCSV} onPDF={handlePDF} />
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setYear(y => y - 1)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-500 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200 w-12 text-center">{year}</span>
                    <button onClick={() => setYear(y => y + 1)} disabled={year >= new Date().getFullYear()} className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-500 transition-colors"><ChevronRight className="w-4 h-4" /></button>
                    {isLoading && <Loader2 className="w-3.5 h-3.5 text-emerald-500 animate-spin ml-1" />}
                </div>

                {/* Year summary pills */}
                {!isLoading && (
                    <div className="flex gap-3 flex-wrap">
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                            Income {fmtPKR(totIncome)}
                        </span>
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                            Spending {fmtPKR(totSpending)}
                        </span>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${totNet >= 0 ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'}`}>
                            Net {fmtPKR(totNet)}
                        </span>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50 dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800">
                        <tr>
                            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400 text-left">Month</th>
                            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400 text-right">Income</th>
                            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400 text-right">Spending</th>
                            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400 text-right">Net</th>
                            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400 text-right">Savings Rate</th>
                            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-400 text-left">Top Category</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                        {isLoading ? <LoadingRows cols={6} />
                            : tableData.map((row, i) => {
                                const savingsRate = (row.income && row.income > 0)
                                    ? (row.net / row.income) * 100
                                    : null;
                                const isFuture = row.income === null && row.spending === null;
                                return (
                                    <tr key={row.month} className={`hover:bg-gray-50/60 dark:hover:bg-neutral-800/40 transition-colors ${isFuture ? 'opacity-40' : ''}`}>
                                        <td className="px-4 py-3 text-sm font-semibold text-gray-800 dark:text-gray-200">{row.month}</td>
                                        <td className="px-4 py-3 text-sm text-right text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap">
                                            {row.income !== null ? fmtPKR(row.income) : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                            {row.spending !== null ? fmtPKR(row.spending) : '—'}
                                        </td>
                                        <td className={`px-4 py-3 text-sm text-right font-semibold whitespace-nowrap ${row.net !== null ? (row.net >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-500 dark:text-orange-400') : 'text-gray-400'}`}>
                                            {row.net !== null ? fmtPKR(row.net) : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {savingsRate !== null ? (
                                                <span className={`text-xs font-medium ${savingsRate >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                                                    {savingsRate.toFixed(1)}%
                                                </span>
                                            ) : <span className="text-gray-300 dark:text-neutral-600 text-xs">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-neutral-400">{row.topCat}</td>
                                    </tr>
                                );
                            })
                        }
                    </tbody>
                    {!isLoading && (
                        <tfoot className="border-t-2 border-gray-200 dark:border-neutral-700">
                            <tr className="bg-gray-50 dark:bg-neutral-900">
                                <td className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">Year Total</td>
                                <td className="px-4 py-3 text-sm font-bold text-right text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{fmtPKR(totIncome)}</td>
                                <td className="px-4 py-3 text-sm font-bold text-right text-gray-800 dark:text-gray-200 whitespace-nowrap">{fmtPKR(totSpending)}</td>
                                <td className={`px-4 py-3 text-sm font-bold text-right whitespace-nowrap ${totNet >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-500'}`}>{fmtPKR(totNet)}</td>
                                <td className="px-4 py-3 text-right">
                                    {totIncome > 0 && (
                                        <span className={`text-xs font-bold ${(totNet / totIncome) * 100 >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                            {((totNet / totIncome) * 100).toFixed(1)}%
                                        </span>
                                    )}
                                </td>
                                <td />
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
}

// ─── Main Reports page ────────────────────────────────────────────────────────

const MENU = [
    { id: 'transactions', label: 'Transaction Log',      icon: Calendar,    desc: 'All transactions with filters' },
    { id: 'categories',   label: 'Category Breakdown',   icon: PieChart,    desc: 'Spending by category' },
    { id: 'annual',       label: 'Annual Summary',       icon: TrendingUp,  desc: '12-month overview' },
];

export default function Reports() {
    const [active, setActive] = useState('transactions');

    return (
        <div className="flex h-[calc(100vh-3.5rem)] -m-6 text-gray-900 dark:text-gray-100 transition-colors">
            {/* Secondary sidebar */}
            <div className="w-60 bg-gray-50 dark:bg-neutral-950 border-r border-gray-200 dark:border-neutral-800 flex flex-col pt-6 pb-4 shrink-0 overflow-y-auto hidden md:flex transition-colors">
                <div className="px-5 mb-5">
                    <h1 className="text-lg font-bold tracking-tight text-emerald-600 dark:text-emerald-400">Reports</h1>
                    <p className="text-[10px] text-gray-400 dark:text-neutral-500 mt-0.5 uppercase font-semibold tracking-wider">Analytics & Exports</p>
                </div>
                <nav className="flex-1">
                    <p className="px-5 mb-2 text-[10px] font-semibold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">Performance</p>
                    <div className="space-y-0.5">
                        {MENU.map(item => {
                            const Icon = item.icon;
                            const isActive = active === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActive(item.id)}
                                    className={`w-full flex items-start gap-3 px-5 py-2.5 text-left transition-colors border-r-2 ${isActive
                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 text-emerald-700 dark:text-emerald-400'
                                        : 'border-transparent text-gray-600 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-800/60 hover:text-gray-900 dark:hover:text-gray-100'
                                    }`}
                                >
                                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isActive ? 'text-emerald-500' : 'text-gray-400 dark:text-neutral-500'}`} />
                                    <div>
                                        <p className="text-[13px] font-medium">{item.label}</p>
                                        <p className="text-[10px] text-gray-400 dark:text-neutral-500 mt-0.5">{item.desc}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </nav>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white dark:bg-neutral-900 transition-colors">
                {active === 'transactions' && <TransactionLogReport />}
                {active === 'categories'   && <CategoryBreakdownReport />}
                {active === 'annual'       && <AnnualSummaryReport />}
            </div>
        </div>
    );
}
