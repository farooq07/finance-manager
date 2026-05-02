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

export const useSyncStockNews = () => {
    return useMutation({
        mutationFn: async (ticker) => {
            const res = await api.post('/stocks/news/sync', { ticker });
            return res.data;
        }
    });
};

export const useStockNews = (ticker) => {
    return useQuery({
        queryKey: ['stock-news', ticker],
        queryFn: async () => {
            if (!ticker) return [];
            const res = await api.get(`/stocks/${ticker}/news`);
            return res.data;
        },
        enabled: !!ticker,
        staleTime: 60 * 60 * 1000, // 1 hour
    });
};
