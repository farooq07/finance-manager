import { chromium } from 'playwright';

/**
 * Scrapes the PSX website for the given list of tickers.
 * @param {string[]} tickers 
 * @returns {Promise<Array>} Array of scraped stock objects
 */
export async function scrapePSX(tickers = []) {
    if (tickers.length === 0) return [];

    const results = [];
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();

    for (const ticker of tickers) {
        try {
            const page = await context.newPage();
            await page.goto(`https://dps.psx.com.pk/company/${ticker}`, { waitUntil: 'domcontentloaded', timeout: 30000 });

            // Wait for at least the company name or price to appear
            await page.waitForSelector('.quote__name', { timeout: 10000 });

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
                    if (label && value) {
                        res[label] = value;
                    }
                });
                return res;
            });

            const parseNumber = (str) => {
                if (!str) return 0;
                // Remove Rs. prefix and everything except digits, decimal, and minus
                const clean = str.replace(/Rs\./gi, '').replace(/[^0-9.-]/g, '');
                return parseFloat(clean) || 0;
            };

            const change = parseNumber(changeValueText);
            const changePct = parseNumber(changePercentText);
            const volume = parseInt((stats['volume'] || '0').replace(/,/g, ''), 10) || 0;
            const high = parseNumber(stats['high']);
            const low = parseNumber(stats['low']);
            const marketCap = parseNumber(stats['market cap']);

            results.push({
                ticker,
                companyName,
                price: parseNumber(priceText),
                change,
                changePct,
                volume,
                high,
                low,
                marketCap,
                lastUpdated: new Date()
            });

            await page.close();
        } catch (error) {
            console.error(`Error scraping ${ticker}:`, error.message);
        }
    }

    await browser.close();
    return results;
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
