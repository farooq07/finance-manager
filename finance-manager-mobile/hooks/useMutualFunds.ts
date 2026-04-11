import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { MutualFundsResponse, PortfolioSnapshot } from '../types/api';
import { QUERY_KEYS } from '../constants/queryKeys';

export function useMutualFunds() {
  return useQuery<MutualFundsResponse>({
    queryKey: QUERY_KEYS.mutualFunds,
    queryFn: () => api.get('/mutual-funds').then((r) => r.data),
  });
}

export function useMutualFundSnapshots() {
  return useQuery<PortfolioSnapshot[]>({
    queryKey: QUERY_KEYS.mutualFundSnapshots,
    queryFn: () => api.get('/mutual-funds/snapshots').then((r) => r.data),
  });
}

export function useCreateMutualFund() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/mutual-funds', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.mutualFunds }),
  });
}

export function useDeleteMutualFund() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/mutual-funds/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.mutualFunds }),
  });
}

export function useUploadMutualFundCSV() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      api.post('/mutual-funds/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.mutualFunds });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.mutualFundSnapshots });
    },
  });
}
