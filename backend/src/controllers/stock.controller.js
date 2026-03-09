import prisma from '../utils/prisma.js';
import { scrapePSX } from '../services/scraper.service.js';

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

const TARGET_STOCKS = ['HUBC', 'FFL', 'FFC', 'MEBL', 'OGDC'];

export const syncPsxStocks = async (req, res) => {
    try {
        console.log('[SYNC] Starting manual PSX Scraping Job...');
        const results = await scrapePSX(TARGET_STOCKS);

        let updatedCount = 0;
        for (const data of results) {
            if (!data.price) continue;

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

        console.log(`[SYNC] Successfully updated ${updatedCount} PSX stocks in DB.`);
        res.status(200).json({ message: `Successfully updated ${updatedCount} stocks.` });
    } catch (error) {
        console.error('[SYNC] Error during manual PSX Scraping:', error.message);
        res.status(500).json({ message: 'Error syncing PSX data' });
    }
};
