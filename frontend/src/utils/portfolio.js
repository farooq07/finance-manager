/**
 * Portfolio derivation for the Stocks page.
 *
 * This is the seam between "where holdings come from" and everything that
 * renders them. Today holdings come from PsxSnapshot.holdings_data; the plan
 * is for them to come from per-lot StockTransaction records instead. Keeping
 * that behind one function means the swap touches this file and nothing else.
 *
 * The other job it does is keep held positions and watchlist-only tickers in
 * separate arrays. Previously a hardcoded list of 14 symbols was merged into
 * the holdings array with zero quantities, which put ~14 zero-value slices in
 * the allocation donut and rows with no position in the holdings table.
 */

const num = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

const normaliseSymbol = (symbol) => String(symbol || '').trim().toUpperCase();

/**
 * Merge the latest snapshot's holdings with live market prices.
 *
 * @param {Array} snapshots      PsxSnapshot rows, newest first
 * @param {Array} livePrices     PsxStock rows ({ ticker, price, change, ... })
 * @param {Array} watchlist      watchlist rows ({ ticker, ... })
 * @returns {{positions: Array, watchlistOnly: Array, asOf: Date|null}}
 */
export function derivePositions(snapshots = [], livePrices = [], watchlist = []) {
    const latest = snapshots.length > 0 ? snapshots[0] : null;
    const holdings = Array.isArray(latest?.holdings_data) ? latest.holdings_data : [];

    const liveByTicker = new Map(
        livePrices.map(l => [normaliseSymbol(l.ticker), l]),
    );

    const positions = holdings
        .map(h => {
            const symbol = normaliseSymbol(h.symbol);
            const live = liveByTicker.get(symbol);
            const quantity = num(h.holding);

            // Prefer the live price; fall back to the price recorded in the
            // snapshot so a missing quote never zeroes out a real holding.
            const marketPrice = live ? num(live.price) : num(h.market_rate);
            const totalCost = num(h.total_cost) || quantity * num(h.cost_per_unit);
            const marketValue = quantity * marketPrice;
            const dayChange = live ? num(live.change) * quantity : num(h.today_gl);

            return {
                symbol,
                companyName: live?.companyName ?? null,
                quantity,
                avgCost: quantity > 0 ? totalCost / quantity : 0,
                marketPrice,
                marketValue,
                totalCost,
                unrealisedGain: marketValue - totalCost,
                unrealisedGainPct: totalCost > 0 ? ((marketValue - totalCost) / totalCost) * 100 : null,
                dayChange,
                dayChangePct: live ? num(live.changePct) : null,
                isLive: Boolean(live),
            };
        })
        // A zero-quantity row is an exited position, not a holding. It must
        // not reach the donut or the weight calculation.
        .filter(p => p.quantity > 0);

    const heldSymbols = new Set(positions.map(p => p.symbol));

    const watchlistOnly = watchlist
        .map(w => normaliseSymbol(w.ticker))
        .filter(ticker => ticker && !heldSymbols.has(ticker))
        .map(ticker => {
            const live = liveByTicker.get(ticker);
            return {
                symbol: ticker,
                companyName: live?.companyName ?? null,
                marketPrice: live ? num(live.price) : null,
                dayChange: live ? num(live.change) : null,
                dayChangePct: live ? num(live.changePct) : null,
                isLive: Boolean(live),
            };
        });

    return {
        positions,
        watchlistOnly,
        asOf: latest?.snapshot_date ? new Date(latest.snapshot_date) : null,
    };
}

/**
 * Portfolio weight per position, as a percentage of total market value.
 * Mirrors positionWeights() in backend/src/services/portfolio.service.js.
 */
export function withWeights(positions = []) {
    const total = positions.reduce((sum, p) => sum + num(p.marketValue), 0);
    return positions.map(p => ({
        ...p,
        weightPct: total > 0 ? (num(p.marketValue) / total) * 100 : 0,
    }));
}

/**
 * Collapse slices below `threshold` percent into a single "Other" bucket.
 *
 * A PSX portfolio of 20 names produces a donut of unreadable slivers; this
 * keeps the chart legible while preserving the detail behind one expandable
 * entry. Returns the bucket's members so the UI can expand it.
 */
export function groupSmallSlices(positions = [], threshold = 3) {
    const weighted = withWeights(positions);
    const major = weighted.filter(p => p.weightPct >= threshold);
    const minor = weighted.filter(p => p.weightPct < threshold);

    // One straggler is not worth hiding behind an "Other" label.
    if (minor.length <= 1) {
        return { slices: weighted.map(toSlice), otherMembers: [] };
    }

    const otherValue = minor.reduce((sum, p) => sum + num(p.marketValue), 0);
    const otherWeight = minor.reduce((sum, p) => sum + p.weightPct, 0);

    return {
        slices: [
            ...major.map(toSlice),
            { name: 'Other', value: otherValue, weightPct: otherWeight, isOther: true },
        ],
        otherMembers: minor.map(toSlice),
    };
}

function toSlice(position) {
    return {
        name: position.symbol,
        value: num(position.marketValue),
        weightPct: position.weightPct ?? 0,
        isOther: false,
    };
}

/**
 * Filter snapshots to a range window for the performance chart.
 *
 * @param {Array} snapshots  newest-first PsxSnapshot rows
 * @param {string} range     '1M' | '3M' | '6M' | '1Y' | 'ALL'
 * @returns {Array} oldest-first, within range
 */
export function snapshotsInRange(snapshots = [], range = 'ALL') {
    const chronological = [...snapshots].sort(
        (a, b) => new Date(a.snapshot_date) - new Date(b.snapshot_date),
    );
    if (range === 'ALL') return chronological;

    const months = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12 }[range];
    if (!months) return chronological;

    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    return chronological.filter(s => new Date(s.snapshot_date) >= cutoff);
}

/**
 * The narrowest range that still contains at least two points, searching from
 * shortest to longest. A chart needs two points to draw a line; defaulting to
 * a range with one is what produced the lone dot on an empty axis.
 *
 * Returns null when no range qualifies, which the UI renders as an empty state.
 */
export function widestUsableRange(snapshots = [], ranges = ['1M', '3M', '6M', '1Y', 'ALL']) {
    for (const range of ranges) {
        if (snapshotsInRange(snapshots, range).length >= 2) return range;
    }
    return null;
}
