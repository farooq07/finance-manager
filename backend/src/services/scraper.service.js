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
            const changeText = await page.$eval('.quote__change', el => el.textContent.trim());

            const stats = await page.$$eval('.stats_item', items => {
                const data = {};
                for (const item of items) {
                    const label = item.querySelector('.stats_label')?.textContent?.trim();
                    const value = item.querySelector('.stats_value')?.textContent?.trim();
                    if (label && value) {
                        data[label] = value;
                    }
                }
                return data;
            });

            // Try to parse the change
            let change = 0;
            let changePct = 0;
            const changeMatch = changeText.match(/([\-\+]?[\d\,]+\.?\d*)\s*\(([\-\+]?[\d\,]+\.?\d*)%\)/);
            if (changeMatch) {
                change = parseFloat(changeMatch[1].replace(/,/g, ''));
                changePct = parseFloat(changeMatch[2].replace(/,/g, ''));
            } else {
                change = parseFloat(changeText.split(' ')[0].replace(/,/g, '')) || 0;
            }

            // Parse other fields safely
            const parseNumber = (str) => parseFloat((str || '0').replace(/[,KMB]/gi, '')) || 0;

            const volumeStr = stats['Volume'] || '0';
            const volume = parseInt(volumeStr.replace(/,/g, '')) || 0;
            const high = parseNumber(stats['High']);
            const low = parseNumber(stats['Low']);
            const marketCapStr = stats['Market Cap'] || '0';
            const marketCap = parseNumber(marketCapStr);

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
            });

            await page.close();
        } catch (error) {
            console.error(`Error scraping ${ticker}:`, error.message);
        }
    }

    await browser.close();
    return results;
}
