import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Settings as SettingsIcon, Building, CreditCard, Banknote, Plus, Trash2, ShieldAlert, Users, Tags, FileText, ChevronRight, Lock, Briefcase, Loader2, ArrowRight, Shield, Mail, Calendar, Eye, EyeOff, Menu, Save, RotateCcw } from 'lucide-react';
import { useInstitutions, useCreateInstitution, useDeleteInstitution, useSeedInstitutions } from '../hooks/useInstitutions';
import { useBrokerAccounts, useCreateBrokerAccount, useDeleteBrokerAccount } from '../hooks/useBrokerAccounts';
import { usePin } from '../context/PinContext';
import { useAuth } from '../context/AuthContext';
import RolesManagement from './RolesManagement';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { TableSkeleton } from '../components/Skeleton';
import Modal from '../components/Modal';
import Button from '../components/Button';
import TextInput from '../components/TextInput';


export default function Settings() {
    const { user: currentUser } = useAuth();
    const isSuperAdmin = currentUser?.role === 'super.admin';
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

    // Users management states
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [deleteUserModal, setDeleteUserModal] = useState({ isOpen: false, id: null, name: '' });
    const [editingUserId, setEditingUserId] = useState(null);
    const [selectedRole, setSelectedRole] = useState(null);
    const [userFormData, setUserFormData] = useState({ name: '', email: '', password: '', role: 'user' });

    // Fetch users
    const { data: usersData, isLoading: isLoadingUsers, error: usersError } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            try {
                const { data } = await api.get('/users');
                return data;
            } catch (error) {
                console.error('Error fetching users:', error);
                // Return empty array on error instead of crashing
                return { users: [] };
            }
        },
        retry: 1,
        staleTime: 30000
    });

    const users = usersData?.users || [];

    // User mutations
    const createUserMutation = useMutation({
        mutationFn: async (userData) => {
            const { data } = await api.post('/users', userData);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['users']);
            setIsAddUserModalOpen(false);
            setUserFormData({ name: '', email: '', password: '', role: 'user' });
            setFeedbackModal({ isOpen: true, title: 'Success', message: 'User created successfully.', type: 'success' });
        },
        onError: (error) => {
            setFeedbackModal({ isOpen: true, title: 'Error', message: error.response?.data?.message || 'Failed to create user.', type: 'danger' });
        }
    });

    const updateRoleMutation = useMutation({
        mutationFn: async ({ userId, role }) => {
            const { data } = await api.put(`/users/${userId}/role`, { role });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['users']);
            setEditingUserId(null);
            setSelectedRole(null);
            setFeedbackModal({ isOpen: true, title: 'Success', message: 'User role updated successfully.', type: 'success' });
        },
        onError: (error) => {
            setFeedbackModal({ isOpen: true, title: 'Error', message: error.response?.data?.message || 'Failed to update role.', type: 'danger' });
        }
    });

    const deleteUserMutation = useMutation({
        mutationFn: async (userId) => {
            await api.delete(`/users/${userId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['users']);
            setDeleteUserModal({ isOpen: false, id: null, name: '' });
            setFeedbackModal({ isOpen: true, title: 'Success', message: 'User deleted successfully.', type: 'success' });
        },
        onError: (error) => {
            setFeedbackModal({ isOpen: true, title: 'Error', message: error.response?.data?.message || 'Failed to delete user.', type: 'danger' });
        }
    });

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

    const handleAddUser = async (e) => {
        e.preventDefault();
        if (!userFormData.name || !userFormData.email || !userFormData.password) {
            setFeedbackModal({
                isOpen: true,
                title: 'Validation Error',
                message: 'Please fill in all fields',
                type: 'warning'
            });
            return;
        }
        await createUserMutation.mutateAsync(userFormData);
    };

    const handleUpdateRole = async (userId) => {
        if (!selectedRole) return;
        await updateRoleMutation.mutateAsync({ userId, role: selectedRole });
    };

    const handleDeleteUser = async () => {
        if (deleteUserModal.id) {
            await deleteUserMutation.mutateAsync(deleteUserModal.id);
        }
    };

    const getRoleBadgeColor = (role) => {
        if (role === 'super.admin') {
            return 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400';
        }
        return role === 'admin'
            ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            : 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
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
                { id: 'users', label: 'Users', icon: Users },
                { id: 'roles', label: 'Roles', icon: Shield },
                { id: 'security', label: 'Security & PIN', icon: ShieldAlert },
                ...(isSuperAdmin ? [{ id: 'menu_access', label: 'Menu Access', icon: Menu }] : []),
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
                                    >
                                        {seedInst.isPending ? 'Seeding...' : 'Auto-Seed Defaults'}
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
                                    >
                                        {createInst.isPending ? 'Saving...' : 'Save Institution'}
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

                {activeTab === 'users' && (
                    <div className="flex-1 flex flex-col h-full overflow-hidden">
                        {/* Header Toolbar */}
                        <div className="px-8 py-5 border-b border-gray-200 dark:border-neutral-800 flex justify-between items-center bg-white dark:bg-neutral-900 shrink-0 transition-colors">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Users & Roles</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage user accounts and assign roles.</p>
                            </div>
                            <Button color="blue" onClick={() => setIsAddUserModalOpen(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add User
                            </Button>
                        </div>

                        {/* Data Table Area */}
                        <div className="flex-1 overflow-auto p-8 bg-gray-50/30 dark:bg-neutral-900/50 transition-colors">
                            {isLoadingUsers ? (
                                <div className="p-6"><TableSkeleton rows={4} /></div>
                            ) : users.length === 0 ? (
                                <div className="p-12 text-center flex flex-col items-center">
                                    <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No Users Found</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
                                        Add your first user to get started.
                                    </p>
                                </div>
                            ) : (
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-800 transition-colors">
                                    <thead className="bg-white dark:bg-neutral-900 transition-colors">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-neutral-800 bg-white dark:bg-neutral-900 transition-colors">
                                        {users.map((user) => (
                                            <tr key={user.id} className="hover:bg-gray-50/50 dark:hover:bg-neutral-800/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                                                            <span className="text-xs font-bold text-white">
                                                                {user.name?.charAt(0)?.toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                            {user.name}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                        <Mail className="w-4 h-4" />
                                                        {user.email}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {editingUserId === user.id ? (
                                                        <div className="flex items-center gap-2">
                                                            <select
                                                                value={selectedRole || user.role}
                                                                onChange={(e) => setSelectedRole(e.target.value)}
                                                                className="px-2 py-1 text-sm border border-gray-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100"
                                                            >
                                                                <option value="user">User</option>
                                                                <option value="admin">Admin</option>
                                                                <option value="super.admin">Super Admin</option>
                                                            </select>
                                                            <button
                                                                onClick={() => handleUpdateRole(user.id)}
                                                                disabled={updateRoleMutation.isPending}
                                                                className="px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
                                                            >
                                                                Save
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingUserId(null)}
                                                                className="px-2 py-1 text-xs bg-gray-300 dark:bg-neutral-700 text-gray-900 dark:text-gray-100 rounded hover:bg-gray-400"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium gap-1 ${getRoleBadgeColor(user.role)}`}>
                                                                {user.role === 'super.admin' && <Shield className="w-3 h-3" />}
                                                                {user.role === 'admin' && <Shield className="w-3 h-3" />}
                                                                {user.role === 'super.admin' ? 'Super Admin' : user.role === 'admin' ? 'Admin' : 'User'}
                                                            </span>
                                                            <button
                                                                onClick={() => setEditingUserId(user.id)}
                                                                className="text-gray-400 hover:text-emerald-600 p-1 rounded hover:bg-gray-100 dark:hover:bg-neutral-800"
                                                                title="Edit role"
                                                            >
                                                                <ChevronRight className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="w-4 h-4" />
                                                        {new Date(user.created_at).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button
                                                        onClick={() => setDeleteUserModal({
                                                            isOpen: true,
                                                            id: user.id,
                                                            name: user.name
                                                        })}
                                                        disabled={deleteUserMutation.isPending}
                                                        className="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                                        title="Delete user"
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
                            <PinSettingsView setFeedbackModal={setFeedbackModal} />
                        </div>
                    </div>
                )}

                {activeTab === 'roles' && (
                    <div className="flex-1 flex flex-col h-full overflow-hidden">
                        <div className="px-8 py-5 border-b border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shrink-0">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Roles</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage role definitions used across the application.</p>
                        </div>
                        <div className="flex-1 overflow-auto p-8 bg-gray-50/30 dark:bg-neutral-900/50">
                            <RolesManagement />
                        </div>
                    </div>
                )}

                {activeTab === 'menu_access' && (
                    <MenuAccessView setFeedbackModal={setFeedbackModal} canEdit={isSuperAdmin} />
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
                                    >
                                        {createBroker.isPending ? 'Saving...' : 'Save Broker Account'}
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

                {/* Add User Modal */}
                {isAddUserModalOpen && (
                    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4 transition-colors">
                        <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-transparent dark:border-neutral-800 transition-colors">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Add New User</h2>
                                <button onClick={() => setIsAddUserModalOpen(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 transition-colors">×</button>
                            </div>
                            <form onSubmit={handleAddUser} className="space-y-4">
                                <div>
                                    <div className="mb-1 block">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                                    </div>
                                    <TextInput
                                        id="user-name"
                                        type="text"
                                        required
                                        value={userFormData.name}
                                        onChange={e => setUserFormData({ ...userFormData, name: e.target.value })}
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div>
                                    <div className="mb-1 block">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                                    </div>
                                    <TextInput
                                        id="user-email"
                                        type="email"
                                        required
                                        value={userFormData.email}
                                        onChange={e => setUserFormData({ ...userFormData, email: e.target.value })}
                                        placeholder="john@example.com"
                                    />
                                </div>
                                <div>
                                    <div className="mb-1 block">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                                    </div>
                                    <TextInput
                                        id="user-password"
                                        type="password"
                                        required
                                        value={userFormData.password}
                                        onChange={e => setUserFormData({ ...userFormData, password: e.target.value })}
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div>
                                    <div className="mb-1 block">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
                                    </div>
                                    <select
                                        value={userFormData.role}
                                        onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="user">User</option>
                                        <option value="admin">Admin</option>
                                        <option value="super.admin">Super Admin</option>
                                    </select>
                                </div>
                                <div className="flex justify-end gap-3 mt-6 pt-2">
                                    <Button color="light" onClick={() => setIsAddUserModalOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        color="blue"
                                        disabled={createUserMutation.isPending}
                                    >
                                        {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Delete User Modal */}
                <Modal
                    isOpen={deleteUserModal.isOpen}
                    onClose={() => setDeleteUserModal({ isOpen: false, id: null, name: '' })}
                    title="Delete User"
                    description={`Are you sure you want to delete ${deleteUserModal.name}? This action cannot be undone.`}
                    type="danger"
                    size="md"
                    primaryAction={{
                        label: 'Delete User',
                        onClick: handleDeleteUser,
                        isLoading: deleteUserMutation.isPending,
                        variant: 'danger',
                    }}
                    secondaryAction={{
                        label: 'Cancel',
                        onClick: () => setDeleteUserModal({ isOpen: false, id: null, name: '' }),
                        disabled: deleteUserMutation.isPending,
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

function PinSettingsView({ setFeedbackModal }) {
    const { hasPin, updateHasPin } = usePin();

    // States: 'idle', 'create_enter', 'create_confirm', 'change_verify', 'change_new', 'change_confirm'
    const [mode, setMode] = useState('idle');
    const [pinSequence, setPinSequence] = useState({ current: '', next: '', confirm: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // For the 6-digit input UI
    const [digits, setDigits] = useState(['', '', '', '', '', '']);
    const inputRefs = useRef([]);

    // Clear input utility
    const clearDigits = () => {
        setDigits(['', '', '', '', '', '']);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
    };

    // Auto-advance logic wrapper
    const handleDigitsChange = (index, value) => {
        if (value && !/^\d+$/.test(value)) return;
        const newDigits = [...digits];
        if (value.length > 1) { // Paste handler
            const pastedData = value.slice(0, 6).split('');
            for (let i = 0; i < pastedData.length; i++) {
                if (index + i < 6) newDigits[index + i] = pastedData[i];
            }
            setDigits(newDigits);
            if (newDigits.join('').length === 6) processStep(newDigits.join(''));
            else inputRefs.current[Math.min(index + pastedData.length, 5)]?.focus();
            return;
        }

        newDigits[index] = value;
        setDigits(newDigits);
        setError('');

        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        } else if (newDigits.join('').length === 6) {
            processStep(newDigits.join(''));
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !digits[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const processStep = async (fullPin) => {
        setLoading(true);
        setError('');

        try {
            if (mode === 'create_enter') {
                setPinSequence(prev => ({ ...prev, next: fullPin }));
                setMode('create_confirm');
                clearDigits();
            } else if (mode === 'create_confirm') {
                if (fullPin !== pinSequence.next) {
                    setError('PINs do not match. Try again.');
                    clearDigits();
                    setLoading(false);
                    return;
                }
                // Save New PIN
                const res = await api.put('/auth/pin', { pin: fullPin });
                updateHasPin(true);
                setMode('idle');
                setFeedbackModal({ isOpen: true, title: 'Success', message: 'Master PIN successfully created.', type: 'success' });
            } else if (mode === 'change_verify') {
                // Verify Current PIN
                await api.post('/auth/verify-pin', { pin: fullPin }); // Will throw if invalid
                setPinSequence(prev => ({ ...prev, current: fullPin }));
                setMode('change_new');
                clearDigits();
            } else if (mode === 'change_new') {
                setPinSequence(prev => ({ ...prev, next: fullPin }));
                setMode('change_confirm');
                clearDigits();
            } else if (mode === 'change_confirm') {
                if (fullPin !== pinSequence.next) {
                    setError('PINs do not match. Try again.');
                    clearDigits();
                    setLoading(false);
                    return;
                }
                // Save Change PIN
                const res = await api.put('/auth/pin/change', { currentPin: pinSequence.current, newPin: fullPin });
                setMode('idle');
                setFeedbackModal({ isOpen: true, title: 'Success', message: 'Master PIN changed successfully.', type: 'success' });
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Verification failed. Try again.');
            clearDigits();
        } finally {
            setLoading(false);
        }
    };

    if (mode === 'idle') {
        return (
            <div className="max-w-md bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                        <Lock className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Master PIN Settings</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Status: {hasPin ? <span className="text-emerald-600 font-medium tracking-wide">ENABLED</span> : <span className="text-gray-500 tracking-wide font-medium">NOT SET</span>}</p>
                    </div>
                </div>

                {!hasPin ? (
                    <Button color="blue" onClick={() => { setMode('create_enter'); clearDigits(); }} className="w-full">
                        Create Master PIN
                    </Button>
                ) : (
                    <Button color="blue" onClick={() => { setMode('change_verify'); clearDigits(); }} className="w-full">
                        Change Master PIN
                    </Button>
                )}
                <p className="mt-4 text-xs text-center text-gray-400">This 6-digit PIN securely masks your overall net worth and account balances until unlocked.</p>
            </div>
        );
    }

    const stepTitles = {
        'create_enter': 'Enter a new 6-digit PIN',
        'create_confirm': 'Confirm your new PIN',
        'change_verify': 'Enter your current PIN',
        'change_new': 'Enter your new 6-digit PIN',
        'change_confirm': 'Confirm your new PIN',
    };

    return (
        <div className="max-w-md bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 p-8 shadow-sm">
            <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{stepTitles[mode]}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Use a strong 6-digit code.
                </p>
            </div>

            <div className="flex gap-2 justify-center mb-6">
                {digits.map((digit, index) => (
                    <input
                        key={index}
                        ref={el => inputRefs.current[index] = el}
                        type="password"
                        inputMode="numeric"
                        maxLength={6}
                        value={digit}
                        onChange={e => handleDigitsChange(index, e.target.value)}
                        onKeyDown={e => handleKeyDown(index, e)}
                        disabled={loading}
                        className="w-12 h-14 text-center text-2xl font-bold bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 dark:text-white mb-2"
                    />
                ))}
            </div>

            <div className="h-6 mb-4 text-center">
                {error && <p className="text-sm font-medium text-red-600 dark:text-red-400 animate-pulse">{error}</p>}
                {loading && <div className="flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-blue-600" /></div>}
            </div>

            <Button color="light" onClick={() => { setMode('idle'); setPinSequence({ current: '', next: '', confirm: '' }); }} className="w-full">
                Cancel
            </Button>
        </div>
    );
}

// =============================================================================
// MenuAccessView — super.admin only — controls which sidebar items regular
// users can see. Admins / super.admins always see everything.
// =============================================================================
function MenuAccessView({ setFeedbackModal, canEdit = false }) {
    const queryClient = useQueryClient();
    const [draft, setDraft] = useState(null);

    // Fetch all users so we can derive the live set of roles.
    // The /users endpoint wraps the array as { users: [...] }.
    // Non-admins get 403 — that's fine, we just fall back to the default 3 roles.
    const { data: usersList = [] } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            try {
                const r = await api.get('/users');
                if (Array.isArray(r.data)) return r.data;
                if (Array.isArray(r.data?.users)) return r.data.users;
                return [];
            } catch {
                return [];
            }
        },
        retry: false,
    });

    const { data: items = [], isLoading } = useQuery({
        queryKey: ['menu-visibility'],
        queryFn: () => api.get('/menu-visibility').then(r => r.data),
    });

    useEffect(() => {
        if (items.length && !draft) setDraft(items);
    }, [items, draft]);

    // Derive the set of all roles currently in use, fall back to defaults
    const allRoles = useMemo(() => {
        const fromUsers = new Set(
            (Array.isArray(usersList) ? usersList : [])
                .map(u => u?.role)
                .filter(Boolean)
        );
        ['user', 'admin', 'super.admin'].forEach(r => fromUsers.add(r));
        return ['user', 'admin', 'super.admin', ...[...fromUsers].filter(r => !['user', 'admin', 'super.admin'].includes(r))];
    }, [usersList]);

    const saveMutation = useMutation({
        mutationFn: (payload) => api.put('/menu-visibility', { items: payload }).then(r => r.data),
        onSuccess: (updated) => {
            queryClient.invalidateQueries({ queryKey: ['menu-visibility'] });
            setDraft(updated);
            setFeedbackModal?.({ isOpen: true, title: 'Saved', message: 'Menu access updated. Users will see the new layout on their next page load.', type: 'success' });
        },
        onError: (err) => {
            setFeedbackModal?.({ isOpen: true, title: 'Error', message: err.response?.data?.message || 'Failed to save', type: 'danger' });
        }
    });

    const toggleRole = (path, role) => {
        setDraft(prev => prev.map(it => {
            if (it.path !== path) return it;
            const roles = Array.isArray(it.visible_to_roles) ? it.visible_to_roles : [];
            const next = roles.includes(role)
                ? roles.filter(r => r !== role)
                : [...roles, role];
            return { ...it, visible_to_roles: next };
        }));
    };

    const reset = () => setDraft(items);
    const isDirty = draft && JSON.stringify(draft) !== JSON.stringify(items);

    const roleLabel = (r) => r === 'super.admin' ? 'Super' : r.charAt(0).toUpperCase() + r.slice(1);

    // Counts per role
    const counts = useMemo(() => {
        if (!draft) return {};
        const c = {};
        for (const role of allRoles) {
            c[role] = draft.filter(d => Array.isArray(d.visible_to_roles) && d.visible_to_roles.includes(role)).length;
        }
        return c;
    }, [draft, allRoles]);

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="px-8 py-5 border-b border-gray-200 dark:border-neutral-800 flex justify-between items-center bg-white dark:bg-neutral-900 shrink-0 transition-colors">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Menu Access</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        Each sidebar item is visible to the roles you tick below. Users with that role see those items.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {isDirty && canEdit && (
                        <Button color="light" onClick={reset}>
                            <RotateCcw className="w-4 h-4 mr-1.5" /> Reset
                        </Button>
                    )}
                    {canEdit && (
                        <Button
                            color="blue"
                            disabled={!isDirty || saveMutation.isPending}
                            onClick={() => saveMutation.mutate(draft)}
                        >
                            {saveMutation.isPending
                                ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Saving…</>
                                : <><Save className="w-4 h-4 mr-1.5" /> Save changes</>}
                        </Button>
                    )}
                    {!canEdit && (
                        <span className="text-xs px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40">
                            Read-only · super-admin required to edit
                        </span>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-auto p-8 bg-gray-50/30 dark:bg-neutral-900/50 transition-colors">
                {/* Per-role summary cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl p-4">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Items</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{draft?.length ?? 0}</p>
                    </div>
                    {allRoles.slice(0, 3).map(role => (
                        <div key={role} className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl p-4">
                            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                                <Eye className="w-3.5 h-3.5" /> {roleLabel(role)} sees
                            </p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                                {counts[role] ?? 0}
                                <span className="text-sm font-normal text-gray-400 dark:text-gray-500"> / {draft?.length ?? 0}</span>
                            </p>
                        </div>
                    ))}
                </div>

                {/* Matrix: rows = menu items, columns = roles */}
                <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl overflow-hidden">
                    {isLoading ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading menu items…
                        </div>
                    ) : (
                        <>
                            {/* Header row */}
                            <div className="hidden sm:flex items-center px-5 py-3 border-b border-gray-100 dark:border-neutral-800 bg-gray-50/60 dark:bg-neutral-800/40 text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold">
                                <span className="flex-1">Menu Item</span>
                                {allRoles.slice(0, 3).map(role => (
                                    <span key={role} className="w-24 text-center">{roleLabel(role)}</span>
                                ))}
                            </div>

                            <div className="divide-y divide-gray-100 dark:divide-neutral-800">
                                {draft?.map((item) => {
                                    const roles = Array.isArray(item.visible_to_roles) ? item.visible_to_roles : [];
                                    return (
                                        <div
                                            key={item.path}
                                            className="flex flex-col sm:flex-row sm:items-center px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3 flex-1 min-w-0 mb-3 sm:mb-0">
                                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                                    roles.length > 0
                                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                                                        : 'bg-gray-100 dark:bg-neutral-800 text-gray-400 dark:text-gray-500'
                                                }`}>
                                                    <Menu className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{item.name}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{item.path}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 sm:gap-0">
                                                {allRoles.slice(0, 3).map(role => {
                                                    const on = roles.includes(role);
                                                    return (
                                                        <div key={role} className="sm:w-24 flex sm:justify-center">
                                                            <button
                                                                onClick={() => canEdit && toggleRole(item.path, role)}
                                                                disabled={!canEdit}
                                                                role="switch"
                                                                aria-checked={on}
                                                                title={`${roleLabel(role)} can ${on ? 'see' : 'NOT see'} this item`}
                                                                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                                                                    canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                                                                } ${
                                                                    on ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-neutral-700'
                                                                }`}
                                                            >
                                                                <span
                                                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                                        on ? 'translate-x-5' : 'translate-x-0.5'
                                                                    }`}
                                                                    style={{ marginTop: '2px' }}
                                                                />
                                                            </button>
                                                            {/* Inline role label on mobile only */}
                                                            <span className="sm:hidden ml-2 text-xs text-gray-500 dark:text-gray-400 self-center">{roleLabel(role)}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
                    A user with role <span className="font-medium text-gray-600 dark:text-gray-300">User</span> sees only items where the User toggle is on.
                    The same goes for Admin and Super.Admin. To hide an item entirely, turn off all three.
                </p>
            </div>
        </div>
    );
}
