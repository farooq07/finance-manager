import { parseNumber, isPlausiblePrice } from '../scraper.service.js';

describe('parseNumber', () => {
    it('parses ordinary values', () => {
        expect(parseNumber('123.45')).toBe(123.45);
        expect(parseNumber('1,234.50')).toBe(1234.5);
        expect(parseNumber('Rs. 980.00')).toBe(980);
        expect(parseNumber('-12.5')).toBe(-12.5);
    });

    it('returns null — not 0 — when there is nothing to parse', () => {
        // This is the whole point of the change. A 0 here used to be written
        // straight over a good stored price.
        expect(parseNumber('')).toBeNull();
        expect(parseNumber(null)).toBeNull();
        expect(parseNumber(undefined)).toBeNull();
        expect(parseNumber('N/A')).toBeNull();
        expect(parseNumber('--')).toBeNull();
        expect(parseNumber('no digits here')).toBeNull();
    });

    it('distinguishes a genuine zero from a failed parse', () => {
        expect(parseNumber('0')).toBe(0);
        expect(parseNumber('0.00')).toBe(0);
    });
});

describe('isPlausiblePrice', () => {
    it('accepts realistic PSX prices', () => {
        expect(isPlausiblePrice(12.5)).toBe(true);
        expect(isPlausiblePrice(980)).toBe(true);
        expect(isPlausiblePrice(25000)).toBe(true);
    });

    it('rejects readings that mean the page structure changed', () => {
        expect(isPlausiblePrice(0)).toBe(false);
        expect(isPlausiblePrice(-5)).toBe(false);
        expect(isPlausiblePrice(1e9)).toBe(false);
        expect(isPlausiblePrice(null)).toBe(false);
        expect(isPlausiblePrice(NaN)).toBe(false);
        expect(isPlausiblePrice('980')).toBe(false); // strings are not prices
    });
});
