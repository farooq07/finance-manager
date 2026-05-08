import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';
import prisma from '../../utils/prisma.js';
import verifyToken from '../auth.middleware.js';

describe('Auth Middleware', () => {
    let mockReq;
    let mockRes;
    let mockNext;

    beforeEach(() => {
        mockReq = { headers: {} };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        mockNext = jest.fn();
    });

    it('should return 401 if no token is provided', async () => {
        await verifyToken(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Access denied. No token provided.' });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if authorization header has no Bearer prefix', async () => {
        mockReq.headers.authorization = 'InvalidFormatToken12345';

        await verifyToken(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 if jwt.verify throws (invalid or expired token)', async () => {
        mockReq.headers.authorization = 'Bearer invalid.fake.token';

        jest.spyOn(jwt, 'verify').mockImplementationOnce(() => {
            throw new Error('invalid signature');
        });

        await verifyToken(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid or expired token.' });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if token is valid but user does not exist in DB', async () => {
        const mockDecoded = { id: 'ghost-user-uuid' };
        mockReq.headers.authorization = 'Bearer valid.jwt.token';

        jest.spyOn(jwt, 'verify').mockReturnValueOnce(mockDecoded);
        jest.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce(null);

        await verifyToken(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'User not found.' });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should attach DB user to req and call next() when token is valid', async () => {
        const mockDecoded = { id: 'user-123' };
        const mockDbUser = { id: 'user-123', email: 'test@example.com', name: 'Test User', role: 'user' };
        mockReq.headers.authorization = 'Bearer valid.jwt.token';

        jest.spyOn(jwt, 'verify').mockReturnValueOnce(mockDecoded);
        jest.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce(mockDbUser);

        await verifyToken(mockReq, mockRes, mockNext);

        expect(mockReq.user).toEqual(mockDbUser);
        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(mockRes.status).not.toHaveBeenCalled();
    });
});
