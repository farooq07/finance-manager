import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';

const VALID_TYPES = new Set(['credit_card', 'personal_loan', 'mortgage', 'car_loan', 'other']);

function validate(body) {
    const errors = [];
    if (!body.name) errors.push('name is required');
    if (!VALID_TYPES.has(body.debt_type)) errors.push('debt_type must be one of: ' + [...VALID_TYPES].join(', '));
    if (Number(body.principal)   <= 0) errors.push('principal must be > 0');
    if (Number(body.outstanding) < 0)  errors.push('outstanding must be >= 0');
    return errors;
}

// GET /api/debts
export const list = async (req, res) => {
    try {
        const debts = await prisma.debt.findMany({
            where: { user_id: req.user.id },
            orderBy: [{ is_active: 'desc' }, { name: 'asc' }],
            include: { _count: { select: { payments: true } } },
        });
        res.json(debts);
    } catch (error) {
        logger.error('[DEBT] list failed:', error);
        res.status(500).json({ message: 'Could not load debts' });
    }
};

// GET /api/debts/:id
export const detail = async (req, res) => {
    try {
        const debt = await prisma.debt.findFirst({
            where: { id: req.params.id, user_id: req.user.id },
            include: {
                payments: { orderBy: { paid_at: 'desc' }, take: 50 },
            },
        });
        if (!debt) return res.status(404).json({ message: 'Not found' });

        // Compute simple amortisation projection if rate and min payment are set.
        let projection = null;
        const rate    = Number(debt.interest_rate   || 0);
        const minPay  = Number(debt.minimum_payment || 0);
        let   balance = Number(debt.outstanding);
        if (minPay > 0 && balance > 0) {
            const monthlyRate = rate / 100 / 12;
            const projected = [];
            let monthsLeft = 0;
            let totalInterest = 0;
            while (balance > 0 && monthsLeft < 600) {
                const interest = balance * monthlyRate;
                const principalPayment = Math.min(balance, Math.max(0, minPay - interest));
                if (principalPayment <= 0 && interest >= minPay) {
                    // Min payment doesn't even cover interest — bail out as unpayable.
                    projection = { unpayable: true };
                    projected.length = 0;
                    break;
                }
                balance = balance - principalPayment;
                totalInterest += interest;
                monthsLeft += 1;
                if (monthsLeft <= 60) {
                    projected.push({
                        month: monthsLeft,
                        balance: Math.max(0, Number(balance.toFixed(2))),
                        interest: Number(interest.toFixed(2)),
                    });
                }
            }
            if (!projection) {
                projection = {
                    monthsToPayoff: monthsLeft,
                    totalInterest: Number(totalInterest.toFixed(2)),
                    samples: projected,
                };
            }
        }

        res.json({ debt, projection });
    } catch (error) {
        logger.error('[DEBT] detail failed:', error);
        res.status(500).json({ message: 'Could not load debt' });
    }
};

// POST /api/debts
export const create = async (req, res) => {
    try {
        const errors = validate(req.body);
        if (errors.length) return res.status(400).json({ message: errors.join(', ') });

        const created = await prisma.debt.create({
            data: {
                user_id:         req.user.id,
                name:            req.body.name.trim(),
                debt_type:       req.body.debt_type,
                principal:       req.body.principal,
                outstanding:     req.body.outstanding ?? req.body.principal,
                interest_rate:   req.body.interest_rate ?? null,
                minimum_payment: req.body.minimum_payment ?? null,
                due_day:         req.body.due_day ?? null,
                start_date:      req.body.start_date ? new Date(req.body.start_date) : null,
                target_payoff:   req.body.target_payoff ? new Date(req.body.target_payoff) : null,
                institution_id:  req.body.institution_id || null,
                notes:           req.body.notes || null,
                is_active:       req.body.is_active === undefined ? true : Boolean(req.body.is_active),
            },
        });
        res.status(201).json(created);
    } catch (error) {
        logger.error('[DEBT] create failed:', error);
        res.status(500).json({ message: 'Could not create debt' });
    }
};

// PATCH /api/debts/:id
export const update = async (req, res) => {
    try {
        const existing = await prisma.debt.findFirst({ where: { id: req.params.id, user_id: req.user.id } });
        if (!existing) return res.status(404).json({ message: 'Not found' });

        const data = {};
        const fields = ['name', 'debt_type', 'principal', 'outstanding', 'interest_rate', 'minimum_payment', 'due_day', 'institution_id', 'notes', 'is_active'];
        for (const f of fields) if (f in req.body) data[f] = req.body[f];
        if (req.body.start_date)    data.start_date    = new Date(req.body.start_date);
        if (req.body.target_payoff) data.target_payoff = new Date(req.body.target_payoff);

        if (data.debt_type && !VALID_TYPES.has(data.debt_type)) {
            return res.status(400).json({ message: 'invalid debt_type' });
        }

        const updated = await prisma.debt.update({ where: { id: existing.id }, data });
        res.json(updated);
    } catch (error) {
        logger.error('[DEBT] update failed:', error);
        res.status(500).json({ message: 'Could not update debt' });
    }
};

// DELETE /api/debts/:id
export const remove = async (req, res) => {
    try {
        const existing = await prisma.debt.findFirst({ where: { id: req.params.id, user_id: req.user.id } });
        if (!existing) return res.status(404).json({ message: 'Not found' });
        await prisma.debt.delete({ where: { id: existing.id } });
        res.json({ ok: true });
    } catch (error) {
        logger.error('[DEBT] delete failed:', error);
        res.status(500).json({ message: 'Could not delete debt' });
    }
};

// POST /api/debts/:id/payments — record a payment and decrement outstanding.
export const addPayment = async (req, res) => {
    try {
        const debt = await prisma.debt.findFirst({ where: { id: req.params.id, user_id: req.user.id } });
        if (!debt) return res.status(404).json({ message: 'Not found' });

        const amount = Number(req.body.amount);
        if (!(amount > 0)) return res.status(400).json({ message: 'amount must be > 0' });

        const principalPortion = req.body.principal_portion !== undefined ? Number(req.body.principal_portion) : null;
        const interestPortion  = req.body.interest_portion  !== undefined ? Number(req.body.interest_portion)  : null;
        const paidAt = req.body.paid_at ? new Date(req.body.paid_at) : new Date();

        // Use the principal portion if supplied, else assume the whole amount goes to principal.
        const principalApplied = principalPortion !== null ? principalPortion : amount;
        const newOutstanding = Math.max(0, Number(debt.outstanding) - principalApplied);

        const [payment, updated] = await prisma.$transaction([
            prisma.debtPayment.create({
                data: {
                    debt_id: debt.id,
                    user_id: req.user.id,
                    amount,
                    paid_at: paidAt,
                    principal_portion: principalPortion,
                    interest_portion:  interestPortion,
                    notes: req.body.notes || null,
                },
            }),
            prisma.debt.update({
                where: { id: debt.id },
                data: {
                    outstanding: newOutstanding,
                    is_active: newOutstanding > 0,
                },
            }),
        ]);

        res.status(201).json({ payment, debt: updated });
    } catch (error) {
        logger.error('[DEBT] addPayment failed:', error);
        res.status(500).json({ message: 'Could not record payment' });
    }
};
