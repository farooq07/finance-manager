import prisma from '../utils/prisma.js';
import { scrapePSX, scrapeTradingViewNews } from '../services/scraper.service.js';

// Get user's stock portfolio
export const getStocks = async (req, res) => {
    try {
        const stocks = await prisma.stock.findMany({
            where: { user_id: req.user.id },
            include: { transactions: true }
        });
        res.json(stocks);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching stocks' });
    }
};

// Add a new stock to tracking
export const createStock = async (req, res) => {
    try {
        const { stock_symbol, company_name } = req.body;

        // Check if stock already exists for user
        let stock = await prisma.stock.findFirst({
            where: {
                user_id: req.user.id,
                stock_symbol: stock_symbol
            }
        });

        if (stock) {
            return res.status(400).json({ message: 'Stock already exists in portfolio' });
        }

        stock = await prisma.stock.create({
            data: {
                user_id: req.user.id,
                stock_symbol,
                company_name
            }
        });

        res.status(201).json(stock);
    } catch (error) {
        res.status(500).json({ message: 'Error creating stock record' });
    }
};

// Update latest market price for a stock
export const updateStockPrice = async (req, res) => {
    try {
        const { id } = req.params;
        const { current_market_price } = req.body;

        const existing = await prisma.stock.findUnique({ where: { id } });
        if (!existing || existing.user_id !== req.user.id) {
            return res.status(404).json({ message: 'Stock not found' });
        }

        const stock = await prisma.stock.update({
            where: { id },
            data: { current_market_price }
        });

        res.json(stock);
    } catch (error) {
        res.status(500).json({ message: 'Error updating stock price' });
    }
};

// Log a buy/sell transaction
export const createStockTransaction = async (req, res) => {
    try {
        const { id } = req.params; // stock id
        const { buy_date, buy_price, quantity, brokerage_fee } = req.body;

        const existing = await prisma.stock.findUnique({ where: { id } });
        if (!existing || existing.user_id !== req.user.id) {
            return res.status(404).json({ message: 'Stock not found' });
        }

        const transaction = await prisma.stockTransaction.create({
            data: {
                user_id: req.user.id,
                stock_id: id,
                buy_date: new Date(buy_date),
                buy_price,
                quantity,
                brokerage_fee: brokerage_fee || 0
            }
        });

        res.status(201).json(transaction);
    } catch (error) {
        res.status(500).json({ message: 'Error creating stock transaction' });
    }
};

export const deleteStock = async (req, res) => {
    try {
        const { id } = req.params;

        const existing = await prisma.stock.findUnique({ where: { id } });
        if (!existing || existing.user_id !== req.user.id) {
            return res.status(404).json({ message: 'Stock not found' });
        }

        await prisma.stock.delete({ where: { id } });
        res.json({ message: 'Stock deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting stock' });
    }
};

// --- NEW PSX SCRAPED STOCKS ---

export const getPsxStocks = async (req, res) => {
    try {
        const stocks = await prisma.psxStock.findMany({
            orderBy: {
                ticker: 'asc',
            },
        });

        // Convert BigInt and Decimal fields for JSON serialization
        const serializedStocks = stocks.map(stock => ({
            ...stock,
            volume: stock.volume.toString(),
            price: Number(stock.price),
            change: Number(stock.change),
            changePct: Number(stock.changePct),
            high: Number(stock.high),
            low: Number(stock.low),
            marketCap: stock.marketCap ? Number(stock.marketCap) : null
        }));

        res.status(200).json(serializedStocks);
    } catch (error) {
        console.error('Error fetching PSX stocks:', error);
        res.status(500).json({ message: 'Error fetching PSX stock data' });
    }
};

const TARGET_STOCKS = ['HUBC', 'FFL', 'FFC', 'MEBL', 'OGDC', 'EFERT', 'FATIMA', 'LUCK', 'MARI', 'MTL', 'NATF', 'PPL', 'PSO', 'SYS'];

export const syncPsxStocks = async (req, res) => {
    try {
        console.log('[SYNC] Starting manual PSX Scraping Job...');
        const results = await scrapePSX(TARGET_STOCKS);

        if (!results || results.length === 0) {
            return res.status(200).json({
                message: 'No stock data retrieved. Check network or website changes.',
                success: false,
                updated: 0
            });
        }

        let updatedCount = 0;
        let skippedCount = 0;

        for (const data of results) {
            if (!data.price) {
                skippedCount++;
                continue;
            }

            await prisma.psxStock.upsert({
                where: { ticker: data.ticker },
                update: {
                    companyName: data.companyName,
                    price: data.price,
                    change: data.change,
                    changePct: data.changePct,
                    volume: BigInt(data.volume),
                    high: data.high,
                    low: data.low,
                    marketCap: data.marketCap
                },
                create: {
                    ticker: data.ticker,
                    companyName: data.companyName,
                    price: data.price,
                    change: data.change,
                    changePct: data.changePct,
                    volume: BigInt(data.volume),
                    high: data.high,
                    low: data.low,
                    marketCap: data.marketCap
                }
            });
            updatedCount++;
        }

        console.log(`[SYNC] Successfully updated ${updatedCount} PSX stocks (skipped ${skippedCount}).`);
        res.status(200).json({
            message: `✓ Updated ${updatedCount} stocks`,
            success: true,
            updated: updatedCount,
            skipped: skippedCount
        });
    } catch (error) {
        console.error('[SYNC] Error during PSX Scraping:', error.message);
        res.status(500).json({
            message: 'Error syncing PSX data',
            error: error.message,
            success: false
        });
    }
};

export const syncStockNews = async (req, res) => {
    try {
        const { ticker } = req.body;

        let tickers = [];
        if (ticker) {
            tickers = [ticker];
        } else {
            // Get latest snapshot to find all symbols in portfolio
            const latestSnapshot = await prisma.psxSnapshot.findFirst({
                where: { user_id: req.user.id },
                orderBy: { snapshot_date: 'desc' }
            });

            if (latestSnapshot && Array.isArray(latestSnapshot.holdings_data)) {
                tickers = latestSnapshot.holdings_data.map(h => h.symbol);
            }
        }

        if (tickers.length === 0) {
            return res.json({ message: 'No stocks found to sync news for.', success: false });
        }

        console.log(`[NEWS SYNC] Syncing news for ${tickers.join(', ')}`);

        const results = {
            success: [],
            failed: []
        };

        // Process one by one - NO RETRIES on errors
        for (const sym of tickers) {
            const { data: newsItems, error } = await scrapeTradingViewNews(sym);

            if (error) {
                // Log error but don't retry
                console.log(`[NEWS SKIP] ${sym}: ${error}`);
                results.failed.push({ ticker: sym, reason: error });
                continue;
            }

            if (newsItems.length === 0) {
                results.failed.push({ ticker: sym, reason: 'No news items found' });
                continue;
            }

            // Save the news
            for (const item of newsItems) {
                try {
                    await prisma.stockNews.upsert({
                        where: { link: item.link },
                        update: {
                            ticker: sym,
                            title: item.title,
                            source: item.source,
                            publishedAt: item.publishedAt
                        },
                        create: {
                            ticker: sym,
                            title: item.title,
                            link: item.link,
                            source: item.source,
                            publishedAt: item.publishedAt
                        }
                    });
                } catch (dbErr) {
                    console.error(`[DB ERROR] Failed to save news for ${sym}:`, dbErr.message);
                }
            }
            results.success.push({ ticker: sym, count: newsItems.length });
        }

        const message = `Synced: ${results.success.length}/${tickers.length} stocks. ${results.failed.length > 0 ? `Failed: ${results.failed.map(f => f.ticker).join(', ')}` : 'All successful.'}`;
        res.json({
            message,
            success: results.success.length > 0,
            details: results
        });
    } catch (error) {
        console.error('[NEWS SYNC ERROR]', error);
        res.status(500).json({
            message: 'Error syncing stock news',
            error: error.message,
            success: false
        });
    }
};

export const getStockNews = async (req, res) => {
    try {
        const { ticker } = req.params;
        const news = await prisma.stockNews.findMany({
            where: { ticker },
            orderBy: { publishedAt: 'desc' },
            take: 10
        });
        res.json(news);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching stock news' });
    }
};
