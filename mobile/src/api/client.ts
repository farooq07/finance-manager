import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

export const TOKEN_KEY = 'auth_token';
const DEFAULT_API_URL = 'https://finance-manager-production-73ad.up.railway.app/api';

export const api = axios.create({
    baseURL: process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
});

// Who to tell when the server says the session is no longer valid. The
// session store registers itself here (it imports this module, so the
// client can't import it back).
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null) {
    onUnauthorized = handler;
}

api.interceptors.request.use(async (config) => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

type RetryableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const config = error.config as RetryableConfig | undefined;
        // No response = the request never got an answer (flaky mobile data).
        // Retry once; never retry a real server reply (4xx/5xx).
        if (!error.response && config && !config._retried) {
            config._retried = true;
            return api(config);
        }
        if (error.response?.status === 401) onUnauthorized?.();
        return Promise.reject(error);
    },
);

/** A message fit to show the user for any failed request. */
export function apiError(err: unknown): string {
    if (axios.isAxiosError(err)) {
        const message = (err.response?.data as { message?: string } | undefined)?.message;
        if (message) return message;
        if (!err.response) return "Can't reach WealthAxis. Check your internet connection.";
    }
    return 'Something went wrong. Please try again.';
}

/** True when a request failed without any answer from the server. */
export const isNetworkError = (err: unknown): boolean => axios.isAxiosError(err) && !err.response;
