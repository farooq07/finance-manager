import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { invalidateMoney } from '../lib/queryKeys';

export const useBanks = () => {
    return useQuery({
        queryKey: ['banks'],
        queryFn: async () => {
            const { data } = await api.get('/banks');
            return data;
        },
    });
};

export const useBank = (id) => {
    return useQuery({
        queryKey: ['banks', id],
        queryFn: async () => {
            if (!id) return null;
            const { data } = await api.get(`/banks/${id}`);
            return data;
        },
        enabled: !!id,
        // A deleted bank returns 404 — don't keep retrying or serving stale cache.
        retry: (failureCount, error) => error?.response?.status !== 404 && failureCount < 2,
        staleTime: 0,
    });
};

export const useCreateBank = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (bankData) => {
            const { data } = await api.post('/banks', bankData);
            return data;
        },
        onSuccess: () => {
            invalidateMoney(queryClient);
        },
    });
};

export const useUpdateBank = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...bankData }) => {
            if (!id) throw new Error("Bank ID required for update");
            const { data } = await api.put(`/banks/${id}`, bankData);
            return data;
        },
        onSuccess: (data, variables) => {
            invalidateMoney(queryClient);
            queryClient.invalidateQueries({ queryKey: ['banks', variables.id] });
        },
    });
};

export const useUpdateBankBalance = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, current_balance }) => {
            if (!id) throw new Error("Bank ID required for balance update");
            const { data } = await api.put(`/banks/${id}/balance`, { current_balance });
            return data;
        },
        onSuccess: (data, variables) => {
            invalidateMoney(queryClient);
            queryClient.invalidateQueries({ queryKey: ['banks', variables.id] });
        },
    });
};

export const useDeleteBank = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id) => {
            const { data } = await api.delete(`/banks/${id}`);
            return data;
        },
        onSuccess: () => {
            invalidateMoney(queryClient);
        },
    });
};

export const useBankCategorySummary = (bankId) => {
    return useQuery({
        queryKey: ['banks', bankId, 'category-summary'],
        queryFn: async () => {
            const { data } = await api.get(`/banks/${bankId}/category-summary`);
            return data;
        },
        enabled: !!bankId,
    });
};
