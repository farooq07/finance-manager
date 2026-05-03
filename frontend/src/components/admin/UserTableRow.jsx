import React from 'react';
import { Trash2, Key, ChevronDown } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function UserTableRow({ user, isEditing, selectedRole, onEditRole, onSaveRole, onCancelEdit, onResetPassword, onDelete }) {
    const getRoleBadgeStyles = (role) => {
        const styles = {
            'super.admin': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
            'admin': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
            'user': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
        };
        return styles[role] || styles.user;
    };

    return (
        <tr className="border-b border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors">
            <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-xs font-bold">
                            {user.name?.charAt(0)?.toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{user.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                {isEditing ? (
                    <div className="flex items-center gap-2">
                        <select
                            value={selectedRole || user.role}
                            onChange={(e) => onEditRole(e.target.value)}
                            className="px-2 py-1 text-sm border border-gray-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                            <option value="super.admin">Super Admin</option>
                        </select>
                        <button
                            onClick={() => onSaveRole(user.id)}
                            className="px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
                        >
                            Save
                        </button>
                        <button
                            onClick={onCancelEdit}
                            className="px-2 py-1 text-xs bg-gray-300 dark:bg-neutral-700 text-gray-900 dark:text-gray-100 rounded hover:bg-gray-400 dark:hover:bg-neutral-600"
                        >
                            Cancel
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeStyles(user.role)}`}>
                            {user.role === 'super.admin' ? 'Super Admin' : user.role === 'admin' ? 'Admin' : 'User'}
                        </span>
                        <button
                            onClick={() => onEditRole(user.role)}
                            className="p-1 text-gray-400 hover:text-emerald-600 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded transition-colors"
                            title="Edit role"
                        >
                            <ChevronDown className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {new Date(user.created_at).toLocaleDateString('en-PK', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                })}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onResetPassword(user.id, user.email)}
                        className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                        title="Reset password"
                    >
                        <Key className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onDelete(user.id, user.name)}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Delete user"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </td>
        </tr>
    );
}
