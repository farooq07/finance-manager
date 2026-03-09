import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    try {
        await page.goto('https://dps.psx.com.pk/company/OGDC', { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('.quote', { timeout: 10000 });
        const quoteHtml = await page.$eval('.quote', el => el.outerHTML);
        console.log("QUOTE HTML:");
        console.log(quoteHtml);
    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();
