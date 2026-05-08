/**
 * Tests for the categorizer service.
 * Prisma and AI are mocked so only the fuzzy keyword layer is exercised.
 *
 * NOTE: Fuse.js threshold is 0.4 — only descriptions close to the exact keyword
 * corpus entries match. Multi-word descriptions with extra words score > 0.4 and
 * fall through to AI (which returns "Other" in these mocked tests).
 */
import { jest } from '@jest/globals';
import prisma from '../../utils/prisma.js';

jest.unstable_mockModule('../aiCategorizer.service.js', () => ({
    aiCategorizeBatch: jest.fn(async (descs) => {
        const m = new Map();
        descs.forEach(d => m.set(d, { category: 'Other', confidence: 0.1, source: 'ai' }));
        return m;
    }),
    getCachedCategories: jest.fn(async () => new Map()),
    saveToCache: jest.fn(async () => {}),
}));

jest.spyOn(prisma.categoryPattern, 'findFirst').mockResolvedValue(null);

const { categorizeTransaction, categorizeTransactionBatch, getCategoryOptions } = await import('../categorizer.service.js');

const USER_ID = 'test-user-uuid';

// ─── getCategoryOptions ───────────────────────────────────────────────────────

describe('getCategoryOptions', () => {
    it('returns an array of category strings', () => {
        const opts = getCategoryOptions();
        expect(Array.isArray(opts)).toBe(true);
        expect(opts.length).toBeGreaterThan(5);
    });

    it('includes expected categories', () => {
        const opts = getCategoryOptions();
        expect(opts).toContain('Food & Dining');
        expect(opts).toContain('Utilities');
        expect(opts).toContain('Transfer');
        expect(opts).toContain('Bank Charges');
        expect(opts).toContain('Salary');
        expect(opts).toContain('ATM Withdrawal');
    });
});

// ─── categorizeTransaction — fuzzy keyword matching ───────────────────────────
// Tests use descriptions that are exact or near-exact matches to corpus keywords.

describe('categorizeTransaction — exact keyword matches', () => {
    it('categorises "atm withdrawal" exactly', async () => {
        const result = await categorizeTransaction(USER_ID, 'atm withdrawal');
        expect(result.category).toBe('ATM Withdrawal');
        expect(result.method).toBe('fuzzy');
        expect(result.confidence).toBeGreaterThan(0);
    });

    it('categorises "salary" exactly', async () => {
        const result = await categorizeTransaction(USER_ID, 'salary');
        expect(result.category).toBe('Salary');
        expect(result.method).toBe('fuzzy');
    });

    it('categorises "ibft" as Transfer', async () => {
        const result = await categorizeTransaction(USER_ID, 'ibft');
        expect(result.category).toBe('Transfer');
    });

    it('categorises "hardees" as Food & Dining', async () => {
        const result = await categorizeTransaction(USER_ID, 'hardees');
        expect(result.category).toBe('Food & Dining');
    });

    it('categorises "starbucks" as Food & Dining', async () => {
        const result = await categorizeTransaction(USER_ID, 'starbucks');
        expect(result.category).toBe('Food & Dining');
    });

    it('categorises "careem" as Transportation', async () => {
        const result = await categorizeTransaction(USER_ID, 'careem');
        expect(result.category).toBe('Transportation');
    });

    it('categorises "petrol" as Transportation', async () => {
        const result = await categorizeTransaction(USER_ID, 'petrol');
        expect(result.category).toBe('Transportation');
    });

    it('categorises "service charge" as Bank Charges', async () => {
        const result = await categorizeTransaction(USER_ID, 'service charge');
        expect(result.category).toBe('Bank Charges');
    });

    it('categorises "dividend" as Profit/Dividend', async () => {
        const result = await categorizeTransaction(USER_ID, 'dividend');
        expect(result.category).toBe('Profit/Dividend');
    });

    it('categorises "mutual fund" as Investment', async () => {
        const result = await categorizeTransaction(USER_ID, 'mutual fund');
        expect(result.category).toBe('Investment');
    });

    it('categorises "hospital" as Healthcare', async () => {
        const result = await categorizeTransaction(USER_ID, 'hospital');
        expect(result.category).toBe('Healthcare');
    });

    it('categorises "insurance premium" as Insurance', async () => {
        const result = await categorizeTransaction(USER_ID, 'insurance premium');
        expect(result.category).toBe('Insurance');
    });
});

describe('categorizeTransaction — fallback to Other', () => {
    it('returns Other for completely unrecognised description', async () => {
        const result = await categorizeTransaction(USER_ID, 'xyzqjk randommerchant 9999abc');
        expect(result.category).toBe('Other');
    });

    it('returns Other for empty description', async () => {
        const result = await categorizeTransaction(USER_ID, '');
        expect(result.category).toBe('Other');
        expect(result.confidence).toBe(0);
    });

    it('returns Other for null description', async () => {
        const result = await categorizeTransaction(USER_ID, null);
        expect(result.category).toBe('Other');
    });

    it('returns Other for very short description below minMatchCharLength', async () => {
        const result = await categorizeTransaction(USER_ID, 'ab');
        expect(result.category).toBe('Other');
    });
});

// ─── categorizeTransactionBatch ───────────────────────────────────────────────

describe('categorizeTransactionBatch', () => {
    it('returns results in the same order as input', async () => {
        const txs = [
            { description: 'salary' },
            { description: 'careem' },
            { description: 'ibft' },
        ];

        const results = await categorizeTransactionBatch(USER_ID, txs);

        expect(results).toHaveLength(3);
        expect(results[0].category).toBe('Salary');
        expect(results[1].category).toBe('Transportation');
        expect(results[2].category).toBe('Transfer');
    });

    it('returns empty array for empty input', async () => {
        const results = await categorizeTransactionBatch(USER_ID, []);
        expect(results).toHaveLength(0);
    });

    it('returns Other for null/empty descriptions', async () => {
        const txs = [{ description: null }, { description: '' }];
        const results = await categorizeTransactionBatch(USER_ID, txs);
        expect(results).toHaveLength(2);
        results.forEach(r => expect(r.category).toBe('Other'));
    });

    it('handles a mix of known and unknown descriptions', async () => {
        const txs = [
            { description: 'salary' },
            { description: 'unknown vendor xyzabc abc123' },
        ];

        const results = await categorizeTransactionBatch(USER_ID, txs);
        expect(results[0].category).toBe('Salary');
        expect(results[1].category).toBe('Other');
    });

    it('deduplicates AI calls for repeated unknown descriptions', async () => {
        const { aiCategorizeBatch } = await import('../aiCategorizer.service.js');
        aiCategorizeBatch.mockClear();

        const txs = [
            { description: 'unknown merchant xyzabc 999 abc' },
            { description: 'unknown merchant xyzabc 999 abc' }, // same
        ];

        await categorizeTransactionBatch(USER_ID, txs);

        if (aiCategorizeBatch.mock.calls.length > 0) {
            const calledWith = aiCategorizeBatch.mock.calls[0][0];
            expect(new Set(calledWith).size).toBe(calledWith.length);
        }
    });
});
