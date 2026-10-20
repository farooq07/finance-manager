import Decimal from 'decimal.js';

const EPSILON = 0.01; // tolerance for floating-point / rounding (1 paisa)

/**
 * Reconcile parsed transactions against the statement's balances.
 *
 * Two independent checks:
 *  1. Total check  — opening + Σ(net_amount) === closing
 *  2. Per-row check — for each row (in statement order), the running balance
 *     must match the row's own balance column: balance[i] === balance[i-1] + net[i]
 *
 * The per-row check is the strongest signal: if any single amount was misread
 * (e.g. the parser grabbed the balance instead of the amount), exactly that row
 * fails — so we can point the user at it.
 *
 * @param {Array} transactions  in STATEMENT order (not date-sorted)
 * @param {number|null} opening
 * @param {number|null} closing
 * @returns {{
 *   ok: boolean,
 *   totalCheck: {ok:boolean, computedClosing:number, expectedClosing:number, diff:number}|null,
 *   rowChecks: Array<{index:number, ok:boolean, expected:number, actual:number, diff:number}>,
 *   mismatchCount: number,
 *   hasBalances: boolean,
 *   message: string,
 * }}
 */
export function reconcile(transactions, opening, closing) {
    const hasOpening = opening !== null && opening !== undefined && !isNaN(Number(opening));
    const hasClosing = closing !== null && closing !== undefined && !isNaN(Number(closing));

    // ── Total check ──────────────────────────────────────────────────────────
    let totalCheck = null;
    if (hasOpening && hasClosing && transactions.length > 0) {
        let running = new Decimal(opening);
        for (const tx of transactions) running = running.plus(new Decimal(tx.net_amount || 0));
        const computed = running.toNumber();
        const expected = Number(closing);
        const diff = Math.abs(computed - expected);
        totalCheck = { ok: diff < EPSILON, computedClosing: computed, expectedClosing: expected, diff };
    }

    // ── Per-row running-balance check ──────────────────────────────────────────
    // Only meaningful when rows carry their own balance column.
    const withBalance = transactions.filter(t => t.balance !== null && t.balance !== undefined);
    const hasBalances = withBalance.length > 0 && withBalance.length === transactions.length;

    const rowChecks = [];
    if (hasBalances && transactions.length > 0) {
        // Seed prevBalance: derive from first row (balance - net), or use opening.
        let prev = hasOpening
            ? new Decimal(opening)
            : new Decimal(transactions[0].balance).minus(new Decimal(transactions[0].net_amount || 0));

        transactions.forEach((tx, index) => {
            const expected = prev.plus(new Decimal(tx.net_amount || 0));
            const actual = new Decimal(tx.balance);
            const diff = expected.minus(actual).abs().toNumber();
            rowChecks.push({
                index,
                ok: diff < EPSILON,
                expected: expected.toNumber(),
                actual: actual.toNumber(),
                diff,
            });
            prev = actual; // chain off the statement's own balance to isolate single-row errors
        });
    }

    const mismatchCount = rowChecks.filter(r => !r.ok).length;

    // ── Overall verdict ────────────────────────────────────────────────────────
    // Valid when whichever checks we COULD run all pass. If we have no balance
    // data at all, we can't verify — report ok:true but flag unverified.
    let ok = true;
    let message = '';
    if (totalCheck && !totalCheck.ok) {
        ok = false;
        message = `Totals don't reconcile: opening + transactions = ${totalCheck.computedClosing.toFixed(2)}, but statement closing = ${totalCheck.expectedClosing.toFixed(2)} (off by ${totalCheck.diff.toFixed(2)}).`;
    }
    if (mismatchCount > 0) {
        ok = false;
        message = `${mismatchCount} transaction${mismatchCount > 1 ? 's' : ''} don't match the running balance.`;
    }
    if (ok && (totalCheck || hasBalances)) {
        message = 'All balances reconcile.';
    } else if (ok && !totalCheck && !hasBalances) {
        message = 'No balance data available to verify — import unverified.';
    }

    return { ok, totalCheck, rowChecks, mismatchCount, hasBalances, message };
}

/**
 * Decide whether a reconciled import may be saved. A statement whose numbers
 * don't add up is blocked until the user explicitly accepts the mismatch;
 * one with no balance data at all is allowed (unverified isn't wrong).
 *
 * @returns {null | { status: 422, body: { message, reconciliation, needsConfirmation: true } }}
 */
export function importGate(reconciliation, acceptMismatch) {
    if (reconciliation.ok) return null;
    if (acceptMismatch === true || acceptMismatch === 'true') return null;
    return {
        status: 422,
        body: {
            message: `This statement doesn't reconcile: ${reconciliation.message} Check the highlighted rows, or confirm to import anyway.`,
            reconciliation,
            needsConfirmation: true,
        },
    };
}
