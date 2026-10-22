import { fmtDateLong } from '../dates';

// Same as frontend/src/utils/__tests__/dates.test.js.
describe('fmtDateLong', () => {
    it('formats ISO strings as "27 February 2026"', () => {
        expect(fmtDateLong('2026-02-27T10:00:00Z')).toBe('27 February 2026');
    });

    it('accepts Date objects', () => {
        expect(fmtDateLong(new Date(2026, 2, 2))).toBe('2 March 2026');
    });

    it('shows a dash for empty values', () => {
        expect(fmtDateLong(null)).toBe('—');
        expect(fmtDateLong('')).toBe('—');
    });
});
