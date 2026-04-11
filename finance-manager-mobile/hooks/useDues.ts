import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { DuesPerson } from '../types/api';
import { QUERY_KEYS } from '../constants/queryKeys';

export function useDues() {
  return useQuery<DuesPerson[]>({
    queryKey: QUERY_KEYS.dues,
    queryFn: () => api.get('/dues').then((r) => r.data),
  });
}

export function useDuesPerson(id: string) {
  return useQuery<DuesPerson>({
    queryKey: QUERY_KEYS.duesPerson(id),
    queryFn: () => api.get(`/dues/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateDuesPerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; email?: string }) => api.post('/dues', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.dues }),
  });
}

export function useAddDuesTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ personId, ...data }: { personId: string; transaction_type: string; amount: number; description?: string }) =>
      api.post(`/dues/${personId}/transactions`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.dues }),
  });
}

export function useDeleteDuesPerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/dues/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.dues }),
  });
}
