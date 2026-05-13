import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useStatementTransactions, useApproveTransaction } from '../hooks/useStatementTransactions';
import { fmtPKR } from '../utils/currency';
import Modal from './Modal';
import Button from './Button';

const EXPENSE_CATEGORIES = [
    'Food & Dining',
    'Transportation',
    'Shopping',
    'Entertainment',
    'Utilities',
    'Healthcare',
    'Education',
    'Travel',
    'Business',
    'Subscriptions',
    'Insurance',
    'Savings',
    'Investments',
    'Other'
];

export default function StatementTransactionsModal({ isOpen, onClose, bankId, statementId, statementTitle }) {
    const { data: transactions = [], isLoading } = useStatementTransactions(bankId, statementId);
    const approveMutation = useApproveTransaction();
    const [expandedTxId, setExpandedTxId] = useState(null);
    const [categoryOverrides, setCategoryOverrides] = useState({});
    const [notesOverrides, setNotesOverrides] = useState({});

    const handleApprove = async (txId) => {
        try {
            await approveMutation.mutateAsync({
                bankId,
                statementId,
                txId,
                approvedCategory: categoryOverrides[txId] || transactions.find(t => t.id === txId)?.suggested_category,
                notes: notesOverrides[txId] || null
            });
            setExpandedTxId(null);
            setCategoryOverrides(prev => ({ ...prev, [txId]: undefined }));
            setNotesOverrides(prev => ({ ...prev, [txId]: undefined }));
        } catch (error) {
            console.error('Error approving transaction:', error);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved':
                return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
            case 'rejected':
                return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
            default:
                return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'approved':
                return (
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-xs font-medium rounded">
                        <CheckCircle2 className="w-3 h-3" />
                        Approved
                    </div>
                );
            case 'rejected':
                return (
                    <div className="flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 text-xs font-medium rounded">
                        <AlertCircle className="w-3 h-3" />
                        Rejected
                    </div>
                );
            default:
                return (
                    <div className="px-2 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-xs font-medium rounded">
                        Pending Review
                    </div>
                );
        }
    };

    const pendingTransactions = transactions.filter(t => t.processing_status !== 'approved');
    const approvedTransactions = transactions.filter(t => t.processing_status === 'approved');

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Transactions from ${statementTitle}`}
            size="xl"
        >
            <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-gray-500 dark:text-gray-400">No transactions found</p>
                    </div>
                ) : (
                    <>
                        {pendingTransactions.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    Pending Review ({pendingTransactions.length})
                                </h3>
                                {pendingTransactions.map((tx) => (
                                    <div
                                        key={tx.id}
                                        className={`border rounded-lg p-4 transition-colors ${getStatusColor(tx.processing_status)}`}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">
                                                    {tx.description}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray:400 mt-1">
                                                    {new Date(tx.transaction_date).toLocaleDateString('en-PK')}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-sm font-semibold ${tx.net_amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                    {tx.net_amount > 0 ? '+' : ''}{fmtPKR(Math.abs(tx.net_amount))}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    {getStatusBadge(tx.processing_status)}
                                                </p>
                                            </div>
                                        </div>

                                        {expandedTxId === tx.id && (
                                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                        Category
                                                    </label>
                                                    <select
                                                        value={categoryOverrides[tx.id] || tx.suggested_category || 'Other'}
                                                        onChange={(e) => setCategoryOverrides(prev => ({
                                                            ...prev,
                                                            [tx.id]: e.target.value
                                                        }))}
                                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                                    >
                                                        {EXPENSE_CATEGORIES.map(cat => (
                                                            <option key={cat} value={cat}>{cat}</option>
                                                        ))}
                                                    </select>
                                                    {tx.category_confidence > 0 && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                            Suggested: {tx.suggested_category} ({Math.round(tx.category_confidence * 100)}% confidence)
                                                        </p>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                        Notes (optional)
                                                    </label>
                                                    <textarea
                                                        value={notesOverrides[tx.id] || ''}
                                                        onChange={(e) => setNotesOverrides(prev => ({
                                                            ...prev,
                                                            [tx.id]: e.target.value
                                                        }))}
                                                        placeholder="Add notes for this transaction..."
                                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                                                        rows="2"
                                                    />
                                                </div>

                                                <div className="flex gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="secondary"
                                                        onClick={() => setExpandedTxId(null)}
                                                        className="flex-1"
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        onClick={() => handleApprove(tx.id)}
                                                        disabled={approveMutation.isPending}
                                                        className="flex-1 flex items-center justify-center gap-2"
                                                    >
                                                        {approveMutation.isPending && (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        )}
                                                        Approve & Save
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        {expandedTxId !== tx.id && (
                                            <button
                                                onClick={() => setExpandedTxId(tx.id)}
                                                className="mt-3 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
                                            >
                                                Review & Categorize
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {approvedTransactions.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    Approved ({approvedTransactions.length})
                                </h3>
                                {approvedTransactions.map((tx) => (
                                    <div
                                        key={tx.id}
                                        className="border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10 rounded-lg p-3 opacity-75"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">
                                                    {tx.description}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    {new Date(tx.transaction_date).toLocaleDateString('en-PK')} • {tx.approved_category || tx.suggested_category}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-sm font-semibold ${tx.net_amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                    {tx.net_amount > 0 ? '+' : ''}{fmtPKR(Math.abs(tx.net_amount))}
                                                </p>
                                                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 mt-1 ml-auto" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </Modal>
    );
}
