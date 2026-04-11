import { useMutation } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import api, { getApiError } from '../services/api';
import { useAuthStore } from '../stores/authStore';

export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  return async () => {
    await SecureStore.deleteItemAsync('auth_token');
    clearAuth();
  };
}

export function useChangePin() {
  return useMutation({
    mutationFn: (data: { currentPin: string; newPin: string }) =>
      api.put('/auth/pin/change', data).then((r) => r.data),
  });
}
