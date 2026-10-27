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
import { cleanupAbandonedUploads } from './uploadSession.service.js';
import { runJob } from './jobRunner.service.js';

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

const KARACHI = { timezone: 'Asia/Karachi' };
const tasks = [];

// Every job goes through runJob: one run per slot across replicas, and the
// outcome (ok / failed + error) is recorded in job_runs.
function schedule(job, expression, fn, options) {
    logger.log(`[Cron] Scheduling ${job} (${expression}${options?.timezone ? ` ${options.timezone}` : ''})`);
    tasks.push(cron.schedule(expression, () => runJob(job, fn), options));
}

/** Stop scheduling new runs (graceful shutdown). */
export const stopCronJobs = () => {
    for (const t of tasks.splice(0)) t.stop();
};

export const initCronJobs = () => {
    schedule('weekly-summary-email', WEEKLY_SUMMARY_SCHEDULE, async () => {
        const users = await prisma.user.findMany({
            where: { deleted_at: null, notify_weekly_summary: true },
            select: { id: true, name: true, email: true },
        });
        let failed = 0;
        for (const user of users) {
            try {
                const data = await fetchDashboardData(user.id);
                await sendSummaryEmail(user.email, user.name || 'User', data.metrics);
            } catch (err) {
                failed++;
                logger.error(`[Cron] Failed to send summary for user ${user.id}:`, err.message);
            }
        }
        if (failed) throw new Error(`${failed} of ${users.length} summary emails failed`);
    });

    schedule('networth-snapshot', NETWORTH_SNAPSHOT_SCHEDULE, async () => {
        const { failed, total } = await snapshotAllUsersNetWorth();
        if (failed) throw new Error(`${failed} of ${total} snapshots failed`);
    });

    schedule('bill-reminders', BILL_REMINDER_SCHEDULE, () => dispatchBillReminders());

    schedule('fx-rates', FX_RATE_SCHEDULE, () => fetchAndStoreFxRates());

    schedule('gold-price', GOLD_SYNC_SCHEDULE, async () => {
        const row = await syncGoldPrice();
        logger.log(`[Cron] Gold price synced: PKR ${row.price_24k_per_tola}/tola`);
    }, KARACHI);

    schedule('psx-prices', PSX_PRICE_SCHEDULE, async () => {
        if (!isPsxTradingDay()) return logger.log('[Cron] PSX closed today (market holiday) — skipping price sync.');
        const result = await syncPsxPrices();
        logger.log(`[Cron] PSX price sync ${result.status}: ${result.updated} updated, ${result.failed} failed`);
        if (result.status === 'failed') throw new Error(`PSX price sync failed (${result.failed} tickers)`);
    }, KARACHI);

    schedule('psx-portfolio-snapshot', PSX_SNAPSHOT_SCHEDULE, async () => {
        if (!isPsxTradingDay()) return logger.log('[Cron] PSX closed today (market holiday) — skipping portfolio snapshot.');
        await snapshotAllUsersPortfolios();
    }, KARACHI);

    // Statement files uploaded for preview but never imported.
    schedule('upload-cleanup', '30 3 * * *', () => cleanupAbandonedUploads(), KARACHI);
};
