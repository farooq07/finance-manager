import { jest } from '@jest/globals';
import { Prisma } from '@prisma/client';
import prisma from '../../utils/prisma.js';
import { updatePreferences } from '../preferences.controller.js';

describe('updatePreferences', () => {
    let req, res, update;

    beforeEach(() => {
        req = { user: { id: 'u1' }, body: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({ onboarded_at: null, interests: null });
        update = jest.spyOn(prisma.user, 'update').mockImplementation(async ({ data }) => ({
            onboarded_at: data.onboarded_at ?? null,
            interests: 'interests' in data ? data.interests : null,
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
        expect(res.json).toHaveBeenCalledWith({ onboarded_at: null, interests: ['gold', 'stocks'] });
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
