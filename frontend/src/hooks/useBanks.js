import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

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
            queryClient.invalidateQueries({ queryKey: ['banks'] });
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
            queryClient.invalidateQueries({ queryKey: ['banks'] });
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
            queryClient.invalidateQueries({ queryKey: ['banks'] });
        },
    });
};
