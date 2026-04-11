import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { BrokerAccount } from '../types/api';
import { QUERY_KEYS } from '../constants/queryKeys';

export function useBrokers() {
  return useQuery<BrokerAccount[]>({
    queryKey: QUERY_KEYS.brokers,
    queryFn: () => api.get('/brokers').then((r) => r.data),
  });
}

export function useCreateBroker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/brokers', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.brokers }),
  });
}

export function useDeleteBroker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/brokers/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.brokers }),
  });
}
