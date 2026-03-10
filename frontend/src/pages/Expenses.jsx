import { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Trash2, CalendarDays, X, Receipt, Edit2, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { TableSkeleton } from '../components/Skeleton';
import DatePickerInput from '../components/DatePickerInput';
import MaskedBalance from '../components/MaskedBalance';
import Button from '../components/Button';
import Modal from '../components/Modal';
import TextInput from '../components/TextInput';
import { toast } from 'sonner';
import { useBanks } from '../hooks/useBanks';
import { useWallets } from '../hooks/useWallets';

const DEFAULT_BILLS = [
    { category: 'Gas Bill', amount: '', expense_date: new Date().toISOString().split('T')[0], payment_method: '', notes: '' },
    { category: 'Gardner Bill', amount: '', expense_date: new Date().toISOString().split('T')[0], payment_method: '', notes: '' },
    { category: 'Electricity Bill', amount: '', expense_date: new Date().toISOString().split('T')[0], payment_method: '', notes: '' },
    { category: 'School', amount: '', expense_date: new Date().toISOString().split('T')[0], payment_method: '', notes: '' },
    { category: 'Water Bill', amount: '', expense_date: new Date().toISOString().split('T')[0], payment_method: '', notes: '' },
    { category: 'Mobile Bill', amount: '', expense_date: new Date().toISOString().split('T')[0], payment_method: '', notes: '' },
    { category: 'Internet Bill', amount: '', expense_date: new Date().toISOString().split('T')[0], payment_method: '', notes: '' },
];

export default function Expenses() {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });

    // Monthly View State
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [editId, setEditId] = useState(null);

    // Batch State
    const [batchRows, setBatchRows] = useState([...DEFAULT_BILLS]);
    const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);

    // Dynamic Payment Methods
    const { data: banks = [] } = useBanks();
    const { data: wallets = [] } = useWallets();

    const paymentMethods = [
        ...banks.map(b => b.name),
        ...wallets.map(w => w.institution),
        'Cash'
    ];

    const [formData, setFormData] = useState({
        amount: '',
        category: '',
        expense_date: new Date().toISOString().split('T')[0],
        payment_method: '',
        notes: ''
    });

    const fetchExpenses = async () => {
        try {
            const { data } = await api.get('/expenses');
            setExpenses(data);
        } catch (error) {
            console.error('Error fetching expenses', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExpenses();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editId) {
                await api.put(`/expenses/${editId}`, formData);
            } else {
                await api.post('/expenses', formData);
            }
            setShowForm(false);
            setEditId(null);
            setFormData({ amount: '', category: '', expense_date: new Date().toISOString().split('T')[0], payment_method: '', notes: '' });
            fetchExpenses();
        } catch (error) {
            console.error('Error saving expense', error);
        }
    };

    const handleBatchSubmit = async (e) => {
        e.preventDefault();

        // Filter out empty/unfilled rows
        const validRows = batchRows.filter(row => row.amount && parseFloat(row.amount) > 0);

        if (validRows.length === 0) {
            toast.error("No valid expenses to submit (all amounts are 0 or empty).");
            return;
        }

        setIsSubmittingBatch(true);
        try {
            await api.post('/expenses/batch', validRows);
            setShowBatchModal(false);
            setBatchRows([...DEFAULT_BILLS]); // Reset to default state
            fetchExpenses();
            toast.success('Batch saved successfully');
        } catch (error) {
            console.error('Error submitting batch', error);
            toast.error("Failed to save the batch! Please try again.");
        } finally {
            setIsSubmittingBatch(false);
        }
    };

    const updateBatchRow = (index, field, value) => {
        const updated = [...batchRows];
        updated[index][field] = value;
        setBatchRows(updated);
    };

    const addBatchRow = () => {
        setBatchRows([
            ...batchRows,
            { category: '', amount: '', expense_date: new Date().toISOString().split('T')[0], payment_method: '', notes: '' }
        ]);
    };

    const removeBatchRow = (index) => {
        const updated = batchRows.filter((_, i) => i !== index);
        setBatchRows(updated);
    };

    const handleEdit = (expense) => {
        setFormData({
            amount: expense.amount,
            category: expense.category,
            expense_date: new Date(expense.expense_date).toISOString().split('T')[0],
            payment_method: expense.payment_method || '',
            notes: expense.notes || ''
        });
        setEditId(expense.id);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = (id) => {
        setDeleteModal({ isOpen: true, id });
    };

    const confirmDelete = async () => {
        if (deleteModal.id) {
            try {
                await api.delete(`/expenses/${deleteModal.id}`);
                fetchExpenses();
                toast.success('Expense deleted');
            } catch (error) {
                toast.error('Failed to delete expense');
            } finally {
                setDeleteModal({ isOpen: false, id: null });
            }
        }
    };

    // Derived States for Monthly View
    const monthlyExpenses = expenses.filter(expense => {
        if (!expense.expense_date) return false;
        const d = new Date(expense.expense_date);
        const yyyy = d.getFullYear();
        // JavaScript getMonth() returns 0-11, so we add 1.
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        // selectedMonth is in 'YYYY-MM' format natively from the <input type="month">
        return `${yyyy}-${mm}` === selectedMonth;
    });

    const monthlyTotal = monthlyExpenses.reduce((sum, item) => sum + Number(item.amount), 0);

    if (loading) return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 transition-colors">Expenses</h1>
                <div className="h-10 w-32 bg-gray-200 dark:bg-neutral-800 animate-pulse rounded-lg" />
            </div>
            <TableSkeleton rows={5} />
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header + Actions */}
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 transition-colors">Expenses</h1>



                <div className="flex gap-3">
                    {/* Month Picker */}
                    <div className="flex items-center gap-1 bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 p-1 shadow-sm transition-colors">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                const [y, m] = selectedMonth.split('-');
                                let prevM = parseInt(m) - 1;
                                let prevY = parseInt(y);
                                if (prevM === 0) { prevM = 12; prevY -= 1; }
                                setSelectedMonth(`${prevY}-${String(prevM).padStart(2, '0')}`);
                            }}
                            className="h-8 w-8 text-gray-500 dark:text-gray-400"
                            title="Previous Month"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </Button>

                        <div className="flex items-center gap-2 px-2">
                            <CalendarDays className="w-4 h-4 text-gray-400 block transition-colors" />
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="bg-transparent border-none focus:ring-0 p-0 text-gray-700 dark:text-gray-200 font-medium sm:text-sm w-[130px] text-center"
                                style={{ colorScheme: 'dark' }}
                            />
                        </div>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                const [y, m] = selectedMonth.split('-');
                                let nextM = parseInt(m) + 1;
                                let nextY = parseInt(y);
                                if (nextM === 13) { nextM = 1; nextY += 1; }
                                setSelectedMonth(`${nextY}-${String(nextM).padStart(2, '0')}`);
                            }}
                            className="h-8 w-8 text-gray-500 dark:text-gray-400"
                            title="Next Month"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </Button>
                    </div>
                    <Button
                        color="light"
                        onClick={() => {
                            setBatchRows([...DEFAULT_BILLS]); // fresh slate
                            setShowBatchModal(true);
                        }}
                    >
                        <Receipt className="w-5 h-5 mr-2" />
                        Log Monthly Bills
                    </Button>
                    <Button
                        color="blue"
                        onClick={() => {
                            setEditId(null);
                            setFormData({ amount: '', category: '', expense_date: new Date().toISOString().split('T')[0], payment_method: '', notes: '' });
                            setShowForm(!showForm);
                        }}
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Single Expense
                    </Button>
                </div>
            </div>

            {/* Insight Card */}
            <div className="bg-white dark:bg-neutral-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-neutral-800 flex items-center gap-4 transition-colors">
                <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center transition-colors">
                    <TrendingDown className="w-6 h-6 text-rose-500 dark:text-rose-400" />
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider transition-colors">
                        Total Expenses for {selectedMonth}
                    </p>
                    <MaskedBalance value={monthlyTotal} className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1 transition-colors multi-line" />
                </div>
            </div>

            {/* Batch Entry Modal */}
            {showBatchModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-xl animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center bg-gray-50/50 dark:bg-neutral-800/50 rounded-t-2xl">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                                    <Receipt className="w-5 h-5 mr-2 text-emerald-600 dark:text-emerald-500" />
                                    Monthly Bill Run
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Review standard tracking lines. Enter values for bills to process; blank fields are skipped.</p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowBatchModal(false)}
                                className="h-8 w-8 text-gray-400 hover:bg-gray-200 dark:hover:bg-neutral-700 rounded-full"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Scrolling Body */}
                        <div className="flex-1 overflow-auto p-6 bg-gray-50/30 dark:bg-neutral-900/50">
                            <form id="batch-form" onSubmit={handleBatchSubmit} className="space-y-3">
                                <div className="hidden lg:grid grid-cols-12 gap-4 px-4 py-2 bg-gray-100 dark:bg-neutral-800 rounded-lg text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    <div className="col-span-3">Bill / Category</div>
                                    <div className="col-span-2">Amount (PKR)</div>
                                    <div className="col-span-2">Date</div>
                                    <div className="col-span-2">Paid Via</div>
                                    <div className="col-span-2">Ref / Notes</div>
                                    <div className="col-span-1 text-center">Delete</div>
                                </div>

                                {batchRows.map((row, idx) => (
                                    <div key={idx} className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 lg:items-center bg-white dark:bg-neutral-800 p-4 lg:p-2 lg:px-4 rounded-xl border border-gray-200 dark:border-neutral-700 shadow-sm hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors">

                                        <div className="col-span-3">
                                            <TextInput
                                                type="text"
                                                required
                                                value={row.category}
                                                onChange={(e) => updateBatchRow(idx, 'category', e.target.value)}
                                                placeholder="Custom Type"
                                            />
                                        </div>

                                        <div className="col-span-2 relative">
                                            <TextInput
                                                type="number"
                                                step="0.01"
                                                addon="Rs"
                                                value={row.amount}
                                                onChange={(e) => updateBatchRow(idx, 'amount', e.target.value)}
                                                placeholder="0.00"
                                                className="font-semibold"
                                            />
                                        </div>

                                        <div className="col-span-2">
                                            <DatePickerInput
                                                required
                                                selectedDate={row.expense_date}
                                                onChange={(val) => updateBatchRow(idx, 'expense_date', val)}
                                                className="w-full px-3 py-2 bg-gray-50 lg:bg-transparent border border-gray-300 dark:border-neutral-600 rounded focus:ring-2 ring-emerald-500 text-sm dark:text-gray-100"
                                            />
                                        </div>

                                        <div className="col-span-2">
                                            <select
                                                value={row.payment_method}
                                                onChange={(e) => updateBatchRow(idx, 'payment_method', e.target.value)}
                                                className="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm dark:text-gray-100 outline-none transition-all"
                                            >
                                                <option value="">Select Method</option>
                                                {[...new Set(paymentMethods)].map(method => (
                                                    <option key={method} value={method}>{method}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="col-span-2">
                                            <TextInput
                                                type="text"
                                                value={row.notes}
                                                onChange={(e) => updateBatchRow(idx, 'notes', e.target.value)}
                                                placeholder="Optional notes"
                                            />
                                        </div>

                                        <div className="col-span-1 flex justify-end lg:justify-center">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeBatchRow(idx)}
                                                className="h-9 w-9 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                title="Remove Row"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </form>

                            <Button
                                type="button"
                                color="light"
                                onClick={addBatchRow}
                                className="mt-4"
                            >
                                <Plus className="w-4 h-4 mr-1" />
                                Custom Blank Row
                            </Button>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-b-2xl flex justify-between items-center transition-colors">
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                Total Rows Detected: <span className="font-semibold text-gray-900 dark:text-gray-100">{batchRows.filter(r => r.amount && parseFloat(r.amount) > 0).length} valid entries</span>
                            </div>
                            <div className="flex gap-3">
                                <Button color="light" onClick={() => setShowBatchModal(false)}>
                                    Discard Session
                                </Button>
                                <Button
                                    type="submit"
                                    color="blue"
                                    form="batch-form"
                                    disabled={isSubmittingBatch}
                                >
                                    {isSubmittingBatch ? 'Committing...' : 'Commit Batch to Ledger'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showForm && (
                <form onSubmit={handleSubmit} className="bg-white dark:bg-neutral-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-800 space-y-4 transition-colors">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <div className="mb-1 block">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Amount (PKR)</label>
                            </div>
                            <TextInput id="exp-amount" required type="number" step="0.01" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
                        </div>
                        <div>
                            <div className="mb-1 block">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                            </div>
                            <TextInput id="exp-category" required type="text" placeholder="Food, Rent, etc." value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} />
                        </div>
                        <div>
                            <div className="mb-1 block">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
                            </div>
                            <DatePickerInput
                                required
                                selectedDate={formData.expense_date}
                                onChange={val => setFormData({ ...formData, expense_date: val })}
                                className="w-full px-3 py-2 bg-transparent border border-gray-300 dark:border-neutral-700 rounded focus:ring-emerald-500 focus:border-emerald-500 dark:text-white"
                            />
                        </div>
                        <div>
                            <div className="mb-1 block">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Payment Method</label>
                            </div>
                            <select
                                id="exp-payment"
                                value={formData.payment_method}
                                onChange={e => setFormData({ ...formData, payment_method: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm dark:text-gray-100 outline-none transition-all h-10"
                            >
                                <option value="">Select Method</option>
                                {[...new Set(paymentMethods)].map(method => (
                                    <option key={method} value={method}>{method}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <div className="mb-1 block">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
                        </div>
                        <TextInput id="exp-notes" type="text" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
                    </div>
                    <div className="flex justify-end space-x-3">
                        <Button color="light" onClick={() => {
                            setShowForm(false);
                            setEditId(null);
                            setFormData({ amount: '', category: '', expense_date: new Date().toISOString().split('T')[0], payment_method: '', notes: '' });
                        }}>Cancel</Button>
                        <Button type="submit" color="blue">{editId ? 'Update Expense' : 'Save Expense'}</Button>
                    </div>
                </form>
            )}

            <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden transition-colors">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-800">
                    <thead className="bg-gray-50 dark:bg-neutral-800/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Method</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Notes</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-neutral-900 divide-y divide-gray-200 dark:divide-neutral-800 transition-colors">
                        {monthlyExpenses.map((expense) => (
                            <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{new Date(expense.expense_date).toLocaleDateString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{expense.category}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600 dark:text-red-400">-PKR {Number(expense.amount).toLocaleString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{expense.payment_method || '-'}</td>
                                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">{expense.notes || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right flex justify-end gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleEdit(expense)}
                                        className="h-8 w-8 text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
                                    >
                                        <Edit2 className="w-5 h-5" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDelete(expense.id)}
                                        className="h-8 w-8 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                        {monthlyExpenses.length === 0 && (
                            <tr>
                                <td colSpan="6" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                    <p className="text-lg font-medium text-gray-900 dark:text-gray-100">No expenses recorded</p>
                                    <p className="mt-1">You have no tracking data for {selectedMonth}.</p>
                                </td>
                            </tr>
                        )}

                    </tbody>
                </table>
            </div>
            <Modal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, id: null })}
                title="Delete Expense"
                description="Are you sure you want to delete this expense?"
                type="danger"
                primaryAction={{
                    label: 'Delete',
                    onClick: confirmDelete,
                    variant: 'danger'
                }}
                secondaryAction={{
                    label: 'Cancel',
                    onClick: () => setDeleteModal({ isOpen: false, id: null })
                }}
            />
        </div>
    );
}
