import { z } from 'zod';

/**
 * Express middleware factory for Zod validation.
 * Usage: router.post('/expenses', validate(expenseSchema), createExpense)
 * 
 * Validates req.body against the provided schema.
 * Returns 400 with detailed error messages if validation fails.
 */
const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
        const errors = result.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
        }));

        console.error("Zod Validation Failed:", errors);

        return res.status(400).json({
            message: 'Validation failed',
            errors
        });
    }

    // Replace req.body with parsed/coerced data
    req.body = result.data;
    next();
};

// ========== Backend Schemas ==========

export const expenseSchema = z.object({
    amount: z.coerce.number().positive('Amount must be greater than 0'),
    category: z.string().min(1, 'Category is required'),
    expense_date: z.string().min(1, 'Date is required'),
    payment_method: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
});

export const expenseBatchSchema = z.array(expenseSchema).min(1, "At least one expense is required required.");

export const mutualFundSchema = z.object({
    fund_name: z.string().min(1, 'Fund name is required'),
    fund_symbol: z.string().min(1, 'Symbol is required'),
    units: z.coerce.number().min(0, 'Units cannot be negative'),
    current_nav: z.coerce.number().positive('NAV must be > 0'),
    invested_amount: z.coerce.number().positive('Invested amount must be > 0'),
});

export const rentEntrySchema = z.object({
    month: z.string().min(1, 'Month is required'),
    year: z.coerce.number().int().min(2000).max(2100),
    payer_name: z.string().min(1, 'Payer name is required'),
    amount: z.coerce.number().positive('Amount must be > 0'),
    payment_date: z.string().min(1, 'Payment date is required'),
    account_source: z.string().min(1, 'Account source is required'),
    notes: z.string().optional().nullable(),
});

export const duesTransactionSchema = z.object({
    amount: z.coerce.number().positive('Amount must be > 0'),
    transaction_type: z.enum(['receivable', 'payable']),
    transaction_date: z.string().min(1, 'Date is required'),
    description: z.string().optional().nullable(),
});

export const bulkDeleteSchema = z.object({
    ids: z.array(z.string().uuid()).min(1, 'At least one ID is required'),
});

export const psxSnapshotSchema = z.object({
    snapshot_date: z.string().min(1, 'Date is required'),
    total_custody: z.coerce.number().min(0, 'Custody cannot be negative'),
    holdings_data: z.array(
        z.object({
            symbol: z.string().min(1),
            holding: z.coerce.number(),
            market_rate: z.coerce.number(),
            custody_val: z.coerce.number()
        })
    )
});

export const bankInvestmentSchema = z.object({
    transaction_date: z.string().min(1, 'Date is required'),
    amount: z.coerce.number().refine(val => val !== 0, {
        message: 'Amount cannot be zero'
    }),
    description: z.string().optional().nullable()
});

export const walletSchema = z.object({
    name: z.string().min(1, 'Wallet name is required'),
    institution: z.string().min(1, 'Institution is required'),
    balance: z.coerce.number().min(0, 'Balance cannot be negative'),
    color_theme: z.string().optional(),
    account_num: z.string().optional().nullable()
});

export const bankSchema = z.object({
    name: z.string().min(1, 'Bank name is required'),
    account_no: z.string().min(1, 'Account number is required'),
    iban_no: z.string().min(1, 'IBAN number is required'),
    starting_balance: z.coerce.number().min(0, 'Starting balance cannot be negative'),
});

export default validate;
