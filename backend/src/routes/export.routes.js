import express from 'express';
import verifyToken from '../middleware/auth.middleware.js';
import { exportTransactions, exportExpenses, exportDues, exportAll } from '../controllers/export.controller.js';

const router = express.Router();

router.get('/transactions.csv', verifyToken, exportTransactions);
router.get('/expenses.csv',     verifyToken, exportExpenses);
router.get('/dues.csv',         verifyToken, exportDues);
router.get('/all.json',         verifyToken, exportAll);

export default router;
