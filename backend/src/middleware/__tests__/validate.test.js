import { bankSchema } from '../validate.js';

describe('bankSchema', () => {
    it('accepts name + starting_balance only', () => {
        const r = bankSchema.safeParse({ name: 'Meezan', starting_balance: '100000' });
        expect(r.success).toBe(true);
        expect(r.data).toMatchObject({ name: 'Meezan', starting_balance: 100000, account_no: '', iban_no: '' });
    });

    it('keeps account details when given', () => {
        const r = bankSchema.safeParse({ name: 'HBL', starting_balance: 0, account_no: '1234', iban_no: 'PK00' });
        expect(r.data).toMatchObject({ account_no: '1234', iban_no: 'PK00' });
    });

    it('still rejects a missing name', () => {
        expect(bankSchema.safeParse({ starting_balance: 10 }).success).toBe(false);
    });

    it('still rejects a negative balance', () => {
        expect(bankSchema.safeParse({ name: 'HBL', starting_balance: -1 }).success).toBe(false);
    });
});
