import Fuse from 'fuse.js';
import prisma from '../utils/prisma.js';
import NodeCache from 'node-cache';
import { aiCategorizeBatch, getCachedCategories, saveToCache } from './aiCategorizer.service.js';

const memCache = new NodeCache({ stdTTL: 3600 });

// Keyword corpus — each entry maps a search term to its category
const categoryKeywords = {
    'ATM Withdrawal': ['atm withdrawal', 'cash withdrawal', 'atm cash', 'atm debit'],
    'Profit/Dividend': ['account credited dividends', 'dividend', 'profit credited', 'mark up', 'markup', 'interest credit', 'return on deposit'],
    'Salary': ['salary', 'payroll', 'wages', 'salary credit'],
    'Bank Charges': ['service charge', 'bank charges', 'wht deducted', 'tax deducted', 'switch charges', 'sms charge', 'maintenance fee', 'withholding tax'],
    'Transfer': ['eft rec', 'rec from bank', 'raast mobile', 'raast transfer', 'ibft', 'mpbl', 'online transfer', 'fund transfer', 'inter bank'],
    'Food & Dining': ['starbucks', 'restaurant', 'cafe', 'pizza', 'burger', 'food panda', 'foodpanda', 'lunch', 'dinner', 'bakery', 'kfc', 'mcdonalds', 'hardees', 'buns', 'donut'],
    'Groceries': ['carrefour', 'imtiaz', 'metro cash', 'al fatah', 'grocery', 'supermarket', 'hyperstar', 'lal qila', 'store purchase'],
    'Utilities': ['k-electric', 'kelectric', 'sui gas', 'wapda', 'electric bill', 'gas bill', 'water bill', 'internet bill', 'ptcl', 'jazz', 'telenor', 'zong', 'ufone', 'nptc', 'bill payment'],
    'Transportation': ['uber', 'careem', 'indriver', 'petrol', 'shell', 'pso', 'total parco', 'fuel', 'toll tax', 'parking fee'],
    'Shopping': ['amazon', 'daraz', 'mall', 'retail', 'clothing', 'shoes', 'garments'],
    'Entertainment': ['cinema', 'movie', 'spotify', 'netflix', 'youtube premium', 'cinepax', 'nueplex'],
    'Education': ['school fee', 'university fee', 'tuition', 'course fee', 'coaching', 'academy'],
    'Healthcare': ['hospital', 'pharmacy', 'medicine', 'clinic', 'dental', 'shaukat khanum', 'aga khan', 'laboratory', 'diagnostic'],
    'Travel': ['hotel', 'booking.com', 'airbnb', 'pia ticket', 'airblue', 'serene air', 'airline'],
    'Subscription': ['subscription', 'membership fee', 'premium plan', 'license fee'],
    'Insurance': ['insurance premium', 'takaful', 'efu', 'jubilee insurance', 'policy payment'],
    'Investment': ['mutual fund', 'al meezan', 'mcb arif habib', 'ubl funds', 'nit', 'unit purchase']
};

// Build flat list for fuse.js: [{ term, category }, ...]
const fuseItems = [];
for (const [category, terms] of Object.entries(categoryKeywords)) {
    for (const term of terms) {
        fuseItems.push({ term, category });
    }
}

const fuse = new Fuse(fuseItems, {
    keys: ['term'],
    threshold: 0.4,
    includeScore: true,
    minMatchCharLength: 3
});

/**
 * Fuzzy-match a description against the keyword corpus.
 * Returns { category, confidence } or null if no match.
 */
function fuzzyMatch(description) {
    const results = fuse.search(description);
    if (!results.length) return null;

    const best = results[0];
    const score = best.score; // 0 = perfect, 1 = worst
    if (score > 0.4) return null;

    // Confidence: lower score = higher confidence
    const confidence = score < 0.2 ? 0.85 : 0.70;
    return { category: best.item.category, confidence };
}

/**
 * Check the user's learned CategoryPattern table.
 */
async function getUserPattern(userId, description) {
    const cacheKey = `pat_${userId}_${description.substring(0, 40)}`;
    let hit = memCache.get(cacheKey);
    if (hit !== undefined) return hit || null;

    const keywords = extractKeywords(description);
    let pattern = null;

    for (const kw of keywords) {
        pattern = await prisma.categoryPattern.findFirst({
            where: { user_id: userId, keyword: kw },
            orderBy: { confidence: 'desc' }
        });
        if (pattern) break;
    }

    memCache.set(cacheKey, pattern || false);
    return pattern;
}

function extractKeywords(description) {
    const stopwords = new Set(['the', 'a', 'an', 'and', 'or', 'by', 'to', 'from', 'for', 'in', 'of']);
    return description
        .split(/\s+/)
        .slice(0, 5)
        .filter(w => w.length > 2 && !stopwords.has(w))
        .map(w => w.toUpperCase());
}

/**
 * Categorise a single transaction (used for individual lookups).
 */
export async function categorizeTransaction(userId, description, amount = null) {
    if (!description) return { category: 'Other', confidence: 0, method: 'default' };

    const norm = description.toLowerCase().trim();

    // Layer 1: user-learned patterns
    const userPattern = await getUserPattern(userId, norm);
    if (userPattern) {
        return { category: userPattern.assigned_category, confidence: parseFloat(userPattern.confidence), method: 'pattern' };
    }

    // Layer 2: DB cache (previous AI/fuzzy result)
    const cacheHits = await getCachedCategories(userId, [norm]);
    if (cacheHits.has(norm)) {
        const hit = cacheHits.get(norm);
        return { category: hit.category, confidence: hit.confidence, method: 'cache' };
    }

    // Layer 3: fuzzy keyword match
    const fuzzy = fuzzyMatch(norm);
    if (fuzzy) {
        await saveToCache(userId, [{ description: norm, ...fuzzy, source: 'fuzzy' }]);
        return { category: fuzzy.category, confidence: fuzzy.confidence, method: 'fuzzy' };
    }

    // Layer 4: AI
    const aiResults = await aiCategorizeBatch([norm]);
    const aiResult = aiResults.get(norm);
    if (aiResult && aiResult.category !== 'Other') {
        await saveToCache(userId, [{ description: norm, ...aiResult }]);
    }
    return { category: aiResult?.category || 'Other', confidence: aiResult?.confidence || 0.1, method: 'ai' };
}

/**
 * Categorise an array of transactions in one efficient pass.
 * Returns an array of { category, confidence, method } in the same order as input.
 */
export async function categorizeTransactionBatch(userId, transactions) {
    if (!transactions.length) return [];

    const results = new Array(transactions.length).fill(null);
    const norms = transactions.map(tx => (tx.description || '').toLowerCase().trim());

    // Layer 1: user-learned patterns (per-item, in-memory cached)
    const needsMore = [];
    for (let i = 0; i < transactions.length; i++) {
        const pattern = await getUserPattern(userId, norms[i]);
        if (pattern) {
            results[i] = { category: pattern.assigned_category, confidence: parseFloat(pattern.confidence), method: 'pattern' };
        } else {
            needsMore.push(i);
        }
    }

    if (!needsMore.length) return results;

    // Layer 2: DB cache lookup (batch)
    const uniqueDescs = [...new Set(needsMore.map(i => norms[i]))];
    const cacheHits = await getCachedCategories(userId, uniqueDescs);

    const needsFuzzy = [];
    for (const i of needsMore) {
        const hit = cacheHits.get(norms[i]);
        if (hit) {
            results[i] = { category: hit.category, confidence: hit.confidence, method: 'cache' };
        } else {
            needsFuzzy.push(i);
        }
    }

    if (!needsFuzzy.length) return results;

    // Layer 3: fuzzy matching
    const needsAI = [];
    const fuzzyToCache = [];
    for (const i of needsFuzzy) {
        const fuzzy = fuzzyMatch(norms[i]);
        if (fuzzy) {
            results[i] = { ...fuzzy, method: 'fuzzy' };
            fuzzyToCache.push({ description: norms[i], ...fuzzy, source: 'fuzzy' });
        } else {
            needsAI.push(i);
        }
    }

    if (fuzzyToCache.length) {
        // Deduplicate by description before saving
        const unique = [...new Map(fuzzyToCache.map(e => [e.description, e])).values()];
        await saveToCache(userId, unique);
    }

    if (!needsAI.length) return results;

    // Layer 4: AI batch call
    const uniqueAIDescs = [...new Set(needsAI.map(i => norms[i]))];
    const aiResults = await aiCategorizeBatch(uniqueAIDescs);

    const aiToCache = [];
    for (const i of needsAI) {
        const aiResult = aiResults.get(norms[i]);
        results[i] = {
            category: aiResult?.category || 'Other',
            confidence: aiResult?.confidence || 0.1,
            method: aiResult?.source === 'ai' ? 'ai' : 'default'
        };
        if (aiResult && aiResult.category !== 'Other') {
            aiToCache.push({ description: norms[i], ...aiResult });
        }
    }

    if (aiToCache.length) {
        const unique = [...new Map(aiToCache.map(e => [e.description, e])).values()];
        await saveToCache(userId, unique);
    }

    return results;
}

/**
 * Learn from user's manual categorisation (called on transaction approval).
 */
export async function recordUserCategory(userId, description, approvedCategory) {
    if (!description || !approvedCategory) return;

    const keywords = extractKeywords(description);

    for (const keyword of keywords) {
        const existing = await prisma.categoryPattern.findFirst({
            where: { user_id: userId, keyword, assigned_category: approvedCategory }
        });

        if (existing) {
            await prisma.categoryPattern.update({
                where: { id: existing.id },
                data: {
                    occurrences: { increment: 1 },
                    confidence: Math.min(existing.confidence.toNumber() + 0.05, 1),
                    last_used: new Date()
                }
            });
        } else {
            await prisma.categoryPattern.create({
                data: { user_id: userId, keyword, assigned_category: approvedCategory, confidence: 0.7, occurrences: 1 }
            });
        }

        memCache.del(`pat_${userId}_${description.toLowerCase().trim().substring(0, 40)}`);
    }

    // Also update the CategoryCache so future imports reflect the correction
    const norm = description.toLowerCase().trim();
    await saveToCache(userId, [{ description: norm, category: approvedCategory, confidence: 0.95, source: 'user' }]);
}

export function getCategoryOptions() {
    return Object.keys(categoryKeywords);
}
