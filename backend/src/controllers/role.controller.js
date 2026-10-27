// The system roles — the only ones the server enforces
const DEFAULT_ROLES = Object.freeze([
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
]);

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
// Roles are fixed (user / admin / super.admin) — they are what the server
// enforces and what users can be assigned. Custom roles used to be held in
// memory and vanished on restart, so they are no longer offered.
const fixedRoles = (res) => res.status(405).json({
  success: false,
  code: 'ROLES_FIXED',
  message: 'Roles are fixed: User, Admin and Super Admin. Assign them from the Users tab.',
});

export const createRole = async (req, res) => fixedRoles(res);
export const updateRole = async (req, res) => fixedRoles(res);
export const deleteRole = async (req, res) => fixedRoles(res);
