import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    useBeneficiaries,
    useCreateBeneficiary,
    useDeleteBeneficiary,
} from '../hooks/useBeneficiaries';
import { TableSkeleton } from '../components/Skeleton';
import Modal from '../components/Modal';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, User, ChevronRight, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

const EMPTY_FORM = { name: '', nickname: '', phone: '', notes: '', accounts: [] };

export default function Beneficiaries() {
    const { data: beneficiaries = [], isLoading } = useBeneficiaries();
    const createBeneficiary = useCreateBeneficiary();
    const deleteBeneficiary = useDeleteBeneficiary();

    const [addModal, setAddModal] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [accountInput, setAccountInput] = useState({ account_label: '', account_no: '' });

    const handleAddAccount = () => {
        if (!accountInput.account_no.trim()) return;
        setForm(f => ({ ...f, accounts: [...f.accounts, { ...accountInput }] }));
        setAccountInput({ account_label: '', account_no: '' });
    };

    const handleRemoveAccount = (idx) => {
        setForm(f => ({ ...f, accounts: f.accounts.filter((_, i) => i !== idx) }));
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) return toast.error('Name is required');
        try {
            await createBeneficiary.mutateAsync(form);
            setForm(EMPTY_FORM);
            setAccountInput({ account_label: '', account_no: '' });
            setAddModal(false);
            toast.success('Beneficiary added');
        } catch {
            toast.error('Failed to add beneficiary');
        }
    };

    const closeAddModal = () => {
        setAddModal(false);
        setForm(EMPTY_FORM);
        setAccountInput({ account_label: '', account_no: '' });
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteBeneficiary.mutateAsync(deleteId);
            setDeleteId(null);
            toast.success('Beneficiary removed');
        } catch {
            toast.error('Failed to delete beneficiary');
        }
    };

    if (isLoading) return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Beneficiaries</h1>
            <TableSkeleton rows={5} />
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Beneficiaries</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Track payments to and from named contacts
                    </p>
                </div>
                <Button onClick={() => setAddModal(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Beneficiary
                </Button>
            </div>

            {/* List */}
            {beneficiaries.length === 0 ? (
                <Card className="p-12 text-center">
                    <User className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium">No beneficiaries yet</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                        Add a person's account number and their transactions will be auto-linked.
                    </p>
                </Card>
            ) : (
                <Card className="divide-y divide-gray-100 dark:divide-neutral-800">
                    {beneficiaries.map((b) => (
                        <div key={b.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                                    {b.name.charAt(0).toUpperCase()}
                                </span>
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">{b.name}</span>
                                    {b.nickname && (
                                        <span className="text-xs text-gray-400 dark:text-gray-500">({b.nickname})</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 mt-0.5">
                                    {b.accounts.length > 0 && (
                                        <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                                            <CreditCard className="w-3 h-3" />
                                            {b.accounts.length} account{b.accounts.length !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                        {b._count?.transactions ?? 0} linked transaction{(b._count?.transactions ?? 0) !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setDeleteId(b.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <Link
                                    to={`/beneficiaries/${b.id}`}
                                    className="p-1.5 text-gray-400 hover:text-emerald-600 transition-colors rounded"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>
                    ))}
                </Card>
            )}

            {/* Add Modal */}
            <Modal isOpen={addModal} onClose={closeAddModal} title="Add Beneficiary" size="md">
                <form onSubmit={handleCreate} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="b-name">Full Name <span className="text-red-500">*</span></Label>
                            <Input
                                id="b-name"
                                value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                placeholder="Azhar Ahmed"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="b-nickname">Nickname</Label>
                            <Input
                                id="b-nickname"
                                value={form.nickname}
                                onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))}
                                placeholder="Azhar"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="b-phone">Phone</Label>
                        <Input
                            id="b-phone"
                            value={form.phone}
                            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                            placeholder="+92 300 1234567"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="b-notes">Notes</Label>
                        <Input
                            id="b-notes"
                            value={form.notes}
                            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                            placeholder="Business partner, etc."
                        />
                    </div>

                    {/* Account numbers */}
                    <div className="border border-gray-200 dark:border-neutral-700 rounded-lg p-3 space-y-3">
                        <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Account Numbers</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                Add their account/IBAN numbers so transactions are auto-linked when you upload a statement.
                            </p>
                        </div>

                        {form.accounts.map((a, i) => (
                            <div key={i} className="flex items-center gap-2 bg-gray-50 dark:bg-neutral-800 rounded-md px-3 py-2">
                                <div className="flex-1 min-w-0">
                                    {a.account_label && (
                                        <span className="text-xs text-gray-400 dark:text-gray-500 mr-1.5">{a.account_label}:</span>
                                    )}
                                    <span className="text-xs font-mono text-gray-700 dark:text-gray-300">{a.account_no}</span>
                                </div>
                                <button type="button" onClick={() => handleRemoveAccount(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}

                        <div className="flex gap-2">
                            <Input
                                value={accountInput.account_label}
                                onChange={e => setAccountInput(a => ({ ...a, account_label: e.target.value }))}
                                placeholder="Label (HBL, NayaPay…)"
                                className="flex-1 h-8 text-xs"
                            />
                            <Input
                                value={accountInput.account_no}
                                onChange={e => setAccountInput(a => ({ ...a, account_no: e.target.value }))}
                                placeholder="Account / IBAN"
                                className="flex-1 h-8 text-xs font-mono"
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddAccount())}
                            />
                            <Button type="button" size="sm" variant="outline" onClick={handleAddAccount} className="h-8 w-8 p-0 shrink-0">
                                <Plus className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                        <Button type="button" variant="outline" onClick={closeAddModal}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={createBeneficiary.isPending}>
                            {createBeneficiary.isPending ? 'Saving…' : 'Add Beneficiary'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirm */}
            <Modal
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                title="Delete Beneficiary"
                description="This will remove the beneficiary and all their linked transaction records. The original bank transactions will not be affected."
                type="danger"
                primaryAction={{ label: 'Delete', variant: 'danger', onClick: handleDelete, isLoading: deleteBeneficiary.isPending }}
                secondaryAction={{ label: 'Cancel', onClick: () => setDeleteId(null) }}
            />
        </div>
    );
}
