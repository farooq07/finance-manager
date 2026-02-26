import prisma from '../utils/prisma.js';

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
