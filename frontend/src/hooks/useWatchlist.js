import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const WATCHLIST_KEYS = {
    all: ['watchlist'],
};

/**
 * Tickers the user tracks. The response already carries the live quote for
 * each, so the watchlist tab renders from one request.
 */
export const useWatchlist = () => {
    return useQuery({
        queryKey: WATCHLIST_KEYS.all,
        queryFn: async () => {
            const res = await api.get('/watchlist');
            return res.data || [];
        },
        staleTime: 5 * 60 * 1000,
    });
};

export const useAddToWatchlist = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ ticker, notes }) => {
            const res = await api.post('/watchlist', { ticker, notes });
            return res.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: WATCHLIST_KEYS.all });
        },
    });
};

export const useRemoveFromWatchlist = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (ticker) => {
            const res = await api.delete(`/watchlist/${ticker}`);
            return res.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: WATCHLIST_KEYS.all });
        },
    });
};
