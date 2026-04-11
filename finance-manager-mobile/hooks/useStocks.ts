import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Stock, PsxStock, PsxSnapshot } from '../types/api';
import { QUERY_KEYS } from '../constants/queryKeys';

export function useStocks() {
  return useQuery<Stock[]>({
    queryKey: QUERY_KEYS.stocks,
    queryFn: () => api.get('/stocks').then((r) => r.data),
  });
}

export function usePsxStocks() {
  return useQuery<PsxStock[]>({
    queryKey: QUERY_KEYS.psxStocks,
    queryFn: () => api.get('/psx/stocks').then((r) => r.data),
    refetchInterval: 60_000,
  });
}

export function usePsxSnapshots() {
  return useQuery<PsxSnapshot[]>({
    queryKey: QUERY_KEYS.psxSnapshots,
    queryFn: () => api.get('/psx/snapshots').then((r) => r.data),
  });
}

export function useCreateStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { stock_symbol: string; company_name?: string }) =>
      api.post('/stocks', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.stocks }),
  });
}

export function useAddStockTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ stockId, ...data }: { stockId: string; buy_date: string; buy_price: number; quantity: number; brokerage_fee?: number }) =>
      api.post(`/stocks/${stockId}/transactions`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.stocks }),
  });
}

export function useDeleteStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/stocks/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.stocks }),
  });
}

export function useSyncStockPrices() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/stocks/sync-prices').then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.stocks }),
  });
}
