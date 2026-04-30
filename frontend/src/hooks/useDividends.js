import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useDividends = () => {
    return useQuery({
        queryKey: ['dividends'],
        queryFn: async () => {
            const { data } = await api.get('/dividends');
            return data;
        },
    });
};

export const useSyncDividends = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (dividends) => {
            const { data } = await api.post('/dividends/sync', { dividends });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dividends'] });
        },
    });
};

export const useDeleteDividend = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id) => {
            const { data } = await api.delete(`/dividends/${id}`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dividends'] });
        },
    });
};
