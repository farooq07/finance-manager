import express from 'express';
import prisma from '../utils/prisma.js';
import verifyToken from '../middleware/auth.middleware.js';
import { jobHealth } from '../services/jobRunner.service.js';

const router = express.Router();

// Liveness: the process is up.
router.get('/', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Readiness: can this instance serve requests (database reachable)?
// Deliberately says nothing else about the system.
router.get('/ready', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ ok: true, database: 'up' });
    } catch {
        res.status(503).json({ ok: false, database: 'down' });
    }
});

// Scheduled jobs: last run of each, and any failed or stuck runs (admins only).
router.get('/jobs', verifyToken, async (req, res) => {
    if (!['admin', 'super.admin'].includes(req.user.role)) {
        return res.status(403).json({ code: 'FORBIDDEN', message: 'Admins only' });
    }
    try {
        const health = await jobHealth();
        res.status(health.ok ? 200 : 503).json(health);
    } catch {
        res.status(503).json({ ok: false, message: 'Could not read job history' });
    }
});

export default router;
