import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { DashboardResponse } from '../types/api';
import { QUERY_KEYS } from '../constants/queryKeys';

export function useDashboard() {
  return useQuery<DashboardResponse>({
    queryKey: QUERY_KEYS.dashboard,
    queryFn: () => api.get('/dashboard/summary').then((r) => r.data),
  });
}
