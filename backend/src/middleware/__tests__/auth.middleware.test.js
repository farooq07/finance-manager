import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';
import verifyToken from '../auth.middleware.js';

describe('Auth Middleware', () => {
    let mockReq;
    let mockRes;
    let mockNext;

    beforeEach(() => {
        mockReq = {
            headers: {}
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        mockNext = jest.fn();
    });

    it('should return 401 if no token is provided', () => {
        verifyToken(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Access denied. No token provided.' });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if token format is invalid (no Bearer)', () => {
        mockReq.headers.authorization = 'InvalidFormatToken12345';

        verifyToken(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Access denied. No token provided.' });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 if the token is invalid or expired', () => {
        // Provide token with Bearer prefix but it's an invalid token
        mockReq.headers.authorization = 'Bearer invalid.fake.token';

        // Mock jwt.verify to throw an error 
        jest.spyOn(jwt, 'verify').mockImplementationOnce(() => {
            throw new Error('invalid signature');
        });

        verifyToken(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid or expired token.' });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should attach decoded user to request and call next() if valid', () => {
        const mockDecodedUser = { id: 'user-123', email: 'test@example.com' };
        mockReq.headers.authorization = 'Bearer valid.jwt.token';

        // Mock jwt.verify to return our fake payload instead of throwing an error
        jest.spyOn(jwt, 'verify').mockImplementationOnce(() => mockDecodedUser);

        verifyToken(mockReq, mockRes, mockNext);

        expect(mockReq.user).toEqual(mockDecodedUser);
        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(mockRes.status).not.toHaveBeenCalled();
    });
});
