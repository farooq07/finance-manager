/**
 * Date helpers keyed to Pakistan Standard Time.
 *
 * Everything user-facing in this app happens in Asia/Karachi, but the server
 * may run anywhere (Railway is UTC). Deriving "today" from the server clock
 * therefore rolls the day over at the wrong moment and produces duplicate or
 * missing daily rows. These helpers compute the calendar date *as seen in
 * Karachi* and store it as UTC midnight, giving a stable per-day key.
 *
 * This pattern originated in goldScraper.service.js; it lives here now so the
 * PSX price history uses exactly the same convention.
 */

const KARACHI = 'Asia/Karachi';

/**
 * The Karachi calendar date for a given instant, as "YYYY-MM-DD".
 */
export function karachiYmd(at = new Date()) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: KARACHI,
        year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(at);
}

/**
 * The Karachi calendar date for a given instant, as a Date at UTC midnight.
 * Use this as the primary key of any daily row.
 */
export function karachiDateKey(at = new Date()) {
    return new Date(`${karachiYmd(at)}T00:00:00.000Z`);
}

/**
 * Day of week in Karachi. 0 = Sunday … 6 = Saturday.
 */
export function karachiWeekday(at = new Date()) {
    // 'en-US' short weekday is stable regardless of the host locale.
    const name = new Intl.DateTimeFormat('en-US', {
        timeZone: KARACHI, weekday: 'short',
    }).format(at);
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(name);
}

/**
 * PSX market holidays, as Karachi "YYYY-MM-DD" strings.
 *
 * MAINTENANCE: this list needs extending every year — PSX publishes its
 * calendar each December, and Islamic-calendar holidays shift annually. When
 * the list runs out the only consequence is that the sync runs on a closed
 * day and stores a stale close, so it degrades quietly rather than breaking.
 * Replacing this with a scraped calendar is tracked as Phase 2 work.
 */
export const PSX_HOLIDAYS = new Set([
    // 2026
    '2026-02-05', // Kashmir Day
    '2026-03-23', // Pakistan Day
    '2026-05-01', // Labour Day
    '2026-08-14', // Independence Day
    '2026-11-09', // Iqbal Day
    '2026-12-25', // Quaid-e-Azam Day
]);

/**
 * Is the Karachi date at `at` a PSX trading day?
 * False on weekends and on any date in PSX_HOLIDAYS.
 */
export function isPsxTradingDay(at = new Date()) {
    const dow = karachiWeekday(at);
    if (dow === 0 || dow === 6) return false;      // Sun / Sat
    return !PSX_HOLIDAYS.has(karachiYmd(at));
}
