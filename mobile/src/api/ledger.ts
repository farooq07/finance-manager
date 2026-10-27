import { api } from './client';

// Ledger: people (who owes whom, entry by entry) and loans (credit cards,
// personal/car loans, mortgages) with their payments. Same endpoints as the web.

/** receivable = they owe me (+), payable = I owe them (−). A person's net decides who owes whom. */
export type DuesType = 'receivable' | 'payable';
export type DuesEntry = {
    id: string; transaction_type: DuesType; amount: string; transaction_date: string; description: string | null;
};
export type Person = { id: string; name: string; email: string | null; netBalance: number; transactions: DuesEntry[] };

export type DebtType = 'credit_card' | 'personal_loan' | 'mortgage' | 'car_loan' | 'other';
export type Debt = {
    id: string; name: string; debt_type: DebtType; principal: string; outstanding: string;
    interest_rate: string | null; minimum_payment: string | null; due_day: number | null;
    notes: string | null; is_active: boolean; _count?: { payments: number };
};
export type DebtPayment = { id: string; amount: string; paid_at: string; principal_portion: string | null; interest_portion: string | null; notes: string | null };
export type DebtDetail = {
    debt: Debt & { payments: DebtPayment[] };
    projection: null | { unpayable: true } | { monthsToPayoff: number; totalInterest: number };
};

export const DEBT_TYPES: { key: DebtType; label: string }[] = [
    { key: 'credit_card', label: 'Credit card' },
    { key: 'personal_loan', label: 'Personal loan' },
    { key: 'car_loan', label: 'Car loan' },
    { key: 'mortgage', label: 'Home loan' },
    { key: 'other', label: 'Other' },
];
export const debtTypeLabel = (t: string) => DEBT_TYPES.find((d) => d.key === t)?.label ?? t;

export const ledgerKey = ['ledger'] as const;

// People ---------------------------------------------------------------------
export const getPeople = async () => (await api.get<Person[]>('/dues')).data;
export const getPerson = async (id: string) => (await api.get<Person>(`/dues/${id}`)).data;
export const addPerson = async (name: string, email?: string) =>
    (await api.post<Person>('/dues', { name, email: email || null })).data;
export const updatePerson = async (id: string, name: string, email?: string | null) =>
    (await api.put(`/dues/${id}`, { name, email: email || null })).data;
export const deletePerson = async (id: string) => (await api.delete(`/dues/${id}`)).data;
export const addDuesEntry = async (personId: string, entry: { transaction_type: DuesType; amount: number; transaction_date: string; description?: string }) =>
    (await api.post(`/dues/${personId}/transactions`, entry)).data;
export const updateDuesEntry = async (id: string, entry: { transaction_type: DuesType; amount: number; transaction_date: string; description?: string | null }) =>
    (await api.put(`/dues/transactions/${id}`, entry)).data;
/** CSV columns: Detail, Dues (positive = they owe you, negative = you owe them), optional Date. */
export async function uploadDuesCsv(personId: string, file: { uri: string; name: string; mimeType?: string | null }) {
    const form = new FormData();
    form.append('duesCSV', { uri: file.uri, name: file.name, type: file.mimeType || 'text/csv' } as unknown as Blob);
    return (await api.post<{ message: string; imported: number }>(`/dues/${personId}/upload-csv`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
    })).data;
}
export const deleteDuesEntry = async (id: string) => (await api.post('/dues/transactions/delete', { ids: [id] })).data;
export const sendReminder = async (personId: string) => (await api.post<{ message: string }>(`/dues/${personId}/reminder`)).data;

// Loans ----------------------------------------------------------------------
export const getDebts = async () => (await api.get<Debt[]>('/debts')).data;
export const getDebt = async (id: string) => (await api.get<DebtDetail>(`/debts/${id}`)).data;
export const addDebt = async (debt: {
    name: string; debt_type: DebtType; principal: number; outstanding: number;
    interest_rate?: number | null; minimum_payment?: number | null; due_day?: number | null;
}) => (await api.post<Debt>('/debts', debt)).data;
export const updateDebt = async (id: string, fields: Partial<{
    name: string; debt_type: DebtType; principal: number; outstanding: number;
    interest_rate: number | null; minimum_payment: number | null; due_day: number | null; notes: string | null;
}>) => (await api.patch<Debt>(`/debts/${id}`, fields)).data;
export const setDebtActive = async (id: string, is_active: boolean) => (await api.patch(`/debts/${id}`, { is_active })).data;
export const deleteDebt = async (id: string) => (await api.delete(`/debts/${id}`)).data;
export const addDebtPayment = async (id: string, amount: number, notes?: string) =>
    (await api.post(`/debts/${id}/payments`, { amount, notes: notes || null })).data;
