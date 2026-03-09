import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const STOCK_KEYS = {
    psxStocks: ['psx-stocks'],
};

export const usePsxStocks = () => {
    return useQuery({
        queryKey: STOCK_KEYS.psxStocks,
        queryFn: async () => {
            const res = await api.get('/stocks/psx');
            return res.data || [];
        },
        staleTime: 10 * 60 * 1000, // 10 minutes
    });
};

export const useSyncPsxStocks = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            const res = await api.post('/stocks/psx/sync');
            return res.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: STOCK_KEYS.psxStocks });
        },
    });
};
