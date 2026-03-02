import React, { useState } from 'react';
import { Settings as SettingsIcon, Building, CreditCard, Banknote, Plus, Trash2, ShieldAlert, Users, Tags, FileText, ChevronRight, Lock, Briefcase } from 'lucide-react';
import { useInstitutions, useCreateInstitution, useDeleteInstitution, useSeedInstitutions } from '../hooks/useInstitutions';
import { useBrokerAccounts, useCreateBrokerAccount, useDeleteBrokerAccount } from '../hooks/useBrokerAccounts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { TableSkeleton } from '../components/Skeleton';
import Modal from '../components/Modal';
import { Button, TextInput, Select } from 'flowbite-react';

export default function Settings() {
    const [activeTab, setActiveTab] = useState('institutions');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAddBrokerModalOpen, setIsAddBrokerModalOpen] = useState(false);

    // Modal Delete States
    const [deleteInstModal, setDeleteInstModal] = useState({ isOpen: false, id: null });
    const [deleteBrokerModal, setDeleteBrokerModal] = useState({ isOpen: false, id: null });

    const [formData, setFormData] = useState({ name: '', type: 'bank', color: '#3b82f6' });
    const [brokerFormData, setBrokerFormData] = useState({ account_title: '', client_code: '', participant_acc_no: '', cdc_sub_acc_no: '', stock_pin_code: '' });

    // Feedback Modal for Success/Errors replacing 'alert'
    const [feedbackModal, setFeedbackModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });

    // PIN
    const [newPin, setNewPin] = useState('');

    const queryClient = useQueryClient();

    // Fetch user profile to check hasPin status
    const { data: userProfile } = useQuery({
        queryKey: ['userProfile'],
        queryFn: async () => {
            const { data } = await api.get('/auth/me');
            return data;
        }
    });

    const { data: institutions, isLoading } = useInstitutions();
    const createInst = useCreateInstitution();
    const deleteInst = useDeleteInstitution();
    const seedInst = useSeedInstitutions();

    const { data: brokerAccounts, isLoading: isLoadingBrokers } = useBrokerAccounts();
    const createBroker = useCreateBrokerAccount();
    const deleteBroker = useDeleteBrokerAccount();

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await createInst.mutateAsync(formData);
            setIsAddModalOpen(false);
            setFormData({ name: '', type: 'bank', color: '#3b82f6' });
            setFeedbackModal({ isOpen: true, title: 'Success', message: 'Institution added successfully.', type: 'success' });
        } catch (error) {
            console.error(error);
            setFeedbackModal({ isOpen: true, title: 'Error', message: error.response?.data?.message || 'Failed to create institution.', type: 'danger' });
        }
    };

    const confirmDeleteInst = async () => {
        if (deleteInstModal.id) {
            await deleteInst.mutateAsync(deleteInstModal.id);
            setDeleteInstModal({ isOpen: false, id: null });
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'bank': return <Building className="w-4 h-4 text-gray-500" />;
            case 'wallet': return <CreditCard className="w-4 h-4 text-gray-500" />;
            case 'cash': return <Banknote className="w-4 h-4 text-green-500" />;
            default: return <Building className="w-4 h-4 text-gray-500" />;
        }
    };

    const menuGroups = [
        {
            title: "Data Dictionary",
            items: [
                { id: 'institutions', label: 'Banks & Wallets', icon: Building },
                { id: 'broker_accounts', label: 'Broker Accounts', icon: Briefcase },
            ]
        },
        {
            title: "System",
            items: [
                { id: 'users', label: 'Users & Roles', icon: Users, disabled: true },
                { id: 'security', label: 'Security & PIN', icon: ShieldAlert },
            ]
        }
    ];

    return (
        <div className="flex h-[calc(100vh-3.5rem)] -m-6 text-gray-900 dark:text-gray-100 transition-colors">
            {/* Secondary Sidebar */}
            <div className="w-64 bg-gray-50 dark:bg-neutral-900 border-r border-gray-200 dark:border-neutral-800 flex flex-col pt-6 pb-4 shrink-0 overflow-y-auto hidden md:flex transition-colors">
                <div className="px-6 mb-6">
                    <h1 className="text-xl font-bold tracking-tight text-blue-600 dark:text-blue-400">Console</h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 uppercase font-semibold tracking-wider">Administration</p>
                </div>

                <nav className="flex-1 space-y-6">
                    {menuGroups.map((group, idx) => (
                        <div key={idx}>
                            <h3 className="px-6 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                                {group.title}
                            </h3>
                            <div className="space-y-0.5">
                                {group.items.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = activeTab === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => !item.disabled && setActiveTab(item.id)}
                                            disabled={item.disabled}
                                            className={`w-full flex items-center justify-between px-6 py-2.5 text-sm transition-colors ${isActive
                                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                                                : item.disabled
                                                    ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800 hover:text-gray-900 dark:hover:text-gray-100'
                                                } ${isActive ? 'border-r-2 border-blue-600 dark:border-blue-500' : 'border-r-2 border-transparent'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} />
                                                {item.label}
                                            </div>
                                            {isActive && <ChevronRight className="w-4 h-4 opacity-50" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white dark:bg-neutral-900 transition-colors">
                {activeTab === 'institutions' && (
                    <div className="flex-1 flex flex-col h-full overflow-hidden">
                        {/* Header Toolbar */}
                        <div className="px-8 py-5 border-b border-gray-200 dark:border-neutral-800 flex justify-between items-center bg-white dark:bg-neutral-900 shrink-0 transition-colors">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Banks & Wallets</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage the global list of banks and wallets available across the app.</p>
                            </div>
                            <Button color="blue" onClick={() => setIsAddModalOpen(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Record
                            </Button>
                        </div>

                        {/* Data Table Area */}
                        <div className="flex-1 overflow-auto p-8 bg-gray-50/30 dark:bg-neutral-900/50 transition-colors">
                            {isLoading ? (
                                <div className="p-6"><TableSkeleton rows={4} /></div>
                            ) : institutions?.length === 0 ? (
                                <div className="p-12 text-center flex flex-col items-center">
                                    <ShieldAlert className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No Banks Configured</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm mb-6">
                                        You need to register at least one institution (like a bank or wallet) before you can add accounts in the app.
                                    </p>
                                    <Button
                                        color="light"
                                        onClick={() => seedInst.mutate()}
                                        disabled={seedInst.isPending}
                                        isProcessing={seedInst.isPending}
                                    >
                                        Auto-Seed Defaults
                                    </Button>
                                </div>
                            ) : (
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-800 transition-colors">
                                    <thead className="bg-white dark:bg-neutral-900 transition-colors">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Brand Color</th>
                                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-neutral-800 bg-white dark:bg-neutral-900 transition-colors">
                                        {institutions?.map((inst) => (
                                            <tr key={inst.id} className="hover:bg-gray-50/50 dark:hover:bg-neutral-800/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{inst.name}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        {getTypeIcon(inst.type)}
                                                        <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">{inst.type}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-4 h-4 rounded border border-gray-200 dark:border-neutral-700" style={{ backgroundColor: inst.color }} />
                                                        <span className="text-sm text-gray-600 dark:text-gray-400 uppercase tabular-nums">{inst.color}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button
                                                        onClick={() => setDeleteInstModal({ isOpen: true, id: inst.id })}
                                                        className="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}

                {/* Add Banks Modal */}
                {isAddModalOpen && (
                    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4 transition-colors">
                        <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-transparent dark:border-neutral-800 transition-colors">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Add Banks</h2>
                                <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 transition-colors">×</button>
                            </div>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div>
                                    <div className="mb-1 block">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Banks Name</label>
                                    </div>
                                    <TextInput
                                        id="bank-name"
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Nayapay"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="mb-1 block">
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
                                        </div>
                                        <Select
                                            id="bank-type"
                                            value={formData.type}
                                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                                        >
                                            <option value="bank">Bank</option>
                                            <option value="wallet">Virtual Wallet</option>
                                            <option value="cash">Cash in Hand</option>
                                            <option value="other">Other</option>
                                        </Select>
                                    </div>
                                    <div>
                                        <div className="mb-1 block">
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Brand Color Code</label>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="color"
                                                className="w-10 h-10 border border-gray-300 dark:border-neutral-700 rounded cursor-pointer p-0.5 bg-white dark:bg-neutral-800 shrink-0 transition-colors"
                                                value={formData.color}
                                                onChange={e => setFormData({ ...formData, color: e.target.value })}
                                            />
                                            <TextInput
                                                id="bank-color"
                                                type="text"
                                                className="flex-1 uppercase font-medium text-gray-600 dark:text-gray-400 tabular-nums"
                                                value={formData.color}
                                                onChange={e => setFormData({ ...formData, color: e.target.value })}
                                                placeholder="#HEXCODE"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 mt-6 pt-2">
                                    <Button color="light" onClick={() => setIsAddModalOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        color="blue"
                                        disabled={createInst.isPending}
                                        isProcessing={createInst.isPending}
                                    >
                                        Save Institution
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {activeTab === 'broker_accounts' && (
                    <div className="flex-1 flex flex-col h-full overflow-hidden">
                        {/* Header Toolbar */}
                        <div className="px-8 py-5 border-b border-gray-200 dark:border-neutral-800 flex justify-between items-center bg-white dark:bg-neutral-900 shrink-0 transition-colors">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Broker Accounts</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage your stock brokerage accounts, CDC mappings, and connection details.</p>
                            </div>
                            <Button color="blue" onClick={() => setIsAddBrokerModalOpen(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Broker
                            </Button>
                        </div>

                        {/* Data Table Area */}
                        <div className="flex-1 overflow-auto p-8 bg-gray-50/30 dark:bg-neutral-900/50 transition-colors">
                            {isLoadingBrokers ? (
                                <div className="p-6"><TableSkeleton rows={2} /></div>
                            ) : brokerAccounts?.length === 0 ? (
                                <div className="p-12 text-center flex flex-col items-center">
                                    <Briefcase className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No Broker Accounts Created</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
                                        You don't have any stock broker accounts configured yet. Add one to activate PSX portfolio linkage.
                                    </p>
                                </div>
                            ) : (
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-800 transition-colors">
                                    <thead className="bg-white dark:bg-neutral-900 transition-colors">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Account Title</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Client Code</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">CDC Sub-Account</th>
                                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-neutral-800 bg-white dark:bg-neutral-900 transition-colors">
                                        {brokerAccounts?.map((broker) => (
                                            <tr key={broker.id} className="hover:bg-gray-50/50 dark:hover:bg-neutral-800/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{broker.account_title}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-mono text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-neutral-800 px-2 py-1 rounded inline-block transition-colors">
                                                        {broker.client_code}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                                        {broker.cdc_sub_acc_no || <span className="text-gray-400 dark:text-gray-500 italic">Not set</span>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button
                                                        onClick={() => setDeleteBrokerModal({ isOpen: true, id: broker.id })}
                                                        className="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'security' && (
                    <div className="flex-1 flex flex-col h-full overflow-hidden">
                        <div className="px-8 py-5 border-b border-gray-200 dark:border-neutral-800 flex justify-between items-center bg-white dark:bg-neutral-900 shrink-0 transition-colors">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Security & PIN</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Configure your Master PIN to protect sensitive account balances.</p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto p-8 bg-gray-50/30 dark:bg-neutral-900/50 transition-colors">
                            <div className="max-w-md bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                                        <Lock className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Master PIN Code</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Must be at least 4 chars long</p>
                                    </div>
                                </div>
                                <form onSubmit={async (e) => {
                                    e.preventDefault();
                                    try {
                                        const res = await api.put('/auth/pin', { pin: newPin });
                                        setNewPin('');
                                        setFeedbackModal({ isOpen: true, title: 'Success', message: res.data.message, type: 'success' });
                                    } catch (error) {
                                        setFeedbackModal({ isOpen: true, title: 'Error', message: error.response?.data?.message || 'Failed to update PIN', type: 'danger' });
                                    }
                                }}>
                                    <div className="mb-4">
                                        <div className="mb-1 block">
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Enter New PIN</label>
                                        </div>
                                        <TextInput
                                            id="new-pin"
                                            type="password"
                                            required
                                            minLength={4}
                                            value={newPin}
                                            onChange={(e) => setNewPin(e.target.value)}
                                            placeholder="••••"
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        color="blue"
                                        className="w-full"
                                    >
                                        Save PIN
                                    </Button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Add Broker Accounts Modal */}
                {isAddBrokerModalOpen && (
                    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4 transition-colors">
                        <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-transparent dark:border-neutral-800 transition-colors">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Add Stock Broker Account</h2>
                                <button onClick={() => setIsAddBrokerModalOpen(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 transition-colors">×</button>
                            </div>
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                try {
                                    await createBroker.mutateAsync(brokerFormData);
                                    setIsAddBrokerModalOpen(false);
                                    setBrokerFormData({ account_title: '', client_code: '', participant_acc_no: '', cdc_sub_acc_no: '', stock_pin_code: '' });
                                    setFeedbackModal({ isOpen: true, title: 'Success', message: 'Broker account successfully added.', type: 'success' });
                                } catch (error) {
                                    setFeedbackModal({ isOpen: true, title: 'Error', message: error.response?.data?.message || 'Failed to create broker account', type: 'danger' });
                                }
                            }} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="mb-1 block">
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Account Title</label>
                                        </div>
                                        <TextInput id="broker-title" type="text" required value={brokerFormData.account_title} onChange={e => setBrokerFormData({ ...brokerFormData, account_title: e.target.value })} placeholder="e.g. Farooq Shad" />
                                    </div>
                                    <div>
                                        <div className="mb-1 block">
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Client Code / User ID</label>
                                        </div>
                                        <TextInput id="broker-code" className="font-mono text-sm" type="text" required value={brokerFormData.client_code} onChange={e => setBrokerFormData({ ...brokerFormData, client_code: e.target.value })} placeholder="e.g. AB1234" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="mb-1 block">
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Participant Account No</label>
                                        </div>
                                        <TextInput id="broker-participant" className="font-mono text-sm" type="text" value={brokerFormData.participant_acc_no} onChange={e => setBrokerFormData({ ...brokerFormData, participant_acc_no: e.target.value })} placeholder="Optional" />
                                    </div>
                                    <div>
                                        <div className="mb-1 block">
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">CDC-Sub Account No</label>
                                        </div>
                                        <TextInput id="broker-cdc" className="font-mono text-sm" type="text" value={brokerFormData.cdc_sub_acc_no} onChange={e => setBrokerFormData({ ...brokerFormData, cdc_sub_acc_no: e.target.value })} placeholder="Optional" />
                                    </div>
                                </div>
                                <div>
                                    <div className="mb-1 block">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Stock Platform PIN Code</label>
                                    </div>
                                    <TextInput id="broker-pin" className="font-mono text-sm" type="text" value={brokerFormData.stock_pin_code} onChange={e => setBrokerFormData({ ...brokerFormData, stock_pin_code: e.target.value })} placeholder="This is the PIN to log into your brokerage app (Optional)" />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">This pin will be protected by your global application Security PIN code.</p>
                                </div>

                                <div className="flex justify-end gap-3 mt-6 pt-2">
                                    <Button color="light" onClick={() => setIsAddBrokerModalOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        color="blue"
                                        disabled={createBroker.isPending}
                                        isProcessing={createBroker.isPending}
                                    >
                                        Save Broker Account
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Delete Institution Modal */}
                <Modal
                    isOpen={deleteInstModal.isOpen}
                    onClose={() => setDeleteInstModal({ isOpen: false, id: null })}
                    title="Delete Institution"
                    description="Are you sure you want to delete this specific institution? Your actively linked accounts won't be deleted, but this option will permanently disappear from the Add Banks menu."
                    type="danger"
                    size="md"
                    primaryAction={{
                        label: 'Delete Institution',
                        onClick: confirmDeleteInst,
                        isLoading: deleteInst.isPending,
                        variant: 'danger',
                    }}
                    secondaryAction={{
                        label: 'Cancel',
                        onClick: () => setDeleteInstModal({ isOpen: false, id: null }),
                        disabled: deleteInst.isPending,
                    }}
                />

                {/* Delete Broker Modal */}
                <Modal
                    isOpen={deleteBrokerModal.isOpen}
                    onClose={() => setDeleteBrokerModal({ isOpen: false, id: null })}
                    title="Delete Broker Account"
                    description="Are you sure you want to remove this stock broker account linkage? This unlinks PSX matching metrics and cannot be undone."
                    type="danger"
                    size="md"
                    primaryAction={{
                        label: 'Delete Account',
                        onClick: async () => {
                            if (deleteBrokerModal.id) {
                                await deleteBroker.mutateAsync(deleteBrokerModal.id);
                                setDeleteBrokerModal({ isOpen: false, id: null });
                            }
                        },
                        isLoading: deleteBroker.isPending,
                        variant: 'danger',
                    }}
                    secondaryAction={{
                        label: 'Cancel',
                        onClick: () => setDeleteBrokerModal({ isOpen: false, id: null }),
                        disabled: deleteBroker.isPending,
                    }}
                />

                {/* Feedback Modal */}
                <Modal
                    isOpen={feedbackModal.isOpen}
                    onClose={() => setFeedbackModal({ ...feedbackModal, isOpen: false })}
                    title={feedbackModal.title}
                    description={feedbackModal.message}
                    type={feedbackModal.type}
                    size="sm"
                    primaryAction={{
                        label: 'Okay',
                        onClick: () => setFeedbackModal({ ...feedbackModal, isOpen: false }),
                        variant: feedbackModal.type === 'danger' ? 'danger' : 'primary'
                    }}
                />
            </div>
        </div>
    );
}
