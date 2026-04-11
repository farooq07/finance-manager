import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Bank, BankDetail } from '../types/api';
import { QUERY_KEYS } from '../constants/queryKeys';

export function useBanks() {
  return useQuery<Bank[]>({
    queryKey: QUERY_KEYS.banks,
    queryFn: () => api.get('/banks').then((r) => r.data),
  });
}

export function useBankDetail(id: string) {
  return useQuery<BankDetail>({
    queryKey: QUERY_KEYS.bankDetail(id),
    queryFn: () => api.get(`/banks/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateBank() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/banks', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.banks }),
  });
}

export function useUpdateBank() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Record<string, unknown> & { id: string }) =>
      api.put(`/banks/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.banks }),
  });
}

export function useDeleteBank() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/banks/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.banks }),
  });
}
