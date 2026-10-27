// Categories the app offers when you approve a transaction or add an expense
// (the same names the web app and the categoriser use).
export const SPEND_CATEGORIES = [
    'Food & Dining', 'Groceries', 'Utilities', 'Transportation', 'Shopping', 'Entertainment',
    'Education', 'Healthcare', 'Travel', 'Subscription', 'Insurance', 'Bank Charges', 'Bills', 'Other',
] as const;

export const ALL_CATEGORIES = [
    ...SPEND_CATEGORIES, 'Salary', 'Profit/Dividend', 'Transfer', 'Self Transfer',
    'ATM Withdrawal', 'Investment', 'Loan Repayment', 'Refund',
] as const;
