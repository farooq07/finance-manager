import { api } from './client';
import { getVaultToken } from './vault';

// Money core: accounts, statements and their transactions, expenses, Zakat
// and the Gold Vault. Same endpoints as the web app.

export type AccountKind = 'bank' | 'wallet';
const base = (kind: AccountKind) => (kind === 'bank' ? 'banks' : 'wallets');

export type Statement = {
    id: string; month: string; year: number; upload_date: string;
    closing_balance: string | null; transaction_count: number; processing_status: string;
};
export type BankDetail = {
    id: string; name: string; current_balance: string; balance_as_of: string | null;
    balance_source: string | null; statements: Statement[];
};

export type TxLog = {
    id: string;
    transaction_date: string;
    description: string;
    debit_amount: string | null;
    credit_amount: string | null;
    net_amount: string;
    suggested_category: string | null;
    approved_category: string | null;
    category_confidence: string | null;
    processing_status: 'pending' | 'approved' | 'rejected' | 'unreconciled' | string;
    is_duplicate: boolean;
    duplicate_match: 'certain' | 'possible' | null;
    bank_statement_id?: string;
    wallet_statement_id?: string;
};

export const getBank = async (id: string) => (await api.get<BankDetail>(`/banks/${id}`)).data;
export const getTransactions = async (kind: AccountKind, id: string) =>
    (await api.get<TxLog[]>(`/${base(kind)}/${id}/transactions`)).data;
export const approveTransaction = async (kind: AccountKind, accountId: string, txId: string, approvedCategory: string) =>
    (await api.post<{ expenseId: string | null; alreadyApproved: boolean }>(`/${base(kind)}/${accountId}/transactions/${txId}/approve`, { approvedCategory })).data;
export const deleteTransaction = async (kind: AccountKind, accountId: string, txId: string) =>
    (await api.delete(`/${base(kind)}/${accountId}/transactions/${txId}`)).data;
export const deleteStatement = async (kind: AccountKind, accountId: string, statementId: string) =>
    (await api.delete(`/${base(kind)}/${accountId}/statements/${statementId}`)).data;
export const updateBalance = async (kind: AccountKind, id: string, balance: number) =>
    kind === 'bank'
        ? (await api.put(`/banks/${id}/balance`, { current_balance: balance })).data
        : (await api.put(`/wallets/${id}`, { balance })).data;

// Statement import: preview (upload) → commit -------------------------------

export type ParsedTx = {
    transaction_date: string; description: string;
    debit_amount: number | null; credit_amount: number | null; net_amount: number; balance?: number | null;
};
export type Reconciliation = { ok: boolean; hasBalances: boolean; message?: string };
export type Preview =
    | { type: 'csv'; uploadId: string; alreadyImported: boolean; headers: string[]; headerRowIndex: number; rowCount: number;
        autoMap: Record<string, number>; meta: { opening: number | null; closing: number | null } }
    | { type: 'pdf'; uploadId: string; alreadyImported: boolean; transactions: ParsedTx[];
        opening: number | null; closing: number | null; reconciliation: Reconciliation };

export type PickedFile = { uri: string; name: string; mimeType?: string | null };

export async function previewStatement(kind: AccountKind, accountId: string, file: PickedFile, password?: string) {
    const form = new FormData();
    // React Native's FormData takes { uri, name, type } for files.
    form.append('file', { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' } as unknown as Blob);
    if (password) form.append('password', password);
    return (await api.post<Preview>(`/${base(kind)}/${accountId}/statements/preview`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
    })).data;
}

export type CommitResult = {
    statementId: string;
    reconciliation?: Reconciliation;
    summary: { totalParsed: number; duplicates: number; possibleDuplicates?: number; unique: number };
};

export async function commitStatement(kind: AccountKind, accountId: string, body: Record<string, unknown>) {
    return (await api.post<CommitResult>(`/${base(kind)}/${accountId}/statements/commit`, body, { timeout: 120000 })).data;
}

// Expenses and spending -------------------------------------------------------

export type SpendingRow = {
    id: string; source: 'bank' | 'wallet' | 'manual'; sourceLabel: string; date: string; description: string;
    category: string; amount: number; kind: 'credit' | 'debit'; flow: string; status: string; possibleDuplicate?: boolean;
};
export type Insights = {
    totals: { currentSpend: number; currentIncome: number; net: number; spendDelta: number | null; cashWithdrawn?: number; transfers?: number };
    categoryBreakdown: { category: string; total: number }[];
};

export const addExpense = async (e: { amount: number; category: string; expense_date: string; notes?: string; payment_method?: string }) =>
    (await api.post('/expenses', e)).data;
export const getSpending = async (anchor?: string) =>
    (await api.get<{ rows: SpendingRow[] }>('/dashboard/spending', { params: { period: 'month', anchor } })).data;
export const getInsights = async (anchor?: string) =>
    (await api.get<Insights>('/dashboard/insights', { params: { period: 'month', anchor } })).data;

// Zakat -----------------------------------------------------------------------

export type ZakatSummary = {
    breakdown: { cash: number; investments: number; goldValue: number; receivables: number; payables: number; debts: number };
    netZakatable: number; nisabValue: number | null; isNisabMet: boolean | null; zakatDue: number;
    goldPriceDate: string | null;
    details?: {
        cash: { kind: string; name: string; value: number; asOf: string | null }[];
        debts: { name: string; deductible: number; rule: string }[];
    };
    assumptions?: string[];
};
export type ZakatEntry = { id: string; amount: string; description: string | null; date: string };

export const getZakatSummary = async () => (await api.get<ZakatSummary>('/zakat/summary')).data;
export const getZakatEntries = async () =>
    (await api.get<{ entries: ZakatEntry[]; currentYearTotal: number }>('/zakat')).data;
export const addZakatEntry = async (amount: number, description: string, date: string) =>
    (await api.post('/zakat', { amount, description, date })).data;

// Gold Vault ------------------------------------------------------------------

export type GoldItem = {
    id: string; name: string; type: string; weight_grams: string; carats: number;
    current_value_pkr: number; equivalent_24k_grams: number; purchase_date: string | null;
};
export type GoldItemsResponse = {
    items: GoldItem[];
    total_value_pkr: number;
    latest_price: { date: string; price_24k_per_gram: string } | null;
};

const vaultHeaders = () => {
    const token = getVaultToken();
    return token ? { 'X-Vault-Token': token } : {};
};
export const goldHasPin = async () => (await api.get<{ hasGoldPin: boolean }>('/gold/has-pin')).data;
export const goldSetPin = async (pin: string) =>
    (await api.post<{ vaultToken?: string; expiresIn?: number }>('/gold/set-pin', { pin })).data;
export const goldVerifyPin = async (pin: string) =>
    (await api.post<{ success: boolean; vaultToken?: string; expiresIn?: number; attemptsLeft?: number }>('/gold/verify-pin', { pin })).data;
export const goldItems = async () => (await api.get<GoldItemsResponse>('/gold/items', { headers: vaultHeaders() })).data;
export const addGoldItem = async (item: { name: string; type: string; weight_grams: number; carats: number }) =>
    (await api.post('/gold/items', item, { headers: vaultHeaders() })).data;
