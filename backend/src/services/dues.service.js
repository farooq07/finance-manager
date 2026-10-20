import Decimal from 'decimal.js';

/**
 * Net each person's ledger, then split by sign: a person who owes you more
 * than you owe them counts toward receivables, and vice versa. Netting is
 * per person only — one person's debt never offsets another's.
 *
 * @param {Array<{transactions: Array<{transaction_type: string, amount: number|string}>}>} people
 * @returns {{ totalReceivable: number, totalPayable: number }}
 */
export function summarizeDues(people) {
    let totalReceivable = new Decimal(0);
    let totalPayable = new Decimal(0);

    for (const person of people) {
        let net = new Decimal(0);
        for (const t of person.transactions) {
            if (t.transaction_type === 'receivable') net = net.plus(new Decimal(String(t.amount)));
            else if (t.transaction_type === 'payable') net = net.minus(new Decimal(String(t.amount)));
        }
        if (net.isPositive() && !net.isZero()) totalReceivable = totalReceivable.plus(net);
        else if (net.isNegative() && !net.isZero()) totalPayable = totalPayable.plus(net.abs());
    }

    return { totalReceivable: totalReceivable.toNumber(), totalPayable: totalPayable.toNumber() };
}
