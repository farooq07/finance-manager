import currency from 'currency.js';

/**
 * Safe math wrapper using currency.js — eliminates floating point errors.
 * Usage: money(100.10).add(200.20).value → 300.30 (not 300.30000000000004)
 */
export const money = (value) => currency(value, { precision: 2 });

/**
 * Format a number as PKR currency string.
 * fmtPKR(1234567.89) → "PKR 1,234,568"
 */
export const fmtPKR = (value) => {
    const num = Number(value) || 0;
    return `PKR ${num.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
};

/**
 * Format a number as PKR with decimals.
 * fmtPKRDecimal(1234.5) → "PKR 1,234.50"
 */
export const fmtPKRDecimal = (value, decimals = 2) => {
    const num = Number(value) || 0;
    return `PKR ${num.toLocaleString('en-PK', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
};

/**
 * Format a raw number with commas.
 * fmtNumber(1234567.89, 0) → "1,234,568"
 */
export const fmtNumber = (value, decimals = 0) => {
    const num = Number(value) || 0;
    return num.toLocaleString('en-PK', { maximumFractionDigits: decimals });
};

/**
 * Calculate percentage change between two values.
 * Returns string with up to 2 decimal places.
 * pctChange(110, 100) → "10.00"
 * pctChange(90, 100) → "-10.00"
 * Handles zero division gracefully.
 */
export const pctChange = (current, previous) => {
    const curr = Number(current) || 0;
    const prev = Number(previous) || 0;
    if (prev === 0) return '0.00';
    return (((curr - prev) / Math.abs(prev)) * 100).toFixed(2);
};

/**
 * Safe addition of multiple financial values.
 * safeSum([100.1, 200.2, 300.3]) → 600.60
 */
export const safeSum = (values) => {
    return values.reduce((acc, val) => money(acc).add(val).value, 0);
};

/**
 * Get gain/loss color class name.
 * glColor(100) → "text-emerald-600"
 * glColor(-50) → "text-red-500"
 */
export const glColor = (value) => {
    return Number(value) >= 0 ? 'text-emerald-600' : 'text-red-500';
};

/**
 * Format gain/loss with sign prefix.
 * fmtGL(5000) → "+5,000"
 * fmtGL(-3000) → "-3,000"
 */
export const fmtGL = (value) => {
    const num = Number(value) || 0;
    const prefix = num >= 0 ? '+' : '';
    return `${prefix}${num.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
};
