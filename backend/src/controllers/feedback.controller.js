import prisma from '../utils/prisma.js';
import { imageProblem } from '../utils/images.js';

const VALID_TYPES    = ['bug', 'feature', 'question', 'other'];
const VALID_STATUSES = ['open', 'in_progress', 'resolved'];
const ADMIN_ROLES    = ['admin', 'super.admin'];

export async function submitFeedback(req, res) {
    const { type, title, description, screenshot } = req.body;

    if (!type || !title || !description) {
        return res.status(400).json({ error: 'type, title, and description are required' });
    }
    if (!VALID_TYPES.includes(type)) {
        return res.status(400).json({ error: 'Invalid type' });
    }
    if (title.length > 200) {
        return res.status(400).json({ error: 'Title must be 200 characters or fewer' });
    }
    const imageIssue = imageProblem(screenshot);
    if (imageIssue) return res.status(400).json({ error: imageIssue });

    const item = await prisma.feedback.create({
        data: {
            user_id:     req.user.id,
            type,
            title:       title.trim(),
            description: description.trim(),
            screenshot:  screenshot || null,
        },
    });

    res.status(201).json(item);
}

export async function getMyFeedback(req, res) {
    const items = await prisma.feedback.findMany({
        where:   { user_id: req.user.id },
        orderBy: { created_at: 'desc' },
        select:  { id: true, type: true, title: true, status: true, created_at: true },
    });
    res.json(items);
}

export async function getAllFeedback(req, res) {
    if (!ADMIN_ROLES.includes(req.user.role)) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const items = await prisma.feedback.findMany({
        orderBy: { created_at: 'desc' },
        include: { user: { select: { name: true, email: true } } },
    });
    res.json(items);
}

export async function updateFeedbackStatus(req, res) {
    if (!ADMIN_ROLES.includes(req.user.role)) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const { id } = req.params;
    const { status } = req.body;

    if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    const item = await prisma.feedback.update({ where: { id }, data: { status } });
    res.json(item);
}
