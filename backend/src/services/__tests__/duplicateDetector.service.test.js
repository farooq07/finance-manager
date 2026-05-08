/**
 * Duplicate detection logic notes:
 *  - description >85% similar + exact amount → duplicate (regardless of date)
 *  - description >85% similar + date within 5 days → duplicate (regardless of amount)
 *  - Both conditions must be absent to pass through
 */
import { jest } from '@jest/globals';
import prisma from '../../utils/prisma.js';

const { findDuplicates } = await import('../duplicateDetector.service.js');

const makeDate = (daysOffset = 0) => {
    const d = new Date('2026-03-10T00:00:00Z');
    d.setDate(d.getDate() + daysOffset);
    return d;
};

const existing = [
    {
        id: 'tx-existing-1',
        description: 'IBFT TRANSFER TO AZHAR',
        net_amount: -5000,
        transaction_date: makeDate(0)
    },
    {
        id: 'tx-existing-2',
        description: 'SALARY CREDIT MONTHLY',
        net_amount: 80000,
        transaction_date: makeDate(-1)
    },
];

beforeEach(() => {
    jest.spyOn(prisma.bankTransactionLog, 'findMany').mockResolvedValue(existing);
});

describe('findDuplicates', () => {
    it('returns empty map when no transactions are similar', async () => {
        const newTxs = [
            { description: 'UTILITY BILL K-ELECTRIC ONLINE', net_amount: -3000, transaction_date: makeDate(0) }
        ];

        const result = await findDuplicates('user-1', 'stmt-1', newTxs);
        expect(result.size).toBe(0);
    });

    it('flags an exact duplicate (same description, amount, date)', async () => {
        const newTxs = [
            { description: 'IBFT TRANSFER TO AZHAR', net_amount: -5000, transaction_date: makeDate(0) }
        ];

        const result = await findDuplicates('user-1', 'stmt-1', newTxs);
        expect(result.size).toBe(1);
        expect(result.get(0).duplicateOfId).toBe('tx-existing-1');
        expect(result.get(0).reason).toContain('Description + amount');
    });

    it('flags a duplicate even when date differs by >5 days if description AND amount both match exactly', async () => {
        // The service has no date requirement when both description and amount match
        const newTxs = [
            { description: 'IBFT TRANSFER TO AZHAR', net_amount: -5000, transaction_date: makeDate(10) }
        ];

        const result = await findDuplicates('user-1', 'stmt-1', newTxs);
        expect(result.size).toBe(1);
        expect(result.get(0).reason).toBe('Description + amount match');
    });

    it('flags a duplicate when description and date match even if amount differs', async () => {
        // description >85% similar + date within 5 days → duplicate regardless of amount
        const newTxs = [
            { description: 'IBFT TRANSFER TO AZHAR', net_amount: -9000, transaction_date: makeDate(0) }
        ];

        const result = await findDuplicates('user-1', 'stmt-1', newTxs);
        expect(result.size).toBe(1);
        expect(result.get(0).reason).toContain('Description + date');
    });

    it('does NOT flag when description is similar but date > 5 days AND amounts differ', async () => {
        // Neither "desc+amount" nor "desc+date" condition is met
        const newTxs = [
            { description: 'IBFT TRANSFER TO AZHAR', net_amount: -9000, transaction_date: makeDate(10) }
        ];

        const result = await findDuplicates('user-1', 'stmt-1', newTxs);
        expect(result.size).toBe(0);
    });

    it('only marks the matched index as duplicate, not all transactions', async () => {
        const newTxs = [
            { description: 'IBFT TRANSFER TO AZHAR', net_amount: -5000, transaction_date: makeDate(0) }, // duplicate
            { description: 'SCHOOL FEE PAYMENT MONTHLY', net_amount: -15000, transaction_date: makeDate(0) }, // new
        ];

        const result = await findDuplicates('user-1', 'stmt-1', newTxs);
        expect(result.size).toBe(1);
        expect(result.has(0)).toBe(true);
        expect(result.has(1)).toBe(false);
    });

    it('handles empty existing transactions (first-ever import)', async () => {
        jest.spyOn(prisma.bankTransactionLog, 'findMany').mockResolvedValueOnce([]);

        const newTxs = [
            { description: 'SALARY CREDIT', net_amount: 80000, transaction_date: makeDate(0) }
        ];

        const result = await findDuplicates('user-1', 'stmt-1', newTxs);
        expect(result.size).toBe(0);
    });

    it('handles empty new transactions array', async () => {
        const result = await findDuplicates('user-1', 'stmt-1', []);
        expect(result.size).toBe(0);
    });

    it('detects multiple duplicates in a batch', async () => {
        const newTxs = [
            { description: 'IBFT TRANSFER TO AZHAR', net_amount: -5000, transaction_date: makeDate(0) },
            { description: 'SALARY CREDIT MONTHLY',  net_amount: 80000,  transaction_date: makeDate(0) },
        ];

        const result = await findDuplicates('user-1', 'stmt-1', newTxs);
        expect(result.size).toBe(2);
        expect(result.get(0).duplicateOfId).toBe('tx-existing-1');
        expect(result.get(1).duplicateOfId).toBe('tx-existing-2');
    });
});
