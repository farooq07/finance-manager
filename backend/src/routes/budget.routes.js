import express from 'express';
import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';
import verifyToken from '../middleware/auth.middleware.js';
import { budgetOverview } from '../services/budget.service.js';

const router = express.Router();
router.use(verifyToken);

const positive = (v) => Number.isFinite(Number(v)) && Number(v) > 0;

// GET /api/budgets — budgets, alerts, upcoming bills, runway and goals for this month
router.get('/', async (req, res) => {
    try {
        res.json(await budgetOverview(req.user.id));
    } catch (error) {
        logger.error('[BUDGETS] overview failed:', error);
        res.status(500).json({ message: 'Could not load budgets' });
    }
});

// PUT /api/budgets — create or change the budget for one category
router.put('/', async (req, res) => {
    const category = String(req.body?.category || '').trim();
    if (!category || category.length > 100) return res.status(400).json({ message: 'category is required' });
    if (!positive(req.body?.monthly_amount)) return res.status(400).json({ message: 'monthly_amount must be greater than 0' });
    try {
        const data = { monthly_amount: Number(req.body.monthly_amount), rollover: Boolean(req.body.rollover) };
        const budget = await prisma.budget.upsert({
            where: { user_id_category: { user_id: req.user.id, category } },
            create: { user_id: req.user.id, category, ...data },
            update: data,
        });
        res.json(budget);
    } catch (error) {
        logger.error('[BUDGETS] save failed:', error);
        res.status(500).json({ message: 'Could not save the budget' });
    }
});

router.delete('/:id', async (req, res) => {
    const r = await prisma.budget.deleteMany({ where: { id: req.params.id, user_id: req.user.id } }).catch(() => ({ count: 0 }));
    if (!r.count) return res.status(404).json({ message: 'Budget not found' });
    res.json({ ok: true });
});

// Savings goals
router.post('/goals', async (req, res) => {
    const name = String(req.body?.name || '').trim();
    if (!name || name.length > 100) return res.status(400).json({ message: 'name is required' });
    if (!positive(req.body?.target_amount)) return res.status(400).json({ message: 'target_amount must be greater than 0' });
    try {
        const goal = await prisma.savingsGoal.create({
            data: {
                user_id: req.user.id,
                name,
                target_amount: Number(req.body.target_amount),
                saved_amount: Number(req.body.saved_amount) > 0 ? Number(req.body.saved_amount) : 0,
                target_date: req.body.target_date ? new Date(req.body.target_date) : null,
            },
        });
        res.status(201).json(goal);
    } catch (error) {
        logger.error('[GOALS] create failed:', error);
        res.status(500).json({ message: 'Could not save the goal' });
    }
});

router.patch('/goals/:id', async (req, res) => {
    const data = {};
    if (req.body?.saved_amount !== undefined) {
        if (!(Number(req.body.saved_amount) >= 0)) return res.status(400).json({ message: 'saved_amount must be 0 or more' });
        data.saved_amount = Number(req.body.saved_amount);
    }
    if (req.body?.target_amount !== undefined) {
        if (!positive(req.body.target_amount)) return res.status(400).json({ message: 'target_amount must be greater than 0' });
        data.target_amount = Number(req.body.target_amount);
    }
    if (req.body?.name !== undefined) data.name = String(req.body.name).trim().slice(0, 100);
    if (req.body?.target_date !== undefined) data.target_date = req.body.target_date ? new Date(req.body.target_date) : null;
    const r = await prisma.savingsGoal.updateMany({ where: { id: req.params.id, user_id: req.user.id }, data }).catch(() => ({ count: 0 }));
    if (!r.count) return res.status(404).json({ message: 'Goal not found' });
    res.json({ ok: true });
});

router.delete('/goals/:id', async (req, res) => {
    const r = await prisma.savingsGoal.deleteMany({ where: { id: req.params.id, user_id: req.user.id } }).catch(() => ({ count: 0 }));
    if (!r.count) return res.status(404).json({ message: 'Goal not found' });
    res.json({ ok: true });
});

export default router;
