import { compareTwoStrings } from 'string-similarity';
import prisma from '../utils/prisma.js';
import Decimal from 'decimal.js';

/**
 * Find duplicate transactions using fuzzy matching (for Banks)
 * Checks: description similarity + amount + date proximity
 */
export async function findDuplicates(userId, bankStatementId, transactions) {
    const duplicates = new Map();

    // Get all existing transactions from this user's bank account
    const existingTransactions = await prisma.bankTransactionLog.findMany({
        where: {
            bank_statement: {
                bank: {
                    user_id: userId
                }
            }
        },
        select: {
            id: true,
            description: true,
            net_amount: true,
            transaction_date: true
        }
    });

    // Check each new transaction against existing ones
    for (let i = 0; i < transactions.length; i++) {
        const newTx = transactions[i];

        for (const existing of existingTransactions) {
            const similarity = calculateSimilarity(newTx, existing);

            if (similarity.isDuplicate) {
                duplicates.set(i, {
                    duplicateOfId: existing.id,
                    similarity: similarity.score,
                    reason: similarity.reason
                });
                break; // Found duplicate, move to next transaction
            }
        }
    }

    return duplicates;
}

/**
 * Find duplicate transactions for Wallets using fuzzy matching
 * Checks: description similarity + amount + date proximity
 */
export async function findWalletDuplicates(userId, walletStatementId, transactions) {
    const duplicates = new Map();

    // Get all existing transactions from this user's wallet
    const existingTransactions = await prisma.walletTransactionLog.findMany({
        where: {
            wallet_statement: {
                wallet: {
                    user_id: userId
                }
            }
        },
        select: {
            id: true,
            description: true,
            net_amount: true,
            transaction_date: true
        }
    });

    // Check each new transaction against existing ones
    for (let i = 0; i < transactions.length; i++) {
        const newTx = transactions[i];

        for (const existing of existingTransactions) {
            const similarity = calculateSimilarity(newTx, existing);

            if (similarity.isDuplicate) {
                duplicates.set(i, {
                    duplicateOfId: existing.id,
                    similarity: similarity.score,
                    reason: similarity.reason
                });
                break; // Found duplicate, move to next transaction
            }
        }
    }

    return duplicates;
}

/**
 * Calculate similarity between two transactions
 * Returns: {isDuplicate: bool, score: 0-1, reason: string}
 */
function calculateSimilarity(newTx, existingTx) {
    // 1. Description similarity (using fuzzy string matching)
    const descSimilarity = compareTwoStrings(
        newTx.description.toLowerCase(),
        existingTx.description.toLowerCase()
    );

    // 2. Amount match (exact or within 1% tolerance for fee variations)
    const newAmount = new Decimal(newTx.net_amount);
    const existingAmount = new Decimal(existingTx.net_amount);

    const amountDiff = newAmount.minus(existingAmount).abs();
    const percentDiff = amountDiff.dividedBy(existingAmount.abs()).toNumber();
    const amountMatch = percentDiff < 0.01; // 1% tolerance

    // 3. Date proximity (within 5 days - accounts for processing delays)
    const newDate = new Date(newTx.transaction_date);
    const existingDate = new Date(existingTx.transaction_date);
    const daysDiff = Math.abs((newDate - existingDate) / (1000 * 60 * 60 * 24));
    const dateProximity = daysDiff <= 5;

    // Decision logic:
    // High description match + exact amount = likely duplicate
    // High description match + date proximity = likely duplicate
    const descriptionConfident = descSimilarity > 0.85;
    const amountExact = newAmount.equals(existingAmount);

    if (descriptionConfident && amountExact && dateProximity) {
        return {
            isDuplicate: true,
            score: Math.min(descSimilarity, 1),
            reason: 'Description + amount + date match'
        };
    }

    if (descriptionConfident && amountExact) {
        return {
            isDuplicate: true,
            score: Math.min(descSimilarity * 0.95, 1),
            reason: 'Description + amount match'
        };
    }

    if (descriptionConfident && dateProximity) {
        return {
            isDuplicate: true,
            score: Math.min(descSimilarity * 0.8, 1),
            reason: 'Description + date proximity match'
        };
    }

    return {
        isDuplicate: false,
        score: descSimilarity,
        reason: 'No strong match'
    };
}

/**
 * Check if PDF itself was already imported (by file hash) - for Banks
 */
export async function isFilePreviouslyImported(userId, fileHash, bankId) {
    const existing = await prisma.bankStatement.findFirst({
        where: {
            file_hash: fileHash,
            bank: {
                user_id: userId,
                id: bankId
            }
        }
    });

    return !!existing;
}

/**
 * Check if wallet PDF was already imported (by file hash)
 */
export async function isWalletFilePreviouslyImported(userId, fileHash, walletId) {
    const existing = await prisma.walletStatement.findFirst({
        where: {
            file_hash: fileHash,
            wallet: {
                user_id: userId,
                id: walletId
            }
        }
    });

    return !!existing;
}

/**
 * Mark transactions as duplicates
 */
export async function markAsDuplicate(transactionLogId, duplicateOfId) {
    await prisma.bankTransactionLog.update({
        where: { id: transactionLogId },
        data: {
            is_duplicate: true,
            duplicate_of_id: duplicateOfId,
            processing_status: 'rejected'
        }
    });
}
