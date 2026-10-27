import { jest } from '@jest/globals';
import { Prisma } from '@prisma/client';
import prisma from '../../utils/prisma.js';
import bcrypt from 'bcrypt';
import { updatePreferences, requestAccountDeletion } from '../preferences.controller.js';

describe('updatePreferences', () => {
    let req, res, update;

    beforeEach(() => {
        req = { user: { id: 'u1' }, body: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({ onboarded_at: null, interests: null });
        update = jest.spyOn(prisma.user, 'update').mockImplementation(async ({ data }) => ({
            onboarded_at: data.onboarded_at ?? null,
            interests: 'interests' in data ? data.interests : null,
            notify_weekly_summary: data.notify_weekly_summary ?? true,
            notify_bill_reminders: data.notify_bill_reminders ?? true,
        }));
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });
    afterEach(() => jest.restoreAllMocks());

    it('writes only req.user.id', async () => {
        req.body = { interests: ['gold'], userId: 'someone-else' };
        await updatePreferences(req, res);
        expect(update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'u1' } }));
    });

    it('saves picked interests deduplicated', async () => {
        req.body = { interests: ['gold', 'gold', 'stocks'] };
        await updatePreferences(req, res);
        expect(update.mock.calls[0][0].data.interests).toEqual(['gold', 'stocks']);
        expect(res.json).toHaveBeenCalledWith({
            onboarded_at: null, interests: ['gold', 'stocks'],
            notifications: { weeklySummary: true, billReminders: true },
        });
    });

    it('accepts null (show everything) and [] (core only)', async () => {
        req.body = { interests: [] };
        await updatePreferences(req, res);
        expect(update.mock.calls[0][0].data.interests).toEqual([]);

        req.body = { interests: null };
        await updatePreferences(req, res);
        // DbNull = SQL NULL, the same as new and backfilled users
        // (JsonNull would store the JSON value 'null' instead).
        expect(update.mock.calls[1][0].data.interests).toBe(Prisma.DbNull);
        expect(res.status).not.toHaveBeenCalled();
    });

    it('rejects an unknown key with 400', async () => {
        req.body = { interests: ['crypto'] };
        await updatePreferences(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: expect.stringMatching(/crypto/) });
        expect(update).not.toHaveBeenCalled();
    });

    it('rejects a non-array, non-null interests with 400', async () => {
        req.body = { interests: 'gold' };
        await updatePreferences(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(update).not.toHaveBeenCalled();
    });

    it('completeOnboarding sets onboarded_at only when unset', async () => {
        req.body = { completeOnboarding: true };
        await updatePreferences(req, res);
        expect(update.mock.calls[0][0].data.onboarded_at).toBeInstanceOf(Date);

        const earlier = new Date('2026-01-01T00:00:00Z');
        prisma.user.findUnique.mockResolvedValue({ onboarded_at: earlier, interests: null });
        req.body = { completeOnboarding: true };
        await updatePreferences(req, res);
        expect(update.mock.calls[1][0].data).not.toHaveProperty('onboarded_at');
    });

    it('does not touch interests when only completing onboarding', async () => {
        req.body = { completeOnboarding: true };
        await updatePreferences(req, res);
        expect(update.mock.calls[0][0].data).not.toHaveProperty('interests');
    });
});

describe('notification preferences', () => {
    afterEach(() => jest.restoreAllMocks());

    it('turns emails on and off', async () => {
        const update = jest.spyOn(prisma.user, 'update').mockResolvedValue({ onboarded_at: null, interests: null, notify_weekly_summary: false, notify_bill_reminders: true });
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        await updatePreferences({ user: { id: 'u1' }, body: { notifications: { weeklySummary: false } } }, res);
        expect(update.mock.calls[0][0].data).toEqual({ notify_weekly_summary: false });
        expect(res.json.mock.calls[0][0].notifications).toEqual({ weeklySummary: false, billReminders: true });
    });

    it('rejects anything but true/false', async () => {
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        await updatePreferences({ user: { id: 'u1' }, body: { notifications: { weeklySummary: 'no' } } }, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
});

describe('requestAccountDeletion', () => {
    const res = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
    afterEach(() => jest.restoreAllMocks());

    it('needs the right password, then deactivates and signs out everywhere', async () => {
        jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({ password_hash: 'h', role: 'user' });
        jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(false).mockResolvedValueOnce(true);
        const update = jest.spyOn(prisma.user, 'update').mockResolvedValue({});

        const wrong = res();
        await requestAccountDeletion({ user: { id: 'u1' }, body: { password: 'nope' } }, wrong);
        expect(wrong.status).toHaveBeenCalledWith(400);
        expect(update).not.toHaveBeenCalled();

        await requestAccountDeletion({ user: { id: 'u1' }, body: { password: 'right' } }, res());
        expect(update.mock.calls[0][0]).toMatchObject({
            where: { id: 'u1' },
            data: { deletion_requested_by: 'u1', token_version: { increment: 1 } },
        });
        expect(update.mock.calls[0][0].data.deleted_at).toBeInstanceOf(Date);
    });

    it('accounts without a password need a fresh sign-in', async () => {
        jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({ password_hash: null, role: 'user' });
        const r = res();
        await requestAccountDeletion({ user: { id: 'u1' }, auth: { iat: Math.floor(Date.now() / 1000) - 3600 }, body: {} }, r);
        expect(r.json.mock.calls[0][0].code).toBe('REAUTH_REQUIRED');
    });
});
