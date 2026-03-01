import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

/**
 * Hook to fetch chronological PSX Snapshots.
 */
export const usePsxSnapshots = () => {
    return useQuery({
        queryKey: ['psxSnapshots'],
        queryFn: async () => {
            const { data } = await api.get('/psx/snapshots');
            return data;
        },
    });
};

/**
 * Hook to upload a new PSX Snapshot (parsed CSV).
 */
export const useUploadPsxSnapshot = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (snapshotData) => {
            const { data } = await api.post('/psx/snapshots', snapshotData);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['psxSnapshots'] });
        },
    });
};

/**
 * Hook to fetch the history of Bank Investments to the brokerage.
 */
export const useBankInvestments = () => {
    return useQuery({
        queryKey: ['bankInvestments'],
        queryFn: async () => {
            const { data } = await api.get('/psx/investments');
            return data;
        },
    });
};

/**
 * Hook to add a new Bank Investment deposit/withdrawal.
 */
export const useAddBankInvestment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (investmentData) => {
            const { data } = await api.post('/psx/investments', investmentData);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bankInvestments'] });
            // Re-fetching snapshots is highly recommended since total_invested on future 
            // snapshots relies on this. But historic snapshots won't change unless we backdate.
            queryClient.invalidateQueries({ queryKey: ['psxSnapshots'] });
        },
    });
};

/**
 * Hook to delete a Bank Investment.
 */
export const useDeleteBankInvestment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id) => {
            const { data } = await api.delete(`/psx/investments/${id}`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bankInvestments'] });
            queryClient.invalidateQueries({ queryKey: ['psxSnapshots'] });
        },
    });
};

/**
 * Hook to update a PSX Snapshot's daily summary stats.
 */
export const useUpdatePsxSummary = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, summaryData }) => {
            const { data } = await api.put(`/psx/snapshots/${id}/summary`, { summary_data: summaryData });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['psxSnapshots'] });
        },
    });
};
