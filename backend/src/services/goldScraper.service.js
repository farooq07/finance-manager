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

// Sanity range — Pakistani 24K per-tola is currently ~420k PKR. Reject
// scrapes that fall wildly outside this band, since the page structure
// has almost certainly changed.
function isPlausibleTolaPrice(price) {
    return price >= 100_000 && price <= 5_000_000;
}

/**
 * Pull the 24K per-tola price out of a rates page's text. Both sources state
 * it in a sentence — "… is PKR 419,500 per tola for 24K gold …" — which is
 * far steadier than table layouts. No guessing from other numbers on the
 * page: a wrong gold price silently skews net worth and the Zakat nisab.
 */
export function parse24kPerTola(text) {
    if (!text) return null;
    const m = text.match(/(?:PKR|Rs\.?)\s*([\d,]+(?:\.\d+)?)\s*(?:\/-)?\s*per\s+tola\s+for\s+24\s*K/i);
    if (!m) return null;
    const price = extractPkr(m[1]);
    return price && isPlausibleTolaPrice(price) ? price : null;
}

// Tried in order; the first usable price wins. hamariweb's old
// /finance/gold_rates.aspx and geo.tv/gold-rate both went 404 in 2026.
const SOURCES = [
    { name: 'hamariweb', url: 'https://hamariweb.com/finance/gold_rate/' },
    { name: 'urdupoint', url: 'https://www.urdupoint.com/business/gold-rates.html' },
];

async function scrapeSource(page, { name, url }) {
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
        const price = parse24kPerTola(await page.evaluate(() => document.body.innerText));
        if (!price) logger.warn(`[GOLD_SCRAPE] ${name}: no 24K per-tola price found on the page`);
        return price ? { price, source: name } : null;
    } catch (err) {
        logger.warn(`[GOLD_SCRAPE] ${name} failed:`, err.message);
        return null;
    }
}

/**
 * Scrapes the latest 24K-per-tola PKR price and writes today's row to
 * gold_price_history (upsert by date). Returns the upserted row.
 *
 * Throws if every source fails — the caller (cron, manual endpoint)
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

        let scraped = null;
        for (const source of SOURCES) {
            scraped = await scrapeSource(page, source);
            if (scraped) break;
        }

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
