/**
 * Duplicate detection rules:
 *  - only the same account, only inside the new statement's date range (± 3 days)
 *  - amount (to the paisa) and direction must match
 *  - same reference → certain; different references → never a duplicate
 *  - same day + near-identical description → certain
 *  - within 3 days + similar description → possible (flagged, not rejected)
 *  - each earlier row matches at most one new row
 */
import { jest } from '@jest/globals';
import prisma from '../../utils/prisma.js';
import { findDuplicates, findWalletDuplicates, matchStrength, matchDuplicates, duplicateFields, extractRefs } from '../duplicateDetector.service.js';

const day = (n) => new Date(Date.UTC(2026, 2, 10 + n));
const row = (over) => ({ id: 'old1', description: 'POS PURCHASE IMTIAZ SUPER MARKET', net_amount: -5000, transaction_date: day(0), ...over });

afterEach(() => jest.restoreAllMocks());

describe('matchStrength', () => {
    it('same day, same amount, same description → certain', () => {
        expect(matchStrength(row({}), row({}))).toBe('certain');
    });

    it('different amount is never a duplicate, however alike the rest is', () => {
        expect(matchStrength(row({ net_amount: -5001 }), row({}))).toBeNull();
    });

    it('opposite direction is never a duplicate', () => {
        expect(matchStrength(row({ net_amount: 5000 }), row({}))).toBeNull();
    });

    it('more than 3 days apart is never a duplicate', () => {
        expect(matchStrength(row({ transaction_date: day(4) }), row({}))).toBeNull();
    });

    it('a similar description a couple of days later is only possible', () => {
        expect(matchStrength(row({ transaction_date: day(2), description: 'POS PURCHASE IMTIAZ SUPERMARKET KHI' }), row({}))).toBe('possible');
    });

    it('a different description on the same day and amount is not a match', () => {
        expect(matchStrength(row({ description: 'K-ELECTRIC BILL PAYMENT' }), row({}))).toBeNull();
    });

    it('a shared reference number is certain even with different wording', () => {
        expect(matchStrength(
            row({ description: 'IBFT OUT REF 260310123456', transaction_date: day(1) }),
            row({ description: 'Funds transfer 260310123456 to AZHAR' }),
        )).toBe('certain');
    });

    it('different reference numbers are different transactions', () => {
        expect(matchStrength(
            row({ description: 'IBFT TRANSFER TO AZHAR REF 111111111' }),
            row({ description: 'IBFT TRANSFER TO AZHAR REF 222222222' }),
        )).toBeNull();
    });
});

describe('extractRefs', () => {
    it('picks long digit runs and strips letter prefixes', () => {
        expect([...extractRefs('FT2603123456 paid 1,500 on 12/03')]).toEqual(['2603123456']);
    });
});

describe('matchDuplicates', () => {
    it('two identical real purchases are not both swallowed by one earlier row', () => {
        const result = matchDuplicates([row({}), row({})], [row({ id: 'old1' })]);
        expect(result.size).toBe(1);
        expect(result.get(0)).toMatchObject({ duplicateOfId: 'old1', match: 'certain' });
    });

    it('prefers a certain match over a possible one for the same earlier row', () => {
        const possibleFirst = row({ transaction_date: day(2), description: 'POS PURCHASE IMTIAZ SUPERMARKET KHI' });
        const exact = row({});
        const result = matchDuplicates([possibleFirst, exact], [row({ id: 'old1' })]);
        expect(result.get(1)).toMatchObject({ match: 'certain' });
        expect(result.has(0)).toBe(false);
    });
});

describe('findDuplicates', () => {
    it('only looks at the same bank account, inside the statement date range', async () => {
        const find = jest.spyOn(prisma.bankTransactionLog, 'findMany').mockResolvedValue([]);
        await findDuplicates('u1', 'bank-1', [row({ transaction_date: day(0) }), row({ transaction_date: day(5) })]);
        const where = find.mock.calls[0][0].where;
        expect(where.bank_statement).toEqual({ bank_id: 'bank-1', bank: { user_id: 'u1' } });
        expect(where.is_duplicate).toBe(false);
        expect(where.transaction_date.gte).toEqual(day(-3));
        expect(where.transaction_date.lte).toEqual(day(8));
    });

    it('wallets are scoped to the wallet', async () => {
        const find = jest.spyOn(prisma.walletTransactionLog, 'findMany').mockResolvedValue([row({})]);
        const result = await findWalletDuplicates('u1', 'w1', [row({})]);
        expect(find.mock.calls[0][0].where.wallet_statement).toEqual({ wallet_id: 'w1', wallet: { user_id: 'u1' } });
        expect(result.get(0).match).toBe('certain');
    });

    it('does not query at all for an empty statement', async () => {
        const find = jest.spyOn(prisma.bankTransactionLog, 'findMany');
        expect((await findDuplicates('u1', 'b1', [])).size).toBe(0);
        expect(find).not.toHaveBeenCalled();
    });
});

describe('duplicateFields', () => {
    it('certain → rejected duplicate', () => {
        expect(duplicateFields({ duplicateOfId: 'old1', match: 'certain' })).toEqual({
            is_duplicate: true, duplicate_of_id: 'old1', duplicate_match: 'certain', processing_status: 'rejected',
        });
    });
    it('possible → kept pending and flagged for review', () => {
        expect(duplicateFields({ duplicateOfId: 'old1', match: 'possible' })).toEqual({
            is_duplicate: false, duplicate_of_id: 'old1', duplicate_match: 'possible', processing_status: 'pending',
        });
    });
    it('no match → a plain pending row', () => {
        expect(duplicateFields(undefined)).toMatchObject({ is_duplicate: false, duplicate_of_id: null, processing_status: 'pending' });
    });
});
