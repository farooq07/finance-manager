import prisma from '../utils/prisma.js';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour

// Category keywords mapping
const categoryKeywords = {
    'Food & Dining': ['starbucks', 'restaurant', 'cafe', 'pizza', 'burger', 'food', 'lunch', 'dinner', 'bakery', 'grocery'],
    'Utilities': ['electric', 'gas', 'water', 'utility', 'telecom', 'internet', 'phone', 'wifi', 'broadband'],
    'Transportation': ['uber', 'taxi', 'petrol', 'gas station', 'transport', 'parking', 'toll', 'airway', 'airline'],
    'Shopping': ['amazon', 'daraz', 'mall', 'store', 'shop', 'retail', 'clothing', 'apparel', 'department'],
    'Entertainment': ['cinema', 'movie', 'spotify', 'netflix', 'gaming', 'game', 'entertainment', 'concert', 'tickets'],
    'Education': ['school', 'university', 'college', 'tuition', 'course', 'books', 'education', 'training', 'exam'],
    'Healthcare': ['hospital', 'doctor', 'pharmacy', 'medicine', 'health', 'clinic', 'dental', 'medical'],
    'Travel': ['hotel', 'accommodation', 'booking', 'airbnb', 'resort', 'travel', 'tourism', 'flight'],
    'Finance': ['bank', 'insurance', 'investment', 'loan', 'credit', 'debit', 'transfer', 'payment'],
    'Subscription': ['subscription', 'membership', 'premium', 'monthly', 'annual', 'license'],
    'Other': []
};

/**
 * Auto-categorize transaction based on description
 * Uses user's past patterns + keyword matching + ML
 */
export async function categorizeTransaction(userId, description, amount = null) {
    if (!description) {
        return { category: 'Other', confidence: 0, method: 'default' };
    }

    const cleanDesc = description.toLowerCase().trim();

    // 1. Check user's past patterns
    const userPattern = await getUserPattern(userId, cleanDesc);
    if (userPattern) {
        return {
            category: userPattern.assigned_category,
            confidence: parseFloat(userPattern.confidence),
            method: 'pattern'
        };
    }

    // 2. Keyword matching
    const keywordMatch = findCategoryByKeywords(cleanDesc);
    if (keywordMatch.confidence > 0) {
        return {
            category: keywordMatch.category,
            confidence: keywordMatch.confidence,
            method: 'keyword'
        };
    }

    // 3. Amount-based heuristic (rough guessing)
    if (amount) {
        const amountCategory = guessFromAmount(amount);
        if (amountCategory) {
            return {
                category: amountCategory,
                confidence: 0.3,
                method: 'amount_heuristic'
            };
        }
    }

    return { category: 'Other', confidence: 0, method: 'default' };
}

/**
 * Get user's learned category pattern
 */
async function getUserPattern(userId, keyword) {
    const cacheKey = `pattern_${userId}_${keyword}`;
    let pattern = cache.get(cacheKey);

    if (!pattern) {
        // Extract keywords from description (first 3 words, important terms)
        const keywords = extractKeywords(keyword);

        for (const kw of keywords) {
            pattern = await prisma.categoryPattern.findFirst({
                where: {
                    user_id: userId,
                    keyword: kw
                },
                orderBy: { confidence: 'desc' }
            });

            if (pattern) {
                cache.set(cacheKey, pattern);
                break;
            }
        }
    }

    return pattern;
}

/**
 * Extract important keywords from description
 */
function extractKeywords(description) {
    const words = description.split(/\s+/).slice(0, 5); // First 5 words
    const stopwords = ['the', 'a', 'an', 'and', 'or', 'by', 'to', 'from'];

    return words
        .filter(w => w.length > 2 && !stopwords.includes(w))
        .map(w => w.toUpperCase());
}

/**
 * Find category by keyword matching
 */
function findCategoryByKeywords(description) {
    let bestMatch = { category: 'Other', confidence: 0 };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
        let matchCount = 0;

        for (const keyword of keywords) {
            if (description.includes(keyword)) {
                matchCount++;
            }
        }

        if (matchCount > 0) {
            const confidence = Math.min(matchCount / keywords.length, 1);
            if (confidence > bestMatch.confidence) {
                bestMatch = { category, confidence };
            }
        }
    }

    return bestMatch;
}

/**
 * Guess category from transaction amount (very rough heuristic)
 */
function guessFromAmount(amount) {
    const absAmount = Math.abs(amount);

    if (absAmount < 500) return 'Food & Dining';
    if (absAmount < 2000) return 'Shopping';
    if (absAmount < 5000) return 'Utilities';
    if (absAmount > 50000) return 'Finance';

    return null;
}

/**
 * Learn from user's manual categorization
 * Called when user approves/corrects a transaction
 */
export async function recordUserCategory(userId, description, approvedCategory) {
    if (!description || !approvedCategory) return;

    const keywords = extractKeywords(description);

    for (const keyword of keywords) {
        // Update or create pattern
        const existing = await prisma.categoryPattern.findFirst({
            where: {
                user_id: userId,
                keyword,
                assigned_category: approvedCategory
            }
        });

        if (existing) {
            // Increase confidence and occurrences
            await prisma.categoryPattern.update({
                where: {
                    id: existing.id
                },
                data: {
                    occurrences: { increment: 1 },
                    confidence: Math.min(existing.confidence.toNumber() + 0.05, 1),
                    last_used: new Date()
                }
            });
        } else {
            // Create new pattern
            await prisma.categoryPattern.create({
                data: {
                    user_id: userId,
                    keyword,
                    assigned_category: approvedCategory,
                    confidence: 0.7,
                    occurrences: 1
                }
            });
        }

        // Clear cache
        cache.del(`pattern_${userId}_${keyword}`);
    }
}

/**
 * Get all category options for a user
 */
export function getCategoryOptions() {
    return Object.keys(categoryKeywords);
}
