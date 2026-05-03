import React from 'react';
import { Trash2, ChevronDown, Edit2 } from 'lucide-react';

export default function RoleTableRow({
  role,
  isEditing,
  editData,
  onEditStart,
  onEditChange,
  onSave,
  onCancel,
  onDelete
}) {
  const getColorBadge = (slug) => {
    const colors = {
      'user': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'admin': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      'super.admin': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
    };
    return colors[slug] || colors['user'];
  };

  return (
    <tr className="border-b border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors">
      <td className="px-6 py-4">
        {isEditing ? (
          <input
            type="text"
            value={editData.name}
            onChange={(e) => onEditChange({ ...editData, name: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent w-full"
            placeholder="Role name"
          />
        ) : (
          <p className="font-medium text-gray-900 dark:text-gray-100">{role.name}</p>
        )}
      </td>
      <td className="px-6 py-4">
        {isEditing ? (
          <input
            type="text"
            value={editData.slug}
            onChange={(e) => onEditChange({ ...editData, slug: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent w-full"
            placeholder="role.slug"
            disabled
          />
        ) : (
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getColorBadge(role.slug)}`}>
            {role.slug}
          </span>
        )}
      </td>
      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
        <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-neutral-800 rounded">
          {role.permission_count || 0} permissions
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={onSave}
                className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
              >
                Save
              </button>
              <button
                onClick={onCancel}
                className="px-3 py-1.5 text-xs bg-gray-300 dark:bg-neutral-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-400 dark:hover:bg-neutral-600 transition-colors font-medium"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onEditStart(role)}
                className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded transition-colors"
                title="Edit role"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              {!['user', 'admin', 'super.admin'].includes(role.slug) && (
                <button
                  onClick={() => onDelete(role.id, role.name)}
                  className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  title="Delete role"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
