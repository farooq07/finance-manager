import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

// Helpers for faking the server in tests: an axios adapter that answers
// each request from a handler, plus ready-made success / error results.
export type Handler = (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>;

export const ok = (config: InternalAxiosRequestConfig, data: unknown, status = 200): Promise<AxiosResponse> =>
    Promise.resolve({ data, status, statusText: 'OK', headers: {}, config });

export const httpError = (config: InternalAxiosRequestConfig, status: number, data: unknown = {}): Promise<never> =>
    Promise.reject(new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_RESPONSE', config, {},
        { data, status, statusText: '', headers: {}, config }));

export const networkError = (config: InternalAxiosRequestConfig): Promise<never> =>
    Promise.reject(new AxiosError('Network Error', 'ERR_NETWORK', config, {}));
