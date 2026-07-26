import Decimal from 'decimal.js';

/**
 * Portfolio maths — weights, yields, and total return.
 *
 * Every function here is pure and takes a `positions[]` array rather than a
 * snapshot or a Prisma row. That is deliberate: positions are currently
 * derived from PsxSnapshot.holdings_data, and will later be derived from
 * per-lot StockTransaction records instead. Keeping the shape at the boundary
 * means that switch does not touch any of this.
 *
 * Expected position shape:
 *   { symbol, quantity, avgCost, marketPrice, marketValue, totalCost }
 *
 * All monetary arithmetic goes through decimal.js. Percentages come back as
 * plain numbers because they are display values, not money.
 */

const ZERO = new Decimal(0);

function d(value) {
    if (value === null || value === undefined || value === '') return ZERO;
    try {
        return new Decimal(value);
    } catch {
        return ZERO;
    }
}

/**
 * Total market value across positions.
 */
export function totalMarketValue(positions = []) {
    return positions.reduce((sum, p) => sum.plus(d(p.marketValue)), ZERO);
}

/**
 * Total cost basis across positions.
 */
export function totalCost(positions = []) {
    return positions.reduce((sum, p) => sum.plus(d(p.totalCost)), ZERO);
}

/**
 * Each position's share of the portfolio by market value.
 *
 * Returns weight as a plain number percentage. An empty or zero-value
 * portfolio yields 0 for every position rather than NaN.
 */
export function positionWeights(positions = []) {
    const total = totalMarketValue(positions);
    return positions.map(p => ({
        symbol: p.symbol,
        marketValue: d(p.marketValue).toNumber(),
        weightPct: total.isZero() ? 0 : d(p.marketValue).dividedBy(total).times(100).toNumber(),
    }));
}

/**
 * Trailing dividend totals per symbol.
 *
 * Gross and net are kept separate throughout. The Dividend model stores both,
 * and mixing them silently overstates income by the withholding-tax amount.
 *
 * @param {Array} dividends rows with security_symbol, gross_/net_dividend_amount, payment_date
 * @param {Date} [since] only count payments on or after this date
 */
export function dividendsBySymbol(dividends = [], since = null) {
    const bySymbol = new Map();
    for (const div of dividends) {
        if (since && div.payment_date && new Date(div.payment_date) < since) continue;
        const symbol = String(div.security_symbol || '').trim().toUpperCase();
        if (!symbol) continue;

        const entry = bySymbol.get(symbol) || { symbol, gross: ZERO, net: ZERO, count: 0 };
        entry.gross = entry.gross.plus(d(div.gross_dividend_amount));
        entry.net = entry.net.plus(d(div.net_dividend_amount));
        entry.count += 1;
        bySymbol.set(symbol, entry);
    }
    return bySymbol;
}

/**
 * Trailing-twelve-month dividend yields per position.
 *
 * - currentYieldPct — TTM dividend over current market value: what the holding
 *   yields at today's price.
 * - yieldOnCostPct — TTM dividend over the investor's own cost basis: what it
 *   yields on what they actually paid. These diverge sharply once a holding
 *   has run up, and the second is the more useful number for a long holder.
 */
export function dividendYields(positions = [], dividends = [], asOf = new Date()) {
    const twelveMonthsAgo = new Date(asOf);
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
    const ttm = dividendsBySymbol(dividends, twelveMonthsAgo);

    return positions.map(p => {
        const symbol = String(p.symbol || '').trim().toUpperCase();
        const entry = ttm.get(symbol);
        const net = entry ? entry.net : ZERO;
        const marketValue = d(p.marketValue);
        const cost = d(p.totalCost);

        return {
            symbol: p.symbol,
            ttmDividendNet: net.toNumber(),
            ttmDividendGross: entry ? entry.gross.toNumber() : 0,
            currentYieldPct: marketValue.isZero() ? null : net.dividedBy(marketValue).times(100).toNumber(),
            yieldOnCostPct: cost.isZero() ? null : net.dividedBy(cost).times(100).toNumber(),
        };
    });
}

/**
 * Portfolio return, price-only and including dividends.
 *
 * The price-only figure is what the page shows today. The dividend-inclusive
 * figure is the one that reflects what the investor actually made — for a
 * high-yield PSX portfolio the gap between them is substantial.
 *
 * Dividends counted here are all-time net receipts, matching the cost basis
 * they are measured against.
 */
export function totalReturn(positions = [], dividends = []) {
    const marketValue = totalMarketValue(positions);
    const cost = totalCost(positions);

    let dividendNet = ZERO;
    let dividendGross = ZERO;
    for (const entry of dividendsBySymbol(dividends).values()) {
        dividendNet = dividendNet.plus(entry.net);
        dividendGross = dividendGross.plus(entry.gross);
    }

    const priceGain = marketValue.minus(cost);
    const totalGain = priceGain.plus(dividendNet);

    return {
        marketValue: marketValue.toNumber(),
        totalCost: cost.toNumber(),
        priceGain: priceGain.toNumber(),
        priceGainPct: cost.isZero() ? null : priceGain.dividedBy(cost).times(100).toNumber(),
        dividendNet: dividendNet.toNumber(),
        dividendGross: dividendGross.toNumber(),
        totalGain: totalGain.toNumber(),
        totalGainPct: cost.isZero() ? null : totalGain.dividedBy(cost).times(100).toNumber(),
    };
}
