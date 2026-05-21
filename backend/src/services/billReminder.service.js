import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';
import { sendBillReminderEmail } from '../utils/email.js';

/**
 * Find active recurring payments whose next_due_date is within reminder_days
 * and whose user hasn't been pinged for this cycle yet (last_reminder_at older
 * than 24h ago). Sends one email per due item. Stamps last_reminder_at so we
 * don't double-send when the cron fires again.
 */
export async function dispatchBillReminders() {
    const now = new Date();
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + 30); // cap query at 30 days out

    const candidates = await prisma.recurringPayment.findMany({
        where: {
            is_active: true,
            next_due_date: { lte: horizon },
        },
        include: { user: { select: { email: true, name: true } } },
    });

    let sent = 0;
    for (const item of candidates) {
        const daysUntilDue = Math.ceil((new Date(item.next_due_date) - now) / (24 * 60 * 60 * 1000));
        if (daysUntilDue > item.reminder_days) continue;
        if (daysUntilDue < -7) continue; // 7 day grace for stale items

        // Skip if we already pinged in the last 24 hours
        if (item.last_reminder_at && (now - new Date(item.last_reminder_at)) < 23 * 60 * 60 * 1000) continue;

        try {
            await sendBillReminderEmail(item.user.email, item.user.name || 'there', {
                name: item.name,
                amount: item.amount,
                currency: item.currency,
                dueDate: item.next_due_date,
                daysUntilDue,
            });
            await prisma.recurringPayment.update({
                where: { id: item.id },
                data: { last_reminder_at: now },
            });
            sent += 1;
        } catch (err) {
            logger.error(`[BILL_REMINDER] failed for item ${item.id}:`, err.message);
        }
    }

    logger.log(`[BILL_REMINDER] sent ${sent} reminders (${candidates.length} candidates)`);
    return { sent, candidates: candidates.length };
}
