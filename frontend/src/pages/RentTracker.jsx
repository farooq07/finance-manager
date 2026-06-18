import { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Trash2, Pencil, Check, X, Loader2, Building, Calendar, Banknote } from 'lucide-react';
import DatePickerInput from '../components/DatePickerInput';
import { toast } from 'sonner';
import Button from '../components/Button';
import { TableSkeleton } from '../components/Skeleton';
import Modal from '../components/Modal';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function RentTracker() {
    const [data, setData] = useState({ entries: [], totalReceived: 0, byYear: {} });
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });

    const emptyForm = {
        month: MONTHS[new Date().getMonth()],
        year: new Date().getFullYear(),
        payer_name: '',
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        account_source: '',
        notes: ''
    };
    const [form, setForm] = useState({ ...emptyForm });

    const fetchEntries = async () => {
        try {
            const res = await api.get('/rents');
            setData(res.data);
        } catch (error) {
            console.error('Error fetching rents', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchEntries(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`/rents/${editingId}`, form);
                setEditingId(null);
            } else {
                await api.post('/rents', form);
            }
            setForm({ ...emptyForm });
            setShowForm(false);
            fetchEntries();
            toast.success('Rent entry saved successfully');
        } catch (error) {
            console.error('Error saving rent entry', error);
            toast.error(error.response?.data?.message || 'Error saving entry');
        }
    };

    const handleEdit = (entry) => {
        setEditingId(entry.id);
        setForm({
            month: entry.month,
            year: entry.year,
            payer_name: entry.payer_name,
            amount: Number(entry.amount),
            payment_date: new Date(entry.payment_date).toISOString().split('T')[0],
            account_source: entry.account_source,
            notes: entry.notes || ''
        });
        setShowForm(true);
    };

    const handleDelete = (id) => {
        setDeleteModal({ isOpen: true, id });
    };

    const confirmDelete = async () => {
        if (deleteModal.id) {
            try {
                await api.delete(`/rents/${deleteModal.id}`);
                fetchEntries();
                toast.success('Rent entry deleted');
            } catch (error) {
                toast.error('Failed to delete entry');
            } finally {
                setDeleteModal({ isOpen: false, id: null });
            }
        }
    };

    const cancelEdit = () => {
        setEditingId(null);
        setForm({ ...emptyForm });
        setShowForm(false);
    };

    const formatPKR = (val) => Number(val).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    // Get available years from data
    const years = Object.keys(data.byYear).map(Number).sort((a, b) => b - a);
    if (years.length === 0) years.push(new Date().getFullYear());

    // Entries for selected year
    const yearEntries = data.entries.filter(e => e.year === selectedYear);

    // Monthly breakdown for selected year
    const monthlyTotals = {};
    MONTHS.forEach(m => { monthlyTotals[m] = 0; });
    yearEntries.forEach(e => { monthlyTotals[e.month] = (monthlyTotals[e.month] || 0) + Number(e.amount); });
    const yearTotal = yearEntries.reduce((sum, e) => sum + Number(e.amount), 0);

    if (loading) return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Rent Tracker</h1>
                    <div className="h-4 w-48 bg-gray-200 dark:bg-neutral-800 animate-pulse rounded mt-2" />
                </div>
                <div className="h-10 w-32 bg-gray-200 dark:bg-neutral-800 animate-pulse rounded-lg" />
            </div>
            <TableSkeleton rows={5} />
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Rent Tracker</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track monthly rent payments received from properties</p>
                </div>
                <Button color="blue" onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ ...emptyForm }); }}>
                    <Plus className="w-4 h-4 mr-2" /> Add Payment
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-5 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Received (All Time)</span>
                        <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                            <Banknote className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">PKR {formatPKR(data.totalReceived)}</div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{data.entries.length} total payments</p>
                </Card>

                <Card className="p-5 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{selectedYear} Total</span>
                        <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                            <Calendar className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">PKR {formatPKR(yearTotal)}</div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{yearEntries.length} payments this year</p>
                </Card>

            </div>

            {/* Add / Edit Form */}
            {showForm && (
                <div className="bg-blue-50/70 dark:bg-neutral-800/50 p-5 rounded-xl border border-blue-200 dark:border-neutral-700 transition-colors">
                    <h3 className="font-semibold text-blue-800 dark:text-blue-400 mb-4 text-sm">{editingId ? 'Edit Payment' : 'Add New Payment'}</h3>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
                        <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Rent Month</label>
                            <select value={form.month} onChange={e => setForm({ ...form, month: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors">
                                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Year</label>
                            <input required type="number" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Received From</label>
                            <select required value={form.payer_name} onChange={e => setForm({ ...form, payer_name: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors">
                                <option value="">Select payer...</option>
                                <option value="Usman Shad">Usman Shad</option>
                                <option value="Naim Shad">Naim Shad</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Amount (PKR)</label>
                            <input required type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Payment Date</label>
                            <DatePickerInput
                                required
                                selectedDate={form.payment_date}
                                onChange={val => setForm({ ...form, payment_date: val })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Received In (Account/Source)</label>
                            <select required value={form.account_source} onChange={e => setForm({ ...form, account_source: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors">
                                <option value="">Select account...</option>
                                <option value="Easy Paisa">Easy Paisa</option>
                                <option value="Standard Chartered Bank">Standard Chartered Bank</option>
                                <option value="Cash">Cash</option>
                                <option value="Jazz Cash">Jazz Cash</option>
                                <option value="Habib Metro Bank">Habib Metro Bank</option>
                                <option value="Naya Pay">Naya Pay</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Notes (Optional)</label>
                            <input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" placeholder="Any notes" />
                        </div>
                        <div className="flex space-x-2">
                            <Button type="button" variant="outline" onClick={cancelEdit} className="w-full">Cancel</Button>
                            <Button type="submit" className="w-full">{editingId ? 'Update' : 'Save'}</Button>
                        </div>
                    </form>
                </div>
            )}

            {/* Year Tabs */}
            <div className="flex items-center space-x-2">
                {years.map(y => (
                    <Button
                        key={y}
                        variant={selectedYear === y ? 'default' : 'outline'}
                        onClick={() => setSelectedYear(y)}
                        className="px-4 py-2"
                    >
                        {y}
                    </Button>
                ))}
            </div>

            {/* Monthly Overview Bar */}
            <Card className="overflow-hidden transition-colors">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-neutral-800">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Monthly Breakdown — {selectedYear}</h3>
                </div>
                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-px bg-gray-100 dark:bg-neutral-800">
                    {MONTHS.map((m, i) => {
                        const amt = monthlyTotals[m];
                        const hasEntry = amt > 0;
                        return (
                            <div key={m} className={`p-3 text-center ${hasEntry ? 'bg-emerald-50 dark:bg-emerald-900/10' : 'bg-white dark:bg-neutral-900'}`}>
                                <div className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase">{m.slice(0, 3)}</div>
                                <div className={`text-xs font-bold mt-1 ${hasEntry ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-300 dark:text-gray-700'}`}>
                                    {hasEntry ? formatPKR(amt) : '—'}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>

            {/* Entries Table */}
            <Card className="overflow-hidden transition-colors">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Payment Records — {selectedYear}</h3>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{yearEntries.length} entries</span>
                </div>

                {yearEntries.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-neutral-800">
                                    <th className="px-5 py-3 text-left font-medium">#</th>
                                    <th className="px-5 py-3 text-left font-medium">Month</th>
                                    <th className="px-5 py-3 text-left font-medium">Received From</th>
                                    <th className="px-5 py-3 text-left font-medium">Payment Date</th>
                                    <th className="px-5 py-3 text-left font-medium">Account/Source</th>
                                    <th className="px-5 py-3 text-right font-medium">Amount (PKR)</th>
                                    <th className="px-5 py-3 text-left font-medium">Notes</th>
                                    <th className="px-5 py-3 text-center font-medium w-20">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-neutral-800/50">
                                {yearEntries.map((entry, idx) => (
                                    <tr key={entry.id} className="hover:bg-gray-50/50 dark:hover:bg-neutral-800/50 transition-colors">
                                        <td className="px-5 py-3 text-gray-400 dark:text-gray-500 font-mono text-xs">{idx + 1}</td>
                                        <td className="px-5 py-3">
                                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">{entry.month}</span>
                                        </td>
                                        <td className="px-5 py-3 text-gray-800 dark:text-gray-200 font-medium">{entry.payer_name}</td>
                                        <td className="px-5 py-3 text-gray-500 dark:text-gray-400">{new Date(entry.payment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                        <td className="px-5 py-3">
                                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400">{entry.account_source}</span>
                                        </td>
                                        <td className="px-5 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">+{formatPKR(Number(entry.amount))}</td>
                                        <td className="px-5 py-3 text-gray-400 dark:text-gray-500 text-xs">{entry.notes || '—'}</td>
                                        <td className="px-5 py-3 text-center">
                                            <div className="flex items-center justify-center space-x-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEdit(entry)}
                                                    className="h-8 w-8 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                                                    title="Edit"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(entry.id)}
                                                    className="h-8 w-8 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-gray-200 dark:border-neutral-700 bg-gray-50/80 dark:bg-neutral-800/80 transition-colors">
                                    <td colSpan="5" className="px-5 py-3 text-right text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Year Total</td>
                                    <td className="px-5 py-3 text-right font-bold text-base text-emerald-600 dark:text-emerald-400">PKR {formatPKR(yearTotal)}</td>
                                    <td colSpan="2"></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                ) : (
                    <div className="px-6 py-12 text-center">
                        <Building className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-400 dark:text-gray-500 text-sm">No rent payments recorded for {selectedYear}</p>
                        <p className="text-gray-300 dark:text-gray-600 text-xs mt-1">Click "Add Payment" to log a rent received</p>
                    </div>
                )}
            </Card>
            <Modal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, id: null })}
                title="Delete Rent Entry"
                description="Are you sure you want to delete this rent entry?"
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
