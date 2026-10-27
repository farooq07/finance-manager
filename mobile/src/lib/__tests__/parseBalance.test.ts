import { parseBalance } from '../parseBalance';

// Same rules as web onboarding (frontend/src/components/onboarding/AccountRows.jsx).
describe('parseBalance', () => {
    it.each([
        ['1,50,000', 150000],
        ['100 000', 100000],
        ['0', 0],
        ['2500.75', 2500.75],
    ])('%s → %p', (text, value) => {
        expect(parseBalance(text)).toEqual({ value, error: null });
    });

    it('empty is neither a value nor an error', () => {
        expect(parseBalance('')).toEqual({ value: null, error: null });
        expect(parseBalance('  ')).toEqual({ value: null, error: null });
    });

    it('negative amounts are rejected', () => {
        expect(parseBalance('-5')).toEqual({ value: null, error: "Balance can't be negative" });
    });

    it('non-numbers are rejected', () => {
        expect(parseBalance('abc')).toEqual({ value: null, error: 'Enter an amount like 100000' });
    });
});
