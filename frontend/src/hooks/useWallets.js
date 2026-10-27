import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { invalidateMoney } from '../lib/queryKeys';

export const useWallets = () => {
    return useQuery({
        queryKey: ['wallets'],
        queryFn: async () => {
            const { data } = await api.get('/wallets');
            return data;
        },
    });
};

export const useCreateWallet = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (walletData) => {
            const { data } = await api.post('/wallets', walletData);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wallets'] });
            invalidateMoney(queryClient);
        },
    });
};

export const useUpdateWalletBalance = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, balance }) => {
            const { data } = await api.put(`/wallets/${id}`, { balance });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wallets'] });
            invalidateMoney(queryClient);
        },
    });
};

export const useDeleteWallet = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id) => {
            const { data } = await api.delete(`/wallets/${id}`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wallets'] });
            invalidateMoney(queryClient);
        },
    });
};
