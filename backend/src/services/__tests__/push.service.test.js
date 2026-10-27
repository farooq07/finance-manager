import { jest } from '@jest/globals';
import prisma from '../../utils/prisma.js';
import { PUSH_TOKEN_PATTERN, sendPush } from '../push.service.js';

describe('sendPush', () => {
    afterEach(() => jest.restoreAllMocks());

    it("sends to every phone and forgets the ones Expo says are gone", async () => {
        jest.spyOn(prisma.pushToken, 'findMany').mockResolvedValue([{ token: 'ExponentPushToken[a]' }, { token: 'ExponentPushToken[b]' }]);
        const del = jest.spyOn(prisma.pushToken, 'deleteMany').mockResolvedValue({ count: 1 });
        const fetchImpl = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ data: [{ status: 'ok' }, { status: 'error', details: { error: 'DeviceNotRegistered' } }] }),
        });

        const r = await sendPush(['u1'], { title: 'T', body: 'B', data: { path: '/x' } }, { fetchImpl });

        expect(r).toEqual({ sent: 1, removed: 1 });
        const sentBody = JSON.parse(fetchImpl.mock.calls[0][1].body);
        expect(sentBody.map((m) => m.to)).toEqual(['ExponentPushToken[a]', 'ExponentPushToken[b]']);
        expect(sentBody[0]).toMatchObject({ title: 'T', body: 'B', data: { path: '/x' } });
        expect(del).toHaveBeenCalledWith({ where: { token: { in: ['ExponentPushToken[b]'] } } });
    });

    it('does nothing for users without phones', async () => {
        jest.spyOn(prisma.pushToken, 'findMany').mockResolvedValue([]);
        const fetchImpl = jest.fn();
        expect(await sendPush(['u1'], { title: 'T', body: 'B' }, { fetchImpl })).toEqual({ sent: 0, removed: 0 });
        expect(fetchImpl).not.toHaveBeenCalled();
    });

    it('never throws — email stays the main channel', async () => {
        jest.spyOn(prisma.pushToken, 'findMany').mockRejectedValue(new Error('db down'));
        await expect(sendPush(['u1'], { title: 'T', body: 'B' })).resolves.toEqual({ sent: 0, removed: 0 });
    });

    it('accepts only Expo push tokens', () => {
        expect(PUSH_TOKEN_PATTERN.test('ExponentPushToken[xxxx]')).toBe(true);
        expect(PUSH_TOKEN_PATTERN.test('not-a-token')).toBe(false);
    });
});
