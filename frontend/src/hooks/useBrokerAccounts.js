import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

const BROKER_ACCOUNTS_KEY = ['brokerAccounts'];

export const useBrokerAccounts = () => {
    return useQuery({
        queryKey: BROKER_ACCOUNTS_KEY,
        queryFn: async () => {
            const { data } = await api.get('/broker-accounts');
            return data;
        },
    });
};

export const useCreateBrokerAccount = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (brokerData) => {
            const { data } = await api.post('/broker-accounts', brokerData);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: BROKER_ACCOUNTS_KEY });
        },
    });
};

export const useDeleteBrokerAccount = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id) => {
            const { data } = await api.delete(`/broker-accounts/${id}`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: BROKER_ACCOUNTS_KEY });
        },
    });
};
