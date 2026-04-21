import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { RentEntry, RentResponse } from '../types/api';
import { QUERY_KEYS } from '../constants/queryKeys';

export function useRent() {
  return useQuery<RentResponse>({
    queryKey: QUERY_KEYS.rent,
    queryFn: () => api.get('/rents').then((r) => r.data),
  });
}

export function useCreateRentPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<RentEntry>) => api.post('/rents', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.rent }),
  });
}

export function useUpdateRentPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<RentEntry> & { id: string }) =>
      api.put(`/rents/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.rent }),
  });
}

export function useDeleteRentPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/rents/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.rent }),
  });
}
