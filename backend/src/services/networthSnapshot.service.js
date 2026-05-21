import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';
import { fetchDashboardData } from '../controllers/dashboard.controller.js';

/**
 * Capture a single net-worth snapshot for one user. Writes a row to
 * networth_snapshots using the same aggregation logic that powers the
 * dashboard card, so history stays consistent with the live view.
 */
export async function snapshotUserNetWorth(userId) {
    const data = await fetchDashboardData(userId);
    const m = data.metrics;
    return prisma.netWorthSnapshot.create({
        data: {
            user_id:            userId,
            bank_total:         m.totalBankBalance,
            wallet_total:       m.totalWalletBalance,
            investment_total:   m.totalInvestments,
            asset_total:        m.totalAssetValue,
            receivable_total:   m.totalReceivable,
            payable_total:      m.totalPayable,
            rent_balance_total: m.totalRentBalance,
            expense_total:      m.totalExpenses,
            net_worth:          m.netWorth,
        },
    });
}

/**
 * Iterate over every user and capture a snapshot. Called nightly by cron.
 * One failed user does not stop the others.
 */
export async function snapshotAllUsersNetWorth() {
    const users = await prisma.user.findMany({ select: { id: true } });
    let success = 0;
    let failed = 0;
    for (const u of users) {
        try {
            await snapshotUserNetWorth(u.id);
            success += 1;
        } catch (err) {
            logger.error(`[NW_SNAPSHOT] user ${u.id} failed:`, err.message);
            failed += 1;
        }
    }
    logger.log(`[NW_SNAPSHOT] captured ${success}/${users.length} (${failed} failed)`);
    return { success, failed, total: users.length };
}
