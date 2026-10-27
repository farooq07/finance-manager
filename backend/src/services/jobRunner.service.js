import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';

/** The scheduled slot a run belongs to (to the minute, UTC). Same on every replica. */
export const slotKey = (at = new Date()) => at.toISOString().slice(0, 16);

const STALE_RUN_MS = 6 * 60 * 60 * 1000; // a 'running' row this old is reported, not reclaimed

/**
 * Run a scheduled job once per slot across every API replica.
 *
 * Each replica's cron fires; the first to insert (job, slot) runs the job,
 * the others see the unique-key conflict and skip. The row records the
 * outcome, so failures are visible (GET /api/health/jobs) instead of only
 * in one replica's logs.
 *
 * Returns 'ran' | 'skipped' | 'failed'.
 */
export async function runJob(job, fn, { at = new Date() } = {}) {
    const runKey = slotKey(at);
    let run;
    try {
        run = await prisma.jobRun.create({ data: { job, run_key: runKey } });
    } catch (err) {
        if (err?.code === 'P2002') {
            logger.log(`[Job] ${job} ${runKey} already claimed by another instance — skipping`);
            return 'skipped';
        }
        // Can't reach the database to claim: don't run blind (it would also fail).
        logger.error(`[Job] ${job} could not be claimed:`, err.message);
        return 'failed';
    }

    try {
        await fn();
        await prisma.jobRun.update({ where: { id: run.id }, data: { status: 'ok', finished_at: new Date() } });
        return 'ran';
    } catch (err) {
        logger.error(`[Job] ${job} ${runKey} failed:`, err.message);
        await prisma.jobRun.update({
            where: { id: run.id },
            data: { status: 'failed', finished_at: new Date(), error: String(err?.message || err).slice(0, 2000) },
        }).catch(() => {});
        return 'failed';
    }
}

/** Latest run of every job, plus anything failed or stuck — for monitoring. */
export async function jobHealth(now = new Date()) {
    const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const runs = await prisma.jobRun.findMany({ where: { started_at: { gte: since } }, orderBy: { started_at: 'desc' } });
    const latest = new Map();
    for (const r of runs) if (!latest.has(r.job)) latest.set(r.job, r);
    const problems = runs.filter((r) => r.status === 'failed'
        || (r.status === 'running' && now - r.started_at > STALE_RUN_MS));
    return {
        ok: problems.length === 0,
        latest: [...latest.values()].map(({ job, status, started_at, finished_at, error }) => ({ job, status, started_at, finished_at, error })),
        problems: problems.slice(0, 20).map(({ job, run_key, status, error }) => ({ job, run_key, status, error })),
    };
}
