import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../stores/authStore';

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'https://finance-manager-production-30c4.up.railway.app/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  console.log(`[API REQUEST]: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
  const token = await SecureStore.getItemAsync('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log(`[API SUCCESS]: ${response.status} ${response.config.url}`);
    return response;
  },
  async (error) => {
    console.log(`[API ERROR]: ${error.message} - URL: ${error.config?.baseURL}${error.config?.url}`);
    if (error.response) {
      console.log(`[API ERROR RESPONSE]: ${error.response.status} -`, error.response.data);
    } else {
      console.log(`[API NETWORK ERROR]: The request never reached the server or was blocked.`);
    }
    
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('auth_token');
      useAuthStore.getState().clearAuth();
    }
    return Promise.reject(error);
  }
);

export default api;

export function getApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message || 'Something went wrong';
  }
  return 'Something went wrong';
}
