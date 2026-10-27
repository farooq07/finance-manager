import { api } from './client';
import type { Bank, DashboardSummary, Preferences, Wallet } from './types';

export const getBanks = async () => (await api.get<Bank[]>('/banks')).data;
export const getWallets = async () => (await api.get<Wallet[]>('/wallets')).data;
export const createBank = async (name: string, startingBalance: number) =>
    (await api.post<Bank>('/banks', { name, starting_balance: startingBalance })).data;
export const createWallet = async (name: string, balance: number) =>
    (await api.post<Wallet>('/wallets', { name, institution: name, balance })).data;

export const getDashboardSummary = async () => (await api.get<DashboardSummary>('/dashboard/summary')).data;

export const updatePreferences = async (body: { interests?: string[] | null; completeOnboarding?: true }) =>
    (await api.patch<Preferences>('/users/me/preferences', body)).data;
