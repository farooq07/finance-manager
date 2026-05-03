import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Check, X, CheckCheck, Loader2 } from 'lucide-react';
import { fmtPKR } from '../utils/currency';
import { useApproveTransaction } from '../hooks/useStatementTransactions';
import { toast } from 'sonner';

const EXPENSE_CATEGORIES = [
    'ATM Withdrawal',
    'Profit/Dividend',
    'Salary',
    'Bank Charges',
    'Transfer',
    'Food & Dining',
    'Groceries',
    'Transportation',
    'Shopping',
    'Entertainment',
    'Utilities',
    'Healthcare',
    'Education',
    'Travel',
    'Business',
    'Subscription',
    'Insurance',
    'Savings',
    'Investment',
    'Other'
];

export default function BankTransactionsTable({ bankId, transactions = [] }) {
    const approveMutation = useApproveTransaction();
    const [expandedTxId, setExpandedTxId] = useState(null);
    const [categoryOverrides, setCategoryOverrides] = useState({});
    const [notesOverrides, setNotesOverrides] = useState({});
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [isBulkApproving, setIsBulkApproving] = useState(false);

    if (!transactions || transactions.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No transactions to display
            </div>
        );
    }

    const totalDebits = transactions.reduce((sum, tx) => sum + Number(tx.debit_amount || 0), 0);
    const totalCredits = transactions.reduce((sum, tx) => sum + Number(tx.credit_amount || 0), 0);
    const pendingCount = transactions.filter(t => t.processing_status !== 'approved').length;
    const approvedCount = transactions.filter(t => t.processing_status === 'approved').length;

    const handleApprove = async (txId) => {
        try {
            const tx = transactions.find(t => t.id === txId);
            if (!tx) {
                toast.error('Transaction not found');
                return;
            }
            await approveMutation.mutateAsync({
                bankId,
                statementId: tx.bank_statement_id,
                txId,
                approvedCategory: categoryOverrides[txId] || tx?.suggested_category,
                notes: notesOverrides[txId] || null
            });
            setCategoryOverrides(prev => ({ ...prev, [txId]: undefined }));
            setNotesOverrides(prev => ({ ...prev, [txId]: undefined }));
            setExpandedTxId(null);
            toast.success('Transaction approved');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to approve transaction');
        }
    };

    const toggleSelect = (txId) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(txId)) next.delete(txId);
            else next.add(txId);
            return next;
        });
    };

    const handleBulkApprove = async () => {
        const idsToApprove = selectedIds.size > 0
            ? [...selectedIds]
            : transactions.filter(t => t.processing_status !== 'approved').map(t => t.id);

        if (idsToApprove.length === 0) {
            toast.error('No transactions to approve');
            return;
        }

        setIsBulkApproving(true);
        let successCount = 0;
        let failCount = 0;

        for (const txId of idsToApprove) {
            const tx = transactions.find(t => t.id === txId);
            if (!tx || tx.processing_status === 'approved') continue;

            try {
                await approveMutation.mutateAsync({
                    bankId,
                    statementId: tx.bank_statement_id,
                    txId,
                    approvedCategory: categoryOverrides[txId] || tx.suggested_category || 'Other',
                    notes: notesOverrides[txId] || null
                });
                successCount++;
            } catch (error) {
                failCount++;
            }
        }

        setSelectedIds(new Set());
        setCategoryOverrides({});
        setNotesOverrides({});
        setIsBulkApproving(false);

        if (successCount > 0) {
            toast.success(`Approved ${successCount} transaction${successCount > 1 ? 's' : ''}`);
        }
        if (failCount > 0) {
            toast.error(`Failed to approve ${failCount} transaction${failCount > 1 ? 's' : ''}`);
        }
    };

    const toggleSelectAll = () => {
        const pendingIds = transactions
            .filter(t => t.processing_status !== 'approved')
            .map(t => t.id);
        if (selectedIds.size === pendingIds.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(pendingIds));
        }
    };

    const pendingTxs = transactions.filter(t => t.processing_status !== 'approved');
    const approvedTxs = transactions.filter(t => t.processing_status === 'approved');

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Total Transactions</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-2">{transactions.length}</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">Pending Review</p>
                    <p className="text-2xl font-bold text-amber-900 dark:text-amber-100 mt-2">{pendingCount}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">Approved</p>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100 mt-2">{approvedCount}</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                    <p className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide">Net Movement</p>
                    <p className={`text-2xl font-bold mt-2 ${totalCredits > totalDebits ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {totalCredits > totalDebits ? '+' : '-'}{fmtPKR(Math.abs(totalCredits - totalDebits))}
                    </p>
                </div>
            </div>

            {/* Totals Section */}
            <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Total Withdrawals</p>
                        <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">{fmtPKR(totalDebits)}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Total Deposits</p>
                        <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">{fmtPKR(totalCredits)}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Net Balance Change</p>
                        <p className={`text-xl font-bold mt-1 ${totalCredits >= totalDebits ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {totalCredits >= totalDebits ? '+' : ''}{fmtPKR(totalCredits - totalDebits)}
                        </p>
                    </div>
                </div>
            </div>

            {pendingTxs.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Pending Transactions ({pendingTxs.length})
                        </h3>
                        <div className="flex gap-2">
                            {selectedIds.size > 0 && (
                                <button
                                    onClick={() => setSelectedIds(new Set())}
                                    className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors"
                                >
                                    Clear ({selectedIds.size})
                                </button>
                            )}
                            <button
                                onClick={handleBulkApprove}
                                disabled={isBulkApproving}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isBulkApproving ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <CheckCheck className="w-4 h-4" />
                                )}
                                {selectedIds.size > 0
                                    ? `Approve Selected (${selectedIds.size})`
                                    : `Approve All (${pendingTxs.length})`}
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-neutral-800 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-center font-semibold text-gray-900 dark:text-gray-100 w-10">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.size > 0 && selectedIds.size === pendingTxs.length}
                                            onChange={toggleSelectAll}
                                            className="rounded border-gray-300 dark:border-gray-600 text-emerald-600 focus:ring-emerald-500"
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-gray-100">Date</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-gray-100">Description</th>
                                    <th className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-gray-100">Withdrawal</th>
                                    <th className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-gray-100">Deposit</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-gray-100">Category</th>
                                    <th className="px-4 py-3 text-center font-semibold text-gray-900 dark:text-gray-100">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingTxs.map((tx, idx) => (
                                    <React.Fragment key={tx.id}>
                                        <tr className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors ${selectedIds.has(tx.id) ? 'bg-emerald-50 dark:bg-emerald-900/10' : ''}`}>
                                            <td className="px-4 py-3 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(tx.id)}
                                                    onChange={() => toggleSelect(tx.id)}
                                                    className="rounded border-gray-300 dark:border-gray-600 text-emerald-600 focus:ring-emerald-500"
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                                                {new Date(tx.transaction_date).toLocaleDateString('en-PK')}
                                            </td>
                                            <td className="px-4 py-3 text-gray-900 dark:text-gray-100 max-w-xs ">
                                                {tx.description}
                                            </td>
                                            <td className="px-4 py-3 text-right text-red-600 dark:text-red-400 font-medium">
                                                {tx.debit_amount ? fmtPKR(tx.debit_amount) : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-right text-green-600 dark:text-green-400 font-medium">
                                                {tx.credit_amount ? fmtPKR(tx.credit_amount) : '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-xs rounded">
                                                    {categoryOverrides[tx.id] || tx.suggested_category || 'Other'}
                                                </span>
                                                {tx.category_confidence > 0 && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                        {Math.round(tx.category_confidence * 100)}% confidence
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => setExpandedTxId(expandedTxId === tx.id ? null : tx.id)}
                                                    className="p-1 hover:bg-gray-200 dark:hover:bg-neutral-700 rounded transition-colors"
                                                >
                                                    {expandedTxId === tx.id ? (
                                                        <ChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                                    ) : (
                                                        <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                        {expandedTxId === tx.id && (
                                            <tr className="bg-gray-50 dark:bg-neutral-800/50 border-b border-gray-200 dark:border-gray-700">
                                                <td colSpan="7" className="px-4 py-4">
                                                    <div className="space-y-4">
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
                                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100"
                                                            >
                                                                {EXPENSE_CATEGORIES.map(cat => (
                                                                    <option key={cat} value={cat}>{cat}</option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                                Notes
                                                            </label>
                                                            <textarea
                                                                value={notesOverrides[tx.id] || ''}
                                                                onChange={(e) => setNotesOverrides(prev => ({
                                                                    ...prev,
                                                                    [tx.id]: e.target.value
                                                                }))}
                                                                placeholder="Add any notes..."
                                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 resize-none"
                                                                rows="2"
                                                            />
                                                        </div>

                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => setExpandedTxId(null)}
                                                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                onClick={() => handleApprove(tx.id)}
                                                                disabled={approveMutation.isPending}
                                                                className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                            >
                                                                <Check className="w-4 h-4" />
                                                                Approve & Save
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {approvedTxs.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                        Approved Transactions ({approvedTxs.length})
                    </h3>
                    <div className="overflow-x-auto border border-green-200 dark:border-green-800 rounded-lg bg-green-50 dark:bg-green-900/10">
                        <table className="w-full text-sm">
                            <thead className="bg-green-100 dark:bg-green-900/30 border-b border-green-200 dark:border-green-800">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold text-green-900 dark:text-green-100">Date</th>
                                    <th className="px-4 py-3 text-left font-semibold text-green-900 dark:text-green-100">Description</th>
                                    <th className="px-4 py-3 text-right font-semibold text-green-900 dark:text-green-100">Withdrawal</th>
                                    <th className="px-4 py-3 text-right font-semibold text-green-900 dark:text-green-100">Deposit</th>
                                    <th className="px-4 py-3 text-left font-semibold text-green-900 dark:text-green-100">Category</th>
                                    <th className="px-4 py-3 text-center font-semibold text-green-900 dark:text-green-100">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {approvedTxs.map((tx) => (
                                    <tr key={tx.id} className="border-b border-green-200 dark:border-green-800 hover:bg-green-100/50 dark:hover:bg-green-900/20 transition-colors">
                                        <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                                            {new Date(tx.transaction_date).toLocaleDateString('en-PK')}
                                        </td>
                                        <td className="px-4 py-3 text-gray-900 dark:text-gray-100 max-w-xs ">
                                            {tx.description}
                                        </td>
                                        <td className="px-4 py-3 text-right text-red-600 dark:text-red-400 font-medium">
                                            {tx.debit_amount ? fmtPKR(tx.debit_amount) : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right text-green-600 dark:text-green-400 font-medium">
                                            {tx.credit_amount ? fmtPKR(tx.credit_amount) : '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-1 bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100 text-xs rounded">
                                                {tx.approved_category || tx.suggested_category || 'Other'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <Check className="w-5 h-5 text-green-600 dark:text-green-400 mx-auto" />
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
}
