import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import prisma from '../../utils/prisma.js';

jest.unstable_mockModule('../../middleware/auth.middleware.js', () => ({
    default: (req, res, next) => { req.user = { id: 'u1', role: 'user' }; next(); },
}));
const forgetLearnedKeyword = jest.fn(async () => {});
jest.unstable_mockModule('../../services/categorizer.service.js', () => ({ forgetLearnedKeyword }));

const { default: router } = await import('../categoryRules.routes.js');
const app = express().use(express.json()).use('/rules', router);

beforeEach(() => jest.spyOn(prisma, '$transaction').mockResolvedValue([]));
afterEach(() => jest.restoreAllMocks());

describe('category rules API', () => {
    it('lists only the signed-in user\'s rules', async () => {
        const find = jest.spyOn(prisma.categoryPattern, 'findMany').mockResolvedValue([{ id: 'r1', keyword: 'KFC' }]);
        const res = await request(app).get('/rules');
        expect(res.status).toBe(200);
        expect(find.mock.calls[0][0].where).toEqual({ user_id: 'u1' });
    });

    it('editing a rule re-points the keyword and forgets the old learning', async () => {
        jest.spyOn(prisma.categoryPattern, 'findFirst').mockResolvedValue({ id: 'r1', keyword: 'KFC' });
        const res = await request(app).put('/rules/r1').send({ assigned_category: 'Food & Dining' });
        expect(res.status).toBe(200);
        expect(prisma.$transaction).toHaveBeenCalled();
        expect(forgetLearnedKeyword).toHaveBeenCalledWith('u1', 'KFC');
    });

    it('another user\'s rule is not found', async () => {
        const find = jest.spyOn(prisma.categoryPattern, 'findFirst').mockResolvedValue(null);
        const res = await request(app).delete('/rules/someone-elses');
        expect(res.status).toBe(404);
        expect(find.mock.calls[0][0].where).toEqual({ id: 'someone-elses', user_id: 'u1' });
    });

    it('adding a rule keeps one category per keyword', async () => {
        jest.spyOn(prisma.categoryPattern, 'upsert').mockResolvedValue({ id: 'new' });
        const del = jest.spyOn(prisma.categoryPattern, 'deleteMany').mockResolvedValue({ count: 1 });
        const res = await request(app).post('/rules').send({ keyword: 'foodpanda', assigned_category: 'Food & Dining' });
        expect(res.status).toBe(201);
        expect(del.mock.calls[0][0].where).toEqual({ user_id: 'u1', keyword: 'FOODPANDA', NOT: { id: 'new' } });
    });

    it('rejects a too-short keyword', async () => {
        const res = await request(app).post('/rules').send({ keyword: 'ab', assigned_category: 'Other' });
        expect(res.status).toBe(400);
    });
});
