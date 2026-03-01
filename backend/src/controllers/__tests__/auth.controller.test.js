import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';
import prisma from '../../utils/prisma.js';

// Jest will automatically use the `__mocks__/email.js` implementation for this module
jest.unstable_mockModule('../../utils/email.js', () => import('../../utils/__mocks__/email.js'));

const { register, login, setPin, verifyPin } = await import('../auth.controller.js');

describe('Auth Controller Tests', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        mockReq = {
            body: {},
            user: {} // For endpoints expecting a mapped JWT payload
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        jest.clearAllMocks();
    });

    describe('register', () => {
        it('should return 400 if missing fields', async () => {
            mockReq.body = { email: 'asdf' };
            await register(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it('should return 400 if user with email already exists', async () => {
            mockReq.body = { email: 'test@example.com', password: 'password123', name: 'Tester' };

            jest.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({ id: '123e4567-e89b-12d3-a456-426614174000' });

            await register(mockReq, mockRes);

            expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'User with this email already exists' });
        });

        it('should execute prisma create and return 201 on success', async () => {
            mockReq.body = { email: 'new@example.com', password: 'securepassword', name: 'John Doe' };

            // Simulate no existing user
            jest.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce(null);

            // Mock bcrypt to avoid doing actual heavy hashing
            jest.spyOn(bcrypt, 'hash').mockResolvedValueOnce('hashed_password_string');

            // Simulate DB creation successful
            jest.spyOn(prisma.user, 'create').mockResolvedValueOnce({
                id: '123e4567-e89b-12d3-a456-426614174001',
                email: mockReq.body.email
            });

            await register(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                user: expect.any(Object),
                token: expect.any(String)
            }));
        });
    });

    describe('login', () => {
        it('should return 400 if wrong email', async () => {
            mockReq.body = { identifier: 'wrong@email.com', password: 'password' };
            jest.spyOn(prisma.user, 'findFirst').mockResolvedValueOnce(null); // No user found

            await login(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid email or password' });
        });

        it('should generate an OTP on valid credentials', async () => {
            mockReq.body = { identifier: 'user@email.com', password: 'correctpassword' };
            const fakeDbUser = { id: '123e4567-e89b-12d3-a456-426614174002', email: 'user@email.com', password_hash: 'bcrypted_correctpassword', name: 'Tester' };

            jest.spyOn(prisma.user, 'findFirst').mockResolvedValueOnce(fakeDbUser);
            jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true);

            // Should successfully process login OTP trigger
            jest.spyOn(prisma.user, 'update').mockResolvedValueOnce(fakeDbUser);
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            // await login(mockReq, mockRes);
            await login(mockReq, mockRes);

            expect(consoleSpy).not.toHaveBeenCalled();
            consoleSpy.mockRestore();

            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                message: 'OTP sent successfully',
                userId: '123e4567-e89b-12d3-a456-426614174002',
                email: 'user@email.com',
                requiresOtp: true
            }));
        });
    });
});
