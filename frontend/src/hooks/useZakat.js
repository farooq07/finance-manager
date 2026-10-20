import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useZakatEntries = () => {
    return useQuery({
        queryKey: ['zakat'],
        queryFn: async () => {
            const { data } = await api.get('/zakat');
            return data;
        }
    });
};

// Server-calculated Zakat (cash, investments, gold, dues, debts, nisab).
// Shares the ['zakat'] prefix so entry mutations refresh it too.
export const useZakatSummary = () => {
    return useQuery({
        queryKey: ['zakat', 'summary'],
        queryFn: async () => {
            const { data } = await api.get('/zakat/summary');
            return data;
        }
    });
};

export const useCreateZakatEntry = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (zakatData) => {
            const { data } = await api.post('/zakat', zakatData);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['zakat'] });
        }
    });
};

export const useDeleteZakatEntry = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id) => {
            await api.delete(`/zakat/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['zakat'] });
        }
    });
};
