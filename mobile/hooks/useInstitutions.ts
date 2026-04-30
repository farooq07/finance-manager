import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { Institution } from '../types/api';
import { QUERY_KEYS } from '../constants/queryKeys';

export function useInstitutions() {
  return useQuery<Institution[]>({
    queryKey: QUERY_KEYS.institutions,
    queryFn: () => api.get('/institutions').then((r) => r.data),
  });
}
