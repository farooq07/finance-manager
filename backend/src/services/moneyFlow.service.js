import prisma from '../utils/prisma.js';

/**
 * One definition of "spending" and "income" for every surface — dashboard,
 * Spending page, AI assistant, emails.
 *
 * Rules (each money event is counted once):
 *  - An imported bank/wallet transaction is the record of the event. Rejected
 *    duplicates are never counted.
 *  - Approving a transaction creates an Expense linked to it
 *    (source_*_tx_id). That expense is NOT counted on top of the transaction,
 *    so approval never changes the total spent — it only fixes the category.
 *  - Manual expenses with no linked transaction are counted as spending.
 *  - Money moved between your own accounts, cash withdrawals, investment
 *    contributions and loan principal are not spending; refunds reduce it.
 */

export const FLOW = Object.freeze({
    SPEND: 'spend',
    INCOME: 'income',
    REFUND: 'refund',
    TRANSFER: 'transfer',
    CASH: 'cash',
    INVESTMENT: 'investment',
    DEBT: 'debt',
});

const norm = (c) => String(c || '').trim().toLowerCase();

const SELF_TRANSFER = new Set(['self transfer', 'own account transfer', 'internal transfer']);
const CASH = new Set(['atm withdrawal', 'cash withdrawal']);
const INVESTMENT = new Set(['investment']);
const DEBT = new Set(['loan repayment', 'debt repayment', 'credit card payment']);
// Credits in these categories are money coming in, not a refund of spending.
const INCOME = new Set(['salary', 'profit/dividend', 'rent income', 'income', 'business income',
    'other income', 'transfer', 'other', 'uncategorised', 'uncategorized', 'gift']);

/** What one movement means for reports. direction: 'in' | 'out'. */
export function classifyFlow(category, direction) {
    const c = norm(category);
    if (SELF_TRANSFER.has(c)) return FLOW.TRANSFER;
    if (INVESTMENT.has(c)) return FLOW.INVESTMENT;
    if (direction === 'out') {
        if (CASH.has(c)) return FLOW.CASH;
        if (DEBT.has(c)) return FLOW.DEBT;
        return FLOW.SPEND;
    }
    if (c === 'refund') return FLOW.REFUND;
    if (INCOME.has(c) || CASH.has(c) || DEBT.has(c)) return FLOW.INCOME;
    return FLOW.REFUND; // a credit in a spending category (e.g. Shopping) is money back
}

const DAY_MS = 24 * 60 * 60 * 1000;
const PAIR_WINDOW_DAYS = 3;

/**
 * A generic "Transfer" out of one of your accounts that lands as a "Transfer"
 * into another of your accounts (same amount, within 3 days) is money moving
 * between your own accounts: neither spending nor income. Mutates `kind`.
 */
export function pairOwnTransfers(events) {
    const isGenericTransfer = (e) => norm(e.category) === 'transfer' && e.kind !== FLOW.TRANSFER;
    const outs = events.filter((e) => e.direction === 'out' && isGenericTransfer(e));
    const ins = events.filter((e) => e.direction === 'in' && isGenericTransfer(e));
    const used = new Set();
    for (const o of outs) {
        const match = ins.find((i) => !used.has(i)
            && i.accountKey !== o.accountKey
            && Math.abs(i.amount - o.amount) < 0.005
            && Math.abs(new Date(i.date) - new Date(o.date)) <= PAIR_WINDOW_DAYS * DAY_MS);
        if (match) {
            used.add(match);
            o.kind = FLOW.TRANSFER;
            match.kind = FLOW.TRANSFER;
            o.pairedWith = match.id;
            match.pairedWith = o.id;
        }
    }
    return events;
}

function logToEvent(log, source, account, linkedCategory) {
    let debit = Math.abs(Number(log.debit_amount || 0));
    let credit = Math.abs(Number(log.credit_amount || 0));
    if (!debit && !credit) {
        const net = Number(log.net_amount || 0);
        if (net < 0) debit = -net; else credit = net;
    }
    const direction = credit > 0 ? 'in' : 'out';
    const category = linkedCategory || log.approved_category || log.suggested_category || 'Uncategorised';
    return {
        id: `${source}:${log.id}`,
        txId: log.id,
        source,
        accountKey: `${source}:${account?.id ?? 'unknown'}`,
        accountId: account?.id ?? null,
        accountLabel: account?.label ?? (source === 'bank' ? 'Bank' : 'Wallet'),
        date: log.transaction_date,
        description: log.description || '',
        category,
        amount: direction === 'in' ? credit : debit,
        direction,
        kind: classifyFlow(category, direction),
        status: log.processing_status || 'pending',
        possibleDuplicate: log.duplicate_match === 'possible',
    };
}

const COUNTED_LOG = { is_duplicate: false, processing_status: { not: 'rejected' } };

/**
 * Every counted money event for the user in [start, end).
 * Returns events sorted newest first.
 */
export async function loadMoneyEvents(userId, start, end) {
    const dateRange = { gte: start, lt: end };
    const logSelect = {
        id: true, transaction_date: true, description: true,
        debit_amount: true, credit_amount: true, net_amount: true,
        approved_category: true, suggested_category: true,
        processing_status: true, duplicate_match: true,
    };
    const [bankLogs, walletLogs, expenses] = await Promise.all([
        prisma.bankTransactionLog.findMany({
            where: { ...COUNTED_LOG, transaction_date: dateRange, bank_statement: { bank: { user_id: userId } } },
            select: { ...logSelect, bank_statement: { select: { bank: { select: { id: true, name: true } } } } },
        }),
        prisma.walletTransactionLog.findMany({
            where: { ...COUNTED_LOG, transaction_date: dateRange, wallet_statement: { wallet: { user_id: userId } } },
            select: { ...logSelect, wallet_statement: { select: { wallet: { select: { id: true, name: true, institution: true } } } } },
        }),
        prisma.expense.findMany({
            where: { user_id: userId, expense_date: dateRange },
            select: {
                id: true, amount: true, category: true, expense_date: true, notes: true,
                payment_method: true, source_bank_tx_id: true, source_wallet_tx_id: true,
            },
        }),
    ]);

    // An approved transaction's expense carries the user's chosen category.
    const linkedCategory = new Map();
    for (const e of expenses) {
        if (e.source_bank_tx_id) linkedCategory.set(`bank:${e.source_bank_tx_id}`, e.category);
        if (e.source_wallet_tx_id) linkedCategory.set(`wallet:${e.source_wallet_tx_id}`, e.category);
    }

    const events = [
        ...bankLogs.map((l) => {
            const b = l.bank_statement?.bank;
            return logToEvent(l, 'bank', b && { id: b.id, label: b.name }, linkedCategory.get(`bank:${l.id}`));
        }),
        ...walletLogs.map((l) => {
            const w = l.wallet_statement?.wallet;
            return logToEvent(l, 'wallet', w && { id: w.id, label: w.institution || w.name }, linkedCategory.get(`wallet:${l.id}`));
        }),
    ];

    const countedLogIds = new Set(events.map((e) => e.id));
    for (const e of expenses) {
        // Represented by its transaction — counting it too would double it.
        if (e.source_bank_tx_id && countedLogIds.has(`bank:${e.source_bank_tx_id}`)) continue;
        if (e.source_wallet_tx_id && countedLogIds.has(`wallet:${e.source_wallet_tx_id}`)) continue;
        const category = e.category || 'Uncategorised';
        events.push({
            id: `manual:${e.id}`,
            txId: e.id,
            source: 'manual',
            accountKey: 'manual',
            accountId: null,
            accountLabel: e.payment_method || 'Manual',
            date: e.expense_date,
            description: e.notes || '',
            category,
            amount: Math.abs(Number(e.amount || 0)),
            direction: 'out',
            kind: classifyFlow(category, 'out'),
            status: 'approved',
            possibleDuplicate: false,
        });
    }

    pairOwnTransfers(events);
    events.sort((a, b) => new Date(b.date) - new Date(a.date));
    return events;
}

/**
 * Totals for a list of events. `spend` is net of refunds (never below zero);
 * spendByCategory is net of refunds per category.
 */
export function summarizeFlows(events) {
    const totals = { spend: 0, grossSpend: 0, refunds: 0, income: 0, transfers: 0, cashWithdrawn: 0, invested: 0, debtRepaid: 0 };
    const spendByCategory = new Map();
    const incomeByCategory = new Map();
    const add = (m, k, v) => m.set(k, (m.get(k) || 0) + v);

    for (const e of events) {
        const signed = e.direction === 'out' ? e.amount : -e.amount;
        switch (e.kind) {
            case FLOW.SPEND: totals.grossSpend += e.amount; add(spendByCategory, e.category, e.amount); break;
            case FLOW.REFUND: totals.refunds += e.amount; add(spendByCategory, e.category, -e.amount); break;
            case FLOW.INCOME: totals.income += e.amount; add(incomeByCategory, e.category, e.amount); break;
            case FLOW.TRANSFER: if (e.direction === 'out') totals.transfers += e.amount; break;
            case FLOW.CASH: totals.cashWithdrawn += e.amount; break;
            case FLOW.INVESTMENT: totals.invested += signed; break;
            case FLOW.DEBT: totals.debtRepaid += e.amount; break;
        }
    }
    totals.spend = Math.max(0, totals.grossSpend - totals.refunds);
    for (const [k, v] of spendByCategory) if (v <= 0) spendByCategory.delete(k);
    return { totals, spendByCategory, incomeByCategory };
}

/** Events that count as spending (refunds excluded — they net off per category). */
export const spendEvents = (events) => events.filter((e) => e.kind === FLOW.SPEND);
