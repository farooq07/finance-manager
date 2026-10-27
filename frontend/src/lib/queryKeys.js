// Cache keys shared by several screens. Use these instead of string literals
// so a change made on one screen refreshes the same figures everywhere.
export const qk = {
    dashboardSummary: ['dashboard-summary'],
    insights: ['insights'],
    spending: ['spending'],
    expenses: ['expenses'],
    banks: ['banks'],
    wallets: ['wallets'],
    zakat: ['zakat'],
};

/**
 * Refresh everything that shows balances or totals. Call after any change
 * that moves money: approvals, imports, deletes, balance edits, expenses.
 */
export function invalidateMoney(queryClient) {
    for (const queryKey of [qk.dashboardSummary, qk.insights, qk.spending, qk.expenses, qk.banks, qk.wallets, qk.zakat]) {
        queryClient.invalidateQueries({ queryKey });
    }
}
