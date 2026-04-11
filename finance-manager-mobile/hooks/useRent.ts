import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { RentResponse } from '../types/api';
import { QUERY_KEYS } from '../constants/queryKeys';

export function useRent() {
  return useQuery<RentResponse>({
    queryKey: QUERY_KEYS.rent,
    queryFn: () => api.get('/rent').then((r) => r.data),
  });
}

export function useCreateRent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/rent', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.rent }),
  });
}

export function useDeleteRent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/rent/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.rent }),
  });
}
