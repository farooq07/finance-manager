import { karachiYmd, karachiDateKey, karachiWeekday, isPsxTradingDay, PSX_HOLIDAYS } from '../dates.js';

describe('Karachi date keying', () => {
    it('uses the Karachi calendar date, not the server date', () => {
        // 20:00 UTC on 25 Jul is already 01:00 on 26 Jul in Karachi (UTC+5).
        // A server in UTC would key this to the 25th, which is the bug.
        const instant = new Date('2026-07-25T20:00:00.000Z');
        expect(karachiYmd(instant)).toBe('2026-07-26');
    });

    it('stays on the previous day just before the Karachi rollover', () => {
        const instant = new Date('2026-07-25T18:59:00.000Z'); // 23:59 PKT on the 25th
        expect(karachiYmd(instant)).toBe('2026-07-25');
    });

    it('returns UTC midnight of the Karachi date', () => {
        const key = karachiDateKey(new Date('2026-07-25T20:00:00.000Z'));
        expect(key.toISOString()).toBe('2026-07-26T00:00:00.000Z');
    });

    it('produces a stable key for two instants on the same Karachi day', () => {
        const a = karachiDateKey(new Date('2026-07-26T04:00:00.000Z')); // 09:00 PKT
        const b = karachiDateKey(new Date('2026-07-26T12:00:00.000Z')); // 17:00 PKT
        expect(a.getTime()).toBe(b.getTime());
    });
});

describe('karachiWeekday', () => {
    it('maps Sunday to 0 and Saturday to 6', () => {
        expect(karachiWeekday(new Date('2026-07-26T06:00:00.000Z'))).toBe(0); // Sunday
        expect(karachiWeekday(new Date('2026-07-25T06:00:00.000Z'))).toBe(6); // Saturday
        expect(karachiWeekday(new Date('2026-07-27T06:00:00.000Z'))).toBe(1); // Monday
    });

    it('uses the Karachi day, not the UTC day', () => {
        // Saturday 20:00 UTC is Sunday in Karachi.
        expect(karachiWeekday(new Date('2026-07-25T20:00:00.000Z'))).toBe(0);
    });
});

describe('isPsxTradingDay', () => {
    it('is false at the weekend', () => {
        expect(isPsxTradingDay(new Date('2026-07-25T06:00:00.000Z'))).toBe(false); // Sat
        expect(isPsxTradingDay(new Date('2026-07-26T06:00:00.000Z'))).toBe(false); // Sun
    });

    it('is true on an ordinary weekday', () => {
        expect(isPsxTradingDay(new Date('2026-07-27T06:00:00.000Z'))).toBe(true); // Mon
    });

    it('is false on a listed market holiday', () => {
        // 14 Aug 2026 (Independence Day) is a Friday — a weekday that is closed.
        expect(karachiWeekday(new Date('2026-08-14T06:00:00.000Z'))).toBe(5);
        expect(PSX_HOLIDAYS.has('2026-08-14')).toBe(true);
        expect(isPsxTradingDay(new Date('2026-08-14T06:00:00.000Z'))).toBe(false);
    });
});
