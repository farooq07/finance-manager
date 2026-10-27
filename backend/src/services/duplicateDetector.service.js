import { compareTwoStrings } from 'string-similarity';
import prisma from '../utils/prisma.js';

/**
 * Duplicate detection for statement imports.
 *
 * A row can only repeat an earlier row of the SAME account, inside the date
 * range the new statement covers (± a few days for posting delays). Amount
 * (to the paisa) and direction must always match. Beyond that:
 *
 *  - certain  → same reference number, or same day + near-identical
 *               description. Saved as a rejected duplicate.
 *  - possible → within 3 days and a similar description. Saved as a normal
 *               pending row flagged for the user to decide — never dropped.
 *
 * Different reference numbers mean different transactions, however alike
 * the rest looks. Each earlier row can be matched at most once, so two real
 * identical purchases are not both swallowed by one earlier row.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 3;

const toDay = (d) => {
    const x = new Date(d);
    return Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate());
};
const dayDiff = (a, b) => Math.round(Math.abs(toDay(a) - toDay(b)) / DAY_MS);
const toPaisa = (v) => Math.round(Number(v) * 100);

/** Reference-like tokens: long digit runs and letter-prefixed codes (FT2603123456). */
export function extractRefs(description) {
    const refs = new Set();
    for (const m of String(description || '').toUpperCase().matchAll(/\b[A-Z]{0,4}\d{6,}\b/g)) refs.add(m[0].replace(/^[A-Z]+/, ''));
    return refs;
}

const normalise = (d) => String(d || '').toLowerCase().replace(/\s+/g, ' ').trim();

/** How a new row relates to an earlier one: 'certain' | 'possible' | null. */
export function matchStrength(newTx, existing) {
    const a = toPaisa(newTx.net_amount);
    const b = toPaisa(existing.net_amount);
    if (a !== b || a === 0) return null;          // amount and direction (sign) must match

    const days = dayDiff(newTx.transaction_date, existing.transaction_date);
    if (days > WINDOW_DAYS) return null;

    const refsA = extractRefs(newTx.description);
    const refsB = extractRefs(existing.description);
    if (refsA.size && refsB.size) {
        const shared = [...refsA].some((r) => refsB.has(r));
        return shared ? 'certain' : null;           // different references → different transactions
    }

    const similarity = compareTwoStrings(normalise(newTx.description), normalise(existing.description));
    if (days === 0 && similarity >= 0.9) return 'certain';
    if (similarity >= 0.6) return 'possible';
    return null;
}

function dateWindow(transactions) {
    const days = transactions.map((t) => toDay(t.transaction_date)).filter(Number.isFinite);
    if (!days.length) return null;
    return {
        gte: new Date(Math.min(...days) - WINDOW_DAYS * DAY_MS),
        lte: new Date(Math.max(...days) + WINDOW_DAYS * DAY_MS),
    };
}

/** Pair new rows with earlier rows one-to-one, certain matches first. */
export function matchDuplicates(transactions, existingRows) {
    const result = new Map();
    const used = new Set();
    for (const wanted of ['certain', 'possible']) {
        transactions.forEach((tx, i) => {
            if (result.has(i)) return;
            const hit = existingRows.find((e) => !used.has(e.id) && matchStrength(tx, e) === wanted);
            if (hit) {
                used.add(hit.id);
                result.set(i, {
                    duplicateOfId: hit.id,
                    match: wanted,
                    reason: wanted === 'certain' ? 'Same amount, date and reference/description' : 'Same amount, similar description, close date',
                });
            }
        });
    }
    return result;
}

const EXISTING_SELECT = { id: true, description: true, net_amount: true, transaction_date: true };

/** Duplicates of `transactions` already imported into this bank account. Map(index → match). */
export async function findDuplicates(userId, bankId, transactions, { excludeStatementId = null } = {}) {
    const window = dateWindow(transactions);
    if (!window) return new Map();
    const existing = await prisma.bankTransactionLog.findMany({
        where: {
            is_duplicate: false,
            transaction_date: window,
            ...(excludeStatementId ? { NOT: { bank_statement_id: excludeStatementId } } : {}),
            bank_statement: { bank_id: bankId, bank: { user_id: userId } },
        },
        select: EXISTING_SELECT,
    });
    return matchDuplicates(transactions, existing);
}

/** Duplicates of `transactions` already imported into this wallet. Map(index → match). */
export async function findWalletDuplicates(userId, walletId, transactions, { excludeStatementId = null } = {}) {
    const window = dateWindow(transactions);
    if (!window) return new Map();
    const existing = await prisma.walletTransactionLog.findMany({
        where: {
            is_duplicate: false,
            transaction_date: window,
            ...(excludeStatementId ? { NOT: { wallet_statement_id: excludeStatementId } } : {}),
            wallet_statement: { wallet_id: walletId, wallet: { user_id: userId } },
        },
        select: EXISTING_SELECT,
    });
    return matchDuplicates(transactions, existing);
}

/** The log fields for a new row given its duplicate match (if any). */
export function duplicateFields(match) {
    if (!match) return { is_duplicate: false, duplicate_of_id: null, duplicate_match: null, processing_status: 'pending' };
    const certain = match.match === 'certain';
    return {
        is_duplicate: certain,
        duplicate_of_id: match.duplicateOfId,
        duplicate_match: match.match,
        processing_status: certain ? 'rejected' : 'pending',
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
