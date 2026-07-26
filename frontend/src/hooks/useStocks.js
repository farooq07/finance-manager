import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const STOCK_KEYS = {
    psxStocks: ['psx-stocks'],
    psxSyncStatus: ['psx-sync-status'],
    tickerHistory: (ticker, days) => ['ticker-history', ticker, days],
    bulkHistory: (tickers, days) => ['ticker-history-bulk', tickers, days],
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
            qc.invalidateQueries({ queryKey: STOCK_KEYS.psxSyncStatus });
        },
    });
};

/**
 * Freshness of the last price sync. Polled every 5 minutes so the staleness
 * badge updates without a page reload.
 */
export const usePsxSyncStatus = () => {
    return useQuery({
        queryKey: STOCK_KEYS.psxSyncStatus,
        queryFn: async () => {
            const res = await api.get('/stocks/psx/status');
            return res.data;
        },
        staleTime: 60 * 1000,
        refetchInterval: 5 * 60 * 1000,
    });
};

/**
 * Daily closes for many tickers in one request, keyed by ticker. Used by the
 * holdings table so N rows do not become N requests.
 */
export const useBulkTickerHistory = (tickers = [], days = 30) => {
    const sorted = [...tickers].map(t => String(t).toUpperCase()).sort();
    const key = sorted.join(',');

    return useQuery({
        queryKey: STOCK_KEYS.bulkHistory(key, days),
        queryFn: async () => {
            if (!key) return {};
            const res = await api.get('/stocks/psx/history', { params: { tickers: key, days } });
            return res.data || {};
        },
        enabled: sorted.length > 0,
        staleTime: 60 * 60 * 1000,
    });
};

/**
 * Daily close series for one ticker, for sparklines and per-ticker charts.
 */
export const useTickerHistory = (ticker, days = 30) => {
    return useQuery({
        queryKey: STOCK_KEYS.tickerHistory(ticker, days),
        queryFn: async () => {
            if (!ticker) return [];
            const res = await api.get(`/stocks/${ticker}/history`, { params: { days } });
            return res.data || [];
        },
        enabled: !!ticker,
        staleTime: 60 * 60 * 1000, // 1 hour — the series only changes once a day
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
