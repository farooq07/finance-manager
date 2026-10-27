import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';
import prisma from '../../utils/prisma.js';
import verifyToken from '../auth.middleware.js';

const activeUser = { id: 'u1', email: 'a@b.c', name: 'Ali', role: 'user', deleted_at: null, token_version: 0 };

describe('Auth Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = { headers: { authorization: 'Bearer valid.jwt.token' } };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        next = jest.fn();
    });
    afterEach(() => jest.restoreAllMocks());

    const expectSignOut = (code) => {
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json.mock.calls[0][0].code).toBe(code);
        expect(next).not.toHaveBeenCalled();
    };

    it('no token → 401 SESSION_MISSING', async () => {
        req.headers = {};
        await verifyToken(req, res, next);
        expectSignOut('SESSION_MISSING');
    });

    it('no Bearer prefix → 401 SESSION_MISSING', async () => {
        req.headers.authorization = 'InvalidFormatToken12345';
        await verifyToken(req, res, next);
        expectSignOut('SESSION_MISSING');
    });

    it('invalid or expired token → 401 SESSION_EXPIRED (not 403)', async () => {
        jest.spyOn(jwt, 'verify').mockImplementationOnce(() => { throw new Error('jwt expired'); });
        await verifyToken(req, res, next);
        expectSignOut('SESSION_EXPIRED');
    });

    it('user no longer exists → 401 SESSION_REVOKED', async () => {
        jest.spyOn(jwt, 'verify').mockReturnValueOnce({ id: 'ghost', tv: 0 });
        jest.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce(null);
        await verifyToken(req, res, next);
        expectSignOut('SESSION_REVOKED');
    });

    it('deactivated account → an already-issued token stops working', async () => {
        jest.spyOn(jwt, 'verify').mockReturnValueOnce({ id: 'u1', tv: 0 });
        jest.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({ ...activeUser, deleted_at: new Date() });
        await verifyToken(req, res, next);
        expectSignOut('SESSION_REVOKED');
    });

    it('stale token version (password changed / signed out everywhere) → 401 SESSION_REVOKED', async () => {
        jest.spyOn(jwt, 'verify').mockReturnValueOnce({ id: 'u1', tv: 2 });
        jest.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({ ...activeUser, token_version: 3 });
        await verifyToken(req, res, next);
        expectSignOut('SESSION_REVOKED');
    });

    it('a pre-versioning token (no tv) works until the first revocation', async () => {
        jest.spyOn(jwt, 'verify').mockReturnValue({ id: 'u1', iat: 100 });
        jest.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce(activeUser);
        await verifyToken(req, res, next);
        expect(next).toHaveBeenCalled();

        next.mockClear();
        prisma.user.findUnique.mockResolvedValueOnce({ ...activeUser, token_version: 1 });
        await verifyToken(req, res, next);
        expectSignOut('SESSION_REVOKED');
    });

    it('valid token → attaches the user and token time, calls next()', async () => {
        jest.spyOn(jwt, 'verify').mockReturnValueOnce({ id: 'u1', tv: 0, iat: 1234 });
        jest.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce(activeUser);
        await verifyToken(req, res, next);
        expect(req.user).toEqual({ id: 'u1', email: 'a@b.c', name: 'Ali', role: 'user' });
        expect(req.auth).toEqual({ iat: 1234, tokenVersion: 0 });
        expect(next).toHaveBeenCalled();
    });

    it('database trouble is not a sign-out → 503', async () => {
        jest.spyOn(jwt, 'verify').mockReturnValueOnce({ id: 'u1', tv: 0 });
        jest.spyOn(prisma.user, 'findUnique').mockRejectedValueOnce(new Error('db down'));
        jest.spyOn(console, 'error').mockImplementation(() => {});
        await verifyToken(req, res, next);
        expect(res.status).toHaveBeenCalledWith(503);
    });
});
