import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';

/**
 * Per-user watchlist of PSX tickers.
 *
 * Every query below is scoped by req.user.id from the JWT. The ticker in the
 * URL or body is only ever used alongside that scope, never on its own.
 */

const TICKER_PATTERN = /^[A-Z0-9.\-]{1,20}$/;

function normaliseTicker(raw) {
    return String(raw || '').trim().toUpperCase();
}

export const getWatchlist = async (req, res) => {
    try {
        const items = await prisma.watchlist.findMany({
            where: { user_id: req.user.id },
            orderBy: { ticker: 'asc' },
        });

        // Join on the live price table so the UI gets one payload, not N+1.
        const tickers = items.map(i => i.ticker);
        const quotes = tickers.length
            ? await prisma.psxStock.findMany({ where: { ticker: { in: tickers } } })
            : [];
        const quoteByTicker = new Map(quotes.map(q => [q.ticker, q]));

        res.json(items.map(item => {
            const quote = quoteByTicker.get(item.ticker);
            return {
                id: item.id,
                ticker: item.ticker,
                notes: item.notes,
                added_at: item.added_at,
                companyName: quote?.companyName ?? null,
                price: quote ? Number(quote.price) : null,
                change: quote ? Number(quote.change) : null,
                changePct: quote ? Number(quote.changePct) : null,
                lastUpdated: quote?.lastUpdated ?? null,
            };
        }));
    } catch (error) {
        logger.error('[Watchlist] Error fetching watchlist:', error.message);
        res.status(500).json({ message: 'Error fetching watchlist' });
    }
};

export const addToWatchlist = async (req, res) => {
    try {
        const ticker = normaliseTicker(req.body.ticker);
        if (!TICKER_PATTERN.test(ticker)) {
            return res.status(400).json({ message: 'A valid ticker symbol is required' });
        }

        const item = await prisma.watchlist.upsert({
            where: { user_id_ticker: { user_id: req.user.id, ticker } },
            update: { notes: req.body.notes ?? undefined },
            create: { user_id: req.user.id, ticker, notes: req.body.notes ?? null },
        });

        res.status(201).json(item);
    } catch (error) {
        logger.error('[Watchlist] Error adding to watchlist:', error.message);
        res.status(500).json({ message: 'Error adding to watchlist' });
    }
};

export const removeFromWatchlist = async (req, res) => {
    try {
        const ticker = normaliseTicker(req.params.ticker);

        // deleteMany, not delete: it scopes by user_id in the same statement,
        // so a ticker belonging to another user simply matches nothing.
        const { count } = await prisma.watchlist.deleteMany({
            where: { user_id: req.user.id, ticker },
        });

        if (count === 0) return res.status(404).json({ message: 'Not on your watchlist' });
        res.json({ message: 'Removed from watchlist', ticker });
    } catch (error) {
        logger.error('[Watchlist] Error removing from watchlist:', error.message);
        res.status(500).json({ message: 'Error removing from watchlist' });
    }
};
