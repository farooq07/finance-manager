import { describe, it, expect } from 'vitest';
import { fmtDate, fmtDateLong, fmtMonth, fmtDateSlash, todayLong } from '../dates';

describe('fmtDate', () => {
    it('formats ISO string', () => {
        expect(fmtDate('2026-02-27T10:00:00Z')).toBe('27 Feb 2026');
    });

    it('formats Date object', () => {
        expect(fmtDate(new Date(2026, 1, 27))).toBe('27 Feb 2026');
    });

    it('returns dash for null', () => {
        expect(fmtDate(null)).toBe('—');
    });
});

describe('fmtDateLong', () => {
    it('formats with full month name', () => {
        expect(fmtDateLong('2026-02-27T10:00:00Z')).toBe('27 February 2026');
    });
});

describe('fmtMonth', () => {
    it('formats month and year', () => {
        expect(fmtMonth('2026-02-27')).toBe('February 2026');
    });
});

describe('fmtDateSlash', () => {
    it('formats with slashes', () => {
        expect(fmtDateSlash('2026-02-27')).toBe('27/02/2026');
    });
});

describe('todayLong', () => {
    it('returns a non-empty string', () => {
        expect(todayLong().length).toBeGreaterThan(5);
    });
});
