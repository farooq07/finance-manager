import prisma from '../utils/prisma.js';
import { passwordProblem } from '../utils/session.js';

// Check if user has permission to manage users at all
const checkUserManagementPermission = (userRole) => {
    return userRole === 'super.admin' || userRole === 'admin';
};

// Authorisation helper: can `actor` act on `target`?
//  - super.admin → anyone
//  - admin       → only regular users (role 'user')
//  - anyone else → no
const canActOnTarget = (actorRole, targetRole) => {
    if (actorRole === 'super.admin') return true;
    if (actorRole === 'admin') return targetRole === 'user';
    return false;
};

export const getAllUsers = async (req, res) => {
    try {
        const currentUser = req.user;

        if (!checkUserManagementPermission(currentUser?.role)) {
            return res.status(403).json({ message: 'Unauthorized - Admin access required' });
        }

        // Active users only — soft-deleted users live in the deletion-requests view.
        const users = await prisma.$queryRaw`
            SELECT id, name, email, role, created_at
            FROM users
            WHERE deleted_at IS NULL
            ORDER BY created_at DESC
        `;

        res.status(200).json({ users });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: 'Failed to fetch users' });
    }
};

export const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const currentUser = req.user;

        // Users can only view their own profile, or admins can view anyone
        if (currentUser.id !== id && !checkUserManagementPermission(currentUser?.role)) {
            return res.status(403).json({ message: 'Unauthorized - You can only view your own profile' });
        }

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

// Update a user's basic profile (name / email).
// Admin → regular users only; super.admin → anyone.
export const updateUser = async (req, res) => {
    try {
        const currentUser = req.user;
        const { id } = req.params;
        const { name, email } = req.body;

        if (!checkUserManagementPermission(currentUser?.role)) {
            return res.status(403).json({ message: 'Unauthorized - Admin access required' });
        }

        const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
        if (!target) return res.status(404).json({ message: 'User not found' });

        if (!canActOnTarget(currentUser.role, target.role)) {
            return res.status(403).json({ message: 'Admins can only edit regular users' });
        }

        if (!name && !email) {
            return res.status(400).json({ message: 'Nothing to update' });
        }

        // Guard against email collisions with another account.
        if (email) {
            const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
            if (existing && existing.id !== id) {
                return res.status(400).json({ message: 'Another account already uses this email' });
            }
        }

        const user = await prisma.user.update({
            where: { id },
            data: {
                ...(name ? { name } : {}),
                ...(email ? { email } : {}),
            },
            select: { id: true, name: true, email: true, role: true, created_at: true }
        });

        res.status(200).json({ user, message: 'User updated successfully' });
    } catch (error) {
        console.error('Update user error:', error);
        if (error.code === 'P2025') return res.status(404).json({ message: 'User not found' });
        res.status(500).json({ message: 'Failed to update user' });
    }
};

// Hard delete — super.admin only. Used directly and to "approve" a soft-delete request.
export const deleteUser = async (req, res) => {
    try {
        const currentUser = req.user;
        const { id } = req.params;

        if (currentUser?.role !== 'super.admin') {
            return res.status(403).json({ message: 'Unauthorized - Super Admin access required' });
        }

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

// Soft delete — admin or super.admin. Deactivates the account (blocks login)
// and records who requested it, for super.admin review.
export const softDeleteUser = async (req, res) => {
    try {
        const currentUser = req.user;
        const { id } = req.params;

        if (!checkUserManagementPermission(currentUser?.role)) {
            return res.status(403).json({ message: 'Unauthorized - Admin access required' });
        }

        if (id === currentUser.id) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }

        const rows = await prisma.$queryRaw`
            SELECT id, role, deleted_at FROM users WHERE id = ${id}::uuid LIMIT 1
        `;
        const target = rows[0];
        if (!target) return res.status(404).json({ message: 'User not found' });

        if (!canActOnTarget(currentUser.role, target.role)) {
            return res.status(403).json({ message: 'Admins can only delete regular users' });
        }

        if (target.deleted_at) {
            return res.status(400).json({ message: 'User is already pending deletion' });
        }

        await prisma.$executeRaw`
            UPDATE users
            SET deleted_at = now(),
                deletion_requested_by = ${currentUser.id}::uuid,
                deletion_requested_at = now(),
                token_version = token_version + 1
            WHERE id = ${id}::uuid
        `;

        res.status(200).json({ message: 'User deactivated and submitted for review' });
    } catch (error) {
        console.error('Soft delete user error:', error);
        res.status(500).json({ message: 'Failed to delete user' });
    }
};

// Super.admin review list — users awaiting permanent deletion, with requester info.
export const getDeletionRequests = async (req, res) => {
    try {
        const currentUser = req.user;
        if (currentUser?.role !== 'super.admin') {
            return res.status(403).json({ message: 'Unauthorized - Super Admin access required' });
        }

        const requests = await prisma.$queryRaw`
            SELECT u.id, u.name, u.email, u.role, u.created_at,
                   u.deleted_at, u.deletion_requested_at,
                   r.id    AS requested_by_id,
                   r.name  AS requested_by_name,
                   r.email AS requested_by_email
            FROM users u
            LEFT JOIN users r ON r.id = u.deletion_requested_by
            WHERE u.deleted_at IS NOT NULL
            ORDER BY u.deletion_requested_at DESC
        `;

        const shaped = requests.map((row) => ({
            id: row.id,
            name: row.name,
            email: row.email,
            role: row.role,
            created_at: row.created_at,
            deleted_at: row.deleted_at,
            deletion_requested_at: row.deletion_requested_at,
            requestedBy: row.requested_by_id
                ? { id: row.requested_by_id, name: row.requested_by_name, email: row.requested_by_email }
                : null,
        }));

        res.status(200).json({ requests: shaped });
    } catch (error) {
        console.error('Get deletion requests error:', error);
        res.status(500).json({ message: 'Failed to fetch deletion requests' });
    }
};

// Restore a soft-deleted user — super.admin only.
export const restoreUser = async (req, res) => {
    try {
        const currentUser = req.user;
        const { id } = req.params;

        if (currentUser?.role !== 'super.admin') {
            return res.status(403).json({ message: 'Unauthorized - Super Admin access required' });
        }

        const result = await prisma.$executeRaw`
            UPDATE users
            SET deleted_at = NULL,
                deletion_requested_by = NULL,
                deletion_requested_at = NULL
            WHERE id = ${id}::uuid AND deleted_at IS NOT NULL
        `;

        if (result === 0) {
            return res.status(404).json({ message: 'No pending-deletion user found' });
        }

        res.status(200).json({ message: 'User restored successfully' });
    } catch (error) {
        console.error('Restore user error:', error);
        res.status(500).json({ message: 'Failed to restore user' });
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
        const passwordIssue = passwordProblem(password);
        if (passwordIssue) return res.status(400).json({ message: passwordIssue });

        if (!['super.admin', 'admin', 'user'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role. Must be one of: super.admin, admin, user' });
        }

        // Admins can only create regular users; super.admin can create any role.
        if (currentUser?.role !== 'super.admin' && role !== 'user') {
            return res.status(403).json({ message: 'Only Super Admin can create admin or super-admin users' });
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
                role,
                must_change_password: true
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

export const resetUserPassword = async (req, res) => {
    try {
        const currentUser = req.user;
        const { id } = req.params;
        const { newPassword } = req.body;

        if (!checkUserManagementPermission(currentUser?.role)) {
            return res.status(403).json({ message: 'Unauthorized - Admin access required' });
        }

        const passwordIssue = passwordProblem(newPassword);
        if (passwordIssue) return res.status(400).json({ message: passwordIssue });

        if (id === currentUser.id) {
            return res.status(400).json({ message: 'Cannot reset your own password via admin panel' });
        }

        const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
        if (!target) return res.status(404).json({ message: 'User not found' });

        if (!canActOnTarget(currentUser.role, target.role)) {
            return res.status(403).json({ message: 'Admins can only reset passwords for regular users' });
        }

        const bcrypt = await import('bcrypt');
        const salt = await bcrypt.default.genSalt(10);
        const hashedPassword = await bcrypt.default.hash(newPassword, salt);

        const user = await prisma.user.update({
            where: { id },
            // The user must sign in with the new password everywhere.
            data: { password_hash: hashedPassword, must_change_password: true, token_version: { increment: 1 } },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                created_at: true
            }
        });

        res.status(200).json({ user, message: `Password reset successfully for ${user.email}` });
    } catch (error) {
        console.error('Reset password error:', error);
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(500).json({ message: 'Failed to reset user password' });
    }
};
