import { jest } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';
import prisma from '../../utils/prisma.js';
import { openUploadSession, resolveUploadSession, claimUploadSession, cleanupAbandonedUploads, UPLOAD_TTL_MS } from '../uploadSession.service.js';

const ID = '11111111-2222-4333-8444-555555555555';
let file;

beforeEach(() => {
    file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'upl-')), 'statement.pdf');
    fs.writeFileSync(file, 'x');
    jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

const session = (over) => ({ id: ID, file_path: file, expires_at: new Date(Date.now() + 60_000), committed_at: null, ...over });

describe('upload sessions', () => {
    it('open binds the file to the user and account with an expiry', async () => {
        const create = jest.spyOn(prisma.uploadSession, 'create').mockResolvedValue({ id: ID });
        const now = new Date('2026-10-27T10:00:00Z');
        expect(await openUploadSession({ userId: 'u1', kind: 'bank', accountId: 'b1', filePath: file, now })).toBe(ID);
        expect(create.mock.calls[0][0].data).toEqual({
            user_id: 'u1', kind: 'bank', account_id: 'b1', file_path: file, expires_at: new Date(now.getTime() + UPLOAD_TTL_MS),
        });
    });

    it('resolve looks only at the signed-in user\'s session for that account', async () => {
        const find = jest.spyOn(prisma.uploadSession, 'findFirst').mockResolvedValue(session());
        const out = await resolveUploadSession({ uploadId: ID, userId: 'u1', kind: 'wallet', accountId: 'w1' });
        expect(out.filePath).toBe(file);
        expect(find.mock.calls[0][0].where).toEqual({ id: ID, user_id: 'u1', kind: 'wallet', account_id: 'w1' });
    });

    it('a filename (the old upload id) or another user\'s session is not found', async () => {
        const find = jest.spyOn(prisma.uploadSession, 'findFirst').mockResolvedValue(null);
        expect((await resolveUploadSession({ uploadId: 'someone-else.pdf', userId: 'u1', kind: 'bank', accountId: 'b1' })).status).toBe(400);
        expect(find).not.toHaveBeenCalled();
        expect((await resolveUploadSession({ uploadId: ID, userId: 'u1', kind: 'bank', accountId: 'b1' })).status).toBe(400);
    });

    it('expired or already-imported sessions are refused', async () => {
        jest.spyOn(prisma.uploadSession, 'findFirst').mockResolvedValueOnce(session({ expires_at: new Date(Date.now() - 1) }));
        expect((await resolveUploadSession({ uploadId: ID, userId: 'u1', kind: 'bank', accountId: 'b1' })).status).toBe(400);
        prisma.uploadSession.findFirst.mockResolvedValueOnce(session({ committed_at: new Date() }));
        expect((await resolveUploadSession({ uploadId: ID, userId: 'u1', kind: 'bank', accountId: 'b1' })).status).toBe(409);
    });

    it('claim succeeds once', async () => {
        jest.spyOn(prisma.uploadSession, 'updateMany').mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
        expect(await claimUploadSession(ID)).toBe(true);
        expect(await claimUploadSession(ID)).toBe(false);
        expect(prisma.uploadSession.updateMany.mock.calls[0][0].where).toEqual({ id: ID, committed_at: null });
    });

    it('cleanup deletes abandoned files but keeps imported ones', async () => {
        const kept = file.replace('statement', 'imported');
        fs.writeFileSync(kept, 'x');
        jest.spyOn(prisma.uploadSession, 'findMany').mockResolvedValue([
            { id: 'a', file_path: file, committed_at: null },
            { id: 'b', file_path: kept, committed_at: new Date() },
        ]);
        const del = jest.spyOn(prisma.uploadSession, 'deleteMany').mockResolvedValue({ count: 2 });
        const out = await cleanupAbandonedUploads();
        expect(out).toEqual({ removed: 1, sessions: 2 });
        expect(fs.existsSync(file)).toBe(false);
        expect(fs.existsSync(kept)).toBe(true);
        expect(del).toHaveBeenCalledWith({ where: { id: { in: ['a', 'b'] } } });
    });
});
