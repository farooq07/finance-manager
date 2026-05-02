import React, { useState } from 'react';
import { Plus, Trash2, Shield, MoreVertical, Loader2, Mail, Calendar, ChevronDown, Key } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import Modal from '../components/Modal';
import Button from '../components/Button';
import TextInput from '../components/TextInput';
import Select from '../components/Select';
import { TableSkeleton } from '../components/Skeleton';

export default function Users() {
    const queryClient = useQueryClient();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, name: '' });
    const [resetPasswordModal, setResetPasswordModal] = useState({ isOpen: false, id: null, email: '' });
    const [feedbackModal, setFeedbackModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
    const [selectedRole, setSelectedRole] = useState(null);
    const [editingUserId, setEditingUserId] = useState(null);
    const [newPassword, setNewPassword] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'user'
    });

    // Fetch all users
    const { data: usersData, isLoading } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const { data } = await api.get('/users');
            return data;
        }
    });

    const users = usersData?.users || [];

    // Create user mutation
    const createUserMutation = useMutation({
        mutationFn: async (userData) => {
            const { data } = await api.post('/users', userData);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['users']);
            setIsAddModalOpen(false);
            setFormData({ name: '', email: '', password: '', role: 'user' });
            setFeedbackModal({
                isOpen: true,
                title: 'Success',
                message: 'User created successfully',
                type: 'success'
            });
        },
        onError: (error) => {
            setFeedbackModal({
                isOpen: true,
                title: 'Error',
                message: error.response?.data?.message || 'Failed to create user',
                type: 'danger'
            });
        }
    });

    // Update role mutation
    const updateRoleMutation = useMutation({
        mutationFn: async ({ userId, role }) => {
            const { data } = await api.put(`/users/${userId}/role`, { role });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['users']);
            setEditingUserId(null);
            setSelectedRole(null);
            setFeedbackModal({
                isOpen: true,
                title: 'Success',
                message: 'User role updated successfully',
                type: 'success'
            });
        },
        onError: (error) => {
            setFeedbackModal({
                isOpen: true,
                title: 'Error',
                message: error.response?.data?.message || 'Failed to update role',
                type: 'danger'
            });
        }
    });

    // Delete user mutation
    const deleteUserMutation = useMutation({
        mutationFn: async (userId) => {
            await api.delete(`/users/${userId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['users']);
            setDeleteModal({ isOpen: false, id: null, name: '' });
            setFeedbackModal({
                isOpen: true,
                title: 'Success',
                message: 'User deleted successfully',
                type: 'success'
            });
        },
        onError: (error) => {
            setFeedbackModal({
                isOpen: true,
                title: 'Error',
                message: error.response?.data?.message || 'Failed to delete user',
                type: 'danger'
            });
        }
    });

    // Reset password mutation
    const resetPasswordMutation = useMutation({
        mutationFn: async ({ userId, password }) => {
            const { data } = await api.put(`/users/${userId}/password`, { newPassword: password });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['users']);
            setResetPasswordModal({ isOpen: false, id: null, email: '' });
            setNewPassword('');
            setFeedbackModal({
                isOpen: true,
                title: 'Success',
                message: 'Password reset successfully',
                type: 'success'
            });
        },
        onError: (error) => {
            setFeedbackModal({
                isOpen: true,
                title: 'Error',
                message: error.response?.data?.message || 'Failed to reset password',
                type: 'danger'
            });
        }
    });

    const handleAddUser = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.email || !formData.password) {
            setFeedbackModal({
                isOpen: true,
                title: 'Validation Error',
                message: 'Please fill in all fields',
                type: 'warning'
            });
            return;
        }
        await createUserMutation.mutateAsync(formData);
    };

    const handleUpdateRole = async (userId) => {
        if (!selectedRole) return;
        await updateRoleMutation.mutateAsync({ userId, role: selectedRole });
    };

    const handleDeleteUser = async () => {
        if (deleteModal.id) {
            await deleteUserMutation.mutateAsync(deleteModal.id);
        }
    };

    const handleResetPassword = async () => {
        if (!newPassword || newPassword.length < 6) {
            setFeedbackModal({
                isOpen: true,
                title: 'Validation Error',
                message: 'Password must be at least 6 characters long',
                type: 'warning'
            });
            return;
        }
        await resetPasswordMutation.mutateAsync({ userId: resetPasswordModal.id, password: newPassword });
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-PK', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getRoleBadgeColor = (role) => {
        if (role === 'super.admin') {
            return 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400';
        }
        return role === 'admin'
            ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            : 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
    };

    return (
        <div className="flex-1 overflow-auto">
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Users Management</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Manage user accounts and assign roles
                        </p>
                    </div>
                    <Button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
                    >
                        <Plus className="w-4 h-4" />
                        Add User
                    </Button>
                </div>

                {/* Users Table */}
                {isLoading ? (
                    <TableSkeleton rows={5} cols={5} />
                ) : (
                    <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Created</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-neutral-800">
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                            No users found
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                                                        <span className="text-xs font-bold text-white">
                                                            {user.name?.charAt(0)?.toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <span className="font-medium text-gray-900 dark:text-gray-100">
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
                                                            {user.role === 'admin' && <Shield className="w-3 h-3" />}
                                                            {user.role === 'admin' ? 'Admin' : 'User'}
                                                        </span>
                                                        <button
                                                            onClick={() => setEditingUserId(user.id)}
                                                            className="text-gray-400 hover:text-emerald-600 p-1 rounded hover:bg-gray-100 dark:hover:bg-neutral-800"
                                                            title="Edit role"
                                                        >
                                                            <ChevronDown className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    {formatDate(user.created_at)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap flex items-center gap-2">
                                                <button
                                                    onClick={() => setResetPasswordModal({
                                                        isOpen: true,
                                                        id: user.id,
                                                        email: user.email
                                                    })}
                                                    disabled={resetPasswordMutation.isPending}
                                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-1.5 rounded transition-colors disabled:opacity-50"
                                                    title="Reset password"
                                                >
                                                    <Key className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteModal({
                                                        isOpen: true,
                                                        id: user.id,
                                                        name: user.name
                                                    })}
                                                    disabled={deleteUserMutation.isPending}
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded transition-colors disabled:opacity-50"
                                                    title="Delete user"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add User Modal */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Add New User"
            >
                <form onSubmit={handleAddUser} className="space-y-4">
                    <TextInput
                        label="Full Name"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                    <TextInput
                        label="Email"
                        type="email"
                        placeholder="john@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                    />
                    <TextInput
                        label="Password"
                        type="password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                    />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Role
                        </label>
                        <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                            <option value="super.admin">Super Admin</option>
                        </select>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsAddModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={createUserMutation.isPending}
                            className="flex items-center gap-2"
                        >
                            {createUserMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            Create User
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Reset Password Modal */}
            <Modal
                isOpen={resetPasswordModal.isOpen}
                onClose={() => {
                    setResetPasswordModal({ isOpen: false, id: null, email: '' });
                    setNewPassword('');
                }}
                title="Reset User Password"
            >
                <div className="space-y-4">
                    <p className="text-gray-700 dark:text-gray-300">
                        Reset password for <strong>{resetPasswordModal.email}</strong>
                    </p>
                    <TextInput
                        label="New Password"
                        type="password"
                        placeholder="Enter new password (min 6 characters)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                                setResetPasswordModal({ isOpen: false, id: null, email: '' });
                                setNewPassword('');
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
                            onClick={handleResetPassword}
                            disabled={resetPasswordMutation.isPending}
                        >
                            {resetPasswordMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            Reset Password
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, id: null, name: '' })}
                title="Delete User"
            >
                <div className="space-y-4">
                    <p className="text-gray-700 dark:text-gray-300">
                        Are you sure you want to delete <strong>{deleteModal.name}</strong>? This action cannot be undone.
                    </p>
                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setDeleteModal({ isOpen: false, id: null, name: '' })}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            className="bg-red-600 hover:bg-red-700 flex items-center gap-2"
                            onClick={handleDeleteUser}
                            disabled={deleteUserMutation.isPending}
                        >
                            {deleteUserMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            Delete
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Feedback Modal */}
            <Modal
                isOpen={feedbackModal.isOpen}
                onClose={() => setFeedbackModal({ isOpen: false, title: '', message: '', type: 'info' })}
                title={feedbackModal.title}
            >
                <p className={`text-sm ${
                    feedbackModal.type === 'success' ? 'text-green-700 dark:text-green-400' :
                    feedbackModal.type === 'danger' ? 'text-red-700 dark:text-red-400' :
                    feedbackModal.type === 'warning' ? 'text-yellow-700 dark:text-yellow-400' :
                    'text-gray-700 dark:text-gray-300'
                }`}>
                    {feedbackModal.message}
                </p>
                <button
                    onClick={() => setFeedbackModal({ isOpen: false, title: '', message: '', type: 'info' })}
                    className="mt-4 w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                    Close
                </button>
            </Modal>
        </div>
    );
}
