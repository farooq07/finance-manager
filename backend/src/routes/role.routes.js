import express from 'express';
import verifyToken from '../middleware/auth.middleware.js';
import {
  getRoles,
  getRoleBySlug,
  createRole,
  updateRole,
  deleteRole
} from '../controllers/role.controller.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Get all roles
router.get('/', getRoles);

// Get role by slug
router.get('/:id', getRoleBySlug);

// Create role (admin+ only)
router.post('/', (req, res, next) => {
  if (!['admin', 'super.admin'].includes(req.user?.role)) {
    return res.status(403).json({
      success: false,
      message: 'Only administrators can create roles'
    });
  }
  next();
}, createRole);

// Update role (admin+ only)
router.put('/:id', (req, res, next) => {
  if (!['admin', 'super.admin'].includes(req.user?.role)) {
    return res.status(403).json({
      success: false,
      message: 'Only administrators can update roles'
    });
  }
  next();
}, updateRole);

// Delete role (super.admin only)
router.delete('/:id', (req, res, next) => {
  if (req.user?.role !== 'super.admin') {
    return res.status(403).json({
      success: false,
      message: 'Only super administrators can delete roles'
    });
  }
  next();
}, deleteRole);

export default router;
