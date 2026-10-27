import axios from 'axios';
import { getVaultToken } from './goldVault';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Request interceptor to attach JWT token (and the Gold Vault unlock, if any)
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        const vault = config.url?.startsWith('/gold/') ? getVaultToken() : null;
        if (vault) config.headers['X-Vault-Token'] = vault;
        return config;
    },
    (error) => Promise.reject(error)
);

/**
 * Only a SESSION_* code means the session is over (expired, revoked,
 * missing). A 403, a wrong PIN or a validation error is a refused action on
 * a session that is still valid — never a reason to sign out.
 */
export function isSessionEnded(error) {
    const code = error?.response?.data?.code;
    return error?.response?.status === 401 && typeof code === 'string' && code.startsWith('SESSION_');
}

let onSessionEnded = null;
/** AuthContext registers how to sign out (clearing cached data) here. */
export function setSessionEndedHandler(fn) {
    onSessionEnded = fn;
}

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (isSessionEnded(error) && localStorage.getItem('token')) {
            localStorage.removeItem('token');
            if (onSessionEnded) onSessionEnded();
            else window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
