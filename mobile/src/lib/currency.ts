/**
 * Format an amount as whole rupees: fmtPKR(1234567.89) → "PKR 1,234,568".
 *
 * Matches the web's fmtPKR exactly. Digits are grouped here rather than with
 * toLocaleString('en-PK'): Android's Hermes engine can group that locale
 * differently from browsers, and amounts must look the same everywhere.
 */
export function fmtPKR(value: number | string | null | undefined): string {
    const num = Number(value) || 0;
    const rounded = Math.sign(num) * Math.round(Math.abs(num)); // half away from zero, like Intl
    const digits = String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `PKR ${rounded < 0 ? '-' : ''}${digits}`;
}
