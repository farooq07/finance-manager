import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useBank, useBankCategorySummary } from '../hooks/useBanks';
import { useBankAllTransactions } from '../hooks/useStatementTransactions';
import { fmtPKR } from '../utils/currency';
import { ArrowLeft, UploadCloud, AlertCircle, Loader2, X, Trash2, TrendingUp, TrendingDown, BarChart3, ChevronsUpDown, RefreshCw } from 'lucide-react';
import { Skeleton, TableSkeleton } from '../components/Skeleton';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { toast } from 'sonner';
import Button from '../components/Button';
import TextInput from '../components/TextInput';
import Modal from '../components/Modal';
import StatementTransactionsModal from '../components/StatementTransactionsModal';
import BankTransactionsTable from '../components/BankTransactionsTable';
import StatementFileUpload from '../components/StatementFileUpload';

export default function BankDetail() {
    const { id } = useParams();
    const { data: bank, isLoading } = useBank(id);
    const { data: allTransactions = [], isLoading: txLoading } = useBankAllTransactions(id);
    const { data: categorySummaryData } = useBankCategorySummary(id);
    const queryClient = useQueryClient();
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploadFile, setUploadFile] = useState(null);
    const [pdfPassword, setPdfPassword] = useState('');
    const [fileName, setFileName] = useState('');
    const [selectedStatement, setSelectedStatement] = useState(null);

    // Delete statement mutation
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
        }
    });

    const handleDeleteStatement = (statementId, statementTitle) => {
        if (!window.confirm(`Delete the statement "${statementTitle}"? This will remove all its transactions and any approved expenses created from them.`)) {
            return;
        }
        deleteStatementMutation.mutate(statementId);
    };

    // Sync statement balance mutation
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
        }
    });

    // Upload statement mutation
    const uploadStatementMutation = useMutation({
        mutationFn: async () => {
            if (!uploadFile) {
                throw new Error('Please select a PDF file');
            }

            const formData = new FormData();
            formData.append('file', uploadFile);
            if (pdfPassword) {
                formData.append('password', pdfPassword);
            }

            const { data } = await api.post(`/banks/${id}/statements/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['banks', id] });
            queryClient.invalidateQueries({ queryKey: ['banks'] });
            setIsUploadModalOpen(false);
            setUploadFile(null);
            setPdfPassword('');
            setFileName('');
            toast.success('Statement uploaded successfully! Processing transactions...');
        },
        onError: (error) => {
            const message = error.response?.data?.message;
            if (message?.includes('already imported')) {
                toast.info('This PDF was already imported. Check the transactions table below to view existing data.');
            } else {
                toast.error(message || 'Failed to upload statement');
            }
        }
    });

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const isPdf = file.type === 'application/pdf';
            const isCsv = file.type === 'text/csv' || file.type === 'application/csv' || file.name.toLowerCase().endsWith('.csv');
            if (!isPdf && !isCsv) {
                toast.error('Only PDF or CSV files are allowed');
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                toast.error('File size must be less than 10MB');
                return;
            }
            setUploadFile(file);
            setFileName(file.name);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!uploadFile) {
            toast.error('Please select a PDF file');
            return;
        }
        await uploadStatementMutation.mutateAsync();
    };

    if (isLoading) return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="h-4 w-24 bg-gray-200 dark:bg-neutral-800 animate-pulse rounded mb-4" />
            <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden transition-colors">
                <div className="p-6 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                    <div className="space-y-2 flex flex-col items-end">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-8 w-40" />
                    </div>
                </div>
                <div className="p-6 bg-gray-50 dark:bg-neutral-800/50 transition-colors">
                    <div className="flex justify-between items-center mb-4">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-10 w-32 rounded-lg" />
                    </div>
                    <TableSkeleton rows={3} />
                </div>
            </div>
        </div>
    );
    if (!bank) return <div className="p-8 text-red-500 dark:text-red-400">Bank not found.</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-2">
                <Link to="/accounts" className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Accounts
                </Link>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-800 overflow-hidden transition-colors">
                <div className="p-6 border-b border-gray-100 dark:border-neutral-800 transition-colors">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-start gap-4">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{bank.name}</h1>
                            <p className="text-gray-500 dark:text-gray-400 font-mono mt-1 text-sm">{bank.account_no} • {bank.iban_no}</p>
                        </div>
                        <div className="flex gap-4 sm:gap-6 flex-wrap">
                            {/* Opening balance — from latest statement */}
                            {(() => {
                                const latest = bank.statements?.find(s => s.opening_balance != null);
                                return latest ? (
                                    <div className="text-right">
                                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Opening Balance</p>
                                        <p className="text-lg font-semibold text-gray-600 dark:text-gray-300 mt-0.5">{fmtPKR(latest.opening_balance)}</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">{latest.month} {latest.year}</p>
                                    </div>
                                ) : null;
                            })()}
                            {/* Current / closing balance */}
                            <div className="text-right">
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Current Balance</p>
                                <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">{fmtPKR(bank.current_balance)}</h2>
                                {bank.statements?.some(s => s.closing_balance != null) && (
                                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">Synced from statement</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-gray-50 dark:bg-neutral-800/50 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Monthly Statements</h3>
                        <button
                            onClick={() => setIsUploadModalOpen(true)}
                            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 border border-emerald-600 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                        >
                            <UploadCloud className="w-4 h-4" />
                            Upload Statement
                        </button>
                    </div>

                    {!bank.statements || bank.statements.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 border-dashed rounded-xl transition-colors">
                            <UploadCloud className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
                            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">No statements yet</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                                Upload a bank statement PDF to automatically extract and categorize transactions.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {bank.statements.map((statement) => (
                                <div
                                    key={statement.id}
                                    className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg p-4 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-start justify-between mb-3 gap-3">
                                        <div>
                                            <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                                                {statement.month} {statement.year}
                                            </h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                {statement.transaction_count} transactions · {new Date(statement.upload_date).toLocaleDateString('en-PK')}
                                            </p>
                                        </div>
                                        <div className="flex gap-4 shrink-0">
                                            {statement.opening_balance != null && (
                                                <div className="text-right">
                                                    <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Opening</p>
                                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{fmtPKR(statement.opening_balance)}</p>
                                                </div>
                                            )}
                                            {statement.closing_balance != null && (
                                                <div className="text-right">
                                                    <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Closing</p>
                                                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{fmtPKR(statement.closing_balance)}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setSelectedStatement({ id: statement.id, title: `${statement.month} ${statement.year}` })}
                                            className="flex-1 px-3 py-2 text-sm bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors font-medium"
                                        >
                                            Review Transactions
                                        </button>
                                        <button
                                            onClick={() => syncBalanceMutation.mutate(statement.id)}
                                            disabled={syncBalanceMutation.isPending && syncBalanceMutation.variables === statement.id}
                                            className="px-3 py-2 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors disabled:opacity-50"
                                            title="Sync balance from this statement"
                                        >
                                            <RefreshCw className={`w-4 h-4 ${syncBalanceMutation.isPending && syncBalanceMutation.variables === statement.id ? 'animate-spin' : ''}`} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteStatement(statement.id, `${statement.month} ${statement.year}`)}
                                            disabled={deleteStatementMutation.isPending}
                                            className="px-3 py-2 text-sm bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
                                            title="Delete statement"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Category Breakdown */}
            {categorySummaryData?.total_approved > 0 && (
                <CategoryBreakdown data={categorySummaryData} />
            )}

            {/* All Transactions Table */}
            {(txLoading || allTransactions.length > 0) && (
                <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-800 overflow-hidden transition-colors p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">All Transactions</h2>
                        {txLoading && (
                            <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                                <span className="inline-block w-3 h-3 rounded-full border-2 border-gray-300 border-t-emerald-500 animate-spin" />
                                Loading…
                            </span>
                        )}
                    </div>
                    {txLoading ? (
                        <TableSkeleton rows={8} />
                    ) : (
                        <BankTransactionsTable
                            bankId={id}
                            transactions={allTransactions}
                        />
                    )}
                </div>
            )}

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

            {/* Upload Statement Modal */}
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

                    <div className="flex gap-3 pt-4">
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
                            disabled={uploadStatementMutation.isPending || !uploadFile}
                            className="flex items-center gap-2"
                        >
                            {uploadStatementMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            Upload & Process
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

// Category icons & colors
const CATEGORY_META = {
    'ATM Withdrawal': { icon: '🏧', color: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800/40' },
    'Salary': { icon: '💼', color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/40' },
    'Profit/Dividend': { icon: '📈', color: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-800/40' },
    'Transfer': { icon: '↔️', color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800/40' },
    'Bank Charges': { icon: '🏦', color: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-800/40' },
    'Food & Dining': { icon: '🍽️', color: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-100 dark:border-yellow-800/40' },
    'Groceries': { icon: '🛒', color: 'bg-lime-50 dark:bg-lime-900/20 text-lime-600 dark:text-lime-400 border-lime-100 dark:border-lime-800/40' },
    'Utilities': { icon: '⚡', color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800/40' },
    'Transportation': { icon: '🚗', color: 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 border-sky-100 dark:border-sky-800/40' },
    'Shopping': { icon: '🛍️', color: 'bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 border-pink-100 dark:border-pink-800/40' },
    'Entertainment': { icon: '🎬', color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-800/40' },
    'Healthcare': { icon: '💊', color: 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 border-teal-100 dark:border-teal-800/40' },
    'Investment': { icon: '💰', color: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800/40' },
    'Other': { icon: '📦', color: 'bg-gray-50 dark:bg-neutral-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-neutral-700' },
};

function CategoryBreakdown({ data }) {
    const { summary = [], total_approved } = data;

    const totalDebits = summary.reduce((s, r) => s + r.debits, 0);
    const totalCredits = summary.reduce((s, r) => s + r.credits, 0);

    return (
        <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-800 overflow-hidden transition-colors">
            <div className="p-6 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                        <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Category Breakdown</h2>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{total_approved} approved transactions</p>
                    </div>
                </div>
                {/* Totals pill */}
                <div className="hidden sm:flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                        <TrendingUp className="w-4 h-4" /> {fmtPKR(totalCredits)}
                    </span>
                    <span className="flex items-center gap-1.5 text-red-500 dark:text-red-400 font-semibold">
                        <TrendingDown className="w-4 h-4" /> {fmtPKR(totalDebits)}
                    </span>
                </div>
            </div>

            <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {summary.map(row => {
                        const meta = CATEGORY_META[row.category] || CATEGORY_META['Other'];
                        const isCredit = row.credits > row.debits;
                        const displayAmount = isCredit ? row.credits : row.debits;

                        return (
                            <div key={row.category} className={`flex items-center gap-3 p-3.5 rounded-xl border ${meta.color} transition-all`}>
                                <span className="text-xl shrink-0">{meta.icon}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold truncate">{row.category}</p>
                                    <p className="text-base font-bold mt-0.5">{fmtPKR(displayAmount)}</p>
                                    <p className="text-[10px] opacity-60 mt-0.5">{row.count} {row.count === 1 ? 'transaction' : 'transactions'}</p>
                                </div>
                                {isCredit
                                    ? <TrendingUp className="w-4 h-4 shrink-0 opacity-50" />
                                    : <TrendingDown className="w-4 h-4 shrink-0 opacity-50" />
                                }
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
