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
