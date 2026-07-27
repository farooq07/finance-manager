import cron from 'node-cron';
import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';
import { sendSummaryEmail } from '../utils/email.js';
import { fetchDashboardData } from '../controllers/dashboard.controller.js';
import { snapshotAllUsersNetWorth } from './networthSnapshot.service.js';
import { dispatchBillReminders } from './billReminder.service.js';
import { fetchAndStoreFxRates } from './fxRate.service.js';
import { syncGoldPrice } from './goldScraper.service.js';
import { syncPsxPrices } from './psxSync.service.js';
import { snapshotAllUsersPortfolios } from './psxSnapshot.service.js';
import { isPsxTradingDay } from '../utils/dates.js';

// Weekly summary email: every Sunday at 9:00 AM
const WEEKLY_SUMMARY_SCHEDULE = '0 9 * * 0';

// Nightly net-worth snapshot: every day at 23:55 local server time
const NETWORTH_SNAPSHOT_SCHEDULE = '55 23 * * *';

// Daily bill reminders: every day at 8:00 AM
const BILL_REMINDER_SCHEDULE = '0 8 * * *';

// Daily FX rate fetch: every day at 6:00 AM
const FX_RATE_SCHEDULE = '0 6 * * *';

// Daily gold price sync: every day at 10:00 AM Asia/Karachi
const GOLD_SYNC_SCHEDULE = '0 10 * * *';

// PSX price sync: weekdays at 16:30 Asia/Karachi, an hour after the 15:30
// close so the day's final prices have settled. node-cron's day-of-week
// filter handles Mon-Fri; isPsxTradingDay() additionally skips market
// holidays, which node-cron cannot express.
const PSX_PRICE_SCHEDULE = '30 16 * * 1-5';

// PSX portfolio snapshot: weekdays at 17:00 Asia/Karachi, after the price
// sync above, so holdings are re-valued at that day's close. This is what
// gives the performance chart its history.
const PSX_SNAPSHOT_SCHEDULE = '0 17 * * 1-5';

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

    logger.log(`[Cron] Initializing daily bill reminders (${BILL_REMINDER_SCHEDULE})...`);
    cron.schedule(BILL_REMINDER_SCHEDULE, async () => {
        logger.log('[Cron] Dispatching bill reminders...');
        try {
            await dispatchBillReminders();
        } catch (error) {
            logger.error('[Cron] Error dispatching bill reminders:', error);
        }
    });

    logger.log(`[Cron] Initializing daily FX rate fetch (${FX_RATE_SCHEDULE})...`);
    cron.schedule(FX_RATE_SCHEDULE, async () => {
        logger.log('[Cron] Fetching FX rates...');
        try {
            await fetchAndStoreFxRates();
        } catch (error) {
            logger.error('[Cron] Error fetching FX rates:', error);
        }
    });

    logger.log(`[Cron] Initializing daily gold price sync (${GOLD_SYNC_SCHEDULE} Asia/Karachi)...`);
    cron.schedule(GOLD_SYNC_SCHEDULE, async () => {
        logger.log('[Cron] Syncing gold price...');
        try {
            const row = await syncGoldPrice();
            logger.log(`[Cron] Gold price synced: PKR ${row.price_24k_per_tola}/tola`);
        } catch (error) {
            logger.error('[Cron] Gold sync failed:', error.message);
        }
    }, { timezone: 'Asia/Karachi' });

    logger.log(`[Cron] Initializing PSX price sync (${PSX_PRICE_SCHEDULE} Asia/Karachi)...`);
    cron.schedule(PSX_PRICE_SCHEDULE, async () => {
        if (!isPsxTradingDay()) {
            logger.log('[Cron] PSX closed today (market holiday) — skipping price sync.');
            return;
        }
        logger.log('[Cron] Syncing PSX prices...');
        try {
            const result = await syncPsxPrices();
            logger.log(`[Cron] PSX price sync ${result.status}: ${result.updated} updated, ${result.failed} failed`);
        } catch (error) {
            logger.error('[Cron] PSX price sync failed:', error.message);
        }
    }, { timezone: 'Asia/Karachi' });

    logger.log(`[Cron] Initializing PSX portfolio snapshot (${PSX_SNAPSHOT_SCHEDULE} Asia/Karachi)...`);
    cron.schedule(PSX_SNAPSHOT_SCHEDULE, async () => {
        if (!isPsxTradingDay()) {
            logger.log('[Cron] PSX closed today (market holiday) — skipping portfolio snapshot.');
            return;
        }
        logger.log('[Cron] Capturing PSX portfolio snapshots...');
        try {
            await snapshotAllUsersPortfolios();
        } catch (error) {
            logger.error('[Cron] PSX portfolio snapshot failed:', error.message);
        }
    }, { timezone: 'Asia/Karachi' });
};
