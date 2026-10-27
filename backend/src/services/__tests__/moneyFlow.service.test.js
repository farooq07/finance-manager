import { jest } from '@jest/globals';
import prisma from '../../utils/prisma.js';
import { classifyFlow, FLOW, loadMoneyEvents, summarizeFlows, pairOwnTransfers } from '../moneyFlow.service.js';

const start = new Date('2026-03-01');
const end = new Date('2026-04-01');

const bankLog = (over) => ({
    id: 'tx1', transaction_date: new Date('2026-03-05'), description: 'KFC',
    debit_amount: 1500, credit_amount: null, net_amount: -1500,
    approved_category: null, suggested_category: 'Food & Dining',
    processing_status: 'pending', duplicate_match: null,
    bank_statement: { bank: { id: 'b1', name: 'Meezan' } },
    ...over,
});

function mockData({ bank = [], wallet = [], expenses = [] }) {
    jest.spyOn(prisma.bankTransactionLog, 'findMany').mockResolvedValue(bank);
    jest.spyOn(prisma.walletTransactionLog, 'findMany').mockResolvedValue(wallet);
    jest.spyOn(prisma.expense, 'findMany').mockResolvedValue(expenses);
}

afterEach(() => jest.restoreAllMocks());

describe('classifyFlow', () => {
    it.each([
        ['Food & Dining', 'out', FLOW.SPEND],
        ['Transfer', 'out', FLOW.SPEND],          // paying someone else
        ['Self Transfer', 'out', FLOW.TRANSFER],
        ['Self Transfer', 'in', FLOW.TRANSFER],
        ['ATM Withdrawal', 'out', FLOW.CASH],
        ['Investment', 'out', FLOW.INVESTMENT],
        ['Investment', 'in', FLOW.INVESTMENT],    // redemption is not income
        ['Loan Repayment', 'out', FLOW.DEBT],
        ['Salary', 'in', FLOW.INCOME],
        ['Transfer', 'in', FLOW.INCOME],
        ['Refund', 'in', FLOW.REFUND],
        ['Shopping', 'in', FLOW.REFUND],          // money back from a shop
    ])('%s %s → %s', (category, direction, expected) => {
        expect(classifyFlow(category, direction)).toBe(expected);
    });
});

describe('loadMoneyEvents', () => {
    it('only asks for logs that are not rejected duplicates', async () => {
        mockData({});
        await loadMoneyEvents('u1', start, end);
        const where = prisma.bankTransactionLog.findMany.mock.calls[0][0].where;
        expect(where.is_duplicate).toBe(false);
        expect(where.processing_status).toEqual({ not: 'rejected' });
        expect(where.bank_statement).toEqual({ bank: { user_id: 'u1' } });
    });

    it('approval never changes the total: the linked expense is not added on top', async () => {
        // Before approval: the imported debit alone.
        mockData({ bank: [bankLog()] });
        const before = summarizeFlows(await loadMoneyEvents('u1', start, end)).totals.spend;
        jest.restoreAllMocks();

        // After approval: same debit + its linked expense, re-categorised.
        mockData({
            bank: [bankLog({ processing_status: 'approved', approved_category: 'Groceries' })],
            expenses: [{ id: 'e1', amount: 1500, category: 'Groceries', expense_date: new Date('2026-03-05'), source_bank_tx_id: 'tx1', source_wallet_tx_id: null }],
        });
        const events = await loadMoneyEvents('u1', start, end);
        const { totals, spendByCategory } = summarizeFlows(events);

        expect(before).toBe(1500);
        expect(totals.spend).toBe(1500);
        expect(events).toHaveLength(1);
        expect(spendByCategory.get('Groceries')).toBe(1500);
    });

    it('counts manual expenses that have no linked transaction', async () => {
        mockData({
            bank: [bankLog()],
            expenses: [{ id: 'e2', amount: 700, category: 'Transportation', expense_date: new Date('2026-03-06'), source_bank_tx_id: null, source_wallet_tx_id: null }],
        });
        const { totals } = summarizeFlows(await loadMoneyEvents('u1', start, end));
        expect(totals.spend).toBe(2200);
    });

    it('a linked expense whose transaction is no longer counted still counts', async () => {
        mockData({
            expenses: [{ id: 'e3', amount: 900, category: 'Shopping', expense_date: new Date('2026-03-06'), source_bank_tx_id: 'gone', source_wallet_tx_id: null }],
        });
        const { totals } = summarizeFlows(await loadMoneyEvents('u1', start, end));
        expect(totals.spend).toBe(900);
    });

    it('a transfer between two of your own accounts is neither spending nor income', async () => {
        mockData({
            bank: [bankLog({ id: 'out', description: 'IBFT to wallet', suggested_category: 'Transfer', debit_amount: 20000, net_amount: -20000 })],
            wallet: [{
                id: 'in', transaction_date: new Date('2026-03-06'), description: 'Received IBFT',
                debit_amount: null, credit_amount: 20000, net_amount: 20000,
                approved_category: null, suggested_category: 'Transfer', processing_status: 'pending', duplicate_match: null,
                wallet_statement: { wallet: { id: 'w1', name: 'Wallet', institution: 'NayaPay' } },
            }],
        });
        const { totals } = summarizeFlows(await loadMoneyEvents('u1', start, end));
        expect(totals.spend).toBe(0);
        expect(totals.income).toBe(0);
        expect(totals.transfers).toBe(20000);
    });
});

describe('summarizeFlows', () => {
    it('refunds reduce spending in their category', () => {
        const events = [
            { kind: FLOW.SPEND, direction: 'out', amount: 5000, category: 'Shopping' },
            { kind: FLOW.REFUND, direction: 'in', amount: 2000, category: 'Shopping' },
            { kind: FLOW.CASH, direction: 'out', amount: 10000, category: 'ATM Withdrawal' },
            { kind: FLOW.INCOME, direction: 'in', amount: 90000, category: 'Salary' },
        ];
        const { totals, spendByCategory } = summarizeFlows(events);
        expect(totals.spend).toBe(3000);
        expect(totals.refunds).toBe(2000);
        expect(totals.cashWithdrawn).toBe(10000);
        expect(totals.income).toBe(90000);
        expect(spendByCategory.get('Shopping')).toBe(3000);
    });
});

describe('pairOwnTransfers', () => {
    it('does not pair transfers within the same account or far apart', () => {
        const events = [
            { id: 'a', accountKey: 'bank:b1', category: 'Transfer', direction: 'out', amount: 100, date: '2026-03-01', kind: FLOW.SPEND },
            { id: 'b', accountKey: 'bank:b1', category: 'Transfer', direction: 'in', amount: 100, date: '2026-03-01', kind: FLOW.INCOME },
            { id: 'c', accountKey: 'bank:b2', category: 'Transfer', direction: 'in', amount: 100, date: '2026-03-20', kind: FLOW.INCOME },
        ];
        pairOwnTransfers(events);
        expect(events.map((e) => e.kind)).toEqual([FLOW.SPEND, FLOW.INCOME, FLOW.INCOME]);
    });
});
