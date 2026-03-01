import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useInstitutions = () => {
    return useQuery({
        queryKey: ['institutions'],
        queryFn: async () => {
            const { data } = await api.get('/institutions');
            return data;
        }
    });
};

export const useCreateInstitution = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (newInst) => {
            const { data } = await api.post('/institutions', newInst);
            return data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['institutions'] })
    });
};

export const useDeleteInstitution = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id) => {
            const { data } = await api.delete(`/institutions/${id}`);
            return data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['institutions'] })
    });
};

export const useSeedInstitutions = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            const { data } = await api.post('/institutions/seed');
            return data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['institutions'] })
    });
};
