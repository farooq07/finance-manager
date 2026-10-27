import { z } from 'zod';

// ========== Auth Schemas ==========

export const loginSchema = z.object({
    email: z.string().min(1, 'Email or Username is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

// New passwords: at least 8 characters (the server enforces the same rule).
export const registerSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

// ========== Expense Schemas ==========

export const expenseSchema = z.object({
    amount: z.coerce.number().positive('Amount must be greater than 0'),
    category: z.string().min(1, 'Category is required'),
    expense_date: z.string().min(1, 'Date is required'),
    payment_method: z.string().optional(),
    notes: z.string().optional(),
});

// ========== Mutual Fund Schemas ==========

export const mutualFundSchema = z.object({
    fund_name: z.string().min(1, 'Fund name is required'),
    fund_symbol: z.string().min(1, 'Symbol is required').max(20, 'Symbol too long'),
    units: z.coerce.number().min(0, 'Units cannot be negative'),
    current_nav: z.coerce.number().positive('NAV must be greater than 0'),
    invested_amount: z.coerce.number().positive('Invested amount must be greater than 0'),
});

// ========== Rent Entry Schemas ==========

export const rentEntrySchema = z.object({
    month: z.string().min(1, 'Month is required'),
    year: z.coerce.number().int().min(2000).max(2100),
    payer_name: z.string().min(1, 'Payer name is required'),
    amount: z.coerce.number().positive('Amount must be greater than 0'),
    payment_date: z.string().min(1, 'Payment date is required'),
    account_source: z.string().min(1, 'Account source is required'),
    notes: z.string().optional(),
});

// ========== Dues Transaction Schemas ==========

export const duesTransactionSchema = z.object({
    amount: z.coerce.number().positive('Amount must be greater than 0'),
    transaction_type: z.enum(['receivable', 'payable'], { message: 'Must be receivable or payable' }),
    transaction_date: z.string().min(1, 'Date is required'),
    description: z.string().optional(),
});

// ========== Stock Schemas ==========

export const stockTransactionSchema = z.object({
    stock_symbol: z.string().min(1, 'Stock symbol is required').max(20),
    buy_date: z.string().min(1, 'Buy date is required'),
    buy_price: z.coerce.number().positive('Buy price must be greater than 0'),
    quantity: z.coerce.number().int().positive('Quantity must be at least 1'),
    brokerage_fee: z.coerce.number().min(0).optional(),
});

export const psxStockSchema = z.object({
    ticker: z.string().min(1),
    companyName: z.string().min(1),
    price: z.number().nonnegative(),
    change: z.number(),
    changePct: z.number(),
    volume: z.string().or(z.number()),
    high: z.number(),
    low: z.number(),
});

// ========== Helper: Extract Zod errors into a flat object ==========

export const getFormErrors = (result) => {
    if (result.success) return {};
    const errors = {};
    for (const issue of result.error.issues) {
        const key = issue.path.join('.');
        if (!errors[key]) errors[key] = issue.message;
    }
    return errors;
};
