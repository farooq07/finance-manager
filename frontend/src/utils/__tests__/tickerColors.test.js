import { describe, it, expect } from 'vitest';
import { colorForTicker, colorsForSeries, TICKER_PALETTE, OTHER_COLOR } from '../tickerColors';

describe('colorForTicker', () => {
    it('is stable for the same ticker', () => {
        expect(colorForTicker('FFC')).toBe(colorForTicker('FFC'));
    });

    it('does not depend on position in a list', () => {
        // The actual bug: ECharts' index-based palette recoloured a holding
        // whenever the list length or order changed.
        const before = ['FFC', 'OGDC', 'HUBC'].map(colorForTicker);
        const after = ['HUBC', 'FFC'].map(colorForTicker);
        expect(after[1]).toBe(before[0]); // FFC keeps its colour
        expect(after[0]).toBe(before[2]); // HUBC keeps its colour
    });

    it('normalises case and whitespace', () => {
        expect(colorForTicker(' ffc ')).toBe(colorForTicker('FFC'));
    });

    it('always returns a colour from the palette', () => {
        for (const ticker of ['FFC', 'OGDC', 'HUBC', 'MEBL', 'LUCK', 'SYS', 'ZZZZ']) {
            expect(TICKER_PALETTE).toContain(colorForTicker(ticker));
        }
    });

    it('falls back to the neutral colour for an empty ticker', () => {
        expect(colorForTicker('')).toBe(OTHER_COLOR);
        expect(colorForTicker(null)).toBe(OTHER_COLOR);
    });

    it('spreads a realistic portfolio across several colours', () => {
        const tickers = ['FFC', 'FFL', 'HUBC', 'MEBL', 'OGDC', 'EFERT', 'LUCK', 'PPL'];
        const unique = new Set(tickers.map(colorForTicker));
        // Collisions are possible with any hash, but 8 tickers should not all
        // land on one or two colours.
        expect(unique.size).toBeGreaterThanOrEqual(5);
    });
});

describe('colorsForSeries', () => {
    it('aligns colours to series order', () => {
        const items = [{ name: 'FFC' }, { name: 'OGDC' }];
        expect(colorsForSeries(items)).toEqual([colorForTicker('FFC'), colorForTicker('OGDC')]);
    });

    it('gives the Other bucket the reserved neutral colour', () => {
        const colors = colorsForSeries([{ name: 'FFC' }, { name: 'Other' }]);
        expect(colors[1]).toBe(OTHER_COLOR);
    });
});
