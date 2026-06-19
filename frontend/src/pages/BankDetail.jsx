import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBank, useBankCategorySummary } from '../hooks/useBanks';
import { useBankAllTransactions } from '../hooks/useStatementTransactions';
import { fmtPKR } from '../utils/currency';
import {
    UploadCloud, Loader2, Trash2, TrendingUp, TrendingDown, RefreshCw,
    ArrowDownLeft, ArrowUpRight, Activity, Mail, FileText, Settings,
    BarChart3, ChevronRight, MapPin,
} from 'lucide-react';
import { Skeleton, TableSkeleton } from '../components/Skeleton';
import MaskedBalance from '../components/MaskedBalance';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { toast } from 'sonner';
import Button from '../components/Button';
import Modal from '../components/Modal';
import StatementTransactionsModal from '../components/StatementTransactionsModal';
import BankTransactionsTable from '../components/BankTransactionsTable';
import StatementFileUpload from '../components/StatementFileUpload';
import CsvMappingModal from '../components/CsvMappingModal';
import StatementReviewModal from '../components/StatementReviewModal';
import { useConfirm } from '../components/ui/confirm-dialog';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';

/* ─── PKR shorthand: 6.82 L (lakh), 12.4 K, etc. ──────────────── */
function fmtPKRShort(n) {
    const abs = Math.abs(Number(n) || 0);
    if (abs >= 1e7) return `${(n / 1e7).toFixed(2)} Cr`;
    if (abs >= 1e5) return `${(n / 1e5).toFixed(2)} L`;
    if (abs >= 1e3) return `${(n / 1e3).toFixed(1)} K`;
    return `${Math.round(n)}`;
}

/* ─── Two-letter monogram for the account logo square ─────────── */
function monogram(name = '') {
    return name
        .split(/[\s_-]+/)
        .filter(Boolean)
        .slice(0, 1)
        .map((w) => w.charAt(0).toUpperCase())
        .join('') || 'A';
}

export default function BankDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: bank, isLoading, isError, error } = useBank(id);
    const notFound = isError && error?.response?.status === 404;

    // A deleted/missing bank: bounce back to Accounts so we never show stale data.
    useEffect(() => {
        if (notFound) {
            toast.error('This account no longer exists.');
            navigate('/accounts', { replace: true });
        }
    }, [notFound, navigate]);
    const { data: allTransactions = [], isLoading: txLoading } = useBankAllTransactions(id);
    const { data: categorySummaryData } = useBankCategorySummary(id);
    const queryClient = useQueryClient();
    const confirm = useConfirm();
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploadFile, setUploadFile] = useState(null);
    const [pdfPassword, setPdfPassword] = useState('');
    const [fileName, setFileName] = useState('');
    const [selectedStatement, setSelectedStatement] = useState(null);
    const [duplicate, setDuplicate] = useState(null);
    const [replacing, setReplacing] = useState(false);
    // Two-step import: preview holds the inspected file; commit finalises it.
    const [preview, setPreview] = useState(null);          // { type, uploadId, ... }
    const [committing, setCommitting] = useState(false);
    const [pendingCommit, setPendingCommit] = useState(null); // payload awaiting force-replace

    const deleteStatementMutation = useMutation({
        mutationFn: async (statementId) => {
            const { data } = await api.delete(`/banks/${id}/statements/${statementId}`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['banks', id] });
            queryClient.invalidateQueries({ queryKey: ['banks'] });
            queryClient.invalidateQueries({ queryKey: ['banks', id, 'all-transactions'] });
            toast.success('Statement deleted');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to delete statement');
        },
    });

    const syncBalanceMutation = useMutation({
        mutationFn: async (statementId) => {
            const { data } = await api.post(`/banks/${id}/statements/${statementId}/sync`);
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['banks', id] });
            queryClient.invalidateQueries({ queryKey: ['banks'] });
            toast.success(`Balance synced — ${fmtPKR(data.closingBalance)}`);
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to sync balance');
        },
    });

    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: ['banks', id] });
        queryClient.invalidateQueries({ queryKey: ['banks'] });
        queryClient.invalidateQueries({ queryKey: ['banks', id, 'all-transactions'] });
    };

    const resetUploadModal = () => {
        setIsUploadModalOpen(false);
        setUploadFile(null);
        setPdfPassword('');
        setFileName('');
    };

    // Step 1 — upload file for inspection (no transactions saved yet).
    const previewMutation = useMutation({
        mutationFn: async () => {
            if (!uploadFile) throw new Error('Please select a file');
            const formData = new FormData();
            formData.append('file', uploadFile);
            if (pdfPassword) formData.append('password', pdfPassword);
            const { data } = await api.post(`/banks/${id}/statements/preview`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return data;
        },
        onSuccess: (data) => {
            setIsUploadModalOpen(false);
            setPreview(data); // opens mapping (csv) or review (pdf) modal
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to read file');
        },
    });

    // Step 2 — commit with the user's mapping (CSV) or reviewed rows (PDF).
    const doCommit = async (payload, { force = false } = {}) => {
        const body = {
            uploadId: preview.uploadId,
            type: preview.type,
            password: pdfPassword || undefined,
            force,
            ...payload,
        };
        const { data } = await api.post(`/banks/${id}/statements/commit`, body);
        return data;
    };

    const announceResult = (data) => {
        const r = data.reconciliation;
        const n = data.summary?.unique ?? data.summary?.totalParsed ?? 0;
        if (r && !r.ok) {
            toast.warning(`Imported ${n} transactions — but ${r.message}`, { duration: 7000 });
        } else if (r && r.hasBalances) {
            toast.success(`Imported ${n} transactions — balances reconciled ✓`);
        } else {
            toast.success(`Imported ${n} transactions`);
        }
    };

    const handleCommit = async (payload) => {
        setCommitting(true);
        try {
            const data = await doCommit(payload);
            invalidateAll();
            setPreview(null);
            resetUploadModal();
            announceResult(data);
        } catch (error) {
            if (error.response?.status === 409 && error.response.data?.duplicate) {
                setDuplicate(error.response.data.existing || {});
                setPendingCommit(payload); // retry with force after confirm
                return;
            }
            toast.error(error.response?.data?.message || 'Failed to import statement');
        } finally {
            setCommitting(false);
        }
    };

    const handleConfirmReplace = async () => {
        setReplacing(true);
        try {
            const data = await doCommit(pendingCommit || {}, { force: true });
            invalidateAll();
            setDuplicate(null);
            setPendingCommit(null);
            setPreview(null);
            resetUploadModal();
            announceResult(data);
        } catch (retryErr) {
            toast.error(retryErr.response?.data?.message || 'Failed to replace statement');
        } finally {
            setReplacing(false);
        }
    };

    /* ─── Aggregate stats from real transactions ─────────────── */
    const stats = useMemo(() => {
        let inflow = 0, outflow = 0;
        let deposits = 0, withdrawals = 0;
        let pending = 0;
        allTransactions.forEach((tx) => {
            const credit = Number(tx.credit_amount || 0);
            const debit = Number(tx.debit_amount || 0);
            if (credit > 0) { inflow += credit; deposits++; }
            if (debit > 0) { outflow += debit; withdrawals++; }
            if (tx.processing_status !== 'approved') pending++;
        });
        return {
            inflow, outflow, net: inflow - outflow,
            deposits, withdrawals,
            pending,
            statementsCount: bank?.statements?.length || 0,
        };
    }, [allTransactions, bank?.statements?.length]);

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const isPdf = file.type === 'application/pdf';
            const isCsv = file.type === 'text/csv' || file.type === 'application/csv' || file.name.toLowerCase().endsWith('.csv');
            if (!isPdf && !isCsv) { toast.error('Only PDF or CSV files are allowed'); return; }
            if (file.size > 10 * 1024 * 1024) { toast.error('File size must be less than 10MB'); return; }
            setUploadFile(file);
            setFileName(file.name);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!uploadFile) { toast.error('Please select a file'); return; }
        await previewMutation.mutateAsync();
    };

    if (isLoading) {
        return (
            <div className="max-w-[1400px] mx-auto space-y-5">
                <Skeleton className="h-32" />
                <Skeleton className="h-24" />
            </div>
        );
    }
    if (notFound) return null; // redirecting to /accounts
    if (!bank) return <div className="p-8 text-error-500">Bank not found.</div>;

    const hasOpening = bank.statements?.some(s => s.opening_balance != null);
    const change = hasOpening ? stats.net : 0; // crude delta proxy from current statements
    const changePct = hasOpening && bank.current_balance > 0
        ? (change / Math.max(bank.current_balance - change, 1)) * 100
        : 0;

    return (
        <div className="max-w-[1400px] mx-auto space-y-5">

            {/* ── Action toolbar (the in-page breadcrumb is already in global Header) ── */}
            <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                    onClick={() => bank.statements?.[0] && syncBalanceMutation.mutate(bank.statements[0].id)}
                    disabled={!bank.statements?.length || syncBalanceMutation.isPending}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-neutral-800 border border-transparent hover:border-gray-200 dark:hover:border-neutral-700 transition-all disabled:opacity-40"
                >
                    <RefreshCw className={`w-4 h-4 ${syncBalanceMutation.isPending ? 'animate-spin' : ''}`} />
                    Sync
                </button>
                <button className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-neutral-800 border border-transparent hover:border-gray-200 dark:hover:border-neutral-700 transition-all">
                    <Settings className="w-4 h-4" />
                    Settings
                </button>
                <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 active:bg-primary-800 transition-colors shadow-sm"
                >
                    <UploadCloud className="w-4 h-4" />
                    Upload statement
                </button>
            </div>

            {/* ── Hero card ── */}
            <HeroCard bank={bank} change={change} changePct={changePct} />

            {/* ── 5-stat horizontal strip ── */}
            <StatStrip stats={stats} />

            {/* ── Two-column main area ── */}
            <div className="grid grid-cols-12 gap-5">
                {/* Left sidebar */}
                <aside className="col-span-12 lg:col-span-3 space-y-5">
                    <StatementsList
                        statements={bank.statements || []}
                        onUpload={() => setIsUploadModalOpen(true)}
                        onSelect={(s) => setSelectedStatement({ id: s.id, title: `${s.month} ${s.year}` })}
                        onSync={(id) => syncBalanceMutation.mutate(id)}
                        onDelete={async (s) => {
                            const ok = await confirm({
                                title: 'Delete statement',
                                description: `Delete the statement "${s.month} ${s.year}"? Its transactions and approved expenses will be removed.`,
                                confirmText: 'Delete',
                            });
                            if (ok) deleteStatementMutation.mutate(s.id);
                        }}
                        syncing={syncBalanceMutation.isPending ? syncBalanceMutation.variables : null}
                    />

                    {categorySummaryData?.total_approved > 0 && (
                        <CategoryMiniBreakdown data={categorySummaryData} />
                    )}
                </aside>

                {/* Right main: transactions */}
                <section className="col-span-12 lg:col-span-9">
                    {(txLoading || allTransactions.length > 0) ? (
                        <Card className="overflow-hidden">
                            <div className="p-5">
                                {txLoading ? (
                                    <TableSkeleton rows={8} />
                                ) : (
                                    <BankTransactionsTable
                                        bankId={id}
                                        transactions={allTransactions}
                                    />
                                )}
                            </div>
                        </Card>
                    ) : (
                        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-dashed border-gray-300 dark:border-neutral-700 px-6 py-16 text-center">
                            <UploadCloud className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">No transactions yet</h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                                Upload a statement PDF to extract and categorise transactions automatically.
                            </p>
                            <button
                                onClick={() => setIsUploadModalOpen(true)}
                                className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors"
                            >
                                <UploadCloud className="w-4 h-4" /> Upload statement
                            </button>
                        </div>
                    )}
                </section>
            </div>

            {/* Statement Transactions Modal */}
            {selectedStatement && (
                <StatementTransactionsModal
                    isOpen={!!selectedStatement}
                    onClose={() => setSelectedStatement(null)}
                    bankId={id}
                    statementId={selectedStatement.id}
                    statementTitle={selectedStatement.title}
                />
            )}

            {/* Upload Modal */}
            <Modal
                isOpen={isUploadModalOpen}
                onClose={() => {
                    setIsUploadModalOpen(false);
                    setUploadFile(null);
                    setPdfPassword('');
                    setFileName('');
                }}
                title="Upload Bank Statement"
            >
                <form onSubmit={handleUpload} className="space-y-4">
                    <StatementFileUpload
                        fileName={fileName}
                        pdfPassword={pdfPassword}
                        onPasswordChange={setPdfPassword}
                        onFileChange={handleFileChange}
                        inputId="bank-pdf-input"
                    />
                    <div className="flex gap-3 pt-2 justify-end">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                                setIsUploadModalOpen(false);
                                setUploadFile(null);
                                setPdfPassword('');
                                setFileName('');
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={previewMutation.isPending || !uploadFile}
                            className="flex items-center gap-2"
                        >
                            {previewMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            Continue
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Step 2a — CSV column mapping */}
            {preview?.type === 'csv' && (
                <CsvMappingModal
                    preview={preview}
                    fileName={fileName}
                    committing={committing}
                    onConfirm={(mapping) => handleCommit(mapping)}
                    onCancel={() => { setPreview(null); resetUploadModal(); }}
                />
            )}

            {/* Step 2b — PDF review & edit */}
            {preview?.type === 'pdf' && (
                <StatementReviewModal
                    preview={preview}
                    fileName={fileName}
                    committing={committing}
                    onConfirm={(payload) => handleCommit(payload)}
                    onCancel={() => { setPreview(null); resetUploadModal(); }}
                />
            )}

            {/* Duplicate-detected confirm — styled, not native window.confirm */}
            <Modal
                isOpen={!!duplicate}
                onClose={() => !replacing && setDuplicate(null)}
                title="Replace existing statement?"
                description={
                    duplicate
                        ? `This file was already imported${duplicate.month ? ` for ${duplicate.month} ${duplicate.year}` : ''}${duplicate.uploadedAt ? ` on ${new Date(duplicate.uploadedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}, with ${duplicate.transactionCount ?? 0} transactions.`
                        : ''
                }
                type="warning"
                primaryAction={{
                    label: replacing ? 'Replacing…' : 'Replace & re-import',
                    onClick: handleConfirmReplace,
                    variant: 'danger',
                    isLoading: replacing,
                    disabled: replacing,
                }}
                secondaryAction={{
                    label: 'Keep existing',
                    onClick: () => setDuplicate(null),
                    disabled: replacing,
                }}
            >
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    Replacing will <span className="font-semibold text-error-600 dark:text-error-400">permanently delete</span> the
                    previous record and all its transactions (including any approved expenses), then re-import the file from scratch.
                </p>
            </Modal>
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────
   Hero card — logo + name + IBAN/A.C + balance + sparkline
   ────────────────────────────────────────────────────────────── */
function HeroCard({ bank, change, changePct }) {
    const positive = change >= 0;
    return (
        <Card className="overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-neutral-800">
                {/* Left — identity */}
                <div className="p-6 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-700 flex items-center justify-center shrink-0">
                        <span className="text-white text-base font-semibold">{monogram(bank.name)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] tracking-[0.18em] uppercase text-gray-500 dark:text-gray-400 font-semibold">
                                Current account
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success-50 text-success-700 dark:bg-success-900/30 dark:text-success-400 text-[10px] font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-success-500" />
                                Active
                            </span>
                        </div>
                        <h1 className="text-[26px] font-semibold text-gray-900 dark:text-gray-100 tracking-tight leading-tight">
                            {bank.name}
                        </h1>
                        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11.5px] font-mono text-gray-500 dark:text-gray-400">
                            {bank.account_no && <span><span className="text-gray-400">A/C</span> <span className="text-gray-700 dark:text-gray-200">{bank.account_no}</span></span>}
                            {bank.iban_no && <span><span className="text-gray-400">IBAN</span> <span className="text-gray-700 dark:text-gray-200">{bank.iban_no}</span></span>}
                            {bank.branch && (
                                <span className="inline-flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {bank.branch}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right — balance + sparkline */}
                <div className="p-6 relative">
                    <div className="flex justify-between items-start gap-4">
                        <div>
                            <p className="text-[10px] tracking-[0.18em] uppercase text-gray-500 dark:text-gray-400 font-semibold mb-1">
                                Current balance
                            </p>
                            <MaskedBalance
                                value={bank.current_balance}
                                className="text-[34px] font-semibold text-gray-900 dark:text-gray-100 tracking-tight tabular-nums leading-none inline-block"
                                iconClassName="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-1"
                            />
                            {change !== 0 && (
                                <div className="mt-3 flex items-center gap-2 text-[12px]">
                                    <span className={`inline-flex items-center gap-1 font-semibold tabular-nums ${positive ? 'text-success-700 dark:text-success-400' : 'text-error-600 dark:text-error-400'}`}>
                                        {positive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                        {positive ? '+' : '−'}{fmtPKRShort(Math.abs(change))} ({Math.abs(changePct).toFixed(1)}%)
                                    </span>
                                    <span className="text-gray-400 dark:text-gray-500 text-[11px]">over the period</span>
                                </div>
                            )}
                        </div>
                        <Sparkline positive={positive} />
                    </div>
                </div>
            </div>
        </Card>
    );
}

/* Mini sparkline — pseudo-trend, since we don't have day-level balance history yet */
function Sparkline({ positive }) {
    const points = positive
        ? [40, 38, 35, 33, 30, 28, 24, 22, 19, 16, 12, 8]
        : [10, 12, 15, 18, 22, 25, 28, 32, 36, 38, 42, 45];
    const path = points.map((y, i) => `${i === 0 ? 'M' : 'L'}${(i / (points.length - 1)) * 140},${y}`).join(' ');
    return (
        <svg viewBox="0 0 140 50" className="w-32 h-12 shrink-0" preserveAspectRatio="none">
            <path d={path} fill="none" stroke="#1F4842" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d={`${path} L140,50 L0,50 Z`} fill="rgba(31,72,66,0.06)" />
        </svg>
    );
}

/* ──────────────────────────────────────────────────────────────
   5-stat horizontal strip
   ────────────────────────────────────────────────────────────── */
function StatStrip({ stats }) {
    // Primary — the money story (plain wording, prominent).
    const primary = [
        {
            label: 'Money in',
            value: fmtPKRShort(stats.inflow),
            sub: `${stats.deposits} ${stats.deposits === 1 ? 'deposit' : 'deposits'}`,
            icon: ArrowDownLeft,
            tone: 'success',
        },
        {
            label: 'Money out',
            value: fmtPKRShort(stats.outflow),
            sub: `${stats.withdrawals} ${stats.withdrawals === 1 ? 'payment' : 'payments'}`,
            icon: ArrowUpRight,
            tone: 'error',
        },
        {
            label: 'Net change',
            value: `${stats.net >= 0 ? '+' : '−'}${fmtPKRShort(Math.abs(stats.net))}`,
            sub: stats.net >= 0 ? 'Balance grew' : 'Balance shrank',
            icon: Activity,
            tone: stats.net >= 0 ? 'success' : 'error',
        },
    ];
    // Secondary — workflow status (de-emphasised, count-led).
    const secondary = [
        {
            label: 'To review',
            value: stats.pending,
            sub: stats.pending > 0 ? 'awaiting approval' : 'all caught up',
            icon: Mail,
        },
        {
            label: 'Statements',
            value: stats.statementsCount,
            sub: `${stats.statementsCount === 1 ? 'month' : 'months'} synced`,
            icon: FileText,
        },
    ];
    return (
        <Card className="overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-stretch divide-y lg:divide-y-0 lg:divide-x divide-gray-200 dark:divide-neutral-800">
                {/* Primary group */}
                <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-200 dark:divide-neutral-800 lg:flex-[3]">
                    {primary.map((it) => <StatCell key={it.label} {...it} />)}
                </div>
                {/* Secondary group — visually recessed */}
                <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-neutral-800 bg-gray-50/60 dark:bg-neutral-800/30 lg:flex-[1]">
                    {secondary.map((it) => <StatCell key={it.label} {...it} secondary />)}
                </div>
            </div>
        </Card>
    );
}

function StatCell({ label, value, sub, icon: Icon, tone, secondary = false }) {
    const tints = {
        success: { box: 'bg-success-50 text-success-700 dark:bg-success-900/20 dark:text-success-400', val: 'text-success-700 dark:text-success-400' },
        error:   { box: 'bg-error-50 text-error-600 dark:bg-error-900/20 dark:text-error-400',         val: 'text-error-600 dark:text-error-400' },
        neutral: { box: 'bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-300',            val: 'text-gray-900 dark:text-gray-100' },
    }[tone] || { box: 'bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-300', val: 'text-gray-900 dark:text-gray-100' };

    if (secondary) {
        return (
            <div className="px-4 py-4 flex items-center gap-2.5">
                <Icon className="w-3.5 h-3.5 text-gray-400 dark:text-neutral-500 shrink-0" />
                <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-500">{label}</p>
                    <p className="mt-0.5 flex items-baseline gap-1.5">
                        <span className="text-base font-semibold tabular-nums leading-none text-gray-700 dark:text-gray-300">{value}</span>
                        <span className="text-[10px] text-gray-400 dark:text-neutral-500 truncate">{sub}</span>
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 flex items-start gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${tints.box}`}>
                <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
                <p className={`mt-1 text-xl font-semibold tabular-nums leading-none ${tints.val}`}>{value}</p>
                <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">{sub}</p>
            </div>
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────
   Statements list — compact horizontal rows
   ────────────────────────────────────────────────────────────── */
function StatementsList({ statements, onUpload, onSelect, onSync, onDelete, syncing }) {
    const sorted = useMemo(() => [...statements].sort((a, b) => {
        const monthOrder = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        const dateA = a.year * 12 + (monthOrder.indexOf(a.month));
        const dateB = b.year * 12 + (monthOrder.indexOf(b.month));
        return dateB - dateA;
    }), [statements]);

    return (
        <Card className="overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400 dark:text-neutral-500" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Monthly Statements</h3>
                    {statements.length > 0 && (
                        <span className="text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-neutral-400">
                            {statements.length}
                        </span>
                    )}
                </div>
                <button
                    onClick={onUpload}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                >
                    <UploadCloud className="w-3 h-3" /> Upload
                </button>
            </div>

            {sorted.length === 0 ? (
                <div className="py-10 text-center">
                    <FileText className="w-8 h-8 mx-auto text-gray-200 dark:text-neutral-700 mb-2" />
                    <p className="text-xs text-gray-400 dark:text-neutral-500">No statements uploaded yet.</p>
                </div>
            ) : (
                <ul className="divide-y divide-gray-100 dark:divide-neutral-800/60">
                    {sorted.map((s) => {
                        const delta = s.opening_balance != null && s.closing_balance != null
                            ? Number(s.closing_balance) - Number(s.opening_balance)
                            : null;
                        const isSyncing = syncing === s.id;

                        return (
                            <li key={s.id} className="group relative flex items-center hover:bg-gray-50/80 dark:hover:bg-neutral-800/30 transition-colors">
                                {/* Clickable row area — two aligned blocks: label left, numbers right */}
                                <button
                                    onClick={() => onSelect(s)}
                                    className="flex-1 min-w-0 flex items-center justify-between gap-3 px-4 py-3 text-left"
                                >
                                    {/* Left — month/year + meta beneath */}
                                    <span className="min-w-0">
                                        <span className="block text-[12px] font-semibold tabular-nums text-gray-800 dark:text-gray-200 leading-tight">
                                            {s.month.slice(0, 3)} <span className="text-gray-400 dark:text-neutral-500 font-normal">{s.year}</span>
                                        </span>
                                        <span className="mt-0.5 block text-[10px] text-gray-400 dark:text-neutral-500 tabular-nums">
                                            {s.transaction_count ?? 0} txn{s.transaction_count !== 1 ? 's' : ''}
                                            {s.upload_date && ` · ${new Date(s.upload_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`}
                                        </span>
                                    </span>

                                    {/* Right — closing balance + delta, right-aligned */}
                                    <span className="shrink-0 text-right pr-12 group-hover:pr-0 transition-all">
                                        {s.closing_balance != null && (
                                            <span className="block text-[12px] font-semibold tabular-nums text-gray-800 dark:text-gray-200 leading-tight">
                                                {fmtPKRShort(s.closing_balance)}
                                            </span>
                                        )}
                                        {delta !== null && (
                                            <span className={`mt-0.5 block text-[10px] tabular-nums font-medium ${delta >= 0 ? 'text-success-600 dark:text-success-400' : 'text-error-500 dark:text-error-400'}`}>
                                                {delta >= 0 ? '+' : '−'}{fmtPKRShort(Math.abs(delta))}
                                            </span>
                                        )}
                                    </span>
                                </button>

                                {/* Icon actions — overlaid on the right, revealed on hover */}
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 bg-gray-50/95 dark:bg-neutral-800/95 rounded-lg pl-1">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onSync(s.id); }}
                                        disabled={isSyncing}
                                        title="Sync balance"
                                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 dark:text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 disabled:opacity-40 transition-colors"
                                    >
                                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDelete(s); }}
                                        title="Delete statement"
                                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 dark:text-neutral-500 hover:text-error-600 dark:hover:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </Card>
    );
}

/* ──────────────────────────────────────────────────────────────
   Category mini-breakdown (left sidebar) — top 6 by amount.
   Ranked list, neutral styling (no per-category colour coding).
   ────────────────────────────────────────────────────────────── */
function CategoryMiniBreakdown({ data }) {
    const { summary = [] } = data;
    const sorted = useMemo(() => {
        return [...summary]
            .map((r) => ({ ...r, _abs: Math.max(r.credits, r.debits), _isCredit: r.credits > r.debits }))
            .sort((a, b) => b._abs - a._abs)
            .slice(0, 6);
    }, [summary]);
    const max = sorted[0]?._abs || 1;
    const total = summary.length;

    return (
        <Card className="overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Top categories</h3>
                </div>
                <span className="text-[11px] text-gray-400 dark:text-gray-500">
                    of {total}
                </span>
            </div>

            <ul className="p-2">
                {sorted.map((row, i) => {
                    const widthPct = (row._abs / max) * 100;
                    return (
                        <li
                            key={row.category}
                            className="relative flex items-center justify-between gap-2 px-2 py-2.5 rounded-lg overflow-hidden"
                        >
                            {/* Neutral magnitude track — proportion without rainbow colours */}
                            <span
                                className="absolute inset-y-1 left-1 rounded-md bg-gray-100 dark:bg-neutral-800/70"
                                style={{ width: `calc(${widthPct}% - 0.5rem)` }}
                                aria-hidden="true"
                            />
                            <div className="relative flex items-center gap-2 min-w-0">
                                <span className="text-[10px] font-semibold tabular-nums text-gray-400 dark:text-neutral-500 w-3 shrink-0">{i + 1}</span>
                                <span className="text-[12px] font-medium text-gray-800 dark:text-gray-100 truncate">{row.category}</span>
                                <span className="text-[10px] text-gray-400 dark:text-neutral-500 shrink-0">{row.count}×</span>
                            </div>
                            <span className={`relative text-[12px] font-semibold tabular-nums shrink-0 ${row._isCredit ? 'text-success-700 dark:text-success-400' : 'text-gray-700 dark:text-gray-200'}`}>
                                {row._isCredit ? '+' : '−'}{fmtPKRShort(row._abs)}
                            </span>
                        </li>
                    );
                })}
            </ul>
        </Card>
    );
}
