import { chromium } from 'playwright';
import logger from '../utils/logger.js';

const NAV_TIMEOUT_MS = 30000;
const SELECTOR_TIMEOUT_MS = 10000;
const MAX_ATTEMPTS = 3;

/**
 * Parse a scraped numeric string.
 *
 * Returns `null` — not 0 — when the text is missing or unparseable. This
 * distinction matters: a failed parse used to become 0, and the caller wrote
 * that 0 straight over a perfectly good stored price. A null tells the caller
 * "no reading", which it can then skip.
 */
export function parseNumber(str) {
    if (str === null || str === undefined) return null;
    const clean = String(str).replace(/Rs\./gi, '').replace(/[^0-9.-]/g, '');
    if (clean === '' || clean === '-' || clean === '.') return null;
    const num = parseFloat(clean);
    return Number.isFinite(num) ? num : null;
}

/**
 * Sanity bounds for a PSX share price in PKR. A scrape that lands outside
 * this band means the page structure changed and we grabbed the wrong node,
 * so the reading is rejected rather than stored.
 *
 * Mirrors isPlausibleTolaPrice() in goldScraper.service.js.
 */
export function isPlausiblePrice(price) {
    return typeof price === 'number' && Number.isFinite(price) && price > 0 && price <= 100_000;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Scrape one ticker. Throws on failure so the retry wrapper can catch it.
 * Fields that fail to parse come back as null and are omitted downstream.
 */
async function scrapeOneTicker(context, ticker) {
    const page = await context.newPage();
    try {
        await page.goto(`https://dps.psx.com.pk/company/${ticker}`, {
            waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS,
        });
        await page.waitForSelector('.quote__name', { timeout: SELECTOR_TIMEOUT_MS });

        const companyName = await page.$eval('.quote__name', el => el.textContent.trim());
        const priceText = await page.$eval('.quote__close', el => el.textContent.trim());
        const changeValueText = await page.$eval('.change__value', el => el.textContent.trim());
        const changePercentText = await page.$eval('.change__percent', el => el.textContent.trim());

        const stats = await page.$eval('.stats.stats--noborder', container => {
            const items = Array.from(container.querySelectorAll('.stats_item'));
            const res = {};
            items.forEach(item => {
                const label = item.querySelector('.stats_label')?.textContent?.trim()?.toLowerCase();
                const value = item.querySelector('.stats_value')?.textContent?.trim();
                if (label && value) res[label] = value;
            });
            return res;
        });

        const price = parseNumber(priceText);
        if (!isPlausiblePrice(price)) {
            throw new Error(`implausible price for ${ticker}: ${JSON.stringify(priceText)}`);
        }

        const volumeRaw = parseNumber(stats['volume']);

        return {
            ticker,
            companyName: companyName || null,
            price,
            change: parseNumber(changeValueText),
            changePct: parseNumber(changePercentText),
            volume: volumeRaw === null ? null : Math.round(volumeRaw),
            high: parseNumber(stats['high']),
            low: parseNumber(stats['low']),
            marketCap: parseNumber(stats['market cap']),
            scrapedAt: new Date(),
        };
    } finally {
        // Always close, including on the throw path — the previous version
        // leaked a page for every ticker that failed.
        await page.close().catch(() => {});
    }
}

/**
 * Scrape the PSX site for the given tickers.
 *
 * Each ticker is retried up to MAX_ATTEMPTS with exponential backoff, and one
 * ticker failing never aborts the rest.
 *
 * @param {string[]} tickers
 * @returns {Promise<{results: Array, failures: Array<{ticker: string, error: string}>}>}
 */
export async function scrapePSX(tickers = []) {
    if (tickers.length === 0) return { results: [], failures: [] };

    const results = [];
    const failures = [];
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();

    try {
        for (const ticker of tickers) {
            let lastError;
            for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
                try {
                    results.push(await scrapeOneTicker(context, ticker));
                    lastError = null;
                    break;
                } catch (error) {
                    lastError = error;
                    if (attempt < MAX_ATTEMPTS) {
                        const backoffMs = 1000 * 2 ** (attempt - 1); // 1s, 2s
                        logger.log(`[PSX] ${ticker} attempt ${attempt} failed (${error.message}); retrying in ${backoffMs}ms`);
                        await sleep(backoffMs);
                    }
                }
            }
            if (lastError) {
                logger.error(`[PSX] ${ticker} failed after ${MAX_ATTEMPTS} attempts: ${lastError.message}`);
                failures.push({ ticker, error: lastError.message });
            }
        }
    } finally {
        await browser.close().catch(() => {});
    }

    return { results, failures };
}

/**
 * Scrapes news from TradingView for a given ticker.
 * @param {string} ticker - The PSX ticker (e.g., OGDC)
 * @returns {Promise<{data: Array, error: string|null}>} Object with news items and error status
 */
export async function scrapeTradingViewNews(ticker) {
    const symbol = `PSX-${ticker}`;
    const url = `https://www.tradingview.com/symbols/${symbol}/news/`;

    let browser;
    try {
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });

        const page = await context.newPage();
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

        // Wait for news items to load - use shorter timeout and return error instead of timing out
        await page.waitForSelector('a[class*="card-"], article, [data-name="news-item"]', { timeout: 5000 }).catch(() => {
            throw new Error(`Timeout loading news for ${ticker} - selector not found`);
        });

        const newsItems = await page.$$eval('a[class*="card-"], article, [data-name="news-item"]', (items) => {
            return items.map(item => {
                const linkEl = item.tagName === 'A' ? item : item.querySelector('a[href*="/news/"]');
                const titleEl = item.querySelector('[class*="title-"], [data-qa-id="news-headline-title"], h2, h3');
                const sourceEl = item.querySelector('[class*="source-"], [class*="provider-"]');
                const dateEl = item.querySelector('time, [class*="date-"], [class*="time-"]');

                if (!titleEl || !linkEl) return null;

                return {
                    title: titleEl?.textContent?.trim() || '',
                    link: linkEl?.href || '',
                    source: sourceEl?.textContent?.trim() || 'TradingView',
                    publishedAtStr: dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim() || '',
                };
            }).filter(Boolean).slice(0, 10);
        });

        await context.close();

        // Post-process dates
        const processedNews = newsItems.map(item => {
            let publishedAt = new Date();
            const str = (item.publishedAtStr || '').toLowerCase();

            let dateToParse = item.publishedAtStr;
            if (dateToParse && !/\d{4}/.test(dateToParse) && !str.includes('ago') && !str.includes('hour') && !str.includes('min')) {
                dateToParse += `, ${new Date().getFullYear()}`;
            }

            const parsed = new Date(dateToParse);

            if (!isNaN(parsed.getTime())) {
                publishedAt = parsed;
            } else if (str.includes('hour')) {
                const hours = parseInt(str) || 0;
                publishedAt.setHours(publishedAt.getHours() - hours);
            } else if (str.includes('minute')) {
                const mins = parseInt(str) || 0;
                publishedAt.setMinutes(publishedAt.getMinutes() - mins);
            } else if (str.includes('day')) {
                const days = parseInt(str) || 0;
                publishedAt.setDate(publishedAt.getDate() - days);
            }

            return {
                ticker,
                title: item.title,
                link: item.link,
                source: item.source,
                publishedAt
            };
        });

        return { data: processedNews, error: null };
    } catch (error) {
        const errorMsg = error.message || `Failed to scrape news for ${ticker}`;
        console.error(`[NEWS ERROR] ${ticker}:`, errorMsg);
        return { data: [], error: errorMsg };
    } finally {
        if (browser) {
            await browser.close().catch(() => {});
        }
    }
}
