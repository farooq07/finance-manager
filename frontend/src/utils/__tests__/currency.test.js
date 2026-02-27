import { describe, it, expect } from 'vitest';
import { money, fmtPKR, fmtPKRDecimal, fmtNumber, pctChange, safeSum, glColor, fmtGL } from '../currency';

describe('money (safe math)', () => {
    it('handles 0.1 + 0.2 correctly', () => {
        expect(money(0.1).add(0.2).value).toBe(0.3);
    });

    it('handles large financial sum', () => {
        expect(money(1234567.89).add(9876543.21).value).toBe(11111111.10);
    });

    it('handles subtraction', () => {
        expect(money(100).subtract(33.33).value).toBe(66.67);
    });

    it('handles multiplication', () => {
        expect(money(19.99).multiply(3).value).toBe(59.97);
    });
});

describe('fmtPKR', () => {
    it('formats positive values', () => {
        expect(fmtPKR(1234567)).toBe('PKR 1,234,567');
    });

    it('formats zero', () => {
        expect(fmtPKR(0)).toBe('PKR 0');
    });

    it('handles string input', () => {
        expect(fmtPKR('50000')).toBe('PKR 50,000');
    });

    it('handles null/undefined gracefully', () => {
        expect(fmtPKR(null)).toBe('PKR 0');
        expect(fmtPKR(undefined)).toBe('PKR 0');
    });
});

describe('fmtPKRDecimal', () => {
    it('formats with 2 decimals by default', () => {
        expect(fmtPKRDecimal(1234.5)).toBe('PKR 1,234.50');
    });
});

describe('fmtNumber', () => {
    it('formats with comma separator', () => {
        expect(fmtNumber(1234567, 0)).toBe('1,234,567');
    });
});

describe('pctChange', () => {
    it('calculates positive change', () => {
        expect(pctChange(110, 100)).toBe('10.00');
    });

    it('calculates negative change', () => {
        expect(pctChange(90, 100)).toBe('-10.00');
    });

    it('handles zero previous value', () => {
        expect(pctChange(100, 0)).toBe('0.00');
    });

    it('handles equal values', () => {
        expect(pctChange(100, 100)).toBe('0.00');
    });
});

describe('safeSum', () => {
    it('sums array of financial values safely', () => {
        expect(safeSum([100.10, 200.20, 300.30])).toBe(600.60);
    });

    it('handles empty array', () => {
        expect(safeSum([])).toBe(0);
    });
});

describe('glColor', () => {
    it('returns green for positive', () => {
        expect(glColor(100)).toBe('text-emerald-600');
    });

    it('returns red for negative', () => {
        expect(glColor(-50)).toBe('text-red-500');
    });

    it('returns green for zero', () => {
        expect(glColor(0)).toBe('text-emerald-600');
    });
});

describe('fmtGL', () => {
    it('formats positive gain with + prefix', () => {
        expect(fmtGL(5000)).toBe('+5,000');
    });

    it('formats negative loss with - prefix', () => {
        expect(fmtGL(-3000)).toBe('-3,000');
    });

    it('formats zero as +0', () => {
        expect(fmtGL(0)).toBe('+0');
    });
});
