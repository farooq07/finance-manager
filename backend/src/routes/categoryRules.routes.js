import express from 'express';
import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';
import verifyToken from '../middleware/auth.middleware.js';
import { forgetLearnedKeyword } from '../services/categorizer.service.js';

/**
 * The categorisation rules learned from the user's approvals ("KFC" →
 * Food & Dining), editable: see them, fix a wrong one, add or delete.
 */
const router = express.Router();
router.use(verifyToken);

const clean = (v, max = 100) => String(v ?? '').trim().slice(0, max);

router.get('/', async (req, res) => {
    const rules = await prisma.categoryPattern.findMany({
        where: { user_id: req.user.id },
        orderBy: [{ last_used: 'desc' }],
        select: { id: true, keyword: true, assigned_category: true, occurrences: true, last_used: true },
    });
    res.json(rules);
});

router.post('/', async (req, res) => {
    const keyword = clean(req.body?.keyword).toUpperCase();
    const category = clean(req.body?.assigned_category);
    if (keyword.length < 3 || !category) return res.status(400).json({ message: 'A keyword (3+ letters) and a category are required' });
    try {
        const rule = await prisma.categoryPattern.upsert({
            where: { user_id_keyword_assigned_category: { user_id: req.user.id, keyword, assigned_category: category } },
            create: { user_id: req.user.id, keyword, assigned_category: category, confidence: 0.95, occurrences: 1 },
            update: { confidence: 0.95, last_used: new Date() },
        });
        // A keyword maps to one category: drop rules sending it elsewhere.
        await prisma.categoryPattern.deleteMany({ where: { user_id: req.user.id, keyword, NOT: { id: rule.id } } });
        await forgetLearnedKeyword(req.user.id, keyword);
        res.status(201).json(rule);
    } catch (error) {
        logger.error('[RULES] save failed:', error);
        res.status(500).json({ message: 'Could not save the rule' });
    }
});

router.put('/:id', async (req, res) => {
    const category = clean(req.body?.assigned_category);
    if (!category) return res.status(400).json({ message: 'assigned_category is required' });
    const rule = await prisma.categoryPattern.findFirst({ where: { id: req.params.id, user_id: req.user.id } });
    if (!rule) return res.status(404).json({ message: 'Rule not found' });
    try {
        await prisma.$transaction([
            // Remove any other rule for this keyword, then point this one at the new category.
            prisma.categoryPattern.deleteMany({ where: { user_id: req.user.id, keyword: rule.keyword, NOT: { id: rule.id } } }),
            prisma.categoryPattern.update({ where: { id: rule.id }, data: { assigned_category: category, confidence: 0.95, last_used: new Date() } }),
        ]);
        await forgetLearnedKeyword(req.user.id, rule.keyword);
        res.json({ ok: true });
    } catch (error) {
        logger.error('[RULES] update failed:', error);
        res.status(500).json({ message: 'Could not update the rule' });
    }
});

router.delete('/:id', async (req, res) => {
    const rule = await prisma.categoryPattern.findFirst({ where: { id: req.params.id, user_id: req.user.id } });
    if (!rule) return res.status(404).json({ message: 'Rule not found' });
    await prisma.categoryPattern.delete({ where: { id: rule.id } });
    await forgetLearnedKeyword(req.user.id, rule.keyword);
    res.json({ ok: true });
});

export default router;
