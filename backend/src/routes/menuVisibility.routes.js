import express from 'express';
import verifyToken from '../middleware/auth.middleware.js';
import { getMenuVisibility, updateMenuVisibility } from '../controllers/menuVisibility.controller.js';

const router = express.Router();

router.use(verifyToken);
router.get('/', getMenuVisibility);
router.put('/', updateMenuVisibility);

export default router;
