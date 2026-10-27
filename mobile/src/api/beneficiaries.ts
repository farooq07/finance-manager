import { api } from './client';

// Beneficiaries: people you send money to (or get it from), with their account
// numbers. Bank statement rows mentioning an account are linked to them.

export type BeneficiaryAccount = { id: string; account_label: string | null; account_no: string };
export type Beneficiary = {
    id: string; name: string; nickname: string | null; phone: string | null; notes: string | null;
    accounts: BeneficiaryAccount[]; _count?: { transactions: number };
};
export type BeneficiaryTransaction = {
    id: string; amount: string; direction: 'credit' | 'debit' | string; transaction_date: string; description: string | null;
};
export type BeneficiaryDetail = Beneficiary & { transactions: BeneficiaryTransaction[] };

export const beneficiariesKey = ['beneficiaries'] as const;

export const getBeneficiaries = async () => (await api.get<Beneficiary[]>('/beneficiaries')).data;
export const getBeneficiary = async (id: string) => (await api.get<BeneficiaryDetail>(`/beneficiaries/${id}`)).data;
export const addBeneficiary = async (b: { name: string; nickname?: string; phone?: string; accounts?: { account_label?: string; account_no: string }[] }) =>
    (await api.post<Beneficiary>('/beneficiaries', b)).data;
export const updateBeneficiary = async (id: string, b: { name: string; nickname?: string | null; phone?: string | null; notes?: string | null }) =>
    (await api.put(`/beneficiaries/${id}`, b)).data;
export const deleteBeneficiary = async (id: string) => (await api.delete(`/beneficiaries/${id}`)).data;
export const addBeneficiaryAccount = async (id: string, account_no: string, account_label?: string) =>
    (await api.post(`/beneficiaries/${id}/accounts`, { account_no, account_label })).data;
export const deleteBeneficiaryAccount = async (id: string, accountId: string) =>
    (await api.delete(`/beneficiaries/${id}/accounts/${accountId}`)).data;
/** Look through imported statements again for this person's accounts. */
export const rescanBeneficiary = async (id: string) =>
    (await api.post<{ message: string; linked: number }>(`/beneficiaries/${id}/rescan`)).data;
