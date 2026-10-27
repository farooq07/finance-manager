import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';
import { categorizeTransactionBatch } from './categorizer.service.js';
import { findDuplicates, findWalletDuplicates, duplicateFields } from './duplicateDetector.service.js';

const KINDS = {
    bank: {
        statement: (db) => db.bankStatement,
        log: (db) => db.bankTransactionLog,
        account: (db) => db.bank,
        accountFk: 'bank_id',
        statementFk: 'bank_statement_id',
        balanceField: 'current_balance',
        findDuplicates,
        expenseLink: 'source_bank_tx_id',
    },
    wallet: {
        statement: (db) => db.walletStatement,
        log: (db) => db.walletTransactionLog,
        account: (db) => db.wallet,
        accountFk: 'wallet_id',
        statementFk: 'wallet_statement_id',
        balanceField: 'balance',
        findDuplicates: findWalletDuplicates,
        expenseLink: 'source_wallet_tx_id',
    },
};

const hasValue = (v) => v !== null && v !== undefined;

/** The last transaction date a statement covers — the date its closing balance is true for. */
export function statementEndDate(parsedTxs) {
    const days = parsedTxs.map((t) => new Date(t.transaction_date).getTime()).filter(Number.isFinite);
    return days.length ? new Date(Math.max(...days)) : null;
}

/**
 * Should a statement closing on `statementEnd` replace the account's balance?
 *  - no dated balance yet, or only the starting balance typed when the account
 *    was created → yes: a statement is the first real figure
 *  - a balance from another statement → only if this one is at least as recent
 *  - a balance typed in by hand → only if this statement ends on or after the
 *    day it was typed
 * So an older statement never overwrites a newer balance.
 */
export function shouldTakeBalance(account, statementEnd) {
    if (!account?.balance_as_of || !account.balance_source || account.balance_source === 'opening') return true;
    if (!statementEnd) return false;
    const day = (d) => new Date(d).toISOString().slice(0, 10);
    return day(statementEnd) >= day(account.balance_as_of);
}

/**
 * Save a parsed statement: the statement row, every transaction row and the
 * balance update succeed or fail together — no half-imported statements, no
 * silently dropped rows.
 *
 * Slow work (duplicate lookup, AI categorisation) runs before the database
 * transaction so the transaction itself stays short.
 *
 * `replaceStatementId` (a re-import of the same file) is deleted inside the
 * same transaction, so a failed re-import keeps the old statement.
 *
 * Returns { statement, transactionLogs, duplicateCount, possibleDuplicateCount, balanceUpdated }.
 */
export async function saveStatementImport({ kind, userId, accountId, statementData, parsedTxs, closingBalance, replaceStatementId = null }) {
    const k = KINDS[kind];
    if (!k) throw new Error(`Unknown statement kind: ${kind}`);

    // A statement being replaced is not a source of duplicates for its replacement.
    const duplicates = parsedTxs.length
        ? await k.findDuplicates(userId, accountId, parsedTxs, { excludeStatementId: replaceStatementId })
        : new Map();

    let categorizations;
    try {
        categorizations = parsedTxs.length ? await categorizeTransactionBatch(userId, parsedTxs) : [];
    } catch (e) {
        logger.error(`[IMPORT] categorisation failed, defaulting to Other: ${e.message}`);
        categorizations = parsedTxs.map(() => ({ category: 'Other', confidence: 0 }));
    }

    const statementEnd = statementEndDate(parsedTxs);

    const result = await prisma.$transaction(async (db) => {
        if (replaceStatementId) {
            // Replace = the old statement, its rows and the expenses its approved
            // rows created go away in the same transaction as the new import.
            const oldLogs = await k.log(db).findMany({ where: { [k.statementFk]: replaceStatementId }, select: { id: true } });
            if (oldLogs.length) {
                await db.expense.deleteMany({ where: { user_id: userId, [k.expenseLink]: { in: oldLogs.map((l) => l.id) } } });
            }
            await k.statement(db).delete({ where: { id: replaceStatementId } });
        }
        const statement = await k.statement(db).create({ data: { ...statementData, [k.accountFk]: accountId } });

        if (parsedTxs.length) {
            await k.log(db).createMany({
                data: parsedTxs.map((tx, i) => {
                    const cat = categorizations[i] || { category: 'Other', confidence: 0 };
                    return {
                        [k.statementFk]: statement.id,
                        transaction_date: tx.transaction_date,
                        description: tx.description,
                        debit_amount: tx.debit_amount || null,
                        credit_amount: tx.credit_amount || null,
                        net_amount: tx.net_amount,
                        suggested_category: cat.category,
                        category_confidence: cat.confidence,
                        ...duplicateFields(duplicates.get(i)),
                    };
                }),
            });
        }
        const transactionLogs = await k.log(db).findMany({
            where: { [k.statementFk]: statement.id },
            orderBy: { transaction_date: 'asc' },
        });
        if (transactionLogs.length !== parsedTxs.length) {
            throw new Error(`Saved ${transactionLogs.length} of ${parsedTxs.length} transactions`);
        }

        let balanceUpdated = false;
        if (hasValue(closingBalance)) {
            const account = await k.account(db).findUnique({ where: { id: accountId }, select: { balance_as_of: true, balance_source: true } });
            if (shouldTakeBalance(account, statementEnd)) {
                await k.account(db).update({
                    where: { id: accountId },
                    data: {
                        [k.balanceField]: closingBalance,
                        balance_as_of: statementEnd ?? new Date(),
                        balance_source: 'statement',
                        balance_statement_id: statement.id,
                    },
                });
                balanceUpdated = true;
            }
        }
        return { statement, transactionLogs, balanceUpdated };
    }, { maxWait: 10_000, timeout: 60_000 });

    const matches = [...duplicates.values()];
    return {
        ...result,
        duplicateCount: matches.filter((m) => m.match === 'certain').length,
        possibleDuplicateCount: matches.filter((m) => m.match === 'possible').length,
    };
}

/**
 * Remove an imported statement ("undo import" / delete): its rows, the
 * expenses its approved rows created, and the statement itself, in one
 * transaction. If the account's balance came from this statement, it falls
 * back to the newest remaining statement's closing balance.
 *
 * Returns the deleted statement's file path (for the caller to remove), or
 * null when the statement isn't this user's.
 */
export async function removeStatement({ kind, userId, accountId, statementId }) {
    const k = KINDS[kind];
    if (!k) throw new Error(`Unknown statement kind: ${kind}`);

    return prisma.$transaction(async (db) => {
        const statement = await k.statement(db).findFirst({
            where: { id: statementId, [k.accountFk]: accountId, [kind]: { user_id: userId } },
            select: { id: true, file_path: true },
        });
        if (!statement) return null;

        const logs = await k.log(db).findMany({ where: { [k.statementFk]: statementId }, select: { id: true, created_expense_id: true } });
        const linked = logs.map((l) => l.created_expense_id).filter(Boolean);
        if (logs.length) {
            await db.expense.deleteMany({
                where: { user_id: userId, OR: [{ id: { in: linked } }, { [k.expenseLink]: { in: logs.map((l) => l.id) } }] },
            });
        }
        await k.statement(db).delete({ where: { id: statementId } });

        const account = await k.account(db).findUnique({ where: { id: accountId }, select: { balance_statement_id: true } });
        if (account?.balance_statement_id === statementId) {
            // The remaining statement covering the latest dates (not the latest upload).
            const candidates = await k.statement(db).findMany({
                where: { [k.accountFk]: accountId, NOT: { closing_balance: null } },
                select: { id: true, closing_balance: true },
            });
            const ends = candidates.length ? await k.log(db).groupBy({
                by: [k.statementFk],
                where: { [k.statementFk]: { in: candidates.map((c) => c.id) } },
                _max: { transaction_date: true },
            }) : [];
            const endOf = new Map(ends.map((e) => [e[k.statementFk], e._max.transaction_date]));
            const fallback = candidates
                .filter((c) => endOf.get(c.id))
                .sort((a, b) => endOf.get(b.id) - endOf.get(a.id))[0];
            if (fallback) {
                await k.account(db).update({
                    where: { id: accountId },
                    data: {
                        [k.balanceField]: fallback.closing_balance,
                        balance_as_of: endOf.get(fallback.id),
                        balance_source: 'statement',
                        balance_statement_id: fallback.id,
                    },
                });
            } else {
                // Nothing left to say what the balance is: keep the figure, as an estimate.
                await k.account(db).update({ where: { id: accountId }, data: { balance_source: 'opening', balance_statement_id: null } });
            }
        }
        return { filePath: statement.file_path };
    });
}
