import { format, parseISO } from 'date-fns';

/**
 * Format a date as "27 Feb 2026"
 */
export const fmtDate = (d) => {
    if (!d) return '—';
    const date = typeof d === 'string' ? parseISO(d) : new Date(d);
    return format(date, 'd MMM yyyy');
};

/**
 * Format a date as "27 February 2026"
 */
export const fmtDateLong = (d) => {
    if (!d) return '—';
    const date = typeof d === 'string' ? parseISO(d) : new Date(d);
    return format(date, 'd MMMM yyyy');
};

/**
 * Format a date as "February 2026"
 */
export const fmtMonth = (d) => {
    if (!d) return '—';
    const date = typeof d === 'string' ? parseISO(d) : new Date(d);
    return format(date, 'MMMM yyyy');
};

/**
 * Format a date as "27/02/2026"
 */
export const fmtDateSlash = (d) => {
    if (!d) return '—';
    const date = typeof d === 'string' ? parseISO(d) : new Date(d);
    return format(date, 'dd/MM/yyyy');
};

/**
 * Get today formatted as "27 February 2026"
 */
export const todayLong = () => fmtDateLong(new Date());
