import { nextDueDate, addMonthsClamped } from '../recurrence.js';

const d = (s) => new Date(`${s}T00:00:00Z`);
const iso = (x) => x.toISOString().slice(0, 10);

describe('nextDueDate', () => {
    it('Jan 31 monthly → Feb 28, not March 3', () => {
        expect(iso(nextDueDate(d('2026-01-31'), 'monthly', 31))).toBe('2026-02-28');
    });

    it('returns to the 31st as soon as a month has one', () => {
        let due = d('2026-01-31');
        const seen = [];
        for (let i = 0; i < 4; i++) { due = nextDueDate(due, 'monthly', 31); seen.push(iso(due)); }
        expect(seen).toEqual(['2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31']);
    });

    it('leap years give Feb 29', () => {
        expect(iso(nextDueDate(d('2028-01-30'), 'monthly', 30))).toBe('2028-02-29');
    });

    it('yearly Feb 29 → Feb 28 next year', () => {
        expect(iso(nextDueDate(d('2028-02-29'), 'yearly', 29))).toBe('2029-02-28');
    });

    it('weekly adds 7 days across a month end', () => {
        expect(iso(nextDueDate(d('2026-01-28'), 'weekly'))).toBe('2026-02-04');
    });

    it('without an anchor the current day is kept', () => {
        expect(iso(addMonthsClamped(d('2026-03-15'), 1))).toBe('2026-04-15');
    });
});
