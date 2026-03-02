import { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import { Plus, Trash2, Upload, ChevronDown, ChevronUp, Loader2, FileSpreadsheet, Pencil, Check, X, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { StatSkeleton, TableSkeleton } from '../components/Skeleton';
import DatePickerInput from '../components/DatePickerInput';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import { Button } from 'flowbite-react';

export default function DuesLedger() {
    const [people, setPeople] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedPerson, setExpandedPerson] = useState(null);

    const [showAddPerson, setShowAddPerson] = useState(false);
    const [personName, setPersonName] = useState('');
    const [personEmail, setPersonEmail] = useState('');

    const [editingPerson, setEditingPerson] = useState(null);
    const [editPersonName, setEditPersonName] = useState('');
    const [editPersonEmail, setEditPersonEmail] = useState('');

    const [activePerson, setActivePerson] = useState(null);
    const [txForm, setTxForm] = useState({
        transaction_type: 'receivable',
        amount: '',
        transaction_date: new Date().toISOString().split('T')[0],
        description: ''
    });

    const [uploadingFor, setUploadingFor] = useState(null);
    const [uploadMsg, setUploadMsg] = useState('');
    const fileInputRef = useRef(null);

    // Checkbox selection state
    const [selectedTxs, setSelectedTxs] = useState(new Set());

    // Inline editing state
    const [editingTx, setEditingTx] = useState(null); // tx id being edited
    const [editForm, setEditForm] = useState({ description: '', amount: '', transaction_date: '', transaction_type: '' });

    const fetchPeople = async () => {
        try {
            const { data } = await api.get('/dues');
            setPeople(data);
        } catch (error) {
            console.error('Error fetching dues', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchPeople(); }, []);

    const handleAddPerson = async (e) => {
        e.preventDefault();
        try {
            await api.post('/dues', { name: personName, email: personEmail });
            setPersonName('');
            setPersonEmail('');
            setShowAddPerson(false);
            fetchPeople();
            toast.success('Person added successfully');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error adding person');
        }
    };

    const handleAddTx = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/dues/${activePerson}/transactions`, txForm);
            setActivePerson(null);
            setTxForm({ transaction_type: 'receivable', amount: '', transaction_date: new Date().toISOString().split('T')[0], description: '' });
            fetchPeople();
            toast.success('Entry added successfully');
        } catch (error) {
            console.error('Error adding transaction', error);
            const errData = error.response?.data;
            if (errData && errData.errors) {
                const msgs = errData.errors.map(e => `${e.field}: ${e.message}`).join('\n');
                toast.error(`Validation Error:\n${msgs}`);
            } else {
                toast.error(errData?.message || 'Error adding transaction');
            }
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Remove this person and all their ledger history?')) return;
        try {
            await api.delete(`/dues/${id}`);
            if (expandedPerson === id) setExpandedPerson(null);
            fetchPeople();
        } catch (error) {
            console.error('Error deleting person', error);
        }
    };

    const handleEditPerson = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/dues/${editingPerson}`, { name: editPersonName, email: editPersonEmail });
            setEditingPerson(null);
            fetchPeople();
            toast.success('Person updated successfully');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error updating person');
        }
    };

    const handleSendReminder = async (id) => {
        try {
            const res = await api.post(`/dues/${id}/reminder`);
            toast.success(res.data.message);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error sending reminder email');
        }
    };

    const handleCSVUpload = async (personId, file) => {
        if (!file) return;
        setUploadingFor(personId);
        setUploadMsg('');
        const form = new FormData();
        form.append('duesCSV', file);
        try {
            const res = await api.post(`/dues/${personId}/upload-csv`, form, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setUploadMsg(res.data.message);
            fetchPeople();
        } catch (error) {
            setUploadMsg('Error uploading CSV.');
            console.error('CSV Upload error', error);
        } finally {
            setUploadingFor(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Checkbox handlers
    const toggleSelect = (txId) => {
        setSelectedTxs(prev => {
            const next = new Set(prev);
            next.has(txId) ? next.delete(txId) : next.add(txId);
            return next;
        });
    };

    const toggleSelectAll = (transactions) => {
        const allIds = transactions.map(t => t.id);
        const allSelected = allIds.every(id => selectedTxs.has(id));
        setSelectedTxs(prev => {
            const next = new Set(prev);
            allIds.forEach(id => allSelected ? next.delete(id) : next.add(id));
            return next;
        });
    };

    const handleDeleteSelected = async () => {
        if (selectedTxs.size === 0) return;
        if (!window.confirm(`Delete ${selectedTxs.size} selected entries?`)) return;
        try {
            await api.post('/dues/transactions/delete', { ids: Array.from(selectedTxs) });
            setSelectedTxs(new Set());
            fetchPeople();
        } catch (error) {
            console.error('Error deleting transactions', error);
        }
    };

    const handleBulkTypeChange = async (type) => {
        if (selectedTxs.size === 0) return;
        try {
            await api.post('/dues/transactions/bulk-type', { ids: Array.from(selectedTxs), transaction_type: type });
            setSelectedTxs(new Set());
            fetchPeople();
        } catch (error) {
            console.error('Error bulk updating type', error);
        }
    };

    // Inline edit handlers
    const startEdit = (tx) => {
        setEditingTx(tx.id);
        setEditForm({
            description: tx.description || '',
            amount: Number(tx.amount),
            transaction_date: new Date(tx.transaction_date).toISOString().split('T')[0],
            transaction_type: tx.transaction_type
        });
    };

    const cancelEdit = () => {
        setEditingTx(null);
        setEditForm({ description: '', amount: '', transaction_date: '', transaction_type: '' });
    };

    const saveEdit = async () => {
        try {
            const payload = {
                description: editForm.description,
                amount: editForm.transaction_type === 'payable' ? -Math.abs(editForm.amount) : Math.abs(editForm.amount),
                transaction_date: editForm.transaction_date,
                transaction_type: editForm.transaction_type
            };
            await api.put(`/dues/transactions/${editingTx}`, payload);
            setEditingTx(null);
            fetchPeople();
        } catch (error) {
            console.error('Error updating transaction', error);
        }
    };

    const toggleExpand = (id) => {
        setExpandedPerson(expandedPerson === id ? null : id);
        setSelectedTxs(new Set());
        setEditingTx(null);
    };

    const formatPKR = (val) => Number(val).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    if (loading) return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <div className="h-8 w-48 bg-gray-200 dark:bg-neutral-800 rounded animate-pulse mb-2"></div>
                    <div className="h-4 w-64 bg-gray-200 dark:bg-neutral-800 rounded animate-pulse"></div>
                </div>
                <div className="h-10 w-32 bg-gray-200 dark:bg-neutral-800 rounded animate-pulse"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <StatSkeleton />
                <StatSkeleton />
                <StatSkeleton />
            </div>
            <div className="space-y-4">
                <TableSkeleton rows={3} />
                <TableSkeleton rows={2} />
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 transition-colors">Dues Ledger</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track who owes you and who you owe</p>
                </div>
                <Button color="blue" onClick={() => setShowAddPerson(!showAddPerson)}>
                    <Plus className="w-4 h-4 mr-2" /> Add Person
                </Button>
            </div>

            {/* Summary Cards */}
            {(() => {
                let totalReceivable = 0;
                let totalPayable = 0;
                people.forEach(p => {
                    if (p.netBalance > 0) totalReceivable += p.netBalance;
                    else if (p.netBalance < 0) totalPayable += Math.abs(p.netBalance);
                });
                const netBalance = totalReceivable - totalPayable;
                return (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Total Receivable */}
                        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-100 dark:border-neutral-800 shadow-sm p-5 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Receivable</span>
                                <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                                    <ArrowUpCircle className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                                </div>
                            </div>
                            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">+PKR {formatPKR(totalReceivable)}</div>
                            <p className="text-xs text-gray-400 mt-1">Amount others owe you</p>
                        </div>
                        {/* Total Payable */}
                        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-100 dark:border-neutral-800 shadow-sm p-5 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Payable</span>
                                <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                                    <ArrowDownCircle className="w-4 h-4 text-red-500 dark:text-red-400" />
                                </div>
                            </div>
                            <div className="text-2xl font-bold text-red-500 dark:text-red-400">-PKR {formatPKR(totalPayable)}</div>
                            <p className="text-xs text-gray-400 mt-1">Amount you owe others</p>
                        </div>
                        {/* Net Balance */}
                        <div className={`rounded-xl border shadow-sm p-5 transition-colors ${netBalance >= 0 ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30' : 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30'}`}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Net Balance</span>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${netBalance >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                                    {netBalance >= 0 ? <ArrowUpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <ArrowDownCircle className="w-4 h-4 text-red-600 dark:text-red-400" />}
                                </div>
                            </div>
                            <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-500 dark:text-red-400'}`}>
                                {netBalance >= 0 ? '+' : '-'}PKR {formatPKR(Math.abs(netBalance))}
                            </div>
                            <p className="text-xs text-gray-400 mt-1">{netBalance >= 0 ? 'You are owed overall' : 'You owe overall'}</p>
                        </div>
                    </div>
                );
            })()}

            {/* Add Person Form */}
            {showAddPerson && (
                <form onSubmit={handleAddPerson} className="bg-white dark:bg-neutral-900 p-5 rounded-xl flex flex-col md:flex-row gap-4 md:items-end shadow-sm border border-gray-200 dark:border-neutral-800 transition-colors">
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Name of Person</label>
                        <input required type="text" value={personName} onChange={e => setPersonName(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors" placeholder="e.g. Ahmed Khan" />
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Email Address (Optional)</label>
                        <input type="email" value={personEmail} onChange={e => setPersonEmail(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors" placeholder="e.g. ahmed@example.com" />
                    </div>
                    <button type="submit" className="px-5 py-2 h-[38px] bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors w-full md:w-auto">Add</button>
                    <button type="button" onClick={() => setShowAddPerson(false)} className="px-5 py-2 h-[38px] bg-gray-200 dark:bg-neutral-700 text-gray-700 dark:text-neutral-300 text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-neutral-600 transition-colors w-full md:w-auto">Cancel</button>
                </form>
            )}

            {/* Add Manual Transaction Form Modal */}
            <Modal
                isOpen={activePerson !== null}
                onClose={() => setActivePerson(null)}
                title={`Add Entry for ${people.find(p => p.id === activePerson)?.name}`}
                size="md"
            >
                <form onSubmit={handleAddTx} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Type</label>
                            <select value={txForm.transaction_type} onChange={e => setTxForm({ ...txForm, transaction_type: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-neutral-600 rounded-lg bg-gray-50 dark:bg-neutral-800 text-gray-900 dark:text-gray-100 text-sm transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none">
                                <option value="receivable">They owe me (+)</option>
                                <option value="payable">I owe them (-)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Amount (PKR)</label>
                            <input required type="number" step="0.01" value={txForm.amount} onChange={e => setTxForm({ ...txForm, amount: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-neutral-600 rounded-lg bg-gray-50 dark:bg-neutral-800 text-gray-900 dark:text-gray-100 text-sm transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Date</label>
                            <DatePickerInput
                                selectedDate={txForm.transaction_date}
                                onChange={(val) => setTxForm({ ...txForm, transaction_date: val })}
                                className="w-full text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description (Optional)</label>
                            <input type="text" value={txForm.description} onChange={e => setTxForm({ ...txForm, description: e.target.value })} className="w-full px-3 py-2 border border-gray-200 dark:border-neutral-600 rounded-lg bg-gray-50 dark:bg-neutral-800 text-gray-900 dark:text-gray-100 text-sm transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="e.g. Lunch" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={() => setActivePerson(null)} className="px-4 py-2 bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors">Cancel</button>
                        <button type="submit" className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">Save Entry</button>
                    </div>
                </form>
            </Modal>

            {/* Upload feedback */}
            {uploadMsg && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-4 py-2.5 rounded-lg text-sm font-medium border border-emerald-200 dark:border-emerald-900/50 transition-colors">
                    {uploadMsg}
                </div>
            )}

            {/* People Cards */}
            <div className="space-y-4">
                {people.map(person => {
                    const isExpanded = expandedPerson === person.id;
                    const balance = person.netBalance;
                    const isPositive = balance > 0;
                    const isNeutral = balance === 0;
                    const allIds = person.transactions.map(t => t.id);
                    const allSelected = allIds.length > 0 && allIds.every(id => selectedTxs.has(id));
                    const someSelected = allIds.some(id => selectedTxs.has(id));

                    return (
                        <div key={person.id} className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden transition-colors">
                            {/* Person Header */}
                            <div className="px-6 py-4 flex justify-between items-center cursor-pointer hover:bg-gray-50/80 dark:hover:bg-neutral-800/80 transition-colors" onClick={() => toggleExpand(person.id)}>
                                <div className="flex items-center space-x-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${isNeutral ? 'bg-gray-400 dark:bg-gray-600' : isPositive ? 'bg-emerald-500' : 'bg-red-500'}`}>
                                        {person.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                            {person.name}
                                            {person.email && person.netBalance > 0 && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSendReminder(person.id);
                                                    }}
                                                    className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 rounded-full hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition-colors shadow-sm"
                                                    title="Send Reminder Email"
                                                >
                                                    Remind
                                                </button>
                                            )}
                                        </h3>
                                        <div className="flex items-center gap-2 text-xs text-gray-400">
                                            <span>{person.transactions.length} entries</span>
                                            {person.email && (
                                                <>
                                                    <span className="w-1 h-1 bg-gray-300 dark:bg-neutral-600 rounded-full"></span>
                                                    <span>{person.email}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <div className={`px-4 py-1.5 rounded-full text-sm font-bold ${isNeutral ? 'bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-gray-400' : isPositive ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'}`}>
                                        {isPositive ? '+' : isNeutral ? '' : '-'}PKR {formatPKR(Math.abs(balance))}
                                        <span className="text-[10px] font-normal ml-1.5 opacity-75">
                                            {isPositive ? 'To Receive' : isNeutral ? 'Settled' : 'To Pay'}
                                        </span>
                                    </div>
                                    {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400 dark:text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-400 dark:text-gray-500" />}
                                </div>
                            </div>

                            {/* Expanded Content */}
                            {isExpanded && (
                                <div className="border-t border-gray-100 dark:border-neutral-800 transition-colors">
                                    {/* Action Buttons */}
                                    <div className="px-6 py-3 bg-gray-50/50 dark:bg-neutral-800/50 flex flex-wrap gap-3 items-center border-b border-gray-100 dark:border-neutral-800 transition-colors relative">

                                        {/* Edit Person Toggle */}
                                        <button onClick={(e) => {
                                            e.stopPropagation();
                                            setEditPersonName(person.name);
                                            setEditPersonEmail(person.email || '');
                                            setEditingPerson(person.id === editingPerson ? null : person.id);
                                        }} className="flex items-center px-3 py-1.5 text-xs font-medium bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors shadow-sm">
                                            <Pencil className="w-3.5 h-3.5 mr-1" /> Edit Profile
                                        </button>

                                        <button onClick={(e) => { e.stopPropagation(); setActivePerson(person.id); }} className="flex items-center px-3 py-1.5 text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                                            <Plus className="w-3.5 h-3.5 mr-1" /> Add Entry
                                        </button>
                                        <label className="flex items-center px-3 py-1.5 text-xs font-medium bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors cursor-pointer">
                                            {uploadingFor === person.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
                                            Upload CSV
                                            <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={(e) => handleCSVUpload(person.id, e.target.files[0])} />
                                        </label>

                                        {someSelected && (
                                            <>
                                                <div className="flex items-center rounded-md overflow-hidden border border-gray-200 dark:border-neutral-700 transition-colors">
                                                    <button onClick={() => handleBulkTypeChange('receivable')} className="flex items-center px-3 py-1.5 text-xs font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors" title="Mark selected as +">
                                                        + Receivable
                                                    </button>
                                                    <button onClick={() => handleBulkTypeChange('payable')} className="flex items-center px-3 py-1.5 text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors border-l border-gray-200 dark:border-neutral-700" title="Mark selected as −">
                                                        − Payable
                                                    </button>
                                                </div>
                                                <button onClick={handleDeleteSelected} className="flex items-center px-3 py-1.5 text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                                                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete ({selectedTxs.size})
                                                </button>
                                            </>
                                        )}

                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(person.id); }} className="flex items-center px-3 py-1.5 text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors ml-auto">
                                            <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove Person
                                        </button>
                                    </div>

                                    {/* Edit Person Inline Form */}
                                    {editingPerson === person.id && (
                                        <form onSubmit={handleEditPerson} className="px-6 py-4 bg-gray-50/80 dark:bg-neutral-800/80 border-b border-gray-100 dark:border-neutral-700 flex flex-col md:flex-row gap-4 shadow-inner transition-colors border-l-4 border-l-blue-500">
                                            <div className="flex-1">
                                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Name</label>
                                                <input required type="text" value={editPersonName} onChange={e => setEditPersonName(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors" />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Email (Optional)</label>
                                                <input type="email" value={editPersonEmail} onChange={e => setEditPersonEmail(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors" placeholder="e.g. hello@example.com" />
                                            </div>
                                            <div className="flex items-end gap-2">
                                                <button type="submit" className="px-4 py-2 h-[38px] bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors w-full md:w-auto flex items-center shadow-sm">
                                                    <Check className="w-4 h-4 mr-1.5" /> Save
                                                </button>
                                                <button type="button" onClick={() => setEditingPerson(null)} className="px-4 py-2 h-[38px] bg-gray-200 dark:bg-neutral-700 text-gray-700 dark:text-neutral-300 text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-neutral-600 transition-colors w-full md:w-auto flex items-center">
                                                    <X className="w-4 h-4 mr-1.5" /> Cancel
                                                </button>
                                            </div>
                                        </form>
                                    )}

                                    {/* Transaction Table */}
                                    {person.transactions.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-neutral-800 transition-colors">
                                                        <th className="px-4 py-3 text-left w-10">
                                                            <input
                                                                type="checkbox"
                                                                checked={allSelected}
                                                                onChange={() => toggleSelectAll(person.transactions)}
                                                                className="w-4 h-4 rounded border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                            />
                                                        </th>
                                                        <th className="px-4 py-3 text-left font-medium w-10">#</th>
                                                        <th className="px-4 py-3 text-left font-medium">Detail</th>
                                                        <th className="px-4 py-3 text-left font-medium">Date</th>
                                                        <th className="px-4 py-3 text-right font-medium">Dues (PKR)</th>
                                                        <th className="px-4 py-3 text-center font-medium w-16">Edit</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50 dark:divide-neutral-800 transition-colors">
                                                    {person.transactions.map((tx, idx) => {
                                                        const amt = Number(tx.amount);
                                                        const isRec = tx.transaction_type === 'receivable';
                                                        const isEditing = editingTx === tx.id;

                                                        return (
                                                            <tr key={tx.id} className={`transition-colors ${isEditing ? 'bg-blue-50/40 dark:bg-blue-900/10' : 'hover:bg-gray-50/50 dark:hover:bg-neutral-800/50'}`}>
                                                                {/* Checkbox */}
                                                                <td className="px-4 py-3">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedTxs.has(tx.id)}
                                                                        onChange={() => toggleSelect(tx.id)}
                                                                        className="w-4 h-4 rounded border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-3 text-gray-400 dark:text-gray-500 font-mono text-xs">{idx + 1}</td>

                                                                {isEditing ? (
                                                                    <>
                                                                        {/* Editable Detail */}
                                                                        <td className="px-4 py-2">
                                                                            <input
                                                                                type="text"
                                                                                value={editForm.description}
                                                                                onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                                                                className="w-full px-2 py-1.5 border border-blue-300 dark:border-blue-700/50 rounded text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-colors"
                                                                            />
                                                                        </td>
                                                                        {/* Editable Date */}
                                                                        <td className="px-4 py-2">
                                                                            <DatePickerInput
                                                                                selectedDate={editForm.transaction_date}
                                                                                onChange={val => setEditForm({ ...editForm, transaction_date: val })}
                                                                                className="!py-1.5 focus:ring-blue-400 border-blue-300 dark:border-blue-700/50 shadow-none text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 transition-colors"
                                                                            />
                                                                        </td>
                                                                        {/* Editable Amount with type toggle */}
                                                                        <td className="px-4 py-2">
                                                                            <div className="flex items-center justify-end space-x-1">
                                                                                <div className="flex rounded-md overflow-hidden border border-blue-300 dark:border-blue-700/50 transition-colors">
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => setEditForm({ ...editForm, transaction_type: 'receivable' })}
                                                                                        className={`px-2.5 py-1.5 text-xs font-bold transition-colors ${editForm.transaction_type === 'receivable'
                                                                                            ? 'bg-emerald-500 text-white'
                                                                                            : 'bg-white dark:bg-neutral-900 text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-neutral-800'
                                                                                            }`}
                                                                                    >+</button>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => setEditForm({ ...editForm, transaction_type: 'payable' })}
                                                                                        className={`px-2.5 py-1.5 text-xs font-bold border-l border-blue-300 dark:border-blue-700/50 transition-colors ${editForm.transaction_type === 'payable'
                                                                                            ? 'bg-red-500 text-white'
                                                                                            : 'bg-white dark:bg-neutral-900 text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-neutral-800'
                                                                                            }`}
                                                                                    >−</button>
                                                                                </div>
                                                                                <input
                                                                                    type="number"
                                                                                    step="0.01"
                                                                                    value={editForm.amount}
                                                                                    onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                                                                                    className="w-28 px-2 py-1.5 border border-blue-300 dark:border-blue-700/50 rounded text-sm text-right bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-colors"
                                                                                />
                                                                            </div>
                                                                        </td>
                                                                        {/* Save / Cancel */}
                                                                        <td className="px-4 py-2">
                                                                            <div className="flex items-center justify-center space-x-1">
                                                                                <button onClick={saveEdit} className="p-1.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition-colors" title="Save">
                                                                                    <Check className="w-3.5 h-3.5" />
                                                                                </button>
                                                                                <button onClick={cancelEdit} className="p-1.5 bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors" title="Cancel">
                                                                                    <X className="w-3.5 h-3.5" />
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <td className="px-4 py-3 text-gray-800 dark:text-gray-200 font-medium">{tx.description || '—'}</td>
                                                                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{new Date(tx.transaction_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                                                        <td className={`px-4 py-3 text-right font-semibold ${isRec ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-500 dark:text-red-400'}`}>
                                                                            {isRec ? '+' : '-'}{formatPKR(amt)}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-center">
                                                                            <button onClick={() => startEdit(tx)} className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors" title="Edit">
                                                                                <Pencil className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        </td>
                                                                    </>
                                                                )}
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="border-t-2 border-gray-200 dark:border-neutral-700 bg-gray-50/80 dark:bg-neutral-800/80 transition-colors">
                                                        <td colSpan="4" className="px-4 py-3 text-right text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Net Total</td>
                                                        <td className={`px-4 py-3 text-right font-bold text-base ${isNeutral ? 'text-gray-500 dark:text-gray-400' : isPositive ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-500 dark:text-red-400'}`}>
                                                            {isPositive ? '+' : isNeutral ? '' : '-'}PKR {formatPKR(Math.abs(balance))}
                                                        </td>
                                                        <td></td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="px-6 py-10 text-center">
                                            <FileSpreadsheet className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                            <p className="text-gray-400 dark:text-gray-500 text-sm">No entries yet. Add manually or upload a CSV.</p>
                                            <p className="text-gray-300 dark:text-gray-600 text-xs mt-1">CSV format: <code className="bg-gray-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-gray-500 dark:text-gray-400">Detail, Dues</code></p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {people.length === 0 && !loading && (
                <div className="text-center py-16 bg-white dark:bg-neutral-900 rounded-xl border border-gray-100 dark:border-neutral-800 transition-colors">
                    <FileSpreadsheet className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium">No one in your ledger yet</p>
                    <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Click "Add Person" to start tracking dues</p>
                </div>
            )}
        </div>
    );
}
