import { holdingsFromRows } from '../cdcHoldings.service.js';

describe('holdingsFromRows (CDC / broker export)', () => {
    it('reads the CDC columns, case-insensitively, with commas', () => {
        const { holdings, totalCustody } = holdingsFromRows([
            { Security: 'engro', Quantity: '1,000', 'Current Price': '485.38', 'Cost/Unit': '400', 'Current Value': '485,380' },
            { SYMBOL: 'LUCK', HOLDING: '50', LAST: '1,000' },
        ]);
        expect(holdings.map((h) => h.symbol)).toEqual(['ENGRO', 'LUCK']);
        expect(holdings[0]).toMatchObject({ holding: 1000, market_rate: 485.38, custody_val: 485380, total_cost: 400000, change: 85380 });
        expect(holdings[1].custody_val).toBe(50000); // no value column: shares × price
        expect(totalCustody).toBe(535380);
    });

    it('skips rows without a symbol or shares', () => {
        const { holdings } = holdingsFromRows([{ Security: '', Quantity: '10' }, { Security: 'HBL', Quantity: '0' }, { Total: '123' }]);
        expect(holdings).toEqual([]);
    });
});
