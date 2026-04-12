import prisma from '../utils/prisma.js';

// Check if user has permission to manage users
const checkUserManagementPermission = (userRole) => {
    return userRole === 'super.admin' || userRole === 'admin';
};

export const getAllUsers = async (req, res) => {
    try {
        const currentUser = req.user; // From auth middleware

        // Check permissions
        if (!checkUserManagementPermission(currentUser?.role)) {
            return res.status(403).json({ message: 'Unauthorized - Admin access required' });
        }

        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                created_at: true
            },
            orderBy: { created_at: 'desc' }
        });

        res.status(200).json({ users });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: 'Failed to fetch users' });
    }
};

export const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                created_at: true
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ user });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ message: 'Failed to fetch user' });
    }
};

export const updateUserRole = async (req, res) => {
    try {
        const currentUser = req.user;
        const { id } = req.params;
        const { role } = req.body;

        // Check permissions - only super.admin can update roles
        if (currentUser?.role !== 'super.admin') {
            return res.status(403).json({ message: 'Unauthorized - Super Admin access required' });
        }

        if (!['super.admin', 'admin', 'user'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role. Must be one of: super.admin, admin, user' });
        }

        // Prevent users from removing themselves as super.admin
        if (id === currentUser.id && role !== 'super.admin') {
            return res.status(400).json({ message: 'Cannot remove your own super.admin status' });
        }

        const user = await prisma.user.update({
            where: { id },
            data: { role },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                created_at: true
            }
        });

        res.status(200).json({ user, message: 'User role updated successfully' });
    } catch (error) {
        console.error('Update user role error:', error);
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(500).json({ message: 'Failed to update user role' });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const currentUser = req.user;
        const { id } = req.params;

        // Check permissions - only super.admin can delete users
        if (currentUser?.role !== 'super.admin') {
            return res.status(403).json({ message: 'Unauthorized - Super Admin access required' });
        }

        // Prevent users from deleting themselves
        if (id === currentUser.id) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }

        await prisma.user.delete({
            where: { id }
        });

        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(500).json({ message: 'Failed to delete user' });
    }
};

export const createUser = async (req, res) => {
    try {
        const currentUser = req.user;
        const { name, email, password, role = 'user' } = req.body;

        // Check permissions - admin and super.admin can create users
        if (!checkUserManagementPermission(currentUser?.role)) {
            return res.status(403).json({ message: 'Unauthorized - Admin access required' });
        }

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email, and password are required' });
        }

        if (!['super.admin', 'admin', 'user'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role. Must be one of: super.admin, admin, user' });
        }

        // Only super.admin can create super.admin users
        if (role === 'super.admin' && currentUser?.role !== 'super.admin') {
            return res.status(403).json({ message: 'Only Super Admin can create Super Admin users' });
        }

        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        const bcrypt = await import('bcrypt');
        const salt = await bcrypt.default.genSalt(10);
        const hashedPassword = await bcrypt.default.hash(password, salt);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password_hash: hashedPassword,
                role
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                created_at: true
            }
        });

        res.status(201).json({ user, message: 'User created successfully' });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ message: 'Failed to create user' });
    }
};
