import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';
import Decimal from 'decimal.js';
import { karachiDateKey } from '../utils/dates.js';

/**
 * Automatic daily PSX portfolio snapshots.
 *
 * This is what fixes the single-dot Portfolio Performance chart. Snapshots
 * were previously written only when a user manually uploaded or pasted a CDC
 * statement, so unless they did that repeatedly there was nothing to plot.
 *
 * The snapshot carries the previous day's holdings forward and re-values them
 * at today's close. Quantities only change when the user uploads a fresh CDC
 * statement — we never invent a position, we only re-price the ones already
 * on record.
 */

/**
 * Re-value one user's most recent holdings at current market prices and store
 * the result as today's snapshot.
 *
 * Returns null when the user has no prior snapshot to carry forward — there is
 * nothing to value, and inventing an empty snapshot would put a misleading
 * zero on their history chart.
 */
export async function snapshotUserPortfolio(userId, { at = new Date() } = {}) {
    const latest = await prisma.psxSnapshot.findFirst({
        where: { user_id: userId },
        orderBy: { snapshot_date: 'desc' },
    });
    if (!latest) return null;

    const holdings = Array.isArray(latest.holdings_data) ? latest.holdings_data : [];
    if (holdings.length === 0) return null;

    const today = karachiDateKey(at);

    // Don't overwrite a snapshot the user uploaded themselves today — their
    // CDC statement is authoritative over our re-valuation.
    if (latest.snapshot_date.getTime() === today.getTime()) return null;

    const tickers = holdings.map(h => String(h.symbol || '').trim().toUpperCase()).filter(Boolean);
    const quotes = await prisma.psxStock.findMany({ where: { ticker: { in: tickers } } });
    const priceByTicker = new Map(quotes.map(q => [q.ticker, new Decimal(q.price)]));

    let totalCustody = new Decimal(0);
    let pricedCount = 0;

    const revalued = holdings.map(h => {
        const symbol = String(h.symbol || '').trim().toUpperCase();
        const quantity = new Decimal(h.holding ?? 0);
        const livePrice = priceByTicker.get(symbol);

        // No live price → carry the previous valuation rather than zeroing it.
        const rate = livePrice ?? new Decimal(h.market_rate ?? 0);
        if (livePrice) pricedCount++;

        const custodyVal = quantity.times(rate);
        totalCustody = totalCustody.plus(custodyVal);

        return {
            ...h,
            symbol,
            market_rate: rate.toNumber(),
            custody_val: custodyVal.toNumber(),
        };
    });

    // If not a single holding could be priced, this snapshot would just be a
    // duplicate of yesterday — skip it rather than padding the chart.
    if (pricedCount === 0) return null;

    // total_invested is derived from brokerage cashflows up to this date,
    // matching how uploadPsxSnapshot computes it.
    const invested = await prisma.bankInvestment.aggregate({
        where: { user_id: userId, transaction_date: { lte: today } },
        _sum: { amount: true },
    });

    return prisma.psxSnapshot.upsert({
        where: { user_id_snapshot_date: { user_id: userId, snapshot_date: today } },
        update: {
            total_custody: totalCustody.toDecimalPlaces(2).toString(),
            holdings_data: revalued,
        },
        create: {
            user_id: userId,
            snapshot_date: today,
            total_custody: totalCustody.toDecimalPlaces(2).toString(),
            total_invested: (invested._sum.amount ?? 0).toString(),
            holdings_data: revalued,
            // Brokerage cash doesn't change with market prices — carry it forward.
            ...(latest.summary_data ? { summary_data: latest.summary_data } : {}),
        },
    });
}

/**
 * Snapshot every user who has PSX holdings. One user failing never stops the
 * rest — same isolation pattern as billReminder.service.js.
 */
export async function snapshotAllUsersPortfolios({ at = new Date() } = {}) {
    const users = await prisma.psxSnapshot.findMany({
        select: { user_id: true },
        distinct: ['user_id'],
    });

    let written = 0;
    let skipped = 0;

    for (const { user_id } of users) {
        try {
            const row = await snapshotUserPortfolio(user_id, { at });
            if (row) written++; else skipped++;
        } catch (error) {
            logger.error(`[PSX] Snapshot failed for user ${user_id}: ${error.message}`);
            skipped++;
        }
    }

    logger.log(`[PSX] Portfolio snapshots: ${written} written, ${skipped} skipped`);
    return { written, skipped };
}
