import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';
import prisma from '../../utils/prisma.js';

// Jest will automatically use the `__mocks__/email.js` implementation for this module
jest.unstable_mockModule('../../utils/email.js', () => import('../../utils/__mocks__/email.js'));

const { register, login, setPin, verifyPin, getMe } = await import('../auth.controller.js');

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

        it('should return 400 if a verified user with email already exists', async () => {
            mockReq.body = { email: 'test@example.com', password: 'password123', name: 'Tester' };

            jest.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({ id: '123e4567-e89b-12d3-a456-426614174000' });
            jest.spyOn(prisma, '$queryRaw').mockResolvedValueOnce([{ email_verified: true }]);

            await register(mockReq, mockRes);

            expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'An account with this email already exists. Please sign in instead.' });
        });

        it('should resend verification (200) if the existing user is unverified', async () => {
            mockReq.body = { email: 'test@example.com', password: 'password123', name: 'Tester' };

            jest.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
                id: '123e4567-e89b-12d3-a456-426614174000', email: 'test@example.com', name: 'Tester',
            });
            jest.spyOn(prisma, '$queryRaw').mockResolvedValueOnce([{ email_verified: false }]);
            jest.spyOn(prisma, '$executeRaw').mockResolvedValueOnce(1);

            await register(mockReq, mockRes);

            expect(prisma.$executeRaw).toHaveBeenCalledTimes(1); // fresh token stored
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                email: 'test@example.com',
                requiresVerification: true,
            }));
        });

        it('should create an unverified user and return 201 asking to verify email', async () => {
            mockReq.body = { email: 'new@example.com', password: 'securepassword', name: 'John Doe' };

            jest.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce(null);
            // Mock bcrypt to avoid doing actual heavy hashing
            jest.spyOn(bcrypt, 'hash').mockResolvedValueOnce('hashed_password_string');
            jest.spyOn(prisma, '$queryRaw').mockResolvedValueOnce([
                { id: '123e4567-e89b-12d3-a456-426614174001', name: 'John Doe', email: 'new@example.com' },
            ]);

            await register(mockReq, mockRes);

            expect(prisma.$queryRaw).toHaveBeenCalledTimes(1); // the INSERT
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                email: 'new@example.com',
                requiresVerification: true,
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
            // Account status lookups (deactivated? verified?) — active, verified user
            jest.spyOn(prisma, '$queryRaw').mockResolvedValue([{ email_verified: true, deleted_at: null }]);

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

    describe('getMe', () => {
        it('returns onboarded_at and interests', async () => {
            mockReq.user = { id: 'u1' };
            const onboarded = new Date('2026-10-21T00:00:00Z');
            jest.spyOn(prisma.user, 'findUnique').mockResolvedValueOnce({
                id: 'u1', name: 'A', email: 'a@x.com', role: 'user', app_pin_code: null,
                must_change_password: false, terms_accepted_at: null, privacy_accepted_at: null,
                onboarded_at: onboarded, interests: ['gold'],
            });

            await getMe(mockReq, mockRes);

            expect(prisma.user.findUnique.mock.calls[0][0].select).toMatchObject({ onboarded_at: true, interests: true });
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                onboarded_at: onboarded,
                interests: ['gold'],
            }));
        });
    });
});
