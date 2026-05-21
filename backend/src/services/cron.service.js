import cron from 'node-cron';
import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';
import { sendSummaryEmail } from '../utils/email.js';
import { fetchDashboardData } from '../controllers/dashboard.controller.js';
import { snapshotAllUsersNetWorth } from './networthSnapshot.service.js';

// Weekly summary email: every Sunday at 9:00 AM
const WEEKLY_SUMMARY_SCHEDULE = '0 9 * * 0';

// Nightly net-worth snapshot: every day at 23:55 local server time
const NETWORTH_SNAPSHOT_SCHEDULE = '55 23 * * *';

export const initCronJobs = () => {
    logger.log(`[Cron] Initializing weekly email summary (${WEEKLY_SUMMARY_SCHEDULE})...`);

    cron.schedule(WEEKLY_SUMMARY_SCHEDULE, async () => {
        logger.log('[Cron] Starting weekly email summary dispatch...');
        try {
            const users = await prisma.user.findMany({
                where: { email: { not: null } },
                select: { id: true, name: true, email: true },
            });

            for (const user of users) {
                try {
                    const data = await fetchDashboardData(user.id);
                    const targetName = user.name || 'User';
                    await sendSummaryEmail(user.email, targetName, data.metrics);
                } catch (err) {
                    logger.error(`[Cron] Failed to send summary for user ${user.id}:`, err.message);
                }
            }
            logger.log('[Cron] Finished weekly email summary dispatch.');
        } catch (error) {
            logger.error('[Cron] Error running weekly email dispatch:', error);
        }
    });

    logger.log(`[Cron] Initializing nightly net-worth snapshot (${NETWORTH_SNAPSHOT_SCHEDULE})...`);
    cron.schedule(NETWORTH_SNAPSHOT_SCHEDULE, async () => {
        logger.log('[Cron] Starting nightly net-worth snapshot...');
        try {
            await snapshotAllUsersNetWorth();
        } catch (error) {
            logger.error('[Cron] Error running net-worth snapshot:', error);
        }
    });
};
