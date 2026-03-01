import express from 'express';
import { getExpenses, createExpense, createBatchExpenses, updateExpense, deleteExpense } from '../controllers/expense.controller.js';
import verifyToken from '../middleware/auth.middleware.js';
import validate, { expenseSchema, expenseBatchSchema } from '../middleware/validate.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', getExpenses);
router.post('/batch', validate(expenseBatchSchema), createBatchExpenses);
router.post('/', validate(expenseSchema), createExpense);
router.put('/:id', validate(expenseSchema), updateExpense);
router.delete('/:id', deleteExpense);

export default router;
