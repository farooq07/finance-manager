import { fmtPKR } from '../currency';

// Same outputs as frontend/src/utils/__tests__/currency.test.js — mobile must
// show money exactly like the web app.
describe('fmtPKR', () => {
    it.each([
        [1234567, 'PKR 1,234,567'],
        [1234567.89, 'PKR 1,234,568'],
        [0, 'PKR 0'],
        ['50000', 'PKR 50,000'],
        [999, 'PKR 999'],
        [1000, 'PKR 1,000'],
        [-1234.5, 'PKR -1,235'],
        [null, 'PKR 0'],
        [undefined, 'PKR 0'],
        ['abc', 'PKR 0'],
    ])('fmtPKR(%p) → %s', (input, expected) => {
        expect(fmtPKR(input as number | string | null | undefined)).toBe(expected);
    });
});
