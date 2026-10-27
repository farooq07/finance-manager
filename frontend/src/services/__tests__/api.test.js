import { describe, it, expect, beforeEach, vi } from 'vitest';
import api, { isSessionEnded, setSessionEndedHandler } from '../api';
import { setVaultToken, clearVaultToken } from '../goldVault';

const failWith = (status, data) => () => Promise.reject(Object.assign(new Error('x'), { response: { status, data }, config: {} }));

describe('isSessionEnded', () => {
    it.each([
        [401, { code: 'SESSION_EXPIRED' }, true],
        [401, { code: 'SESSION_REVOKED' }, true],
        [401, { code: 'WRONG_PIN' }, false],     // a wrong PIN is not a sign-out
        [403, { code: 'FORBIDDEN' }, false],     // permission denied is not a sign-out
        [403, { code: 'VAULT_LOCKED' }, false],
        [401, {}, false],
    ])('%i %j → %s', (status, data, expected) => {
        expect(isSessionEnded({ response: { status, data } })).toBe(expected);
    });
});

describe('api interceptors', () => {
    let seen;
    beforeEach(() => {
        localStorage.clear();
        clearVaultToken();
        seen = null;
        api.defaults.adapter = async (config) => { seen = config; return { data: {}, status: 200, statusText: 'OK', headers: {}, config }; };
    });

    it('adds the vault token only to gold requests', async () => {
        setVaultToken('vault-1', 900);
        await api.get('/gold/items');
        expect(seen.headers['X-Vault-Token']).toBe('vault-1');
        await api.get('/banks');
        expect(seen.headers['X-Vault-Token']).toBeUndefined();
    });

    it('a 403 does not sign the user out; SESSION_* does', async () => {
        localStorage.setItem('token', 'jwt');
        const ended = vi.fn();
        setSessionEndedHandler(ended);

        api.defaults.adapter = failWith(403, { code: 'FORBIDDEN' });
        await expect(api.get('/roles')).rejects.toThrow();
        expect(localStorage.getItem('token')).toBe('jwt');
        expect(ended).not.toHaveBeenCalled();

        api.defaults.adapter = failWith(401, { code: 'SESSION_REVOKED' });
        await expect(api.get('/banks')).rejects.toThrow();
        expect(localStorage.getItem('token')).toBeNull();
        expect(ended).toHaveBeenCalled();
        setSessionEndedHandler(null);
    });
});
