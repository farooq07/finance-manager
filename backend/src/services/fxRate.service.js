import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';

// Base currency for the app — PKR. Foreign accounts store their native
// currency; consumers multiply by the (currency → PKR) rate to convert.
const BASE = 'PKR';

// The pairs that matter for Pakistani users. Extend as new currencies appear.
const TRACKED_QUOTES = ['USD', 'EUR', 'GBP', 'AED', 'SAR'];

// open.er-api.com — free, no key required, ~unlimited daily.
// Returns USD-based rates, so we compute (PKR per X) = (PKR per USD) / (X per USD).
const PROVIDER_URL = 'https://open.er-api.com/v6/latest/USD';
const PROVIDER_NAME = 'open.er-api';

/**
 * Fetch the latest USD-based rates and write one row per (PKR → quote) pair.
 * Returns the inserted rates as { USD: <rate>, EUR: <rate>, ... }.
 */
export async function fetchAndStoreFxRates() {
    let payload;
    try {
        const resp = await fetch(PROVIDER_URL);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        payload = await resp.json();
    } catch (err) {
        logger.error('[FX] provider fetch failed:', err.message);
        throw err;
    }

    if (payload.result !== 'success' || !payload.rates) {
        throw new Error('FX provider returned unexpected payload');
    }

    const pkrPerUsd = Number(payload.rates.PKR);
    if (!(pkrPerUsd > 0)) {
        throw new Error('FX provider returned no PKR rate');
    }

    const fetchedAt = new Date();
    const rows = [];
    const result = {};

    // Always write USD itself
    rows.push({
        base: BASE,
        quote: 'USD',
        rate: pkrPerUsd, // 1 USD = pkrPerUsd PKR
        fetched_at: fetchedAt,
        source: PROVIDER_NAME,
    });
    result.USD = pkrPerUsd;

    for (const quote of TRACKED_QUOTES) {
        if (quote === 'USD') continue;
        const quotePerUsd = Number(payload.rates[quote]);
        if (!(quotePerUsd > 0)) {
            logger.warn(`[FX] no rate for ${quote}, skipping`);
            continue;
        }
        // 1 <quote> = (pkrPerUsd / quotePerUsd) PKR
        const pkrPerQuote = pkrPerUsd / quotePerUsd;
        rows.push({
            base: BASE,
            quote,
            rate: pkrPerQuote,
            fetched_at: fetchedAt,
            source: PROVIDER_NAME,
        });
        result[quote] = pkrPerQuote;
    }

    await prisma.fxRate.createMany({ data: rows });
    logger.log(`[FX] stored ${rows.length} pairs (PKR/USD = ${pkrPerUsd.toFixed(2)})`);
    return result;
}

/**
 * Returns the latest rate for each tracked quote currency, as a Map
 * keyed by currency code: { USD: 278.5, EUR: 302.1, ... }. PKR is implicit (1).
 */
export async function getLatestRates() {
    const out = { PKR: 1 };
    for (const quote of TRACKED_QUOTES) {
        const row = await prisma.fxRate.findFirst({
            where: { base: BASE, quote },
            orderBy: { fetched_at: 'desc' },
        });
        if (row) out[quote] = Number(row.rate);
    }
    return out;
}
