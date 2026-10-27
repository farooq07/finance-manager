import jwt from 'jsonwebtoken';
import { isFreshLogin, signSessionToken } from '../session.js';

describe('fresh sign-in', () => {
    const user = { id: 'u1', email: 'a@b.c', token_version: 3 };
    const now = Date.now();
    beforeAll(() => { process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret'; });

    it('a real sign-in is fresh', () => {
        const { at } = jwt.decode(signSessionToken(user));
        expect(isFreshLogin({ auth: { iat: at, authAt: at } }, now)).toBe(true);
    });

    it('a re-issued token keeps the original sign-in time', () => {
        const signedInAt = Math.floor(now / 1000) - 3600; // an hour ago
        const { at, iat } = jwt.decode(signSessionToken(user, { authAt: signedInAt }));
        expect(at).toBe(signedInAt);
        // Brand-new token, but the person last proved who they are an hour ago.
        expect(isFreshLogin({ auth: { iat, authAt: at } }, now)).toBe(false);
    });

    it('older tokens without `at` fall back to their issue time', () => {
        expect(isFreshLogin({ auth: { iat: Math.floor(now / 1000) } }, now)).toBe(true);
    });
});
