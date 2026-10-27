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
 * Only when the account has no dated balance yet, or the statement is at
 * least as recent as it — an older statement never overwrites a newer balance.
 */
export function shouldTakeBalance(account, statementEnd) {
    if (!account?.balance_as_of) return true;
    if (!statementEnd) return false;
    return statementEnd.getTime() >= new Date(account.balance_as_of).getTime();
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
            const account = await k.account(db).findUnique({ where: { id: accountId }, select: { balance_as_of: true } });
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
