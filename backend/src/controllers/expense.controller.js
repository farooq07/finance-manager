import prisma from '../utils/prisma.js';

export const getExpenses = async (req, res) => {
    try {
        const expenses = await prisma.expense.findMany({
            where: { user_id: req.user.id },
            orderBy: { expense_date: 'desc' }
        });
        res.json(expenses);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching expenses' });
    }
};

export const createExpense = async (req, res) => {
    try {
        const { amount, category, expense_date, payment_method, notes } = req.body;
        const expense = await prisma.expense.create({
            data: {
                user_id: req.user.id,
                amount,
                category,
                expense_date: new Date(expense_date),
                payment_method,
                notes
            }
        });
        res.status(201).json(expense);
    } catch (error) {
        res.status(500).json({ message: 'Error creating expense' });
    }
};

export const updateExpense = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, category, expense_date, payment_method, notes } = req.body;

        // Ensure the expense belongs to the user
        const existing = await prisma.expense.findUnique({ where: { id } });
        if (!existing || existing.user_id !== req.user.id) {
            return res.status(404).json({ message: 'Expense not found' });
        }

        const expense = await prisma.expense.update({
            where: { id },
            data: {
                amount,
                category,
                expense_date: expense_date ? new Date(expense_date) : undefined,
                payment_method,
                notes
            }
        });
        res.json(expense);
    } catch (error) {
        res.status(500).json({ message: 'Error updating expense' });
    }
};

export const deleteExpense = async (req, res) => {
    try {
        const { id } = req.params;

        const existing = await prisma.expense.findUnique({ where: { id } });
        if (!existing || existing.user_id !== req.user.id) {
            return res.status(404).json({ message: 'Expense not found' });
        }

        await prisma.expense.delete({ where: { id } });
        res.json({ message: 'Expense deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting expense' });
    }
};
