import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';
import { fetchAndStoreFxRates, getLatestRates } from '../services/fxRate.service.js';

// GET /api/fx/latest — public-ish endpoint, JWT-protected.
// Returns latest PKR-based rate for each tracked quote currency.
export const latest = async (req, res) => {
    try {
        const rates = await getLatestRates();
        const newest = await prisma.fxRate.findFirst({ orderBy: { fetched_at: 'desc' }, select: { fetched_at: true, source: true } });
        res.json({
            base: 'PKR',
            rates,
            fetched_at: newest?.fetched_at || null,
            source: newest?.source || null,
        });
    } catch (error) {
        logger.error('[FX] latest failed:', error);
        res.status(500).json({ message: 'Could not load FX rates' });
    }
};

// GET /api/fx/history?quote=USD&days=30
export const history = async (req, res) => {
    try {
        const quote = (req.query.quote || 'USD').toUpperCase();
        const days  = Math.min(Math.max(parseInt(req.query.days || '30', 10) || 30, 1), 730);
        const since = new Date();
        since.setDate(since.getDate() - days);

        const rows = await prisma.fxRate.findMany({
            where: { base: 'PKR', quote, fetched_at: { gte: since } },
            orderBy: { fetched_at: 'asc' },
            select: { fetched_at: true, rate: true },
        });
        res.json({ base: 'PKR', quote, days, rows });
    } catch (error) {
        logger.error('[FX] history failed:', error);
        res.status(500).json({ message: 'Could not load FX history' });
    }
};

// POST /api/fx/refresh — admin only, triggers an immediate fetch.
export const refresh = async (req, res) => {
    try {
        if (!['admin', 'super.admin'].includes(req.user?.role)) {
            return res.status(403).json({ message: 'Admin only' });
        }
        const result = await fetchAndStoreFxRates();
        res.json({ ok: true, rates: result });
    } catch (error) {
        logger.error('[FX] manual refresh failed:', error);
        res.status(500).json({ message: 'Could not refresh FX rates' });
    }
};
