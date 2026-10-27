import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Check, CheckCheck, Loader2, Pencil, Trash2, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { fmtPKR } from '../utils/currency';
import { useApproveTransaction, useBulkApproveTransactions, useUpdateTransactionCategory, useDeleteTransaction } from '../hooks/useStatementTransactions';
import { useStaleResourceHandler } from '../hooks/useStaleResource';
import { useConfirm } from './ui/confirm-dialog';
import { toast } from 'sonner';
import DuplicateBadge from './DuplicateBadge';

const EXPENSE_CATEGORIES = [
    'ATM Withdrawal', 'Profit/Dividend', 'Salary', 'Bank Charges', 'Transfer',
    'Food & Dining', 'Groceries', 'Transportation', 'Shopping', 'Entertainment',
    'Utilities', 'Healthcare', 'Education', 'Travel', 'Business',
    'Subscription', 'Insurance', 'Savings', 'Investment', 'Other'
];

export default function BankTransactionsTable({ bankId, transactions = [], resource = 'banks' }) {
    const approveMutation = useApproveTransaction();
    const bulkApproveMutation = useBulkApproveTransactions();
    const updateMutation = useUpdateTransactionCategory();
    const deleteMutation = useDeleteTransaction();
    const handleStaleResource = useStaleResourceHandler();
    const confirm = useConfirm();
    const [expandedTxId, setExpandedTxId] = useState(null);
    const [categoryOverrides, setCategoryOverrides] = useState({});
    const [notesOverrides, setNotesOverrides] = useState({});
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [bulkCategory, setBulkCategory] = useState('');
    const [editingApprovedId, setEditingApprovedId] = useState(null);
    const [editCategory, setEditCategory] = useState('');
    const [editNotes, setEditNotes] = useState('');
    const [editType, setEditType] = useState('');
    const [editAmount, setEditAmount] = useState('');
    const [pendingTypeOverrides, setPendingTypeOverrides] = useState({});
    const [pendingAmountOverrides, setPendingAmountOverrides] = useState({});

    const TypeBadge = ({ tx }) => {
        const isCredit = Number(tx.net_amount) > 0 || (tx.credit_amount && !tx.debit_amount);
        return isCredit ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
                <ArrowDownLeft className="w-3 h-3" />
                Credit
            </span>
        ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400">
                <ArrowUpRight className="w-3 h-3" />
                Debit
            </span>
        );
    };

    if (!transactions || transactions.length === 0) {
        return <div className="text-center py-8 text-gray-500 dark:text-gray-400">No transactions to display</div>;
    }

    const pendingTxs = transactions.filter(t => t.processing_status !== 'approved');
    const approvedTxs = transactions.filter(t => t.processing_status === 'approved');

    const handleApprove = async (txId) => {
        const tx = transactions.find(t => t.id === txId);
        if (!tx) return;
        try {
            const typeOverride = pendingTypeOverrides[txId];
            const amountOverride = pendingAmountOverrides[txId];
            const currentType = Number(tx.net_amount) > 0 ? 'credit' : 'debit';
            const currentAbs = Math.abs(Number(tx.net_amount));
            const typeChanged = typeOverride && typeOverride !== currentType;
            const amountChanged = amountOverride != null && parseFloat(amountOverride) !== currentAbs;

            if (typeChanged || amountChanged) {
                await updateMutation.mutateAsync({
                    resource,
                    bankId,
                    statementId: tx.bank_statement_id,
                    txId,
                    transaction_type: typeChanged ? typeOverride : undefined,
                    amount: amountChanged ? parseFloat(amountOverride) : undefined
                });
            }
            await approveMutation.mutateAsync({
                resource,
                bankId,
                statementId: tx.bank_statement_id,
                txId,
                approvedCategory: categoryOverrides[txId] || tx.suggested_category,
                notes: notesOverrides[txId] || null
            });
            setCategoryOverrides(prev => { const n = { ...prev }; delete n[txId]; return n; });
            setNotesOverrides(prev => { const n = { ...prev }; delete n[txId]; return n; });
            setPendingTypeOverrides(prev => { const n = { ...prev }; delete n[txId]; return n; });
            setPendingAmountOverrides(prev => { const n = { ...prev }; delete n[txId]; return n; });
            setExpandedTxId(null);
            toast.success('Transaction approved');
        } catch (error) {
            if (handleStaleResource(error)) return;
            toast.error(error.response?.data?.message || 'Failed to approve transaction');
        }
    };

    const handleBulkApprove = async () => {
        const toApprove = selectedIds.size > 0
            ? pendingTxs.filter(t => selectedIds.has(t.id))
            : pendingTxs;

        if (!toApprove.length) { toast.error('No transactions to approve'); return; }

        const payload = toApprove.map(tx => ({
            txId: tx.id,
            approvedCategory: bulkCategory || tx.suggested_category || 'Other'
        }));

        try {
            const result = await bulkApproveMutation.mutateAsync({ resource, bankId, transactions: payload });
            setSelectedIds(new Set());
            setBulkCategory('');
            toast.success(`Approved ${result.successCount} transaction${result.successCount !== 1 ? 's' : ''}`);
        } catch (error) {
            if (handleStaleResource(error)) return;
            toast.error(error.response?.data?.message || 'Failed to approve transactions');
        }
    };

    const handleDelete = async (tx) => {
        const ok = await confirm({
            title: 'Delete transaction',
            description: `Delete this transaction? "${tx.description.substring(0, 60)}"${tx.description.length > 60 ? '...' : ''}`,
            confirmText: 'Delete',
        });
        if (!ok) return;
        try {
            await deleteMutation.mutateAsync({
                resource,
                bankId,
                statementId: tx.bank_statement_id,
                txId: tx.id
            });
            toast.success('Transaction deleted');
        } catch (error) {
            if (handleStaleResource(error)) return;
            toast.error(error.response?.data?.message || 'Failed to delete transaction');
        }
    };

    const openEditApproved = (tx) => {
        setEditingApprovedId(tx.id);
        setEditCategory(tx.approved_category || tx.suggested_category || 'Other');
        setEditNotes(tx.notes || '');
        setEditType(Number(tx.net_amount) > 0 ? 'credit' : 'debit');
        setEditAmount(String(Math.abs(Number(tx.net_amount))));
    };

    const handleSaveEdit = async (tx) => {
        try {
            const currentType = Number(tx.net_amount) > 0 ? 'credit' : 'debit';
            const currentAbs = Math.abs(Number(tx.net_amount));
            const newAbs = parseFloat(editAmount);
            await updateMutation.mutateAsync({
                resource,
                bankId,
                statementId: tx.bank_statement_id,
                txId: tx.id,
                approvedCategory: editCategory,
                notes: editNotes || null,
                transaction_type: editType !== currentType ? editType : undefined,
                amount: !isNaN(newAbs) && newAbs !== currentAbs ? newAbs : undefined
            });
            setEditingApprovedId(null);
            toast.success('Category updated');
        } catch (error) {
            if (handleStaleResource(error)) return;
            toast.error(error.response?.data?.message || 'Failed to update');
        }
    };

    const toggleSelect = (txId) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(txId) ? next.delete(txId) : next.add(txId);
            return next;
        });
    };

    const toggleSelectAll = () => {
        const pendingIds = pendingTxs.map(t => t.id);
        setSelectedIds(selectedIds.size === pendingIds.length ? new Set() : new Set(pendingIds));
    };

    const isLoading = bulkApproveMutation.isPending;
    const selectedCount = selectedIds.size;

    return (
        <div className="space-y-6">
            {/* Section heading — explains what this list is; totals live in the stat strip above */}
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Transactions</h2>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 max-w-md">
                        Pulled from your uploaded statements and auto-categorised — review pending items, then approve.
                    </p>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-medium tabular-nums">
                    <span className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300">
                        {transactions.length} total
                    </span>
                    {pendingTxs.length > 0 && (
                        <span className="px-2 py-1 rounded-lg bg-warning-50 dark:bg-warning-900/20 text-warning-700 dark:text-warning-400">
                            {pendingTxs.length} to review
                        </span>
                    )}
                    <span className="px-2 py-1 rounded-lg bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-400">
                        {approvedTxs.length} approved
                    </span>
                </div>
            </div>

            {pendingTxs.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Pending Transactions ({pendingTxs.length})
                        </h3>
                    </div>

                    {/* Bulk Action Bar */}
                    <div className="flex flex-wrap items-center gap-3 mb-3 p-3 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <span className="text-sm text-gray-600 dark:text-gray-400 min-w-max">
                            {selectedCount > 0 ? (
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{selectedCount} selected</span>
                            ) : (
                                <span>Select transactions or approve all</span>
                            )}
                        </span>

                        <select
                            value={bulkCategory}
                            onChange={(e) => setBulkCategory(e.target.value)}
                            className="flex-1 min-w-[180px] px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        >
                            <option value="">Keep each suggested category</option>
                            {EXPENSE_CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>

                        <div className="flex gap-2">
                            {selectedCount > 0 && (
                                <button
                                    onClick={() => setSelectedIds(new Set())}
                                    className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors"
                                >
                                    Clear
                                </button>
                            )}
                            <button
                                onClick={handleBulkApprove}
                                disabled={isLoading}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
                                {selectedCount > 0 ? `Approve ${selectedCount}` : `Approve All (${pendingTxs.length})`}
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-neutral-800 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-center w-10">
                                        <div className="flex justify-center">
                                            <Checkbox
                                                checked={selectedIds.size === pendingTxs.length && pendingTxs.length > 0}
                                                onCheckedChange={toggleSelectAll}
                                                className="border-gray-300 dark:border-gray-600"
                                            />
                                        </div>
                                    </th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-gray-100">Date</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-gray-100">Type</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-gray-100">Description</th>
                                    <th className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-gray-100">Withdrawal</th>
                                    <th className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-gray-100">Deposit</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-gray-100">Category</th>
                                    <th className="px-4 py-3 text-center font-semibold text-gray-900 dark:text-gray-100">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingTxs.map((tx) => (
                                    <React.Fragment key={tx.id}>
                                        <tr className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors ${selectedIds.has(tx.id) ? 'bg-emerald-50 dark:bg-emerald-900/10' : ''}`}>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex justify-center">
                                                    <Checkbox
                                                        checked={selectedIds.has(tx.id)}
                                                        onCheckedChange={() => toggleSelect(tx.id)}
                                                        className="border-gray-300 dark:border-gray-600"
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                                {new Date(tx.transaction_date).toLocaleDateString('en-PK')}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <TypeBadge tx={tx} />
                                            </td>
                                            <td className="px-4 py-3 text-gray-900 dark:text-gray-100 max-w-xs">
                                                {tx.description}
                                                <DuplicateBadge tx={tx} />
                                            </td>
                                            <td className="px-4 py-3 text-right text-red-600 dark:text-red-400 font-medium whitespace-nowrap">
                                                {tx.debit_amount ? fmtPKR(tx.debit_amount) : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-right text-green-600 dark:text-green-400 font-medium whitespace-nowrap">
                                                {tx.credit_amount ? fmtPKR(tx.credit_amount) : '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-xs rounded">
                                                    {categoryOverrides[tx.id] || tx.suggested_category || 'Other'}
                                                </span>
                                                {tx.category_confidence > 0 && (
                                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                        {Math.round(tx.category_confidence * 100)}%
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => setExpandedTxId(expandedTxId === tx.id ? null : tx.id)}
                                                        className="p-1 hover:bg-gray-200 dark:hover:bg-neutral-700 rounded transition-colors"
                                                        title="Edit category / notes"
                                                    >
                                                        {expandedTxId === tx.id
                                                            ? <ChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                                            : <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(tx)}
                                                        disabled={deleteMutation.isPending}
                                                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors disabled:opacity-50"
                                                        title="Delete transaction"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-500 dark:text-red-400" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedTxId === tx.id && (
                                            <tr className="bg-gray-50 dark:bg-neutral-800/50 border-b border-gray-200 dark:border-gray-700">
                                                <td colSpan="8" className="px-4 py-4">
                                                    <div className="flex flex-wrap gap-3 items-end">
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Transaction Type</label>
                                                            <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 text-sm">
                                                                {['debit', 'credit'].map(t => {
                                                                    const current = pendingTypeOverrides[tx.id] ?? (Number(tx.net_amount) > 0 ? 'credit' : 'debit');
                                                                    const active = current === t;
                                                                    return (
                                                                        <button
                                                                            key={t}
                                                                            type="button"
                                                                            onClick={() => setPendingTypeOverrides(prev => ({ ...prev, [tx.id]: t }))}
                                                                            className={`px-3 py-2 capitalize font-medium transition-colors ${active
                                                                                ? t === 'credit'
                                                                                    ? 'bg-emerald-600 text-white'
                                                                                    : 'bg-red-500 text-white'
                                                                                : 'bg-white dark:bg-neutral-900 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-700'
                                                                                }`}
                                                                        >
                                                                            {t}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                        <div className="w-36">
                                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (PKR)</label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                value={pendingAmountOverrides[tx.id] ?? Math.abs(Number(tx.net_amount))}
                                                                onChange={(e) => setPendingAmountOverrides(prev => ({ ...prev, [tx.id]: e.target.value }))}
                                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100"
                                                            />
                                                        </div>
                                                        <div className="flex-1 min-w-[180px]">
                                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                                                            <select
                                                                value={categoryOverrides[tx.id] || tx.suggested_category || 'Other'}
                                                                onChange={(e) => setCategoryOverrides(prev => ({ ...prev, [tx.id]: e.target.value }))}
                                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100"
                                                            >
                                                                {EXPENSE_CATEGORIES.map(cat => (
                                                                    <option key={cat} value={cat}>{cat}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="flex-1 min-w-[180px]">
                                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                                                            <input
                                                                type="text"
                                                                value={notesOverrides[tx.id] || ''}
                                                                onChange={(e) => setNotesOverrides(prev => ({ ...prev, [tx.id]: e.target.value }))}
                                                                placeholder="Optional note..."
                                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100"
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
                                                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
                                                            >
                                                                <Check className="w-4 h-4" />
                                                                Approve
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
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                            Approved Transactions
                            <span className="ml-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-400 text-xs font-medium">
                                <Check className="w-3 h-3" />
                                {approvedTxs.length}
                            </span>
                        </h3>
                    </div>
                    <div className="overflow-x-auto border border-gray-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-neutral-800/50 border-b border-gray-200 dark:border-neutral-800">
                                <tr>
                                    <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Date</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Type</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Description</th>
                                    <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Withdrawal</th>
                                    <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Deposit</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Category</th>
                                    <th className="px-4 py-3 text-center text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {approvedTxs.map((tx) => (
                                    <React.Fragment key={tx.id}>
                                        <tr className="border-b border-gray-100 dark:border-neutral-800 last:border-0 hover:bg-gray-50/60 dark:hover:bg-neutral-800/40 transition-colors">
                                            <td className="px-4 py-3 text-[11px] text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                                {new Date(tx.transaction_date).toLocaleDateString('en-PK')}
                                            </td>
                                            <td className="px-4 py-3 text-[11px] whitespace-nowrap">
                                                <TypeBadge tx={tx} />
                                            </td>
                                            <td className="px-4 py-3 text-[11px] text-gray-900 dark:text-gray-100 max-w-xs">
                                                {tx.description}
                                                <DuplicateBadge tx={tx} />
                                            </td>
                                            <td className="px-4 py-3 text-[11px] text-right text-red-600 dark:text-red-400 font-medium whitespace-nowrap">
                                                {tx.debit_amount ? fmtPKR(tx.debit_amount) : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-[11px] text-right text-green-600 dark:text-green-400 font-medium whitespace-nowrap">
                                                {tx.credit_amount ? fmtPKR(tx.credit_amount) : '-'}
                                            </td>
                                            <td className="px-4 py-3 ">
                                                <span className="px-2 py-0.5 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 text-[11px] font-medium rounded">
                                                    {tx.approved_category || tx.suggested_category || 'Other'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-[11px] text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => editingApprovedId === tx.id ? setEditingApprovedId(null) : openEditApproved(tx)}
                                                        className="p-1 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded transition-colors"
                                                        title="Fix category"
                                                    >
                                                        <Pencil className="w-4 h-4 text-gray-500 dark:text-gray-400 hover:text-primary-600" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(tx)}
                                                        disabled={deleteMutation.isPending}
                                                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors disabled:opacity-50"
                                                        title="Delete transaction"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-500 dark:text-red-400" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {editingApprovedId === tx.id && (
                                            <tr className="bg-green-100/60 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800">
                                                <td colSpan="7" className="px-4 py-4">
                                                    <div className="flex flex-wrap gap-3 items-end">
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Transaction Type</label>
                                                            <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 text-sm">
                                                                {['debit', 'credit'].map(t => {
                                                                    const active = editType === t;
                                                                    return (
                                                                        <button
                                                                            key={t}
                                                                            type="button"
                                                                            onClick={() => setEditType(t)}
                                                                            className={`px-3 py-2 capitalize font-medium transition-colors ${active
                                                                                ? t === 'credit'
                                                                                    ? 'bg-emerald-600 text-white'
                                                                                    : 'bg-red-500 text-white'
                                                                                : 'bg-white dark:bg-neutral-900 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-700'
                                                                                }`}
                                                                        >
                                                                            {t}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                        <div className="w-36">
                                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (PKR)</label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                value={editAmount}
                                                                onChange={(e) => setEditAmount(e.target.value)}
                                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100"
                                                            />
                                                        </div>
                                                        <div className="flex-1 min-w-[180px]">
                                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                                                            <select
                                                                value={editCategory}
                                                                onChange={(e) => setEditCategory(e.target.value)}
                                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100"
                                                            >
                                                                {EXPENSE_CATEGORIES.map(cat => (
                                                                    <option key={cat} value={cat}>{cat}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="flex-1 min-w-[180px]">
                                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                                                            <input
                                                                type="text"
                                                                value={editNotes}
                                                                onChange={(e) => setEditNotes(e.target.value)}
                                                                placeholder="Optional note..."
                                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100"
                                                            />
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => setEditingApprovedId(null)}
                                                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                onClick={() => handleSaveEdit(tx)}
                                                                disabled={updateMutation.isPending}
                                                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
                                                            >
                                                                {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                                                Save
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
        </div>
    );
}
