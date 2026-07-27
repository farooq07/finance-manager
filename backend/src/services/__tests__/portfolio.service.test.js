import {
    totalMarketValue, totalCost, positionWeights,
    dividendsBySymbol, dividendYields, totalReturn,
} from '../portfolio.service.js';

const positions = [
    { symbol: 'FFC', quantity: 100, avgCost: 100, marketPrice: 120, marketValue: 12000, totalCost: 10000 },
    { symbol: 'OGDC', quantity: 50, avgCost: 200, marketPrice: 180, marketValue: 9000, totalCost: 10000 },
];

describe('totals', () => {
    it('sums market value and cost', () => {
        expect(totalMarketValue(positions).toNumber()).toBe(21000);
        expect(totalCost(positions).toNumber()).toBe(20000);
    });

    it('returns zero for an empty portfolio rather than NaN', () => {
        expect(totalMarketValue([]).toNumber()).toBe(0);
        expect(totalCost([]).toNumber()).toBe(0);
    });
});

describe('positionWeights', () => {
    it('weights sum to 100', () => {
        const weights = positionWeights(positions);
        const sum = weights.reduce((s, w) => s + w.weightPct, 0);
        expect(sum).toBeCloseTo(100, 6);
    });

    it('computes each weight correctly', () => {
        const weights = positionWeights(positions);
        expect(weights.find(w => w.symbol === 'FFC').weightPct).toBeCloseTo(57.142857, 4);
        expect(weights.find(w => w.symbol === 'OGDC').weightPct).toBeCloseTo(42.857142, 4);
    });

    it('yields 0 rather than NaN when the portfolio is worthless', () => {
        const weights = positionWeights([
            { symbol: 'DEAD', marketValue: 0, totalCost: 5000 },
        ]);
        expect(weights[0].weightPct).toBe(0);
    });

    it('handles a fully-exited position among live ones', () => {
        const weights = positionWeights([
            ...positions,
            { symbol: 'EXITED', marketValue: 0, totalCost: 0 },
        ]);
        expect(weights.find(w => w.symbol === 'EXITED').weightPct).toBe(0);
        expect(weights.reduce((s, w) => s + w.weightPct, 0)).toBeCloseTo(100, 6);
    });
});

describe('dividendsBySymbol', () => {
    const dividends = [
        { security_symbol: 'FFC', gross_dividend_amount: 1000, net_dividend_amount: 850, payment_date: new Date('2025-09-01') },
        { security_symbol: 'ffc', gross_dividend_amount: 500, net_dividend_amount: 425, payment_date: new Date('2025-12-01') },
        { security_symbol: 'OGDC', gross_dividend_amount: 300, net_dividend_amount: 255, payment_date: new Date('2024-01-01') },
    ];

    it('aggregates case-insensitively by symbol', () => {
        const map = dividendsBySymbol(dividends);
        expect(map.get('FFC').gross.toNumber()).toBe(1500);
        expect(map.get('FFC').net.toNumber()).toBe(1275);
        expect(map.get('FFC').count).toBe(2);
    });

    it('keeps gross and net separate', () => {
        const map = dividendsBySymbol(dividends);
        expect(map.get('OGDC').gross.toNumber()).toBe(300);
        expect(map.get('OGDC').net.toNumber()).toBe(255);
    });

    it('respects the since cutoff', () => {
        const map = dividendsBySymbol(dividends, new Date('2025-01-01'));
        expect(map.has('OGDC')).toBe(false);
        expect(map.get('FFC').net.toNumber()).toBe(1275);
    });
});

describe('dividendYields', () => {
    const asOf = new Date('2026-01-01');
    const dividends = [
        { security_symbol: 'FFC', gross_dividend_amount: 1200, net_dividend_amount: 1000, payment_date: new Date('2025-06-01') },
        // Older than 12 months from asOf — must not count toward TTM.
        { security_symbol: 'FFC', gross_dividend_amount: 900, net_dividend_amount: 800, payment_date: new Date('2024-06-01') },
    ];

    it('counts only trailing twelve months', () => {
        const [ffc] = dividendYields([positions[0]], dividends, asOf);
        expect(ffc.ttmDividendNet).toBe(1000);
    });

    it('computes current yield against market value', () => {
        const [ffc] = dividendYields([positions[0]], dividends, asOf);
        expect(ffc.currentYieldPct).toBeCloseTo(1000 / 12000 * 100, 6);
    });

    it('computes yield on cost against cost basis', () => {
        const [ffc] = dividendYields([positions[0]], dividends, asOf);
        expect(ffc.yieldOnCostPct).toBeCloseTo(1000 / 10000 * 100, 6);
    });

    it('returns null instead of dividing by zero cost', () => {
        const [row] = dividendYields(
            [{ symbol: 'FFC', marketValue: 0, totalCost: 0 }],
            dividends, asOf,
        );
        expect(row.currentYieldPct).toBeNull();
        expect(row.yieldOnCostPct).toBeNull();
    });

    it('reports zero for a holding with no dividends', () => {
        const [row] = dividendYields([positions[1]], dividends, asOf);
        expect(row.ttmDividendNet).toBe(0);
        expect(row.currentYieldPct).toBe(0);
    });
});

describe('totalReturn', () => {
    const dividends = [
        { security_symbol: 'FFC', gross_dividend_amount: 1200, net_dividend_amount: 1000, payment_date: new Date('2025-06-01') },
    ];

    it('separates price-only from dividend-inclusive return', () => {
        const result = totalReturn(positions, dividends);
        expect(result.priceGain).toBe(1000);            // 21000 - 20000
        expect(result.priceGainPct).toBeCloseTo(5, 6);
        expect(result.totalGain).toBe(2000);            // + 1000 net dividends
        expect(result.totalGainPct).toBeCloseTo(10, 6);
    });

    it('reports gross and net dividends separately', () => {
        const result = totalReturn(positions, dividends);
        expect(result.dividendGross).toBe(1200);
        expect(result.dividendNet).toBe(1000);
    });

    it('returns null percentages instead of dividing by zero cost', () => {
        const result = totalReturn([{ symbol: 'X', marketValue: 100, totalCost: 0 }], []);
        expect(result.priceGainPct).toBeNull();
        expect(result.totalGainPct).toBeNull();
    });

    it('handles an empty portfolio', () => {
        const result = totalReturn([], []);
        expect(result.marketValue).toBe(0);
        expect(result.totalGain).toBe(0);
    });

    it('avoids floating-point drift on repeating decimals', () => {
        // 0.1 + 0.2 style drift would show up here without decimal.js.
        const result = totalReturn(
            [{ symbol: 'A', marketValue: 0.3, totalCost: 0.1 }],
            [{ security_symbol: 'A', gross_dividend_amount: 0.2, net_dividend_amount: 0.2, payment_date: new Date() }],
        );
        expect(result.totalGain).toBe(0.4);
    });
});
