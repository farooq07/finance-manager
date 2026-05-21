import { chromium } from 'playwright';
import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';

// 1 tola = 11.664 grams (Pakistani standard).
const GRAMS_PER_TOLA = 11.664;

const TIMEOUT_MS = 30000;

/**
 * Returns the start of today's date in Asia/Karachi as a JS Date that
 * stores midnight at PKT in UTC. Used as the PK of the daily row.
 */
function todayAtKarachi() {
    const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Karachi',
        year: 'numeric', month: '2-digit', day: '2-digit',
    });
    const ymd = fmt.format(new Date()); // "2026-05-21"
    return new Date(`${ymd}T00:00:00.000Z`);
}

/**
 * Extract the first PKR money-looking number from a chunk of text.
 * Handles 380,500.00 / Rs. 380500 / 3,80,500 (Indian grouping).
 */
function extractPkr(text) {
    if (!text) return null;
    const cleaned = text.replace(/Rs\.?/gi, '').replace(/PKR/gi, '');
    // Find the longest run of digits with commas/decimals
    const m = cleaned.match(/[\d,]+(?:\.\d{1,2})?/);
    if (!m) return null;
    const num = parseFloat(m[0].replace(/,/g, ''));
    return Number.isFinite(num) && num > 0 ? num : null;
}

// Sanity range — Pakistani 24K per-tola is currently ~330k PKR. Reject
// scrapes that fall wildly outside this band, since the page structure
// has almost certainly changed.
function isPlausibleTolaPrice(price) {
    return price >= 100_000 && price <= 5_000_000;
}

/**
 * Try hamariweb first. Looks for the "24K" row in the rates table and
 * pulls the per-tola PKR figure. Returns null on any failure.
 */
async function scrapeHamariweb(page) {
    try {
        await page.goto('https://www.hamariweb.com/finance/gold_rates.aspx', {
            waitUntil: 'domcontentloaded',
            timeout: TIMEOUT_MS,
        });

        // The page renders rates in a table; the row for 24K typically
        // includes "24" in the carat cell and a PKR figure in the
        // per-tola cell. We grab the raw text and pattern-match.
        const bodyText = await page.evaluate(() => document.body.innerText);

        // Heuristic: look for "24K" or "24 Karat" within ~80 chars before
        // a PKR-looking number — that's the per-tola price.
        const re24k = /24\s*[Kk](?:arat)?[\s\S]{0,200}?Rs?\.?\s*([\d,]+(?:\.\d+)?)/;
        const match = bodyText.match(re24k);
        if (match) {
            const price = extractPkr(match[1]);
            if (price && isPlausibleTolaPrice(price)) return { price, source: 'hamariweb' };
        }

        // Fallback: find the largest PKR number in the page that's
        // within the sanity range (assumes 24K per-tola is the headline).
        const allMoney = [...bodyText.matchAll(/Rs?\.?\s*([\d,]+(?:\.\d+)?)/gi)]
            .map((m) => extractPkr(m[1]))
            .filter((n) => n && isPlausibleTolaPrice(n))
            .sort((a, b) => b - a);
        if (allMoney.length) return { price: allMoney[0], source: 'hamariweb' };

        return null;
    } catch (err) {
        logger.warn('[GOLD_SCRAPE] hamariweb failed:', err.message);
        return null;
    }
}

/**
 * Fallback to geo.tv if hamariweb didn't return a usable number.
 */
async function scrapeGeo(page) {
    try {
        await page.goto('https://www.geo.tv/gold-rate', {
            waitUntil: 'domcontentloaded',
            timeout: TIMEOUT_MS,
        });
        const bodyText = await page.evaluate(() => document.body.innerText);
        const re = /(?:tola|24[\s-]*[Kk])[\s\S]{0,200}?Rs?\.?\s*([\d,]+(?:\.\d+)?)/;
        const match = bodyText.match(re);
        if (match) {
            const price = extractPkr(match[1]);
            if (price && isPlausibleTolaPrice(price)) return { price, source: 'geo' };
        }
        return null;
    } catch (err) {
        logger.warn('[GOLD_SCRAPE] geo failed:', err.message);
        return null;
    }
}

/**
 * Scrapes the latest 24K-per-tola PKR price and writes today's row to
 * gold_price_history (upsert by date). Returns the upserted row.
 *
 * Throws if both sources fail — the caller (cron, manual endpoint)
 * decides how loud to be about it.
 */
export async function syncGoldPrice() {
    let browser;
    try {
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        });
        const page = await context.newPage();

        let scraped = await scrapeHamariweb(page);
        if (!scraped) scraped = await scrapeGeo(page);

        if (!scraped) {
            throw new Error('All gold price sources failed to return a usable 24K/tola price');
        }

        const pricePerTola = Number(scraped.price);
        const pricePerGram = pricePerTola / GRAMS_PER_TOLA;
        const date = todayAtKarachi();

        const row = await prisma.goldPriceHistory.upsert({
            where: { date },
            update: {
                price_24k_per_tola: pricePerTola,
                price_24k_per_gram: pricePerGram.toFixed(2),
                source: scraped.source,
            },
            create: {
                date,
                price_24k_per_tola: pricePerTola,
                price_24k_per_gram: pricePerGram.toFixed(2),
                source: scraped.source,
            },
        });

        logger.log(`[GOLD_SCRAPE] ${scraped.source}: 24K = PKR ${pricePerTola.toLocaleString('en-PK')} /tola (PKR ${pricePerGram.toFixed(2)} /g)`);
        return row;
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
}
