import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

// Invalidates the whole gold cache surface after any mutation.
function useInvalidateGold() {
    const qc = useQueryClient();
    return () => {
        qc.invalidateQueries({ queryKey: ['gold-items']         });
        qc.invalidateQueries({ queryKey: ['gold-latest-price']  });
        qc.invalidateQueries({ queryKey: ['gold-price-history'] });
        qc.invalidateQueries({ queryKey: ['gold-zakat']         });
    };
}

// Queries -------------------------------------------------------------

export function useGoldItems() {
    return useQuery({
        queryKey: ['gold-items'],
        queryFn: () => api.get('/gold/items').then((r) => r.data),
        staleTime: 30_000,
    });
}

export function useGoldLatestPrice() {
    return useQuery({
        queryKey: ['gold-latest-price'],
        queryFn: () => api.get('/gold/latest-price').then((r) => r.data),
        staleTime: 30_000,
    });
}

export function useGoldPriceHistory(days = 30) {
    return useQuery({
        queryKey: ['gold-price-history', days],
        queryFn: () => api.get('/gold/price-history', { params: { days } }).then((r) => r.data),
        staleTime: 60_000,
    });
}

export function useGoldZakatSummary(enabled = true) {
    return useQuery({
        queryKey: ['gold-zakat'],
        queryFn: () => api.get('/gold/zakat-summary').then((r) => r.data),
        enabled,
        staleTime: 30_000,
    });
}

export function useGoldHasPin() {
    return useQuery({
        queryKey: ['gold-has-pin'],
        queryFn: () => api.get('/gold/has-pin').then((r) => r.data),
        staleTime: 60_000,
    });
}

// Mutations -----------------------------------------------------------

export function useAddGoldItem() {
    const invalidate = useInvalidateGold();
    return useMutation({
        mutationFn: (payload) => api.post('/gold/items', payload).then((r) => r.data),
        onSuccess: invalidate,
    });
}

export function useUpdateGoldItem() {
    const invalidate = useInvalidateGold();
    return useMutation({
        mutationFn: ({ id, ...payload }) => api.put(`/gold/items/${id}`, payload).then((r) => r.data),
        onSuccess: invalidate,
    });
}

export function useDeleteGoldItem() {
    const invalidate = useInvalidateGold();
    return useMutation({
        mutationFn: (id) => api.delete(`/gold/items/${id}`).then((r) => r.data),
        onSuccess: invalidate,
    });
}

export function useSyncGoldPrice() {
    const invalidate = useInvalidateGold();
    return useMutation({
        mutationFn: () => api.post('/gold/sync-price').then((r) => r.data),
        onSuccess: invalidate,
    });
}

export function useSetGoldPin() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (pin) => api.post('/gold/set-pin', { pin }).then((r) => r.data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['gold-has-pin'] }),
    });
}

export function useVerifyGoldPin() {
    // Deliberately not cached: every check hits the server.
    return useMutation({
        mutationFn: (pin) => api.post('/gold/verify-pin', { pin }).then((r) => r.data),
    });
}
