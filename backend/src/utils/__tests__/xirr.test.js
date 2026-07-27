import { jest } from '@jest/globals';
import { xirr, buildPortfolioCashflows } from '../xirr.js';

describe('xirr', () => {
    it('solves a known one-year 10% return', () => {
        const rate = xirr([
            { amount: -1000, date: new Date('2025-01-01') },
            { amount: 1100, date: new Date('2026-01-01') },
        ]);
        expect(rate).toBeCloseTo(0.1, 4);
    });

    it('solves a known multi-flow series', () => {
        // Two deposits, one terminal value. Verified against the NPV being ~0.
        const flows = [
            { amount: -1000, date: new Date('2025-01-01') },
            { amount: -500, date: new Date('2025-07-01') },
            { amount: 1700, date: new Date('2026-01-01') },
        ];
        const rate = xirr(flows);
        expect(rate).not.toBeNull();

        // Independently confirm it is a root: NPV at that rate must be ~0.
        const start = flows[0].date;
        const npv = flows.reduce((sum, f) => {
            const years = (f.date - start) / (1000 * 60 * 60 * 24 * 365);
            return sum + f.amount / (1 + rate) ** years;
        }, 0);
        expect(Math.abs(npv)).toBeLessThan(1e-4);
    });

    it('handles a loss (negative rate)', () => {
        const rate = xirr([
            { amount: -1000, date: new Date('2025-01-01') },
            { amount: 800, date: new Date('2026-01-01') },
        ]);
        expect(rate).toBeCloseTo(-0.2, 4);
    });

    it('returns null when all flows are negative', () => {
        expect(xirr([
            { amount: -100, date: new Date('2025-01-01') },
            { amount: -200, date: new Date('2025-06-01') },
        ])).toBeNull();
    });

    it('returns null when all flows are positive', () => {
        expect(xirr([
            { amount: 100, date: new Date('2025-01-01') },
            { amount: 200, date: new Date('2025-06-01') },
        ])).toBeNull();
    });

    it('returns null for fewer than two flows', () => {
        expect(xirr([{ amount: -100, date: new Date('2025-01-01') }])).toBeNull();
        expect(xirr([])).toBeNull();
        expect(xirr(null)).toBeNull();
    });

    it('ignores malformed flows rather than throwing', () => {
        const rate = xirr([
            { amount: -1000, date: new Date('2025-01-01') },
            { amount: NaN, date: new Date('2025-06-01') },
            { amount: 500, date: new Date('not a date') },
            { amount: 1100, date: new Date('2026-01-01') },
        ]);
        expect(rate).toBeCloseTo(0.1, 4);
    });

    it('accepts Decimal-like string amounts', () => {
        const rate = xirr([
            { amount: '-1000.00', date: new Date('2025-01-01') },
            { amount: '1100.00', date: new Date('2026-01-01') },
        ]);
        expect(rate).toBeCloseTo(0.1, 4);
    });
});

describe('buildPortfolioCashflows', () => {
    const asOf = new Date('2026-01-01');

    it('inverts deposits into negative flows and keeps dividends positive', () => {
        const flows = buildPortfolioCashflows(
            [{ transaction_date: new Date('2025-01-01'), amount: 1000 }],
            [{ payment_date: new Date('2025-06-01'), net_dividend_amount: 50 }],
            1200,
            asOf,
        );

        expect(flows).toHaveLength(3);
        expect(flows[0].amount).toBe(-1000); // deposit = money out
        expect(flows[1].amount).toBe(50);    // dividend = money in
        expect(flows[2].amount).toBe(1200);  // terminal value
    });

    it('treats a withdrawal (negative investment) as an inflow', () => {
        const flows = buildPortfolioCashflows(
            [
                { transaction_date: new Date('2025-01-01'), amount: 1000 },
                { transaction_date: new Date('2025-09-01'), amount: -300 },
            ],
            [],
            800,
            asOf,
        );
        expect(flows[0].amount).toBe(-1000);
        expect(flows[1].amount).toBe(300);
    });

    it('omits a zero terminal value', () => {
        const flows = buildPortfolioCashflows(
            [{ transaction_date: new Date('2025-01-01'), amount: 1000 }],
            [],
            0,
            asOf,
        );
        expect(flows).toHaveLength(1);
    });

    it('skips dividends with no payment date', () => {
        const flows = buildPortfolioCashflows(
            [{ transaction_date: new Date('2025-01-01'), amount: 1000 }],
            [{ payment_date: null, net_dividend_amount: 99 }],
            1000,
            asOf,
        );
        expect(flows.some(f => f.amount === 99)).toBe(false);
    });

    it('produces a series xirr can actually solve', () => {
        const flows = buildPortfolioCashflows(
            [{ transaction_date: new Date('2025-01-01'), amount: 1000 }],
            [{ payment_date: new Date('2025-06-01'), net_dividend_amount: 50 }],
            1100,
            asOf,
        );
        const rate = xirr(flows);
        expect(rate).not.toBeNull();
        expect(rate).toBeGreaterThan(0);
    });
});
