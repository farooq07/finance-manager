import { describe, it, expect } from 'vitest';
import {
    loginSchema,
    registerSchema,
    expenseSchema,
    mutualFundSchema,
    rentEntrySchema,
    duesTransactionSchema,
    stockTransactionSchema,
    getFormErrors,
} from '../schemas';

describe('loginSchema', () => {
    it('accepts valid credentials', () => {
        const result = loginSchema.safeParse({ email: 'test@example.com', password: '123456' });
        expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
        const result = loginSchema.safeParse({ email: 'not-an-email', password: '123456' });
        expect(result.success).toBe(false);
    });

    it('rejects short password', () => {
        const result = loginSchema.safeParse({ email: 'test@example.com', password: '12345' });
        expect(result.success).toBe(false);
    });
});

describe('expenseSchema', () => {
    it('accepts valid expense', () => {
        const result = expenseSchema.safeParse({
            amount: 500,
            category: 'Food',
            expense_date: '2026-02-27',
        });
        expect(result.success).toBe(true);
    });

    it('rejects zero amount', () => {
        const result = expenseSchema.safeParse({
            amount: 0,
            category: 'Food',
            expense_date: '2026-02-27',
        });
        expect(result.success).toBe(false);
    });

    it('rejects negative amount', () => {
        const result = expenseSchema.safeParse({
            amount: -100,
            category: 'Food',
            expense_date: '2026-02-27',
        });
        expect(result.success).toBe(false);
    });

    it('coerces string amount to number', () => {
        const result = expenseSchema.safeParse({
            amount: '250',
            category: 'Transport',
            expense_date: '2026-02-27',
        });
        expect(result.success).toBe(true);
        expect(result.data.amount).toBe(250);
    });
});

describe('mutualFundSchema', () => {
    it('accepts valid fund entry', () => {
        const result = mutualFundSchema.safeParse({
            fund_name: 'Meezan Sovereign Fund',
            fund_symbol: 'MSF',
            units: 1500,
            current_nav: 55.18,
            invested_amount: 100000,
        });
        expect(result.success).toBe(true);
    });

    it('rejects negative units', () => {
        const result = mutualFundSchema.safeParse({
            fund_name: 'MSF',
            fund_symbol: 'MSF',
            units: -10,
            current_nav: 55.18,
            invested_amount: 100000,
        });
        expect(result.success).toBe(false);
    });

    it('allows zero units (e.g. dormant fund)', () => {
        const result = mutualFundSchema.safeParse({
            fund_name: 'MSF',
            fund_symbol: 'MSF',
            units: 0,
            current_nav: 55.18,
            invested_amount: 100000,
        });
        expect(result.success).toBe(true);
    });
});

describe('rentEntrySchema', () => {
    it('accepts valid rent entry', () => {
        const result = rentEntrySchema.safeParse({
            month: 'February',
            year: 2026,
            payer_name: 'Usman Shad',
            amount: 25000,
            payment_date: '2026-02-27',
            account_source: 'Easy Paisa',
        });
        expect(result.success).toBe(true);
    });

    it('rejects missing payer name', () => {
        const result = rentEntrySchema.safeParse({
            month: 'February',
            year: 2026,
            payer_name: '',
            amount: 25000,
            payment_date: '2026-02-27',
            account_source: 'Cash',
        });
        expect(result.success).toBe(false);
    });
});

describe('duesTransactionSchema', () => {
    it('accepts valid transaction', () => {
        const result = duesTransactionSchema.safeParse({
            amount: 5000,
            transaction_type: 'receivable',
            transaction_date: '2026-02-27',
        });
        expect(result.success).toBe(true);
    });

    it('rejects invalid transaction_type', () => {
        const result = duesTransactionSchema.safeParse({
            amount: 5000,
            transaction_type: 'gift',
            transaction_date: '2026-02-27',
        });
        expect(result.success).toBe(false);
    });
});

describe('getFormErrors', () => {
    it('returns empty object for valid data', () => {
        const result = loginSchema.safeParse({ email: 'test@test.com', password: '123456' });
        expect(getFormErrors(result)).toEqual({});
    });

    it('returns error map for invalid data', () => {
        const result = loginSchema.safeParse({ email: 'bad', password: '12' });
        const errors = getFormErrors(result);
        expect(errors.email).toBeDefined();
        expect(errors.password).toBeDefined();
    });
});
