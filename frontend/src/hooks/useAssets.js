import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useAssets = () => {
    return useQuery({
        queryKey: ['assets'],
        queryFn: async () => {
            const { data } = await api.get('/assets');
            return data; // Returns { assets: [], totalValue: 0 }
        }
    });
};

export const useCreateAsset = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (assetData) => {
            const { data } = await api.post('/assets', assetData);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
        }
    });
};

export const useDeleteAsset = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id) => {
            await api.delete(`/assets/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
        }
    });
};
