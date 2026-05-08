import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useStatementTransactions = (bankId, statementId) => {
    return useQuery({
        queryKey: ['statements', bankId, statementId, 'transactions'],
        queryFn: async () => {
            if (!bankId || !statementId) return [];
            const { data } = await api.get(`/banks/${bankId}/statements/${statementId}/transactions`);
            return data;
        },
        enabled: !!bankId && !!statementId,
    });
};

export const useBankAllTransactions = (bankId) => {
    return useQuery({
        queryKey: ['banks', bankId, 'all-transactions'],
        queryFn: async () => {
            if (!bankId) return [];
            const { data } = await api.get(`/banks/${bankId}/transactions`);
            return data;
        },
        enabled: !!bankId,
    });
};

export const useApproveTransaction = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ bankId, statementId, txId, approvedCategory, notes }) => {
            const { data } = await api.post(
                `/banks/${bankId}/statements/${statementId}/transactions/${txId}/approve`,
                { approvedCategory, notes }
            );
            return data;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ['statements', variables.bankId, variables.statementId, 'transactions']
            });
        },
    });
};

export const useDeleteTransaction = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ bankId, statementId, txId }) => {
            const { data } = await api.delete(
                `/banks/${bankId}/statements/${statementId}/transactions/${txId}`
            );
            return data;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['banks', variables.bankId, 'all-transactions'] });
            queryClient.invalidateQueries({ queryKey: ['statements', variables.bankId, variables.statementId, 'transactions'] });
        },
    });
};

export const useUpdateTransactionCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ bankId, statementId, txId, approvedCategory, notes }) => {
            const { data } = await api.put(
                `/banks/${bankId}/statements/${statementId}/transactions/${txId}`,
                { approvedCategory, notes }
            );
            return data;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['banks', variables.bankId, 'all-transactions'] });
            queryClient.invalidateQueries({ queryKey: ['statements', variables.bankId, variables.statementId, 'transactions'] });
        },
    });
};

export const useBulkApproveTransactions = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ bankId, transactions }) => {
            const { data } = await api.post(`/banks/${bankId}/bulk-approve`, { transactions });
            return data;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['banks', variables.bankId, 'all-transactions'] });
            queryClient.invalidateQueries({ queryKey: ['banks', variables.bankId] });
        },
    });
};
