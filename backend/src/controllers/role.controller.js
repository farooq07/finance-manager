import prisma from '../utils/prisma.js';

// Default system roles
const DEFAULT_ROLES = [
  {
    id: '1',
    name: 'User',
    slug: 'user',
    description: 'Standard user with basic access',
    permission_count: 5
  },
  {
    id: '2',
    name: 'Admin',
    slug: 'admin',
    description: 'Administrator with extended access',
    permission_count: 15
  },
  {
    id: '3',
    name: 'Super Admin',
    slug: 'super.admin',
    description: 'Full system access and control',
    permission_count: 25
  }
];

// Get all roles
export const getRoles = async (req, res) => {
  try {
    // For now, return default roles
    // In the future, this can fetch from database when Role model is added
    res.json({
      success: true,
      roles: DEFAULT_ROLES
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch roles'
    });
  }
};

// Get single role
export const getRoleBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const role = DEFAULT_ROLES.find(r => r.slug === slug);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    res.json({
      success: true,
      role
    });
  } catch (error) {
    console.error('Error fetching role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch role'
    });
  }
};

// Create role (custom roles only - system roles cannot be modified)
export const createRole = async (req, res) => {
  try {
    const { name, slug, description } = req.body;

    // Validate input
    if (!name || !slug) {
      return res.status(400).json({
        success: false,
        message: 'Name and slug are required'
      });
    }

    // Prevent creating system roles
    const systemRoleSlugs = ['user', 'admin', 'super.admin'];
    if (systemRoleSlugs.includes(slug)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create or modify system roles'
      });
    }

    // Check for duplicate slug
    if (DEFAULT_ROLES.some(r => r.slug === slug)) {
      return res.status(400).json({
        success: false,
        message: 'Role with this slug already exists'
      });
    }

    const newRole = {
      id: Date.now().toString(),
      name,
      slug,
      description: description || '',
      permission_count: 0,
      custom: true,
      created_at: new Date(),
      created_by: req.user?.id
    };

    // In the future: await prisma.role.create({ data: newRole });
    DEFAULT_ROLES.push(newRole);

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      role: newRole
    });
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create role'
    });
  }
};

// Update role
export const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const roleIndex = DEFAULT_ROLES.findIndex(r => r.id === id);

    if (roleIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    // Prevent updating system roles (except description)
    const systemRoles = ['1', '2', '3'];
    if (systemRoles.includes(id) && name) {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify system role names'
      });
    }

    const updatedRole = {
      ...DEFAULT_ROLES[roleIndex],
      ...(name && { name }),
      ...(description !== undefined && { description })
    };

    DEFAULT_ROLES[roleIndex] = updatedRole;

    res.json({
      success: true,
      message: 'Role updated successfully',
      role: updatedRole
    });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update role'
    });
  }
};

// Delete role
export const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting system roles
    const systemRoles = ['1', '2', '3'];
    if (systemRoles.includes(id)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete system roles'
      });
    }

    const roleIndex = DEFAULT_ROLES.findIndex(r => r.id === id);

    if (roleIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    const deletedRole = DEFAULT_ROLES.splice(roleIndex, 1)[0];

    res.json({
      success: true,
      message: 'Role deleted successfully',
      role: deletedRole
    });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete role'
    });
  }
};
