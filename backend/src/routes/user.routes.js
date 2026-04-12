import express from 'express';
import { getAllUsers, getUserById, updateUserRole, deleteUser, createUser } from '../controllers/user.controller.js';
import verifyToken from '../middleware/auth.middleware.js';

const router = express.Router();

// Get all users
router.get('/', verifyToken, getAllUsers);

// Get user by ID
router.get('/:id', verifyToken, getUserById);

// Create new user
router.post('/', verifyToken, createUser);

// Update user role
router.put('/:id/role', verifyToken, updateUserRole);

// Delete user
router.delete('/:id', verifyToken, deleteUser);

export default router;
