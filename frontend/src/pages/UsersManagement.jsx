import React, { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import UserTableRow from '../components/admin/UserTableRow';
import Modal from '../components/Modal';
import Button from '../components/Button';
import TextInput from '../components/TextInput';
import { TableSkeleton } from '../components/Skeleton';
import { toast } from 'sonner';

export default function UsersManagement() {
    const queryClient = useQueryClient();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, name: '' });
    const [resetPasswordModal, setResetPasswordModal] = useState({ isOpen: false, id: null, email: '' });
    const [editingUserId, setEditingUserId] = useState(null);
    const [selectedRole, setSelectedRole] = useState(null);
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
            toast.success('User created successfully');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to create user');
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
            toast.success('User role updated successfully');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to update role');
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
            toast.success('Password reset successfully');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to reset password');
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
            toast.success('User deleted successfully');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to delete user');
        }
    });

    const handleAddUser = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.email || !formData.password) {
            toast.error('Please fill in all fields');
            return;
        }
        await createUserMutation.mutateAsync(formData);
    };

    const handleUpdateRole = async (userId) => {
        if (!selectedRole) return;
        await updateRoleMutation.mutateAsync({ userId, role: selectedRole });
    };

    const handleResetPassword = async () => {
        if (!newPassword || newPassword.length < 6) {
            toast.error('Password must be at least 6 characters long');
            return;
        }
        await resetPasswordMutation.mutateAsync({ userId: resetPasswordModal.id, password: newPassword });
    };

    const handleDeleteUser = async () => {
        if (deleteModal.id) {
            await deleteUserMutation.mutateAsync(deleteModal.id);
        }
    };

    return (
        <div className="flex-1 overflow-auto">
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-50">Users & Roles</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Manage user accounts and assign roles.
                        </p>
                    </div>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        Add User
                    </button>
                </div>

                {/* Users Table */}
                {isLoading ? (
                    <TableSkeleton rows={5} cols={5} />
                ) : (
                    <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Joined</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-neutral-800">
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                            No users found
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((user) => (
                                        <UserTableRow
                                            key={user.id}
                                            user={user}
                                            isEditing={editingUserId === user.id}
                                            selectedRole={selectedRole}
                                            onEditRole={(role) => {
                                                setEditingUserId(user.id);
                                                setSelectedRole(role);
                                            }}
                                            onSaveRole={() => handleUpdateRole(user.id)}
                                            onCancelEdit={() => {
                                                setEditingUserId(null);
                                                setSelectedRole(null);
                                            }}
                                            onResetPassword={(id, email) => {
                                                setResetPasswordModal({ isOpen: true, id, email });
                                            }}
                                            onDelete={(id, name) => {
                                                setDeleteModal({ isOpen: true, id, name });
                                            }}
                                        />
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
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Role</label>
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
        </div>
    );
}
