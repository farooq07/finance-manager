import { jest } from '@jest/globals';
import prisma from '../../utils/prisma.js';

const searchChunks = jest.fn(async () => []);
jest.unstable_mockModule('../documentProcessor.service.js', () => ({ searchChunks }));

let release;
const generateContent = jest.fn();
jest.unstable_mockModule('@google/generative-ai', () => ({
    GoogleGenerativeAI: class {
        getGenerativeModel() {
            return { startChat: () => ({ sendMessage: generateContent }) };
        }
    },
    SchemaType: new Proxy({}, { get: (_t, k) => String(k) }),
}));

process.env.GEMINI_API_KEY = 'test';
process.env.AI_CHAT_PROVIDER = 'gemini';
const { chat, HISTORY_TURNS } = await import('../ragEngine.service.js');

const reply = (text) => ({ response: { text: () => text, functionCalls: () => [] } });

beforeEach(() => {
    jest.spyOn(prisma, '$transaction').mockResolvedValue([]);
    jest.spyOn(prisma.chatMessage, 'findMany').mockResolvedValue([]);
    generateContent.mockReset().mockResolvedValue(reply('Hello'));
});
afterEach(() => jest.restoreAllMocks());

describe('chat', () => {
    it('sends the most recent turns, oldest first', async () => {
        prisma.chatMessage.findMany.mockResolvedValue([{ role: 'assistant', content: 'newest' }, { role: 'user', content: 'older' }]);
        await chat('u1', 's1', 'hi');
        const q = prisma.chatMessage.findMany.mock.calls[0][0];
        expect(q.orderBy).toEqual({ created_at: 'desc' });
        expect(q.take).toBe(HISTORY_TURNS);
    });

    it('saves the question and the answer together, only after the answer exists', async () => {
        await chat('u1', 's1', 'hi');
        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
        expect(prisma.$transaction.mock.calls[0][0]).toHaveLength(3);
    });

    it('a failed reply saves nothing, so a retry does not duplicate the question', async () => {
        generateContent.mockRejectedValue(new Error('model down'));
        await expect(chat('u1', 's1', 'hi')).rejects.toThrow('model down');
        expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('a second send while the first is being answered is refused', async () => {
        generateContent.mockImplementation(() => new Promise((r) => { release = () => r(reply('ok')); }));
        const first = chat('u1', 's1', 'one');
        await new Promise((r) => setTimeout(r, 0));
        await expect(chat('u1', 's1', 'two')).rejects.toMatchObject({ status: 409 });
        release();
        await first;
    });

    it('returns document citations', async () => {
        searchChunks.mockResolvedValueOnce([{ filename: 'policy.pdf', similarity: 0.83, content: 'Premium due yearly' }]);
        const out = await chat('u1', 's1', 'when is my premium due?');
        expect(out.citations).toEqual([{ ref: 1, filename: 'policy.pdf', similarity: 0.83, excerpt: 'Premium due yearly' }]);
        expect(out.dataAsOf).toEqual(expect.any(String));
    });
});
