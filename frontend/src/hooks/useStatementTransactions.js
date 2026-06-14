import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

// These hooks are shared by the bank and wallet detail pages. `resource` selects
// the API namespace ('banks' | 'wallets') so the same review table can drive
// either. It defaults to 'banks' to keep existing bank callers unchanged.
const baseKey = (resource) => (resource === 'wallets' ? 'wallets' : 'banks');

export const useStatementTransactions = (bankId, statementId, resource = 'banks') => {
    return useQuery({
        queryKey: ['statements', bankId, statementId, 'transactions'],
        queryFn: async () => {
            if (!bankId || !statementId) return [];
            const { data } = await api.get(`/${resource}/${bankId}/statements/${statementId}/transactions`);
            return data;
        },
        enabled: !!bankId && !!statementId,
    });
};

export const useBankAllTransactions = (bankId, resource = 'banks') => {
    return useQuery({
        queryKey: [baseKey(resource), bankId, 'all-transactions'],
        queryFn: async () => {
            if (!bankId) return [];
            const { data } = await api.get(`/${resource}/${bankId}/transactions`);
            return data;
        },
        enabled: !!bankId,
    });
};

export const useApproveTransaction = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ resource = 'banks', bankId, txId, approvedCategory, notes }) => {
            const { data } = await api.post(
                `/${resource}/${bankId}/transactions/${txId}/approve`,
                { approvedCategory, notes }
            );
            return data;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: [baseKey(variables.resource), variables.bankId, 'all-transactions'] });
            queryClient.invalidateQueries({
                queryKey: ['statements', variables.bankId, variables.statementId, 'transactions']
            });
        },
    });
};

export const useDeleteTransaction = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ resource = 'banks', bankId, txId }) => {
            const { data } = await api.delete(
                `/${resource}/${bankId}/transactions/${txId}`
            );
            return data;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: [baseKey(variables.resource), variables.bankId, 'all-transactions'] });
            queryClient.invalidateQueries({ queryKey: ['statements', variables.bankId, variables.statementId, 'transactions'] });
        },
    });
};

export const useUpdateTransactionCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ resource = 'banks', bankId, txId, approvedCategory, notes, transaction_type, amount }) => {
            const { data } = await api.put(
                `/${resource}/${bankId}/transactions/${txId}`,
                { approvedCategory, notes, transaction_type, amount }
            );
            return data;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: [baseKey(variables.resource), variables.bankId, 'all-transactions'] });
            queryClient.invalidateQueries({ queryKey: ['statements', variables.bankId, variables.statementId, 'transactions'] });
        },
    });
};

export const useBulkApproveTransactions = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ resource = 'banks', bankId, transactions }) => {
            const { data } = await api.post(`/${resource}/${bankId}/bulk-approve`, { transactions });
            return data;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: [baseKey(variables.resource), variables.bankId, 'all-transactions'] });
            queryClient.invalidateQueries({ queryKey: [baseKey(variables.resource), variables.bankId] });
        },
    });
};
