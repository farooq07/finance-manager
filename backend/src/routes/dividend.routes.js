import express from 'express';
import { getDividends, syncDividends, deleteDividend } from '../controllers/dividend.controller.js';
import verifyToken from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', verifyToken, getDividends);
router.post('/sync', verifyToken, syncDividends);
router.delete('/:id', verifyToken, deleteDividend);

export default router;
