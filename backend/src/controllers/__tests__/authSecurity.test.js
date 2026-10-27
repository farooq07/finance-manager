import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';
import prisma from '../../utils/prisma.js';
import { hashOtp } from '../../utils/session.js';

jest.unstable_mockModule('../../utils/email.js', () => import('../../utils/__mocks__/email.js'));
const auth = await import('../auth.controller.js');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const res = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
const future = () => new Date(Date.now() + 5 * 60 * 1000);
const baseUser = {
    id: 'u1', email: 'a@b.c', name: 'Ali', role: 'user', password_hash: 'hash',
    email_verified: true, deleted_at: null, must_change_password: false, app_pin_code: null,
    failed_login_attempts: 0, locked_until: null, pin_failed_attempts: 0, token_version: 0,
    otp_code: null, otp_expires_at: null, otp_purpose: null, otp_attempts: 0,
};

beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

describe('one-time codes', () => {
    it('a login code cannot reset the password', async () => {
        jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({ ...baseUser, otp_code: hashOtp('123456'), otp_expires_at: future(), otp_purpose: 'login' });
        const update = jest.spyOn(prisma.user, 'update').mockResolvedValue({});
        const r = res();
        await auth.resetPassword({ body: { email: 'a@b.c', otp: '123456', newPassword: 'longenough1' } }, r);
        expect(r.status).toHaveBeenCalledWith(400);
        expect(update).not.toHaveBeenCalled();
    });

    it('a reset code cannot sign in', async () => {
        jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({ ...baseUser, otp_code: hashOtp('123456'), otp_expires_at: future(), otp_purpose: 'reset' });
        const r = res();
        await auth.verifyOtp({ body: { userId: 'u1', otp: '123456' } }, r);
        expect(r.status).toHaveBeenCalledWith(400);
    });

    it('codes are stored hashed', async () => {
        jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(baseUser);
        const update = jest.spyOn(prisma.user, 'update').mockResolvedValue({});
        await auth.forgotPassword({ body: { email: 'a@b.c' } }, res());
        const data = update.mock.calls[0][0].data;
        expect(data.otp_code).toMatch(/^[0-9a-f]{64}$/);
        expect(data.otp_purpose).toBe('reset');
    });

    it('the 5th wrong code voids it', async () => {
        jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({ ...baseUser, otp_code: hashOtp('123456'), otp_expires_at: future(), otp_purpose: 'login', otp_attempts: 4 });
        const update = jest.spyOn(prisma.user, 'update').mockResolvedValue({});
        const r = res();
        await auth.verifyOtp({ body: { userId: 'u1', otp: '000000' } }, r);
        expect(update.mock.calls[0][0].data).toMatchObject({ otp_code: null, otp_purpose: null });
        expect(r.json.mock.calls[0][0].message).toMatch(/request a new one/);
    });

    it('a correct login code issues a versioned token and clears the code', async () => {
        jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({ ...baseUser, otp_code: hashOtp('123456'), otp_expires_at: future(), otp_purpose: 'login' });
        jest.spyOn(prisma.user, 'update').mockResolvedValue({ ...baseUser, token_version: 3 });
        const r = res();
        await auth.verifyOtp({ body: { userId: 'u1', otp: '123456' } }, r);
        const { token } = r.json.mock.calls[0][0];
        expect(jwt.verify(token, process.env.JWT_SECRET)).toMatchObject({ id: 'u1', tv: 3 });
    });
});

describe('password changes sign out other sessions', () => {
    it('reset password bumps token_version', async () => {
        jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({ ...baseUser, otp_code: hashOtp('123456'), otp_expires_at: future(), otp_purpose: 'reset' });
        const update = jest.spyOn(prisma.user, 'update').mockResolvedValue({});
        await auth.resetPassword({ body: { email: 'a@b.c', otp: '123456', newPassword: 'longenough1' } }, res());
        expect(update.mock.calls[0][0].data.token_version).toEqual({ increment: 1 });
    });

    it('reset password enforces the length rule', async () => {
        const r = res();
        await auth.resetPassword({ body: { email: 'a@b.c', otp: '123456', newPassword: 'short' } }, r);
        expect(r.status).toHaveBeenCalledWith(400);
        expect(r.json.mock.calls[0][0].code).toBe('VALIDATION');
    });

    it('first-password only works for a temporary password', async () => {
        jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({ must_change_password: false });
        const r = res();
        await auth.firstPasswordChange({ user: { id: 'u1' }, body: { newPassword: 'longenough1' } }, r);
        expect(r.status).toHaveBeenCalledWith(403);
    });

    it('first-password revokes old sessions and returns a token for this device', async () => {
        jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({ must_change_password: true });
        const update = jest.spyOn(prisma.user, 'update').mockResolvedValue({ id: 'u1', email: 'a@b.c', token_version: 1 });
        const r = res();
        await auth.firstPasswordChange({ user: { id: 'u1' }, body: { newPassword: 'longenough1' } }, r);
        expect(update.mock.calls[0][0].data.token_version).toEqual({ increment: 1 });
        expect(jwt.verify(r.json.mock.calls[0][0].token, process.env.JWT_SECRET).tv).toBe(1);
    });

    it('sign out everywhere bumps the version and keeps this device signed in', async () => {
        jest.spyOn(prisma.user, 'update').mockResolvedValue({ id: 'u1', email: 'a@b.c', token_version: 5 });
        const r = res();
        await auth.revokeAllSessions({ user: { id: 'u1' } }, r);
        expect(prisma.user.update.mock.calls[0][0].data).toEqual({ token_version: { increment: 1 } });
        expect(jwt.verify(r.json.mock.calls[0][0].token, process.env.JWT_SECRET).tv).toBe(5);
    });
});

describe('login attempt limit', () => {
    it('locks the account after 5 wrong passwords', async () => {
        jest.spyOn(prisma.user, 'findFirst').mockResolvedValue({ ...baseUser, failed_login_attempts: 4 });
        jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);
        const update = jest.spyOn(prisma.user, 'update').mockResolvedValue({});
        await auth.login({ body: { identifier: 'a@b.c', password: 'nope' } }, res());
        expect(update.mock.calls[0][0].data.locked_until).toBeInstanceOf(Date);
    });

    it('a locked account is refused even with the right password', async () => {
        jest.spyOn(prisma.user, 'findFirst').mockResolvedValue({ ...baseUser, locked_until: future() });
        const compare = jest.spyOn(bcrypt, 'compare');
        const r = res();
        await auth.login({ body: { identifier: 'a@b.c', password: 'right' } }, r);
        expect(r.status).toHaveBeenCalledWith(429);
        expect(r.json.mock.calls[0][0].code).toBe('ACCOUNT_LOCKED');
        expect(compare).not.toHaveBeenCalled();
    });
});

describe('app PIN', () => {
    it('wrong PIN → 401 WRONG_PIN with attempts left (not a session error)', async () => {
        jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({ ...baseUser, app_pin_code: 'h', pin_failed_attempts: 1 });
        jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);
        jest.spyOn(prisma.user, 'update').mockResolvedValue({});
        const r = res();
        await auth.verifyPin({ user: { id: 'u1' }, body: { pin: '1111' } }, r);
        expect(r.status).toHaveBeenCalledWith(401);
        expect(r.json.mock.calls[0][0]).toMatchObject({ code: 'WRONG_PIN', attemptsLeft: 3 });
    });

    it('the 5th wrong PIN signs out every session', async () => {
        jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({ ...baseUser, app_pin_code: 'h', pin_failed_attempts: 4 });
        jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);
        const update = jest.spyOn(prisma.user, 'update').mockResolvedValue({});
        const r = res();
        await auth.verifyPin({ user: { id: 'u1' }, body: { pin: '1111' } }, r);
        expect(update.mock.calls[0][0].data.token_version).toEqual({ increment: 1 });
        expect(r.json.mock.calls[0][0].code).toBe('SESSION_REVOKED');
    });

    it('replacing an existing PIN needs a fresh sign-in', async () => {
        jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({ app_pin_code: 'h' });
        const update = jest.spyOn(prisma.user, 'update');
        const stale = { user: { id: 'u1' }, auth: { iat: Math.floor(Date.now() / 1000) - 3600 }, body: { pin: '123456' } };
        const r = res();
        await auth.setupPin(stale, r);
        expect(r.status).toHaveBeenCalledWith(403);
        expect(r.json.mock.calls[0][0].code).toBe('REAUTH_REQUIRED');
        expect(update).not.toHaveBeenCalled();

        update.mockResolvedValue({});
        const fresh = { ...stale, auth: { iat: Math.floor(Date.now() / 1000) - 60 } };
        const r2 = res();
        await auth.setupPin(fresh, r2);
        expect(r2.json).toHaveBeenCalledWith({ message: 'PIN configured successfully' });
    });

    it('PINs must be exactly 6 digits (web and mobile share one PIN)', async () => {
        const r = res();
        await auth.setupPin({ user: { id: 'u1' }, body: { pin: 'abcd' } }, r);
        expect(r.status).toHaveBeenCalledWith(400);
    });
});
