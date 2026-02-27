import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

// ========== Query Keys ==========
export const FUND_KEYS = {
    all: ['mutual-funds'],
    snapshots: ['mutual-funds', 'snapshots'],
};

// ========== Queries ==========

export const useMutualFunds = () => {
    return useQuery({
        queryKey: FUND_KEYS.all,
        queryFn: async () => {
            const res = await api.get('/mutual-funds');
            if (Array.isArray(res.data)) {
                return { funds: res.data, portfolioSummary: {} };
            }
            return res.data || { funds: [], portfolioSummary: {} };
        },
    });
};

export const useSnapshots = () => {
    return useQuery({
        queryKey: FUND_KEYS.snapshots,
        queryFn: async () => {
            const res = await api.get('/mutual-funds/snapshots');
            return res.data || [];
        },
    });
};

// ========== Mutations ==========

export const useUploadFile = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (file) => {
            const form = new FormData();
            form.append('portfolioCSV', file);
            const res = await api.post('/mutual-funds/upload', form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return res.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: FUND_KEYS.all });
            qc.invalidateQueries({ queryKey: FUND_KEYS.snapshots });
        },
    });
};

export const useCreateFund = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (data) => {
            const res = await api.post('/mutual-funds', data);
            return res.data;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: FUND_KEYS.all }),
    });
};

export const useDeleteFund = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id) => {
            const res = await api.delete(`/mutual-funds/${id}`);
            return res.data;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: FUND_KEYS.all }),
    });
};

export const useBulkDeleteFunds = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (ids) => {
            const res = await api.post('/mutual-funds/bulk-delete', { ids });
            return res.data;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: FUND_KEYS.all }),
    });
};
