import express from 'express';
import { getExpenses, createExpense, updateExpense, deleteExpense } from '../controllers/expense.controller.js';
import verifyToken from '../middleware/auth.middleware.js';
import validate, { expenseSchema } from '../middleware/validate.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', getExpenses);
router.post('/', validate(expenseSchema), createExpense);
router.put('/:id', validate(expenseSchema), updateExpense);
router.delete('/:id', deleteExpense);

export default router;
