import React, { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import RoleTableRow from '../components/admin/RoleTableRow';
import Modal from '../components/Modal';
import Button from '../components/Button';
import TextInput from '../components/TextInput';
import { TableSkeleton } from '../components/Skeleton';
import { toast } from 'sonner';

export default function RolesManagement({ addOpen, onAddOpenChange, hideInternalAddButton = false }) {
  const queryClient = useQueryClient();
  const [internalAddOpen, setInternalAddOpen] = useState(false);
  // Allow a parent (Settings console) to drive the Add-Role modal from its header.
  const isAddModalOpen = addOpen !== undefined ? addOpen : internalAddOpen;
  const setIsAddModalOpen = onAddOpenChange || setInternalAddOpen;
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, name: '' });
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [editData, setEditData] = useState({ name: '', slug: '' });
  const [formData, setFormData] = useState({
    name: '',
    slug: ''
  });

  // Fetch all roles
  const { data: rolesData, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data } = await api.get('/roles');
      return data;
    }
  });

  const roles = rolesData?.roles || [];

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (roleData) => {
      const { data } = await api.post('/roles', roleData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['roles']);
      setIsAddModalOpen(false);
      setFormData({ name: '', slug: '' });
      toast.success('Role created successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create role');
    }
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ roleId, roleData }) => {
      const { data } = await api.put(`/roles/${roleId}`, roleData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['roles']);
      setEditingRoleId(null);
      setEditData({ name: '', slug: '' });
      toast.success('Role updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update role');
    }
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId) => {
      await api.delete(`/roles/${roleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['roles']);
      setDeleteModal({ isOpen: false, id: null, name: '' });
      toast.success('Role deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete role');
    }
  });

  const handleAddRole = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.slug) {
      toast.error('Please fill in all fields');
      return;
    }

    // Validate slug format (lowercase, no spaces)
    if (!/^[a-z0-9.]+$/.test(formData.slug)) {
      toast.error('Slug must be lowercase alphanumeric with dots only');
      return;
    }

    await createRoleMutation.mutateAsync(formData);
  };

  const handleUpdateRole = async () => {
    if (!editData.name) {
      toast.error('Role name is required');
      return;
    }
    await updateRoleMutation.mutateAsync({ roleId: editingRoleId, roleData: editData });
  };

  const handleDeleteRole = async () => {
    if (deleteModal.id) {
      await deleteRoleMutation.mutateAsync(deleteModal.id);
    }
  };

  const handleEditStart = (role) => {
    setEditingRoleId(role.id);
    setEditData({ name: role.name, slug: role.slug });
  };

  return (
    <div className="flex-1 overflow-auto">
      {!hideInternalAddButton && (
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Role
        </button>
      )}
      <div className="py-6 space-y-6">


        {/* Roles Table */}
        {isLoading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : (
          <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Slug</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Permissions</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-neutral-800">
                {roles.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      No roles found
                    </td>
                  </tr>
                ) : (
                  roles.map((role) => (
                    <RoleTableRow
                      key={role.id}
                      role={role}
                      isEditing={editingRoleId === role.id}
                      editData={editData}
                      onEditStart={handleEditStart}
                      onEditChange={setEditData}
                      onSave={handleUpdateRole}
                      onCancel={() => {
                        setEditingRoleId(null);
                        setEditData({ name: '', slug: '' });
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

      {/* Add Role Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Role"
      >
        <form onSubmit={handleAddRole} className="space-y-4">
          <TextInput
            label="Role Name"
            placeholder="Editor"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <TextInput
            label="Slug (Identifier)"
            placeholder="editor"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase() })}
            required
            helperText="Lowercase alphanumeric with dots (e.g., editor, content.moderator)"
          />
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
              disabled={createRoleMutation.isPending}
              className="flex items-center gap-2"
            >
              {createRoleMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Role
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null, name: '' })}
        title="Delete Role"
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
              onClick={handleDeleteRole}
              disabled={deleteRoleMutation.isPending}
            >
              {deleteRoleMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
