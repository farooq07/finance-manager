import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';
import { scrapeTradingViewNews } from '../services/scraper.service.js';
import { syncPsxPrices, getLatestSyncStatus, priceNewTickers } from '../services/psxSync.service.js';

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

        priceNewTickers([stock.stock_symbol]); // no price yet? fetch one now, in the background
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
        const { buy_date, buy_price, quantity, brokerage_fee, side = 'buy' } = req.body;

        // A sale is stored as a lot with negative shares at the sale price.
        const shares = Number(quantity);
        const price = Number(buy_price);
        const fee = brokerage_fee == null || brokerage_fee === '' ? 0 : Number(brokerage_fee);
        if (!['buy', 'sell'].includes(side)) return res.status(400).json({ message: "side must be 'buy' or 'sell'" });
        if (!Number.isInteger(shares) || shares <= 0) return res.status(400).json({ message: 'Shares must be a whole number above 0' });
        if (!(price > 0)) return res.status(400).json({ message: 'Price must be greater than 0' });
        if (!(fee >= 0)) return res.status(400).json({ message: 'Fees cannot be negative' });
        if (!buy_date || Number.isNaN(Date.parse(buy_date))) return res.status(400).json({ message: 'A valid date is required' });

        const existing = await prisma.stock.findUnique({ where: { id }, include: { transactions: true } });
        if (!existing || existing.user_id !== req.user.id) {
            return res.status(404).json({ message: 'Stock not found' });
        }
        if (side === 'sell') {
            const held = existing.transactions.reduce((q, t) => q + Number(t.quantity || 0), 0);
            if (shares > held) return res.status(400).json({ message: `You hold ${held} shares — you can't sell ${shares}` });
        }

        const transaction = await prisma.stockTransaction.create({
            data: {
                user_id: req.user.id,
                stock_id: id,
                buy_date: new Date(buy_date),
                buy_price: price,
                quantity: side === 'sell' ? -shares : shares,
                brokerage_fee: fee
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

/**
 * Manual PSX price sync. The scrape/validate/write logic lives in
 * psxSync.service.js so the nightly cron and this endpoint share one code
 * path — previously the only way to refresh prices was for an admin to press
 * a button, and the ticker list was hardcoded here.
 */
export const syncPsxStocks = async (req, res) => {
    try {
        if (!['admin', 'super.admin'].includes(req.user?.role)) {
            return res.status(403).json({ message: 'Unauthorized - Admin access required' });
        }

        logger.log('[SYNC] Starting manual PSX price sync...');
        const result = await syncPsxPrices();

        if (result.aborted) {
            return res.status(200).json({
                message: 'Sync aborted — too many tickers failed. Existing prices left untouched.',
                success: false,
                updated: 0,
                failed: result.failed,
            });
        }

        res.status(200).json({
            message: `✓ Updated ${result.updated} stocks`,
            success: true,
            updated: result.updated,
            failed: result.failed,
            status: result.status,
        });
    } catch (error) {
        logger.error('[SYNC] Error during PSX price sync:', error.message);
        res.status(500).json({
            message: 'Error syncing PSX data',
            error: error.message,
            success: false
        });
    }
};

/**
 * Freshness of the last price sync, for the staleness badge on the Stocks
 * page. Readable by any signed-in user — it exposes no user data.
 */
export const getPsxSyncStatus = async (req, res) => {
    try {
        const run = await getLatestSyncStatus('psx_prices');
        if (!run) return res.json({ status: 'never', lastSyncedAt: null });

        res.json({
            status: run.status,
            lastSyncedAt: run.finished_at || run.started_at,
            tickersOk: run.tickers_ok,
            tickersFailed: run.tickers_failed,
        });
    } catch (error) {
        logger.error('[SYNC] Error fetching sync status:', error.message);
        res.status(500).json({ message: 'Error fetching sync status' });
    }
};

const MAX_HISTORY_DAYS = 3650;
const MAX_BULK_TICKERS = 100;

function historyDays(raw) {
    return Math.min(Math.max(parseInt(raw, 10) || 30, 1), MAX_HISTORY_DAYS);
}

function serialiseHistoryRow(r) {
    return {
        date: r.date,
        open: r.open === null ? null : Number(r.open),
        high: r.high === null ? null : Number(r.high),
        low: r.low === null ? null : Number(r.low),
        close: Number(r.close),
        volume: r.volume === null ? null : Number(r.volume),
    };
}

/**
 * Daily closes for several tickers at once, keyed by ticker.
 *
 * The holdings table draws a sparkline per row; without this it would fire one
 * request per holding on every render of the page.
 */
export const getBulkTickerHistory = async (req, res) => {
    try {
        const tickers = String(req.query.tickers || '')
            .split(',')
            .map(t => t.trim().toUpperCase())
            .filter(Boolean)
            .slice(0, MAX_BULK_TICKERS);

        if (tickers.length === 0) return res.json({});

        const days = historyDays(req.query.days);
        const since = new Date();
        since.setDate(since.getDate() - days);

        const rows = await prisma.psxPriceHistory.findMany({
            where: { ticker: { in: tickers }, date: { gte: since } },
            orderBy: [{ ticker: 'asc' }, { date: 'asc' }],
            select: { ticker: true, date: true, open: true, high: true, low: true, close: true, volume: true },
        });

        const byTicker = {};
        for (const ticker of tickers) byTicker[ticker] = [];
        for (const row of rows) {
            (byTicker[row.ticker] ||= []).push(serialiseHistoryRow(row));
        }

        res.json(byTicker);
    } catch (error) {
        logger.error('[PSX] Error fetching bulk ticker history:', error.message);
        res.status(500).json({ message: 'Error fetching ticker history' });
    }
};

/**
 * Daily close series for one ticker, for sparklines and per-ticker charts.
 * PsxPriceHistory is market data, not user data, so it is not user-scoped —
 * but the route still requires a valid token.
 */
export const getTickerHistory = async (req, res) => {
    try {
        const ticker = String(req.params.ticker || '').trim().toUpperCase();
        if (!ticker) return res.status(400).json({ message: 'Ticker is required' });

        const days = historyDays(req.query.days);
        const since = new Date();
        since.setDate(since.getDate() - days);

        const rows = await prisma.psxPriceHistory.findMany({
            where: { ticker, date: { gte: since } },
            orderBy: { date: 'asc' },
            select: { date: true, open: true, high: true, low: true, close: true, volume: true },
        });

        res.json(rows.map(serialiseHistoryRow));
    } catch (error) {
        logger.error('[PSX] Error fetching ticker history:', error.message);
        res.status(500).json({ message: 'Error fetching ticker history' });
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

        logger.log(`[NEWS SYNC] Syncing news for ${tickers.join(', ')}`);

        const results = {
            success: [],
            failed: []
        };

        // Process one by one - NO RETRIES on errors
        for (const sym of tickers) {
            const { data: newsItems, error } = await scrapeTradingViewNews(sym);

            if (error) {
                // Log error but don't retry
                logger.log(`[NEWS SKIP] ${sym}: ${error}`);
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
