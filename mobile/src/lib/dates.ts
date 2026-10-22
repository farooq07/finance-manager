import { format, parseISO } from 'date-fns';

/** "27 February 2026" — same as the web's fmtDateLong; "—" when empty. */
export function fmtDateLong(d: string | number | Date | null | undefined): string {
    if (!d) return '—';
    const date = typeof d === 'string' ? parseISO(d) : new Date(d);
    return format(date, 'd MMMM yyyy');
}
