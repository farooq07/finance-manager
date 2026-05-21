import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';
import { snapshotUserNetWorth } from '../services/networthSnapshot.service.js';

// GET /api/networth/history?days=90
export const getHistory = async (req, res) => {
    try {
        const days = Math.min(Math.max(parseInt(req.query.days || '90', 10) || 90, 7), 730);
        const since = new Date();
        since.setDate(since.getDate() - days);

        const snapshots = await prisma.netWorthSnapshot.findMany({
            where: { user_id: req.user.id, captured_at: { gte: since } },
            orderBy: { captured_at: 'asc' },
            select: {
                captured_at: true,
                bank_total: true,
                wallet_total: true,
                investment_total: true,
                asset_total: true,
                receivable_total: true,
                payable_total: true,
                rent_balance_total: true,
                net_worth: true,
            },
        });

        const first = snapshots[0];
        const last = snapshots[snapshots.length - 1];
        const delta = first && last ? Number(last.net_worth) - Number(first.net_worth) : 0;
        const deltaPct = first && Number(first.net_worth) !== 0
            ? (delta / Math.abs(Number(first.net_worth))) * 100
            : null;

        res.json({
            days,
            count: snapshots.length,
            snapshots,
            summary: {
                first:    first?.net_worth ?? null,
                latest:   last?.net_worth ?? null,
                delta,
                deltaPct,
            },
        });
    } catch (error) {
        logger.error('[NETWORTH] history failed:', error);
        res.status(500).json({ message: 'Could not load net-worth history' });
    }
};

// POST /api/networth/snapshot — manually trigger a snapshot for the authed user.
// Useful for backfilling the chart's first data point or after a big change.
export const triggerSnapshot = async (req, res) => {
    try {
        const snap = await snapshotUserNetWorth(req.user.id);
        res.json({ ok: true, snapshot: { id: snap.id, captured_at: snap.captured_at, net_worth: snap.net_worth } });
    } catch (error) {
        logger.error('[NETWORTH] manual snapshot failed:', error);
        res.status(500).json({ message: 'Could not capture snapshot' });
    }
};
