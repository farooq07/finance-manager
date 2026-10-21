import { jest } from '@jest/globals';

// Each generateContent call answers for the numbered list it was sent,
// labelling item k of the chunk by the description's own index so the test
// can check results land on the right descriptions.
const generateContent = jest.fn();
jest.unstable_mockModule('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn(() => ({ getGenerativeModel: () => ({ generateContent }) })),
}));

process.env.AI_PROVIDER = 'gemini';
process.env.GEMINI_API_KEY = 'test-key';

const { aiCategorizeBatch, AI_BATCH_SIZE } = await import('../aiCategorizer.service.js');

const CATS = ['Transfer', 'Groceries', 'Utilities'];
const descs = (n) => Array.from({ length: n }, (_, i) => `DESC ${i}`);

// Answer every numbered line "k. DESC i" with CATS[i % 3].
const answerFromPrompt = async ({ contents }) => {
    const prompt = contents[0].parts[0].text;
    const out = {};
    for (const m of prompt.matchAll(/^(\d+)\. DESC (\d+)$/gm)) out[m[1]] = CATS[Number(m[2]) % 3];
    return { response: { text: () => JSON.stringify(out) } };
};

describe('aiCategorizeBatch chunking', () => {
    beforeEach(() => {
        generateContent.mockReset();
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('splits 100 descriptions into 3 requests of at most AI_BATCH_SIZE', async () => {
        generateContent.mockImplementation(answerFromPrompt);
        await aiCategorizeBatch(descs(100));
        expect(AI_BATCH_SIZE).toBe(40);
        expect(generateContent).toHaveBeenCalledTimes(3);
        for (const [arg] of generateContent.mock.calls) {
            const lines = arg.contents[0].parts[0].text.match(/^\d+\. DESC \d+$/gm);
            expect(lines.length).toBeLessThanOrEqual(AI_BATCH_SIZE);
        }
    });

    it('maps results across chunks', async () => {
        generateContent.mockImplementation(answerFromPrompt);
        const r = await aiCategorizeBatch(descs(100));
        expect(r.size).toBe(100);
        expect(r.get('DESC 40')).toMatchObject({ category: CATS[40 % 3], source: 'ai' });
        expect(r.get('DESC 99')).toMatchObject({ category: CATS[99 % 3], source: 'ai' });
    });

    it('one failing chunk marks only its own items ai_error', async () => {
        generateContent
            .mockImplementationOnce(answerFromPrompt)
            .mockRejectedValueOnce(new Error('quota'))
            .mockImplementationOnce(answerFromPrompt);
        const r = await aiCategorizeBatch(descs(100));
        expect(r.get('DESC 0').source).toBe('ai');
        expect(r.get('DESC 40').source).toBe('ai_error');
        expect(r.get('DESC 79').source).toBe('ai_error');
        expect(r.get('DESC 80').source).toBe('ai');
    });
});
