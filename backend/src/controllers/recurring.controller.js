import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';
import { nextDueDate, anchorDayOf } from '../utils/recurrence.js';

const VALID_FREQUENCIES = new Set(['weekly', 'monthly', 'yearly']);

function validatePayload(body) {
    const errors = [];
    if (!body.name || typeof body.name !== 'string') errors.push('name is required');
    if (body.amount === undefined || Number(body.amount) <= 0) errors.push('amount must be > 0');
    if (!VALID_FREQUENCIES.has(body.frequency)) errors.push('frequency must be weekly|monthly|yearly');
    if (!body.next_due_date) errors.push('next_due_date is required');
    return errors;
}

// GET /api/recurring
export const list = async (req, res) => {
    try {
        const items = await prisma.recurringPayment.findMany({
            where: { user_id: req.user.id },
            orderBy: [{ is_active: 'desc' }, { next_due_date: 'asc' }],
        });
        res.json(items);
    } catch (error) {
        logger.error('[RECURRING] list failed:', error);
        res.status(500).json({ message: 'Could not load recurring payments' });
    }
};

// GET /api/recurring/upcoming?days=30
export const upcoming = async (req, res) => {
    try {
        const days = Math.min(Math.max(parseInt(req.query.days || '30', 10) || 30, 1), 365);
        const horizon = new Date();
        horizon.setDate(horizon.getDate() + days);

        const items = await prisma.recurringPayment.findMany({
            where: {
                user_id: req.user.id,
                is_active: true,
                next_due_date: { lte: horizon },
            },
            orderBy: { next_due_date: 'asc' },
        });
        res.json(items);
    } catch (error) {
        logger.error('[RECURRING] upcoming failed:', error);
        res.status(500).json({ message: 'Could not load upcoming bills' });
    }
};

// POST /api/recurring
export const create = async (req, res) => {
    try {
        const errors = validatePayload(req.body);
        if (errors.length) return res.status(400).json({ message: errors.join(', ') });

        const created = await prisma.recurringPayment.create({
            data: {
                user_id:       req.user.id,
                name:          req.body.name.trim(),
                amount:        req.body.amount,
                currency:      req.body.currency || 'PKR',
                category:      req.body.category || null,
                frequency:     req.body.frequency,
                next_due_date: new Date(req.body.next_due_date),
                due_day:       anchorDayOf(req.body.next_due_date),
                auto_debit:    Boolean(req.body.auto_debit),
                bank_id:       req.body.bank_id || null,
                reminder_days: Number(req.body.reminder_days ?? 3),
                is_active:     req.body.is_active === undefined ? true : Boolean(req.body.is_active),
                notes:         req.body.notes || null,
            },
        });
        res.status(201).json(created);
    } catch (error) {
        logger.error('[RECURRING] create failed:', error);
        res.status(500).json({ message: 'Could not create recurring payment' });
    }
};

// PATCH /api/recurring/:id
export const update = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await prisma.recurringPayment.findFirst({ where: { id, user_id: req.user.id } });
        if (!existing) return res.status(404).json({ message: 'Not found' });

        const data = {};
        const fields = ['name', 'amount', 'currency', 'category', 'frequency', 'auto_debit', 'bank_id', 'reminder_days', 'is_active', 'notes'];
        for (const f of fields) if (f in req.body) data[f] = req.body[f];
        if (req.body.next_due_date) {
            data.next_due_date = new Date(req.body.next_due_date);
            data.due_day = anchorDayOf(req.body.next_due_date);
        }

        if (data.frequency && !VALID_FREQUENCIES.has(data.frequency)) {
            return res.status(400).json({ message: 'frequency must be weekly|monthly|yearly' });
        }

        const updated = await prisma.recurringPayment.update({ where: { id }, data });
        res.json(updated);
    } catch (error) {
        logger.error('[RECURRING] update failed:', error);
        res.status(500).json({ message: 'Could not update recurring payment' });
    }
};

// DELETE /api/recurring/:id
export const remove = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await prisma.recurringPayment.findFirst({ where: { id, user_id: req.user.id } });
        if (!existing) return res.status(404).json({ message: 'Not found' });
        await prisma.recurringPayment.delete({ where: { id } });
        res.json({ ok: true });
    } catch (error) {
        logger.error('[RECURRING] delete failed:', error);
        res.status(500).json({ message: 'Could not delete recurring payment' });
    }
};

// POST /api/recurring/:id/paid — mark the current cycle paid and advance it.
// One transaction: the cycle advances only if it is still the one the user
// saw (a double click can't skip a month), and the optional expense is
// written with it or not at all.
export const markPaid = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await prisma.recurringPayment.findFirst({ where: { id, user_id: req.user.id } });
        if (!existing) return res.status(404).json({ message: 'Not found' });

        const nextDue = nextDueDate(existing.next_due_date, existing.frequency, existing.due_day ?? anchorDayOf(existing.next_due_date));

        const updated = await prisma.$transaction(async (tx) => {
            const advanced = await tx.recurringPayment.updateMany({
                where: { id, user_id: req.user.id, next_due_date: existing.next_due_date },
                data: { last_paid_at: new Date(), next_due_date: nextDue, last_reminder_at: null },
            });
            if (advanced.count === 0) return null; // already marked paid by another request

            // Optionally record an expense so it shows in spend totals.
            if (req.body.record_expense) {
                await tx.expense.create({
                    data: {
                        user_id: req.user.id,
                        category: existing.category || 'Bills',
                        amount: existing.amount,
                        notes: existing.name,
                        payment_method: 'Recurring',
                        expense_date: new Date(),
                    },
                });
            }
            return tx.recurringPayment.findUnique({ where: { id } });
        });

        if (!updated) {
            return res.status(409).json({ message: 'This bill was already marked paid.', item: await prisma.recurringPayment.findUnique({ where: { id } }) });
        }
        res.json(updated);
    } catch (error) {
        logger.error('[RECURRING] markPaid failed:', error);
        res.status(500).json({ message: 'Could not mark as paid' });
    }
};
