import { jest } from '@jest/globals';
import prisma from '../../utils/prisma.js';

const embedContent = jest.fn();
jest.unstable_mockModule('@google/generative-ai', () => ({
    GoogleGenerativeAI: class { getGenerativeModel() { return { embedContent }; } },
}));
process.env.GEMINI_API_KEY = 'test';
const { processDocument, listDocuments, exceedsIndexLimit, chunkText } = await import('../documentProcessor.service.js');

beforeEach(() => {
    embedContent.mockReset().mockResolvedValue({ embedding: { values: [0.1, 0.2] } });
    jest.spyOn(prisma.chatDocument, 'create').mockResolvedValue({ id: 'd1' });
    jest.spyOn(prisma.chatDocument, 'update').mockResolvedValue({});
    jest.spyOn(prisma, '$executeRaw').mockReturnValue('insert');
    jest.spyOn(prisma, '$transaction').mockResolvedValue([]);
});
afterEach(() => jest.restoreAllMocks());

describe('processDocument', () => {
    it('returns at once as embedding, then becomes ready with every chunk written together', async () => {
        const out = await processDocument('u1', 'policy.txt', 'text/plain', 'word '.repeat(1200));
        expect(out).toMatchObject({ documentId: 'd1', status: 'embedding', truncated: false });
        expect(prisma.chatDocument.create.mock.calls[0][0].data.status).toBe('embedding');

        expect(await out.done).toBe('ready');
        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
        expect(prisma.$transaction.mock.calls[0][0]).toHaveLength(out.chunkCount);
        expect(prisma.chatDocument.update).toHaveBeenLastCalledWith({ where: { id: 'd1' }, data: { status: 'ready', error: null } });
    });

    it('a failure part-way writes no chunks and marks the document failed', async () => {
        embedContent.mockResolvedValueOnce({ embedding: { values: [1] } }).mockRejectedValueOnce(new Error('quota exceeded'));
        const out = await processDocument('u1', 'policy.txt', 'text/plain', 'word '.repeat(1200));
        expect(await out.done).toBe('failed');
        expect(prisma.$transaction).not.toHaveBeenCalled();
        expect(prisma.chatDocument.update.mock.calls.at(-1)[0].data).toMatchObject({ status: 'failed', error: expect.stringContaining('quota exceeded') });
    }, 20000);

    it('flags documents longer than the index limit', () => {
        expect(exceedsIndexLimit('w '.repeat(1000))).toBe(false);
        expect(exceedsIndexLimit('w '.repeat(100000))).toBe(true);
        expect(chunkText('w '.repeat(100000))).toHaveLength(200);
    });
});

describe('listDocuments', () => {
    it('reports long-stuck indexing as failed', async () => {
        const stale = jest.spyOn(prisma.chatDocument, 'updateMany').mockResolvedValue({ count: 1 });
        jest.spyOn(prisma.chatDocument, 'findMany').mockResolvedValue([]);
        await listDocuments('u1', new Date('2026-10-27T12:00:00Z'));
        expect(stale.mock.calls[0][0]).toMatchObject({
            where: { user_id: 'u1', status: 'embedding', created_at: { lt: new Date('2026-10-27T11:30:00Z') } },
            data: { status: 'failed' },
        });
    });
});
