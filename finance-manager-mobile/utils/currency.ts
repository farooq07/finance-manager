import currency from 'currency.js';

export const money = (value: number | string) =>
  currency(value, { precision: 2 });

export const fmtPKR = (value: number | string): string => {
  const num = parseFloat(String(value));
  if (isNaN(num)) return 'PKR 0';
  return 'PKR ' + Math.round(num).toLocaleString('en-PK');
};

export const fmtPKRDecimal = (value: number | string, decimals = 2): string => {
  const num = parseFloat(String(value));
  if (isNaN(num)) return 'PKR 0.00';
  return 'PKR ' + num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export const pctChange = (current: number, previous: number): number => {
  if (previous === 0) return 0;
  return ((current - previous) / Math.abs(previous)) * 100;
};

export const safeSum = (values: (number | string)[]): number =>
  values.reduce((acc: number, v) => money(acc).add(v).value, 0);

export const glColor = (value: number | string): string => {
  const n = parseFloat(String(value));
  return n >= 0 ? '#10B981' : '#EF4444';
};

export const fmtGL = (value: number | string): string => {
  const n = parseFloat(String(value));
  const sign = n >= 0 ? '+' : '';
  return sign + fmtPKR(n);
};
