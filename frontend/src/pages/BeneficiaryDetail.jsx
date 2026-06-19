import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    useBeneficiary,
    useUpdateBeneficiary,
    useAddBeneficiaryAccount,
    useDeleteBeneficiaryAccount,
    useRescanBeneficiary,
} from '../hooks/useBeneficiaries';
import { fmtPKR } from '../utils/currency';
import MaskedBalance from '../components/MaskedBalance';
import { TableSkeleton } from '../components/Skeleton';
import Modal from '../components/Modal';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Trash2, Pencil, CreditCard, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ui/confirm-dialog';
import clsx from 'clsx';

export default function BeneficiaryDetail() {
    const { id } = useParams();
    const { data: beneficiary, isLoading } = useBeneficiary(id);
    const updateBeneficiary = useUpdateBeneficiary();
    const addAccount = useAddBeneficiaryAccount();
    const deleteAccount = useDeleteBeneficiaryAccount();
    const rescan = useRescanBeneficiary();
    const confirm = useConfirm();

    const [editModal, setEditModal] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [addAccountModal, setAddAccountModal] = useState(false);
    const [accountInput, setAccountInput] = useState({ account_label: '', account_no: '' });

    if (isLoading) return (
        <div className="space-y-6">
            <div className="h-8 w-40 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse" />
            <TableSkeleton rows={6} />
        </div>
    );

    if (!beneficiary) return (
        <div className="text-center py-16 text-gray-400">Beneficiary not found.</div>
    );

    const transactions = beneficiary.transactions || [];

    const totalIn = transactions
        .filter(t => t.direction === 'credit')
        .reduce((s, t) => s + Number(t.amount), 0);

    const totalOut = transactions
        .filter(t => t.direction === 'debit')
        .reduce((s, t) => s + Number(t.amount), 0);

    const openEdit = () => {
        setEditForm({
            name: beneficiary.name,
            nickname: beneficiary.nickname || '',
            phone: beneficiary.phone || '',
            notes: beneficiary.notes || '',
        });
        setEditModal(true);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await updateBeneficiary.mutateAsync({ id, ...editForm });
            setEditModal(false);
            toast.success('Beneficiary updated');
        } catch {
            toast.error('Failed to update');
        }
    };

    const handleAddAccount = async (e) => {
        e.preventDefault();
        if (!accountInput.account_no.trim()) return toast.error('Account number is required');
        try {
            await addAccount.mutateAsync({ beneficiaryId: id, ...accountInput });
            setAccountInput({ account_label: '', account_no: '' });
            setAddAccountModal(false);
            toast.success('Account added');
        } catch {
            toast.error('Failed to add account');
        }
    };

    const handleDeleteAccount = async (accountId) => {
        const ok = await confirm({
            title: 'Remove account number',
            description: 'Remove this account number?',
            confirmText: 'Remove',
        });
        if (!ok) return;
        try {
            await deleteAccount.mutateAsync({ beneficiaryId: id, accountId });
            toast.success('Account removed');
        } catch {
            toast.error('Failed to remove account');
        }
    };

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Header — back navigation lives in the global Header now */}
            <div className="flex items-start gap-3">
                <div className="flex-1 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold text-lg">
                            {beneficiary.name.charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {beneficiary.name}
                            {beneficiary.nickname && (
                                <span className="ml-2 text-base font-normal text-gray-400 dark:text-gray-500">
                                    ({beneficiary.nickname})
                                </span>
                            )}
                        </h1>
                        {beneficiary.phone && (
                            <p className="text-sm text-gray-400 dark:text-gray-500">{beneficiary.phone}</p>
                        )}
                    </div>
                    <Button variant="outline" size="sm" onClick={openEdit} className="gap-1.5 shrink-0">
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                    </Button>
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4">
                <Card className="p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Transactions</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{transactions.length}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Received from them</p>
                    <MaskedBalance
                        value={totalIn}
                        className="text-lg font-bold text-emerald-600 dark:text-emerald-400 inline-block"
                        iconClassName="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-1"
                    />
                </Card>
                <Card className="p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Sent to them</p>
                    <MaskedBalance
                        value={totalOut}
                        className="text-lg font-bold text-red-500 inline-block"
                        iconClassName="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-1"
                    />
                </Card>
            </div>

            {/* Account numbers */}
            <Card>
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-neutral-800">
                    <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-gray-400" />
                        <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">Account Numbers</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setAddAccountModal(true)} className="gap-1.5 h-7 text-xs">
                        <Plus className="w-3.5 h-3.5" />
                        Add
                    </Button>
                </div>

                {beneficiary.accounts.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-gray-400 dark:text-gray-500">
                        No accounts — add one to auto-link transactions when you upload a statement.
                    </p>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-neutral-800">
                        {beneficiary.accounts.map((acc) => (
                            <div key={acc.id} className="flex items-center gap-3 px-5 py-3">
                                <div className="flex-1">
                                    {acc.account_label && (
                                        <span className="text-xs text-gray-400 dark:text-gray-500 mr-2">{acc.account_label}</span>
                                    )}
                                    <span className="text-sm font-mono text-gray-700 dark:text-gray-300">{acc.account_no}</span>
                                </div>
                                <button
                                    onClick={() => handleDeleteAccount(acc.id)}
                                    className="text-gray-300 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Notes */}
            {beneficiary.notes && (
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl px-5 py-3 text-sm text-amber-800 dark:text-amber-300">
                    {beneficiary.notes}
                </div>
            )}

            {/* Transaction history */}
            <Card>
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-neutral-800">
                    <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">Linked Transactions</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 h-7 text-xs"
                        disabled={rescan.isPending}
                        onClick={async () => {
                            try {
                                const result = await rescan.mutateAsync(id);
                                toast.success(`${result.linked} transaction(s) linked`);
                            } catch {
                                toast.error('Rescan failed');
                            }
                        }}
                    >
                        <RefreshCw className={clsx('w-3.5 h-3.5', rescan.isPending && 'animate-spin')} />
                        Re-scan
                    </Button>
                </div>

                {transactions.length === 0 ? (
                    <div className="px-5 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                        No transactions linked yet. Upload a bank statement containing their account number to auto-link.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-neutral-800">
                        {transactions.map((tx) => (
                            <div key={tx.id} className="flex items-center gap-4 px-5 py-3">
                                <div className={clsx(
                                    'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
                                    tx.direction === 'credit'
                                        ? 'bg-emerald-100 dark:bg-emerald-900/30'
                                        : 'bg-red-100 dark:bg-red-900/20'
                                )}>
                                    {tx.direction === 'credit'
                                        ? <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                        : <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                                    }
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                                        {tx.description || '—'}
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500">
                                        {new Date(tx.transaction_date).toLocaleDateString('en-PK', {
                                            day: 'numeric', month: 'short', year: 'numeric'
                                        })}
                                    </p>
                                </div>

                                <span className={clsx(
                                    'font-semibold text-sm',
                                    tx.direction === 'credit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                                )}>
                                    {tx.direction === 'credit' ? '+' : '−'}{fmtPKR(tx.amount)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Edit Modal */}
            <Modal isOpen={editModal} onClose={() => setEditModal(false)} title="Edit Beneficiary" size="md">
                <form onSubmit={handleUpdate} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="e-name">Full Name <span className="text-red-500">*</span></Label>
                            <Input
                                id="e-name"
                                value={editForm.name || ''}
                                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="e-nick">Nickname</Label>
                            <Input
                                id="e-nick"
                                value={editForm.nickname || ''}
                                onChange={e => setEditForm(f => ({ ...f, nickname: e.target.value }))}
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="e-phone">Phone</Label>
                        <Input
                            id="e-phone"
                            value={editForm.phone || ''}
                            onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="e-notes">Notes</Label>
                        <Input
                            id="e-notes"
                            value={editForm.notes || ''}
                            onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                        <Button type="button" variant="outline" onClick={() => setEditModal(false)}>Cancel</Button>
                        <Button type="submit" disabled={updateBeneficiary.isPending}>
                            {updateBeneficiary.isPending ? 'Saving…' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Add Account Modal */}
            <Modal isOpen={addAccountModal} onClose={() => setAddAccountModal(false)} title="Add Account Number" size="sm">
                <form onSubmit={handleAddAccount} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="acc-label">Label <span className="text-gray-400 font-normal">(optional)</span></Label>
                        <Input
                            id="acc-label"
                            value={accountInput.account_label}
                            onChange={e => setAccountInput(a => ({ ...a, account_label: e.target.value }))}
                            placeholder="HBL, NayaPay, JazzCash…"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="acc-no">Account / IBAN <span className="text-red-500">*</span></Label>
                        <Input
                            id="acc-no"
                            value={accountInput.account_no}
                            onChange={e => setAccountInput(a => ({ ...a, account_no: e.target.value }))}
                            placeholder="PK36SCBL0000001123456702"
                            className="font-mono"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                        <Button type="button" variant="outline" onClick={() => setAddAccountModal(false)}>Cancel</Button>
                        <Button type="submit" disabled={addAccount.isPending}>
                            {addAccount.isPending ? 'Adding…' : 'Add Account'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
