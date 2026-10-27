import * as SecureStore from 'expo-secure-store';
import { api, apiError, setUnauthorizedHandler } from '../client';
import { ok, httpError, networkError, type Handler } from './testServer';

const store = (SecureStore as unknown as { __store: Map<string, string> }).__store;

describe('api client', () => {
    let handler: jest.Mock<ReturnType<Handler>, Parameters<Handler>>;

    beforeEach(() => {
        store.clear();
        handler = jest.fn();
        api.defaults.adapter = handler;
        setUnauthorizedHandler(null);
    });

    it('uses the live API by default', () => {
        expect(api.defaults.baseURL).toBe('https://finance-manager-production-73ad.up.railway.app/api');
    });

    it('adds the bearer token from SecureStore', async () => {
        store.set('auth_token', 'jwt-123');
        handler.mockImplementation((config) => ok(config, {}));
        await api.get('/auth/me');
        expect(handler.mock.calls[0][0].headers.Authorization).toBe('Bearer jwt-123');
    });

    it('sends no Authorization header when signed out', async () => {
        handler.mockImplementation((config) => ok(config, {}));
        await api.get('/auth/config');
        expect(handler.mock.calls[0][0].headers.Authorization).toBeUndefined();
    });

    it('does not spoof a browser User-Agent', async () => {
        handler.mockImplementation((config) => ok(config, {}));
        await api.get('/auth/config');
        expect(handler.mock.calls[0][0].headers['User-Agent']).toBeUndefined();
    });

    it('retries once on a network error then succeeds', async () => {
        handler.mockImplementationOnce(networkError).mockImplementationOnce((config) => ok(config, { fine: true }));
        const res = await api.get('/banks');
        expect(res.data).toEqual({ fine: true });
        expect(handler).toHaveBeenCalledTimes(2);
    });

    it('gives up after one retry', async () => {
        handler.mockImplementation(networkError);
        await expect(api.get('/banks')).rejects.toThrow('Network Error');
        expect(handler).toHaveBeenCalledTimes(2);
    });

    it('does not retry a 500', async () => {
        handler.mockImplementation((config) => httpError(config, 500));
        await expect(api.get('/banks')).rejects.toThrow();
        expect(handler).toHaveBeenCalledTimes(1);
    });

    it('401 calls the unauthorized handler', async () => {
        const onUnauthorized = jest.fn();
        setUnauthorizedHandler(onUnauthorized);
        handler.mockImplementation((config) => httpError(config, 401, { message: 'Invalid token' }));
        await expect(api.get('/auth/me')).rejects.toThrow();
        expect(onUnauthorized).toHaveBeenCalledTimes(1);
    });

    it('a wrong PIN (401 from /auth/verify-pin) does not end the session', async () => {
        const onUnauthorized = jest.fn();
        setUnauthorizedHandler(onUnauthorized);
        handler.mockImplementation((config) => httpError(config, 401, { message: 'Invalid PIN code' }));
        await expect(api.post('/auth/verify-pin', { pin: '0000' })).rejects.toThrow();
        expect(onUnauthorized).not.toHaveBeenCalled();
    });

    it('apiError prefers the server message', async () => {
        handler.mockImplementation((config) => httpError(config, 400, { message: 'Invalid or expired OTP' }));
        const err = await api.post('/auth/verify-otp', {}).catch((e) => e);
        expect(apiError(err)).toBe('Invalid or expired OTP');
    });

    it('apiError explains a network failure in plain words', async () => {
        handler.mockImplementation(networkError);
        const err = await api.get('/banks').catch((e) => e);
        expect(apiError(err)).toBe("Can't reach WealthAxis. Check your internet connection.");
    });

    it('apiError has a fallback for anything else', () => {
        expect(apiError(new Error('boom'))).toBe('Something went wrong. Please try again.');
    });
});
