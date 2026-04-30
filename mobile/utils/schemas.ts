import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const otpSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

export const pinSchema = z.object({
  pin: z.string().min(4, 'PIN must be at least 4 digits'),
});

export const expenseSchema = z.object({
  amount: z.number({ invalid_type_error: 'Amount is required' }).positive('Amount must be positive'),
  category: z.string().min(1, 'Category is required'),
  expense_date: z.string().min(1, 'Date is required'),
  payment_method: z.string().optional(),
  notes: z.string().optional(),
});

export const mutualFundSchema = z.object({
  fund_name: z.string().min(1, 'Fund name is required'),
  fund_symbol: z.string().min(1).max(20),
  units: z.number().min(0),
  current_nav: z.number().positive(),
  invested_amount: z.number().positive(),
});

export const rentSchema = z.object({
  month: z.string().min(1, 'Month is required'),
  year: z.number().int().min(2000).max(2100),
  payer_name: z.string().min(1, 'Payer name is required'),
  amount: z.number().positive(),
  payment_date: z.string().min(1, 'Date is required'),
  account_source: z.string().min(1, 'Account source is required'),
  notes: z.string().optional(),
});

export const duesPersonSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional().or(z.literal('')),
});

export const duesTransactionSchema = z.object({
  transaction_type: z.enum(['receivable', 'payable']),
  amount: z.number().positive(),
  transaction_date: z.string().optional(),
  description: z.string().optional(),
});

export const stockSchema = z.object({
  stock_symbol: z.string().min(1, 'Symbol is required'),
  company_name: z.string().optional(),
});

export const stockTransactionSchema = z.object({
  buy_date: z.string().min(1, 'Date is required'),
  buy_price: z.number().positive(),
  quantity: z.number().int().positive(),
  brokerage_fee: z.number().min(0).optional(),
});

export const bankSchema = z.object({
  name: z.string().min(1, 'Bank name is required'),
  account_no: z.string().min(1, 'Account number is required'),
  iban_no: z.string().min(1, 'IBAN is required'),
  starting_balance: z.number(),
});

export const walletSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  institution: z.string().min(1, 'Institution is required'),
  balance: z.number(),
  color_theme: z.string().optional(),
  account_num: z.string().optional(),
  currency: z.string().optional(),
  exchange_rate: z.number().optional(),
});

export const zakatSchema = z.object({
  amount: z.number().positive(),
  description: z.string().optional(),
  date: z.string().optional(),
});

export const assetSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
  value: z.number().min(0).optional(),
  purchase_date: z.string().optional(),
  description: z.string().optional(),
});

export const brokerSchema = z.object({
  account_title: z.string().min(1, 'Account title is required'),
  client_code: z.string().min(1, 'Client code is required'),
  participant_acc_no: z.string().optional(),
  cdc_sub_acc_no: z.string().optional(),
  stock_pin_code: z.string().optional(),
});
