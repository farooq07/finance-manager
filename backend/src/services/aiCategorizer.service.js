import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';

const CATEGORIES = [
    'ATM Withdrawal', 'Profit/Dividend', 'Salary', 'Bank Charges', 'Transfer',
    'Food & Dining', 'Groceries', 'Utilities', 'Transportation', 'Shopping',
    'Entertainment', 'Education', 'Healthcare', 'Travel', 'Subscription',
    'Insurance', 'Investment', 'Other'
];

const PROMPT_TEMPLATE = (numbered) => `You are a Pakistani bank transaction categoriser. Categorise each transaction description into exactly one of these categories:
${CATEGORIES.join(', ')}

Rules:
- ATM Withdrawal: any ATM cash withdrawal
- Transfer: IBFT, RAAST, EFT, inter-bank transfers, received/sent funds
- Bank Charges: service fees, WHT, SMS charges, maintenance fees, withholding tax
- Profit/Dividend: interest/profit credited, dividend payments, mark-up
- Salary: payroll, salary credits, wages
- Use "Other" only when nothing else fits

Return ONLY a valid JSON object mapping the number (as string key) to the category name. No explanation, no markdown, no code block.

Example: {"1":"Transfer","2":"Bank Charges","3":"Salary"}

Transactions:
${numbered}`;

let geminiClient = null;
let groqClient = null;

function getProvider() {
    const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
    if (provider === 'gemini' && process.env.GEMINI_API_KEY) return 'gemini';
    if (provider === 'groq' && process.env.GROQ_API_KEY) return 'groq';
    if (process.env.GEMINI_API_KEY) return 'gemini';
    if (process.env.GROQ_API_KEY) return 'groq';
    return null;
}

async function callGemini(descriptions) {
    if (!geminiClient) geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = geminiClient.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const numbered = descriptions.map((d, i) => `${i + 1}. ${d}`).join('\n');
    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: PROMPT_TEMPLATE(numbered) }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1024, responseMimeType: 'application/json' }
    });

    const text = result.response.text();
    return JSON.parse(text);
}

async function callGroq(descriptions) {
    if (!groqClient) groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const numbered = descriptions.map((d, i) => `${i + 1}. ${d}`).join('\n');
    const completion = await groqClient.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: PROMPT_TEMPLATE(numbered) }],
        temperature: 0.1,
        max_tokens: 1024,
        response_format: { type: 'json_object' }
    });

    return JSON.parse(completion.choices[0]?.message?.content || '{}');
}

/**
 * Categorise a batch of unique descriptions via the configured AI provider.
 * Returns a Map<description, { category, confidence, source }>.
 */
export async function aiCategorizeBatch(descriptions) {
    const results = new Map();
    if (!descriptions.length) return results;

    const provider = getProvider();
    if (!provider) {
        console.warn('[AI_CAT] No AI provider configured (set GEMINI_API_KEY or GROQ_API_KEY)');
        descriptions.forEach(d => results.set(d, { category: 'Other', confidence: 0.1, source: 'ai_unavailable' }));
        return results;
    }

    try {
        const parsed = provider === 'gemini'
            ? await callGemini(descriptions)
            : await callGroq(descriptions);

        descriptions.forEach((desc, i) => {
            const category = parsed[String(i + 1)];
            if (category && CATEGORIES.includes(category)) {
                results.set(desc, { category, confidence: 0.80, source: 'ai' });
            } else {
                results.set(desc, { category: 'Other', confidence: 0.1, source: 'ai' });
            }
        });

        logger.log(`[AI_CAT] ${provider} categorised ${descriptions.length} descriptions`);
    } catch (err) {
        console.error(`[AI_CAT] ${provider} batch failed:`, err.message);
        descriptions.forEach(d => results.set(d, { category: 'Other', confidence: 0.1, source: 'ai_error' }));
    }

    return results;
}

/**
 * Look up cached categories for a list of normalised descriptions.
 * Returns a Map<description, { category, confidence, source }>.
 */
export async function getCachedCategories(userId, descriptions) {
    const results = new Map();
    if (!descriptions.length) return results;

    const rows = await prisma.categoryCache.findMany({
        where: { user_id: userId, description: { in: descriptions } },
        select: { description: true, category: true, confidence: true, source: true }
    });

    for (const row of rows) {
        results.set(row.description, {
            category: row.category,
            confidence: parseFloat(row.confidence),
            source: row.source
        });
    }

    if (rows.length > 0) {
        await prisma.categoryCache.updateMany({
            where: { user_id: userId, description: { in: rows.map(r => r.description) } },
            data: { hit_count: { increment: 1 }, last_used: new Date() }
        });
    }

    return results;
}

/**
 * Persist AI/fuzzy results to the cache.
 */
export async function saveToCache(userId, entries) {
    for (const entry of entries) {
        try {
            await prisma.categoryCache.upsert({
                where: { user_id_description: { user_id: userId, description: entry.description } },
                create: {
                    user_id: userId,
                    description: entry.description,
                    category: entry.category,
                    confidence: entry.confidence,
                    source: entry.source
                },
                update: {
                    category: entry.category,
                    confidence: entry.confidence,
                    source: entry.source,
                    last_used: new Date()
                }
            });
        } catch (err) {
            console.error('[AI_CAT] Cache save failed for:', entry.description, err.message);
        }
    }
}
