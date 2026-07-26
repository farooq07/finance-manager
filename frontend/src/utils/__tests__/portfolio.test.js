import { describe, it, expect } from 'vitest';
import {
    derivePositions, withWeights, groupSmallSlices,
    snapshotsInRange, widestUsableRange,
} from '../portfolio';

const snapshot = (date, holdings) => ({ snapshot_date: date, holdings_data: holdings });

const livePrices = [
    { ticker: 'FFC', companyName: 'Fauji Fertilizer', price: 120, change: 2, changePct: 1.7 },
    { ticker: 'OGDC', companyName: 'Oil & Gas Dev', price: 180, change: -3, changePct: -1.6 },
];

describe('derivePositions', () => {
    const snapshots = [
        snapshot('2026-07-20', [
            { symbol: 'FFC', holding: 100, cost_per_unit: 100, total_cost: 10000, market_rate: 110 },
            { symbol: 'OGDC', holding: 50, cost_per_unit: 200, total_cost: 10000, market_rate: 190 },
        ]),
    ];

    it('prefers the live price over the snapshot price', () => {
        const { positions } = derivePositions(snapshots, livePrices, []);
        expect(positions.find(p => p.symbol === 'FFC').marketPrice).toBe(120);
        expect(positions.find(p => p.symbol === 'FFC').marketValue).toBe(12000);
    });

    it('falls back to the snapshot price when there is no live quote', () => {
        const { positions } = derivePositions(snapshots, [], []);
        const ffc = positions.find(p => p.symbol === 'FFC');
        expect(ffc.marketPrice).toBe(110);
        expect(ffc.isLive).toBe(false);
    });

    it('keeps watchlist-only tickers out of positions', () => {
        const watchlist = [{ ticker: 'HUBC' }, { ticker: 'FFC' }];
        const { positions, watchlistOnly } = derivePositions(snapshots, livePrices, watchlist);

        // This is the regression that produced ~14 zero-value donut slices.
        expect(positions.map(p => p.symbol)).toEqual(['FFC', 'OGDC']);
        expect(watchlistOnly.map(w => w.symbol)).toEqual(['HUBC']);
    });

    it('excludes zero-quantity (fully exited) positions', () => {
        const withExit = [snapshot('2026-07-20', [
            { symbol: 'FFC', holding: 100, total_cost: 10000, market_rate: 110 },
            { symbol: 'GONE', holding: 0, total_cost: 0, market_rate: 50 },
        ])];
        const { positions } = derivePositions(withExit, [], []);
        expect(positions.map(p => p.symbol)).toEqual(['FFC']);
    });

    it('normalises symbol case and whitespace', () => {
        const messy = [snapshot('2026-07-20', [{ symbol: ' ffc ', holding: 10, total_cost: 1000 }])];
        const { positions } = derivePositions(messy, livePrices, []);
        expect(positions[0].symbol).toBe('FFC');
        expect(positions[0].isLive).toBe(true);
    });

    it('computes avg cost and unrealised gain', () => {
        const { positions } = derivePositions(snapshots, livePrices, []);
        const ffc = positions.find(p => p.symbol === 'FFC');
        expect(ffc.avgCost).toBe(100);
        expect(ffc.unrealisedGain).toBe(2000);
        expect(ffc.unrealisedGainPct).toBeCloseTo(20, 6);
    });

    it('returns empty results with no snapshots', () => {
        const { positions, watchlistOnly, asOf } = derivePositions([], livePrices, []);
        expect(positions).toEqual([]);
        expect(watchlistOnly).toEqual([]);
        expect(asOf).toBeNull();
    });

    it('derives total cost from cost_per_unit when total_cost is absent', () => {
        const noTotal = [snapshot('2026-07-20', [{ symbol: 'FFC', holding: 10, cost_per_unit: 90 }])];
        const { positions } = derivePositions(noTotal, [], []);
        expect(positions[0].totalCost).toBe(900);
    });
});

describe('withWeights', () => {
    it('weights sum to 100', () => {
        const weighted = withWeights([
            { symbol: 'A', marketValue: 12000 },
            { symbol: 'B', marketValue: 9000 },
        ]);
        expect(weighted.reduce((s, p) => s + p.weightPct, 0)).toBeCloseTo(100, 6);
    });

    it('yields 0 rather than NaN for a zero-value portfolio', () => {
        const weighted = withWeights([{ symbol: 'A', marketValue: 0 }]);
        expect(weighted[0].weightPct).toBe(0);
    });
});

describe('groupSmallSlices', () => {
    const positions = [
        { symbol: 'BIG1', marketValue: 5000 },
        { symbol: 'BIG2', marketValue: 3000 },
        { symbol: 'TINY1', marketValue: 100 },
        { symbol: 'TINY2', marketValue: 100 },
        { symbol: 'TINY3', marketValue: 100 },
    ];

    it('collapses sub-threshold slices into Other', () => {
        const { slices, otherMembers } = groupSmallSlices(positions, 3);
        expect(slices.map(s => s.name)).toEqual(['BIG1', 'BIG2', 'Other']);
        expect(otherMembers.map(s => s.name)).toEqual(['TINY1', 'TINY2', 'TINY3']);
    });

    it('Other carries the summed value of its members', () => {
        const { slices } = groupSmallSlices(positions, 3);
        expect(slices.find(s => s.name === 'Other').value).toBe(300);
    });

    it('does not create an Other bucket for a single small slice', () => {
        const { slices, otherMembers } = groupSmallSlices([
            { symbol: 'BIG', marketValue: 9900 },
            { symbol: 'TINY', marketValue: 100 },
        ], 3);
        expect(slices.map(s => s.name)).toEqual(['BIG', 'TINY']);
        expect(otherMembers).toEqual([]);
    });

    it('total value is preserved after grouping', () => {
        const { slices } = groupSmallSlices(positions, 3);
        expect(slices.reduce((s, x) => s + x.value, 0)).toBe(8300);
    });
});

describe('snapshotsInRange', () => {
    const today = new Date();
    const daysAgo = (n) => {
        const d = new Date(today);
        d.setDate(d.getDate() - n);
        return d.toISOString();
    };

    const snapshots = [
        snapshot(daysAgo(400), []),
        snapshot(daysAgo(100), []),
        snapshot(daysAgo(10), []),
    ];

    it('returns oldest-first regardless of input order', () => {
        const result = snapshotsInRange(snapshots, 'ALL');
        expect(new Date(result[0].snapshot_date) < new Date(result[2].snapshot_date)).toBe(true);
    });

    it('filters to the requested window', () => {
        expect(snapshotsInRange(snapshots, '1M')).toHaveLength(1);
        expect(snapshotsInRange(snapshots, '6M')).toHaveLength(2);
        expect(snapshotsInRange(snapshots, 'ALL')).toHaveLength(3);
    });
});

describe('widestUsableRange', () => {
    const daysAgo = (n) => {
        const d = new Date();
        d.setDate(d.getDate() - n);
        return d.toISOString();
    };

    it('picks the narrowest range holding two points', () => {
        const snapshots = [snapshot(daysAgo(5), []), snapshot(daysAgo(10), [])];
        expect(widestUsableRange(snapshots)).toBe('1M');
    });

    it('widens when the short ranges are too sparse', () => {
        const snapshots = [snapshot(daysAgo(5), []), snapshot(daysAgo(200), [])];
        expect(widestUsableRange(snapshots)).toBe('1Y');
    });

    it('returns null with fewer than two points anywhere', () => {
        // The lone-dot case. The UI must show an empty state, not a chart.
        expect(widestUsableRange([snapshot(daysAgo(5), [])])).toBeNull();
        expect(widestUsableRange([])).toBeNull();
    });
});
