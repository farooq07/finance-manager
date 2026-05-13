import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useSessions = () =>
  useQuery({
    queryKey: ['chat-sessions'],
    queryFn: () => api.get('/chat/sessions').then(r => r.data)
  });

export const useSession = (id) =>
  useQuery({
    queryKey: ['chat-sessions', id],
    queryFn: () => api.get(`/chat/sessions/${id}`).then(r => r.data),
    enabled: !!id
  });

export const useCreateSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/chat/sessions').then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat-sessions'] })
  });
};

export const useDeleteSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/chat/sessions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat-sessions'] })
  });
};

export const useSendMessage = (sessionId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (message) => api.post(`/chat/sessions/${sessionId}/message`, { message }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat-sessions', sessionId] })
  });
};
