export type ParsedBalance = { value: number | null; error: string | null };

/**
 * Read a typed balance. Pakistani users write "1,50,000" or "100 000", so
 * commas and spaces are ignored. Empty → no value and no error (untouched).
 */
export function parseBalance(text: string): ParsedBalance {
    const cleaned = text.replace(/[,\s]/g, '');
    if (cleaned === '') return { value: null, error: null };
    const value = Number(cleaned);
    if (!Number.isFinite(value)) return { value: null, error: 'Enter an amount like 100000' };
    if (value < 0) return { value: null, error: "Balance can't be negative" };
    return { value, error: null };
}
