/**
 * Next due date for a recurring payment.
 *
 * Month-end rule: a payment keeps its intended day of the month (`anchorDay`,
 * 1–31). When a month is shorter, it falls on that month's last day — and
 * returns to the intended day as soon as a month allows it. So the 31st runs
 * Jan 31 → Feb 28 (29 in a leap year) → Mar 31 → Apr 30, never skipping a
 * month. Yearly payments on Feb 29 fall on Feb 28 in non-leap years.
 *
 * Dates are calendar dates (stored as @db.Date), handled in UTC.
 */

const daysInMonth = (year, monthIndex) => new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

export function addMonthsClamped(date, months, anchorDay) {
    const d = new Date(date);
    const day = anchorDay ?? d.getUTCDate();
    const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
    const y = target.getUTCFullYear();
    const m = target.getUTCMonth();
    return new Date(Date.UTC(y, m, Math.min(day, daysInMonth(y, m))));
}

export function nextDueDate(date, frequency, anchorDay) {
    const d = new Date(date);
    if (frequency === 'weekly') return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 7));
    if (frequency === 'monthly') return addMonthsClamped(d, 1, anchorDay);
    if (frequency === 'yearly') return addMonthsClamped(d, 12, anchorDay);
    throw new Error(`Unknown frequency: ${frequency}`);
}

/** The intended day of month for a schedule starting on `date`. */
export const anchorDayOf = (date) => new Date(date).getUTCDate();
