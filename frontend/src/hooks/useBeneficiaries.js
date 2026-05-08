import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useBeneficiaries = () => {
    return useQuery({
        queryKey: ['beneficiaries'],
        queryFn: async () => {
            const { data } = await api.get('/beneficiaries');
            return data;
        },
    });
};

export const useBeneficiary = (id) => {
    return useQuery({
        queryKey: ['beneficiaries', id],
        queryFn: async () => {
            if (!id) return null;
            const { data } = await api.get(`/beneficiaries/${id}`);
            return data;
        },
        enabled: !!id,
    });
};

export const useCreateBeneficiary = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload) => {
            const { data } = await api.post('/beneficiaries', payload);
            return data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['beneficiaries'] }),
    });
};

export const useUpdateBeneficiary = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...payload }) => {
            const { data } = await api.put(`/beneficiaries/${id}`, payload);
            return data;
        },
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['beneficiaries'] });
            queryClient.invalidateQueries({ queryKey: ['beneficiaries', vars.id] });
        },
    });
};

export const useDeleteBeneficiary = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id) => {
            const { data } = await api.delete(`/beneficiaries/${id}`);
            return data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['beneficiaries'] }),
    });
};

export const useAddBeneficiaryAccount = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ beneficiaryId, ...payload }) => {
            const { data } = await api.post(`/beneficiaries/${beneficiaryId}/accounts`, payload);
            return data;
        },
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['beneficiaries'] });
            queryClient.invalidateQueries({ queryKey: ['beneficiaries', vars.beneficiaryId] });
        },
    });
};

export const useRescanBeneficiary = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id) => {
            const { data } = await api.post(`/beneficiaries/${id}/rescan`);
            return data;
        },
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: ['beneficiaries', id] });
        },
    });
};

export const useDeleteBeneficiaryAccount = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ beneficiaryId, accountId }) => {
            const { data } = await api.delete(`/beneficiaries/${beneficiaryId}/accounts/${accountId}`);
            return data;
        },
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: ['beneficiaries'] });
            queryClient.invalidateQueries({ queryKey: ['beneficiaries', vars.beneficiaryId] });
        },
    });
};
