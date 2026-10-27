import express from 'express';
import {
    getAllUsers, getUserById, updateUserRole, updateUser, deleteUser,
    softDeleteUser, getDeletionRequests, restoreUser, createUser, resetUserPassword
} from '../controllers/user.controller.js';
import { updatePreferences, requestAccountDeletion, registerPushToken, unregisterPushToken } from '../controllers/preferences.controller.js';
import verifyToken from '../middleware/auth.middleware.js';

const router = express.Router();

// Get all users (active only)
router.get('/', verifyToken, getAllUsers);

// The signed-in user's own onboarding / menu preferences — must be before '/:id'
router.patch('/me/preferences', verifyToken, updatePreferences);
router.post('/me/deletion-request', verifyToken, requestAccountDeletion);
router.post('/me/push-tokens', verifyToken, registerPushToken);
router.delete('/me/push-tokens', verifyToken, unregisterPushToken);

// Super-admin review list of soft-deleted users — must be before '/:id'
router.get('/deletion-requests', verifyToken, getDeletionRequests);

// Get user by ID
router.get('/:id', verifyToken, getUserById);

// Create new user
router.post('/', verifyToken, createUser);

// Update user profile (name / email)
router.put('/:id', verifyToken, updateUser);

// Update user role (super.admin only)
router.put('/:id/role', verifyToken, updateUserRole);

// Reset user password
router.put('/:id/password', verifyToken, resetUserPassword);

// Soft delete (request deletion + deactivate) — admin or super.admin
router.post('/:id/soft-delete', verifyToken, softDeleteUser);

// Restore a soft-deleted user — super.admin only
router.post('/:id/restore', verifyToken, restoreUser);

// Hard delete — super.admin only
router.delete('/:id', verifyToken, deleteUser);

export default router;
