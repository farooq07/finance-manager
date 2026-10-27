import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useWallets } from '../hooks/useWallets';
import { fmtPKR } from '../utils/currency';
import MaskedBalance from '../components/MaskedBalance';
import { ArrowLeft, UploadCloud, Loader2, Trash2, RefreshCw } from 'lucide-react';
import api from '../services/api';
import { toast } from 'sonner';
import Button from '../components/Button';
import Modal from '../components/Modal';
import TextInput from '../components/TextInput';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import BankTransactionsTable from '../components/BankTransactionsTable';
import StatementTransactionsModal from '../components/StatementTransactionsModal';
import StatementFileUpload from '../components/StatementFileUpload';
import CsvMappingModal from '../components/CsvMappingModal';
import StatementReviewModal from '../components/StatementReviewModal';
import UnreconciledBadge from '../components/UnreconciledBadge';
import { useConfirm } from '../components/ui/confirm-dialog';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { invalidateMoney } from '../lib/queryKeys';

export default function WalletDetail() {
    const { id } = useParams();
    const queryClient = useQueryClient();
    const confirm = useConfirm();
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploadFile, setUploadFile] = useState(null);
    const [pdfPassword, setPdfPassword] = useState('');
    const [fileName, setFileName] = useState('');
    const [selectedStatement, setSelectedStatement] = useState(null);
    const [duplicate, setDuplicate] = useState(null); // { month, year, transactionCount, uploadedAt } | null
    const [replacing, setReplacing] = useState(false);
    const [preview, setPreview] = useState(null);          // { type, uploadId, ... }
    const [committing, setCommitting] = useState(false);
    const [pendingCommit, setPendingCommit] = useState(null);

    const { data: allWallets = [], isLoading } = useWallets();
    const wallet = allWallets.find(w => w.id === id);

    const { data: allTransactions = [] } = useQuery({
        queryKey: ['wallets', id, 'all-transactions'],
        queryFn: async () => {
            if (!wallet?.statements || wallet.statements.length === 0) return [];
            const allTxs = [];
            for (const statement of wallet.statements) {
                try {
                    const { data: txs } = await api.get(
                        `/wallets/${id}/statements/${statement.id}/transactions`
                    );
                    allTxs.push(...(txs || []));
                } catch (error) {
                    console.error(`Failed to fetch transactions for statement ${statement.id}`, error);
                }
            }
            return allTxs.sort((a, b) =>
                new Date(b.transaction_date) - new Date(a.transaction_date)
            );
        },
        enabled: !!wallet
    });

    const syncBalanceMutation = useMutation({
        mutationFn: async (statementId) => {
            const { data } = await api.post(`/wallets/${id}/statements/${statementId}/sync`);
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['wallets'] });
            toast.success(`Balance synced — ${fmtPKR(data.closingBalance)}`);
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to sync balance');
        }
    });

    const deleteStatementMutation = useMutation({
        mutationFn: async (statementId) => {
            const { data } = await api.delete(`/wallets/${id}/statements/${statementId}`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wallets', id] });
            queryClient.invalidateQueries({ queryKey: ['wallets'] });
            toast.success('Statement deleted');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to delete statement');
        }
    });

    const handleDeleteStatement = async (statementId, statementTitle) => {
        const ok = await confirm({
            title: 'Delete statement',
            description: `Delete the statement "${statementTitle}"? This will remove all its transactions and any approved expenses created from them.`,
            confirmText: 'Delete',
        });
        if (!ok) return;
        deleteStatementMutation.mutate(statementId);
    };

    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: ['wallets', id] });
        queryClient.invalidateQueries({ queryKey: ['wallets'] });
        queryClient.invalidateQueries({ queryKey: ['wallets', id, 'all-transactions'] });
    };

    const resetUploadModal = () => {
        setIsUploadModalOpen(false);
        setUploadFile(null);
        setPdfPassword('');
        setFileName('');
    };

    // Step 1 — inspect the file (no transactions saved yet).
    const previewMutation = useMutation({
        mutationFn: async () => {
            if (!uploadFile) throw new Error('Please select a file');
            const formData = new FormData();
            formData.append('file', uploadFile);
            if (pdfPassword) formData.append('password', pdfPassword);
            const { data } = await api.post(`/wallets/${id}/statements/preview`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return data;
        },
        onSuccess: (data) => {
            setIsUploadModalOpen(false);
            setPreview(data);
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to read file');
        },
    });

    const doCommit = async (payload, { force = false } = {}) => {
        const body = { uploadId: preview.uploadId, type: preview.type, password: pdfPassword || undefined, force, ...payload };
        const { data } = await api.post(`/wallets/${id}/statements/commit`, body);
        invalidateMoney(queryClient);
        return data;
    };

    const announceResult = (data) => {
        const r = data.reconciliation;
        const n = data.summary?.unique ?? data.summary?.totalParsed ?? 0;
        const possible = data.summary?.possibleDuplicates ?? 0;
        if (possible > 0) {
            toast.info(`${possible} transaction${possible === 1 ? ' looks' : 's look'} like ${possible === 1 ? 'a repeat' : 'repeats'} of earlier ones — marked "Possible duplicate" for you to check.`, { duration: 8000 });
        }
        // Every import can be undone straight away (removes the statement, its rows and their expenses).
        const undo = data.statementId ? {
            action: {
                label: 'Undo',
                onClick: async () => {
                    try {
                        await api.delete(`/wallets/${id}/statements/${data.statementId}`);
                        invalidateMoney(queryClient);
                        queryClient.invalidateQueries();
                        toast.success('Import undone');
                    } catch (err) {
                        toast.error(err?.response?.data?.message || 'Could not undo the import');
                    }
                },
            },
        } : {};
        if (r && !r.ok) {
            toast.warning(`Imported ${n} transactions — but ${r.message}`, { duration: 10000, ...undo });
        } else if (r && r.hasBalances) {
            toast.success(`Imported ${n} transactions — balances reconciled ✓`, { duration: 10000, ...undo });
        } else {
            toast.success(`Imported ${n} transactions`, { duration: 10000, ...undo });
        }
    };

    // The server refuses (422) a statement whose numbers don't reconcile.
    // Ask the user; if they accept, retry with the explicit override.
    // Returns undefined when the error isn't a mismatch, null when declined.
    const retryIfMismatchAccepted = async (error, payload, opts) => {
        if (error.response?.status !== 422 || !error.response.data?.needsConfirmation) return undefined;
        const ok = await confirm({
            title: "This statement doesn't add up",
            description: error.response.data.message,
            confirmText: 'Import anyway',
        });
        if (!ok) return null;
        return doCommit({ ...payload, acceptMismatch: true }, opts);
    };

    const handleCommit = async (payload) => {
        setCommitting(true);
        const onImported = (data) => {
            invalidateAll();
            setPreview(null);
            resetUploadModal();
            announceResult(data);
        };
        try {
            onImported(await doCommit(payload));
        } catch (error) {
            if (error.response?.status === 409 && error.response.data?.duplicate) {
                setDuplicate(error.response.data.existing || {});
                setPendingCommit(payload);
                return;
            }
            let failure = error;
            try {
                const data = await retryIfMismatchAccepted(error, payload);
                if (data !== undefined) {
                    if (data) onImported(data);
                    return;
                }
            } catch (retryErr) {
                failure = retryErr;
            }
            toast.error(failure.response?.data?.message || 'Failed to import statement');
        } finally {
            setCommitting(false);
        }
    };

    const handleConfirmReplace = async () => {
        setReplacing(true);
        const onReplaced = (data) => {
            invalidateAll();
            setDuplicate(null);
            setPendingCommit(null);
            setPreview(null);
            resetUploadModal();
            announceResult(data);
        };
        try {
            onReplaced(await doCommit(pendingCommit || {}, { force: true }));
        } catch (retryErr) {
            let failure = retryErr;
            try {
                const data = await retryIfMismatchAccepted(retryErr, pendingCommit || {}, { force: true });
                if (data !== undefined) {
                    if (data) onReplaced(data);
                    return;
                }
            } catch (err) {
                failure = err;
            }
            toast.error(failure.response?.data?.message || 'Failed to replace statement');
        } finally {
            setReplacing(false);
        }
    };

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
            toast.error('Please select a file');
            return;
        }
        await previewMutation.mutateAsync();
    };

    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="h-4 w-24 bg-gray-200 dark:bg-neutral-800 animate-pulse rounded mb-4" />
            </div>
        );
    }

    if (!wallet) {
        return <div className="p-8 text-red-500 dark:text-red-400">Wallet not found.</div>;
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <Card className="overflow-hidden transition-colors">
                <div className="p-6 border-b border-gray-100 dark:border-neutral-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{wallet.name}</h1>
                        <p className="text-gray-500 dark:text-gray-400 font-mono mt-1 text-sm">{wallet.institution} • {wallet.account_num || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Balance</p>
                        <MaskedBalance
                            value={wallet.balance}
                            className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1 inline-block"
                            iconClassName="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-1"
                        />

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

                    {!wallet.statements || wallet.statements.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 border-dashed rounded-xl transition-colors">
                            <UploadCloud className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
                            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">No statements yet</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                                Upload a wallet statement PDF to automatically extract and categorize transactions.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {wallet.statements.map((statement) => (
                                <Card
                                    key={statement.id}
                                    className="p-4 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                                                {statement.month} {statement.year}
                                                <UnreconciledBadge status={statement.processing_status} />
                                            </h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {statement.transaction_count} transactions • {statement.processing_status}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                                {new Date(statement.upload_date).toLocaleDateString('en-PK')}
                                            </p>
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
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </Card>

            {/* All Transactions Table */}
            {allTransactions.length > 0 && (
                <Card className="overflow-hidden transition-colors p-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                        All Transactions
                    </h2>
                    <BankTransactionsTable
                        bankId={id}
                        transactions={allTransactions}
                        resource="wallets"
                    />
                </Card>
            )}

            {/* Statement Transactions Modal */}
            {selectedStatement && (
                <StatementTransactionsModal
                    isOpen={!!selectedStatement}
                    onClose={() => setSelectedStatement(null)}
                    bankId={id}
                    statementId={selectedStatement.id}
                    statementTitle={selectedStatement.title}
                    resource="wallets"
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
                title="Upload Wallet Statement"
            >
                <form onSubmit={handleUpload} className="space-y-4">
                    <StatementFileUpload
                        fileName={fileName}
                        pdfPassword={pdfPassword}
                        onPasswordChange={setPdfPassword}
                        onFileChange={handleFileChange}
                        inputId="wallet-pdf-input"
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
                    onConfirm={(mapping) => handleCommit({ mapping })}
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
