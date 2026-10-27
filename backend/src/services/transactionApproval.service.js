import prisma from '../utils/prisma.js';

const KINDS = {
    bank: {
        model: (db) => db.bankTransactionLog,
        scope: (accountId, userId) => ({ bank_statement: { bank_id: accountId, bank: { user_id: userId } } }),
        sourceField: 'source_bank_tx_id',
        paymentMethod: 'Bank Transfer',
    },
    wallet: {
        model: (db) => db.walletTransactionLog,
        scope: (accountId, userId) => ({ wallet_statement: { wallet_id: accountId, wallet: { user_id: userId } } }),
        sourceField: 'source_wallet_tx_id',
        paymentMethod: 'Wallet',
    },
};

const isUniqueViolation = (err) => err?.code === 'P2002';

/**
 * Approve one imported transaction exactly once.
 *
 * The approved flag flips in a single conditional UPDATE (`user_approved =
 * false` → `true`), so a repeated click, a client retry or two concurrent
 * requests find nothing left to claim and get the original result back. The
 * unique Expense.source_*_tx_id backs this up at the database level.
 *
 * Approving also clears a duplicate flag: the user has said it is real.
 *
 * Returns null when the transaction isn't the user's, else
 * { approved: true|false (false = it was already approved), expenseId, isCredit }.
 */
export async function approveImportedTransaction({ kind, userId, accountId, txId, category, notes }) {
    const k = KINDS[kind];
    if (!k) throw new Error(`Unknown transaction kind: ${kind}`);

    try {
        return await prisma.$transaction(async (db) => {
            const log = await k.model(db).findFirst({ where: { id: txId, ...k.scope(accountId, userId) } });
            if (!log) return null;

            const isCredit = Number(log.net_amount) > 0;
            const finalCategory = category || log.approved_category || log.suggested_category || 'Other';

            const claimed = await k.model(db).updateMany({
                where: { id: txId, user_approved: false },
                data: {
                    user_approved: true,
                    processing_status: 'approved',
                    approved_category: finalCategory,
                    is_duplicate: false,
                    duplicate_match: null,
                    ...(notes !== undefined ? { notes } : {}),
                },
            });
            if (claimed.count === 0) {
                return { approved: false, expenseId: log.created_expense_id, isCredit };
            }

            let expenseId = null;
            if (!isCredit) {
                const expense = await db.expense.create({
                    data: {
                        user_id: userId,
                        amount: Math.abs(Number(log.net_amount)),
                        category: finalCategory,
                        expense_date: log.transaction_date,
                        payment_method: k.paymentMethod,
                        notes: notes || log.description,
                        [k.sourceField]: txId,
                    },
                });
                expenseId = expense.id;
                await k.model(db).update({ where: { id: txId }, data: { created_expense_id: expenseId } });
            }
            return { approved: true, expenseId, isCredit, description: log.description, category: finalCategory };
        });
    } catch (err) {
        if (!isUniqueViolation(err)) throw err;
        // Lost a race to an identical request: report what that one created.
        const existing = await prisma.expense.findFirst({ where: { [k.sourceField]: txId, user_id: userId }, select: { id: true } });
        return { approved: false, expenseId: existing?.id ?? null, isCredit: false };
    }
}
