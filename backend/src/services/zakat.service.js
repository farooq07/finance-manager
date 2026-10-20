import Decimal from 'decimal.js';
import { ZAKAT_RATE } from './goldValuation.service.js';

const toDecimal = (v) => {
    const n = Number(v);
    return new Decimal(Number.isFinite(n) ? v : 0);
};

const round2 = (d) => d.toDecimalPlaces(2).toNumber();

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
