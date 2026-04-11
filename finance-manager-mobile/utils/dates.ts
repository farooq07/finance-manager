import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';

export const formatDate = (date: string | Date, fmt = 'dd MMM yyyy'): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, fmt);
};

export const formatMonth = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMMM yyyy');
};

export const todayISO = (): string => format(new Date(), 'yyyy-MM-dd');

export const monthStart = (date?: Date): Date => startOfMonth(date ?? new Date());
export const monthEnd = (date?: Date): Date => endOfMonth(date ?? new Date());
