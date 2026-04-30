import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { ZakatResponse } from '../types/api';
import { QUERY_KEYS } from '../constants/queryKeys';

export function useZakat() {
  return useQuery<ZakatResponse>({
    queryKey: QUERY_KEYS.zakat,
    queryFn: () => api.get('/zakat').then((r) => r.data),
  });
}

export function useCreateZakat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { amount: number; description?: string; date?: string }) =>
      api.post('/zakat', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.zakat }),
  });
}

export function useDeleteZakat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/zakat/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.zakat }),
  });
}
