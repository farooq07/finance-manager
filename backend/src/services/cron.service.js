import cron from 'node-cron';
import prisma from '../utils/prisma.js';
import { sendSummaryEmail } from '../utils/email.js';
import { getDashboardSummary } from '../controllers/dashboard.controller.js';

// We need to fetch the helper, so let's import the file and use a hack or just re-export it.
// Actually, earlier I made it an internal function. Let me rewrite this logic so I will export fetchDashboardData
// For this script, I'll assume we can export `fetchDashboardData` from `dashboard.controller.js` 
// I'll update the previous tool call to ensure it's exported.
import { fetchDashboardData } from '../controllers/dashboard.controller.js';

// Schedule to run every Sunday at 9:00 AM (0 9 * * 0)
// For testing purposes, you can change this to '* * * * *' (every minute)
const CRON_SCHEDULE = '0 9 * * 0'; // '0 9 * * 0' for weekly on Sunday 9AM

export const initCronJobs = () => {
    console.log(`[Cron] Initializing weekly email summary cron job (${CRON_SCHEDULE})...`);

    cron.schedule(CRON_SCHEDULE, async () => {
        console.log('[Cron] Starting weekly email summary dispatch...');
        try {
            const users = await prisma.user.findMany({
                where: {
                    email: {
                        not: null
                    }
                },
                select: { id: true, name: true, email: true }
            });

            for (const user of users) {
                try {
                    const data = await fetchDashboardData(user.id);
                    const targetName = user.name || 'User';

                    await sendSummaryEmail(user.email, targetName, data.metrics);
                } catch (err) {
                    console.error(`[Cron] Failed to send summary for user ${user.id}:`, err.message);
                }
            }
            console.log('[Cron] Finished weekly email summary dispatch.');
        } catch (error) {
            console.error('[Cron] Error running weekly email dispatch:', error);
        }
    });
};
