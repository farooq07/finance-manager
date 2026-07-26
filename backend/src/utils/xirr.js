import Decimal from 'decimal.js';

/**
 * XIRR — the annualised rate of return for an irregularly-spaced series of
 * cashflows. This is the honest measure of portfolio performance: it accounts
 * for when money went in, which a simple (value - cost) / cost ratio does not.
 *
 * Convention: money leaving the investor is negative (deposits, buys), money
 * coming back is positive (sells, dividends, and the current portfolio value
 * as a final synthetic inflow).
 *
 * Solved with Newton-Raphson, falling back to bisection when the derivative
 * misbehaves — which it does for realistic finance inputs more often than
 * textbook examples suggest. Returns null rather than a garbage number when
 * no rate can be found; callers must handle null and show "—".
 */

const DAYS_PER_YEAR = 365;
const MAX_NEWTON_ITERATIONS = 100;
const TOLERANCE = 1e-7;

// Rates outside this band are not meaningful for a portfolio and usually mean
// the cashflow series is malformed. -0.999999 avoids (1+r) hitting zero.
const MIN_RATE = -0.999999;
const MAX_RATE = 100; // 10,000% — generous upper bound for bisection

function yearsBetween(start, date) {
    return (date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * DAYS_PER_YEAR);
}

/**
 * Net present value of the flows at a given rate.
 * Uses plain floats: NPV is a root-finding intermediate, not a reported
 * figure, and Decimal's fractional exponent support is not suited to it.
 * The reported inputs and outputs stay decimal-safe.
 */
function npv(flows, rate) {
    const start = flows[0].date;
    let total = 0;
    for (const flow of flows) {
        total += flow.amount / (1 + rate) ** yearsBetween(start, flow.date);
    }
    return total;
}

function npvDerivative(flows, rate) {
    const start = flows[0].date;
    let total = 0;
    for (const flow of flows) {
        const t = yearsBetween(start, flow.date);
        if (t === 0) continue;
        total -= (t * flow.amount) / (1 + rate) ** (t + 1);
    }
    return total;
}

/**
 * @param {Array<{amount: number|string|Decimal, date: Date}>} cashflows
 * @param {number} [guess=0.1]
 * @returns {number|null} annualised rate as a decimal (0.15 = 15%), or null
 */
export function xirr(cashflows, guess = 0.1) {
    if (!Array.isArray(cashflows) || cashflows.length < 2) return null;

    const flows = cashflows
        .map(f => ({ amount: new Decimal(f.amount ?? 0).toNumber(), date: new Date(f.date) }))
        .filter(f => Number.isFinite(f.amount) && !Number.isNaN(f.date.getTime()))
        .sort((a, b) => a.date - b.date);

    if (flows.length < 2) return null;

    // A rate only exists if money went both directions.
    const hasNegative = flows.some(f => f.amount < 0);
    const hasPositive = flows.some(f => f.amount > 0);
    if (!hasNegative || !hasPositive) return null;

    // Newton-Raphson first — fast when it works.
    let rate = guess;
    for (let i = 0; i < MAX_NEWTON_ITERATIONS; i++) {
        const value = npv(flows, rate);
        if (Math.abs(value) < TOLERANCE) return rate;

        const derivative = npvDerivative(flows, rate);
        if (!Number.isFinite(derivative) || derivative === 0) break;

        const next = rate - value / derivative;
        if (!Number.isFinite(next) || next <= MIN_RATE) break;
        if (Math.abs(next - rate) < TOLERANCE) return next;
        rate = next;
    }

    // Bisection fallback — slower, but converges whenever a sign change exists.
    let low = MIN_RATE;
    let high = MAX_RATE;
    let lowValue = npv(flows, low);
    let highValue = npv(flows, high);
    if (!Number.isFinite(lowValue) || !Number.isFinite(highValue)) return null;
    if (lowValue * highValue > 0) return null; // no root in range

    for (let i = 0; i < 200; i++) {
        const mid = (low + high) / 2;
        const midValue = npv(flows, mid);
        if (Math.abs(midValue) < TOLERANCE) return mid;
        if (lowValue * midValue < 0) {
            high = mid;
            highValue = midValue;
        } else {
            low = mid;
            lowValue = midValue;
        }
    }
    return null;
}

/**
 * Build the cashflow series for a brokerage portfolio.
 *
 * Until per-lot buy/sell records exist, brokerage deposits and withdrawals
 * (BankInvestment) are the truest available record of money in and out:
 * positive amounts are deposits (cash leaving the investor → negative flow),
 * negative amounts are withdrawals (→ positive flow). Dividends received are
 * inflows, and the current market value is the terminal inflow.
 *
 * @param {Array<{transaction_date: Date, amount: number|Decimal}>} investments
 * @param {Array<{payment_date: Date, net_dividend_amount: number|Decimal}>} dividends
 * @param {number|Decimal} currentValue
 * @param {Date} [asOf=new Date()]
 */
export function buildPortfolioCashflows(investments = [], dividends = [], currentValue = 0, asOf = new Date()) {
    const flows = [];

    for (const inv of investments) {
        const amount = new Decimal(inv.amount ?? 0);
        if (amount.isZero()) continue;
        flows.push({ amount: amount.negated().toNumber(), date: new Date(inv.transaction_date) });
    }

    for (const div of dividends) {
        const amount = new Decimal(div.net_dividend_amount ?? 0);
        if (amount.isZero() || !div.payment_date) continue;
        flows.push({ amount: amount.toNumber(), date: new Date(div.payment_date) });
    }

    const terminal = new Decimal(currentValue ?? 0);
    if (terminal.greaterThan(0)) {
        flows.push({ amount: terminal.toNumber(), date: new Date(asOf) });
    }

    return flows.sort((a, b) => a.date - b.date);
}
