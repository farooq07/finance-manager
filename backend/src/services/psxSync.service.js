import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';
import { scrapePSX } from './scraper.service.js';
import { karachiDateKey } from '../utils/dates.js';

/**
 * PSX price sync — the single code path behind both the manual admin trigger
 * and the weekday cron job.
 *
 * Two things here are deliberate and worth not undoing:
 *
 * 1. Only fields that actually parsed are written. The previous version
 *    validated the price and then wrote every other field regardless, so a
 *    markup change on the source site silently replaced good high/low/volume/
 *    marketCap values with zeros.
 *
 * 2. If more than half the tickers fail, nothing is written at all. A site
 *    redesign takes every selector down at once, and a half-empty table is
 *    worse than a stale one.
 */

// Abort the write entirely past this failure ratio.
const FAILURE_ABORT_RATIO = 0.5;

/**
 * Tickers to sync: the union of every user's watchlist, every stock entered
 * by hand, and every symbol anyone actually holds in their latest snapshot. Previously this was a
 * hardcoded 14-symbol array, so a user who held anything else got no live
 * price for it at all.
 */
export async function resolveSyncTickers() {
    const [watched, manual, snapshots] = await Promise.all([
        prisma.watchlist.findMany({ select: { ticker: true }, distinct: ['ticker'] }),
        // Stocks entered by hand (no CDC upload) need prices too.
        prisma.stock.findMany({ select: { stock_symbol: true }, distinct: ['stock_symbol'] }),
        prisma.psxSnapshot.findMany({
            select: { holdings_data: true },
            orderBy: { snapshot_date: 'desc' },
            take: 200, // recent snapshots are enough to cover held symbols
        }),
    ]);

    const tickers = new Set([...watched.map(w => w.ticker), ...manual.map(m => m.stock_symbol.trim().toUpperCase())]);
    for (const snap of snapshots) {
        const holdings = Array.isArray(snap.holdings_data) ? snap.holdings_data : [];
        for (const h of holdings) {
            if (h?.symbol) tickers.add(String(h.symbol).trim().toUpperCase());
        }
    }
    return [...tickers].filter(Boolean);
}

/**
 * Build a Prisma update payload containing only the fields that parsed.
 * Null readings are omitted so the stored value survives untouched.
 */
function buildPricePayload(data) {
    const payload = { price: data.price };
    if (data.companyName) payload.companyName = data.companyName;
    if (data.change !== null) payload.change = data.change;
    if (data.changePct !== null) payload.changePct = data.changePct;
    if (data.volume !== null) payload.volume = BigInt(data.volume);
    if (data.high !== null) payload.high = data.high;
    if (data.low !== null) payload.low = data.low;
    if (data.marketCap !== null) payload.marketCap = data.marketCap;
    return payload;
}

/**
 * Run a full price sync: scrape, validate, upsert current prices, and append
 * one row per ticker to the daily price history.
 *
 * @returns {Promise<{status: string, updated: number, failed: number, historyRows: number, aborted?: boolean}>}
 */
export async function syncPsxPrices({ tickers } = {}) {
    const targets = tickers?.length ? tickers : await resolveSyncTickers();

    const run = await prisma.scrapeRun.create({
        data: { source: 'psx_prices', status: 'failed' }, // pessimistic until proven otherwise
    });

    if (targets.length === 0) {
        await prisma.scrapeRun.update({
            where: { id: run.id },
            data: { status: 'success', finished_at: new Date(), error: 'no tickers to sync' },
        });
        return { status: 'success', updated: 0, failed: 0, historyRows: 0 };
    }

    try {
        const { results, failures } = await scrapePSX(targets);

        // A site redesign fails everything at once. Don't half-write the table.
        const failureRatio = failures.length / targets.length;
        if (failureRatio > FAILURE_ABORT_RATIO) {
            const message = `${failures.length}/${targets.length} tickers failed — aborting write`;
            logger.error(`[PSX] ${message}`);
            await prisma.scrapeRun.update({
                where: { id: run.id },
                data: {
                    status: 'failed', finished_at: new Date(),
                    tickers_ok: results.length, tickers_failed: failures.length,
                    error: message,
                },
            });
            return { status: 'failed', updated: 0, failed: failures.length, historyRows: 0, aborted: true };
        }

        const today = karachiDateKey();
        let updated = 0;
        let historyRows = 0;

        for (const data of results) {
            const payload = buildPricePayload(data);

            await prisma.psxStock.upsert({
                where: { ticker: data.ticker },
                update: payload,
                create: {
                    ticker: data.ticker,
                    companyName: data.companyName ?? data.ticker,
                    price: data.price,
                    change: data.change ?? 0,
                    changePct: data.changePct ?? 0,
                    volume: BigInt(data.volume ?? 0),
                    high: data.high ?? data.price,
                    low: data.low ?? data.price,
                    marketCap: data.marketCap,
                },
            });
            updated++;

            // One row per ticker per Karachi trading day. Re-running the sync
            // on the same day refreshes that day's close rather than
            // duplicating it.
            await prisma.psxPriceHistory.upsert({
                where: { ticker_date: { ticker: data.ticker, date: today } },
                update: {
                    close: data.price,
                    high: data.high,
                    low: data.low,
                    volume: data.volume === null ? null : BigInt(data.volume),
                },
                create: {
                    ticker: data.ticker,
                    date: today,
                    close: data.price,
                    high: data.high,
                    low: data.low,
                    volume: data.volume === null ? null : BigInt(data.volume),
                },
            });
            historyRows++;
        }

        const status = failures.length === 0 ? 'success' : 'partial';
        await prisma.scrapeRun.update({
            where: { id: run.id },
            data: {
                status, finished_at: new Date(),
                tickers_ok: updated, tickers_failed: failures.length,
                error: failures.length ? failures.map(f => `${f.ticker}: ${f.error}`).join('; ').slice(0, 2000) : null,
            },
        });

        logger.log(`[PSX] Sync ${status}: ${updated} updated, ${failures.length} failed, ${historyRows} history rows`);
        return { status, updated, failed: failures.length, historyRows };
    } catch (error) {
        await prisma.scrapeRun.update({
            where: { id: run.id },
            data: { status: 'failed', finished_at: new Date(), error: error.message?.slice(0, 2000) },
        });
        throw error;
    }
}

/**
 * The most recent run for a source, for the staleness badge on the Stocks page.
 */
export async function getLatestSyncStatus(source = 'psx_prices') {
    return prisma.scrapeRun.findFirst({
        where: { source },
        orderBy: { started_at: 'desc' },
    });
}
