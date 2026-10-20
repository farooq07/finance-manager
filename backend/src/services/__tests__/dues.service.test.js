import { summarizeDues } from '../dues.service.js';

const tx = (transaction_type, amount) => ({ transaction_type, amount });

describe('summarizeDues', () => {
    it('one receivable person', () => {
        expect(summarizeDues([{ transactions: [tx('receivable', 1000)] }]))
            .toEqual({ totalReceivable: 1000, totalPayable: 0 });
    });

    it('one payable person', () => {
        expect(summarizeDues([{ transactions: [tx('payable', 700)] }]))
            .toEqual({ totalReceivable: 0, totalPayable: 700 });
    });

    it('nets within a person', () => {
        expect(summarizeDues([{ transactions: [tx('receivable', 1000), tx('payable', 400)] }]))
            .toEqual({ totalReceivable: 600, totalPayable: 0 });
    });

    it('netted-to-zero person', () => {
        expect(summarizeDues([{ transactions: [tx('receivable', 500), tx('payable', 500)] }]))
            .toEqual({ totalReceivable: 0, totalPayable: 0 });
    });

    it('does not net across people', () => {
        expect(summarizeDues([
            { transactions: [tx('receivable', 1000)] },
            { transactions: [tx('payable', 300)] },
        ])).toEqual({ totalReceivable: 1000, totalPayable: 300 });
    });

    it('sums string amounts exactly', () => {
        const r = summarizeDues([{ transactions: [tx('receivable', '0.10'), tx('receivable', '0.20')] }]);
        expect(r.totalReceivable).toBe(0.3);
    });

    it('ignores unknown transaction types', () => {
        expect(summarizeDues([{ transactions: [tx('receivable', 100), tx('note', 999)] }]))
            .toEqual({ totalReceivable: 100, totalPayable: 0 });
    });

    it('empty list → zeros', () => {
        expect(summarizeDues([])).toEqual({ totalReceivable: 0, totalPayable: 0 });
    });
});
