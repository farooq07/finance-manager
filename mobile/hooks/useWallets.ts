import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Wallet } from '../types/api';
import { QUERY_KEYS } from '../constants/queryKeys';

export function useWallets() {
  return useQuery<Wallet[]>({
    queryKey: QUERY_KEYS.wallets,
    queryFn: () => api.get('/wallets').then((r) => r.data),
  });
}

export function useCreateWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/wallets', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.wallets }),
  });
}

export function useUpdateWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Record<string, unknown> & { id: string }) =>
      api.put(`/wallets/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.wallets }),
  });
}

export function useDeleteWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/wallets/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.wallets }),
  });
}
