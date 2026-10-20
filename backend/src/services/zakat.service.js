import Decimal from 'decimal.js';
import { ZAKAT_RATE } from './goldValuation.service.js';

const toDecimal = (v) => {
    if (v == null) return new Decimal(0);
    const n = Number(v);
    return new Decimal(Number.isFinite(n) ? String(v) : 0);
};

const round2 = (d) => d.toDecimalPlaces(2).toNumber();

// Long-term financing: only the instalments due in the coming year reduce
// zakatable wealth (common contemporary Hanafi practice). Everything else is
// short-term and deducted in full.
const LONG_TERM_DEBT_TYPES = new Set(['mortgage', 'car_loan']);
const LONG_TERM_MONTHS = 12;

/**
 * How much of the user's active debts may be deducted before Zakat.
 * A long-term loan without a recorded monthly payment is deducted in full —
 * we can't tell what falls due this year, and under-deducting would
 * overstate Zakat.
 */
export function zakatDeductibleDebt(debts) {
    let total = new Decimal(0);
    for (const d of debts) {
        const outstanding = toDecimal(d.outstanding);
        const monthly = toDecimal(d.minimum_payment);
        const deductible = LONG_TERM_DEBT_TYPES.has(d.debt_type) && monthly.greaterThan(0)
            ? Decimal.min(outstanding, monthly.times(LONG_TERM_MONTHS))
            : outstanding;
        total = total.plus(deductible);
    }
    return round2(total);
}

/**
 * Zakat on the user's whole wealth.
 *
 * Zakatable: cash (bank + wallet), investments at market value,
 * gold at current value, and money owed to the user. Deducted: money the user
 * owes (dues payables + active debts). Personal-use physical assets are not
 * passed in — they are not zakatable.
 *
 * nisabValue is the PKR value of 85 g of 24K gold. When it is unknown (no gold
 * price recorded yet) isNisabMet is null and zakatDue is still reported as an
 * estimate on the net amount, so the UI can warn instead of showing 0.
 */
export function computeZakat({ cash, investments, goldValue, receivables, payables, debts, nisabValue }) {
    const zakatableAssets = toDecimal(cash)
        .plus(toDecimal(investments))
        .plus(toDecimal(goldValue))
        .plus(toDecimal(receivables));
    const deductions = toDecimal(payables).plus(toDecimal(debts));
    const net = Decimal.max(zakatableAssets.minus(deductions), 0);

    const nisabKnown = nisabValue != null && toDecimal(nisabValue).greaterThan(0);
    const isNisabMet = nisabKnown ? net.greaterThanOrEqualTo(toDecimal(nisabValue)) : null;
    const zakatDue = isNisabMet === false ? new Decimal(0) : net.times(ZAKAT_RATE);

    return {
        zakatableAssets: round2(zakatableAssets),
        deductions: round2(deductions),
        netZakatable: round2(net),
        nisabValue: nisabKnown ? round2(toDecimal(nisabValue)) : null,
        isNisabMet,
        zakatDue: round2(zakatDue),
    };
}
