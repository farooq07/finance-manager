import { reconcile, importGate } from '../reconcile.service.js';

const tx = (net_amount, balance = null) => ({ net_amount, balance });

describe('reconcile — row order', () => {
    it('newest-first statement reconciles', () => {
        // Opening 10,000 → -500 (9,500) → +1,000 (10,500), listed newest first
        const recon = reconcile([tx(1000, 10500), tx(-500, 9500)], 10000, 10500);
        expect(recon.ok).toBe(true);
        expect(recon.mismatchCount).toBe(0);
    });

    it('a genuinely broken newest-first statement still fails', () => {
        const recon = reconcile([tx(1000, 10500), tx(-500, 9000)], 10000, 10500);
        expect(recon.ok).toBe(false);
    });
});

describe('importGate', () => {
    it('balanced import is allowed', () => {
        const recon = reconcile([tx(-500, 9500), tx(1000, 10500)], 10000, 10500);
        expect(importGate(recon, false)).toBeNull();
    });

    it('mismatch is blocked with 422 and the reconciliation', () => {
        const recon = reconcile([tx(-500, 9500), tx(1000, 10500)], 10000, 99999);
        const gate = importGate(recon, false);
        expect(gate.status).toBe(422);
        expect(gate.body.needsConfirmation).toBe(true);
        expect(gate.body.reconciliation).toBe(recon);
        expect(gate.body.message).toMatch(/reconcile/i);
        // CSV imports have no review grid, so don't send people looking for one.
        expect(gate.body.message).not.toMatch(/highlighted/i);
    });

    it('mismatch with acceptMismatch true is allowed', () => {
        const recon = reconcile([tx(-500)], 10000, 99999);
        expect(importGate(recon, true)).toBeNull();
    });

    it("acceptMismatch 'true' string is allowed", () => {
        const recon = reconcile([tx(-500)], 10000, 99999);
        expect(importGate(recon, 'true')).toBeNull();
    });

    it('unverifiable import is allowed', () => {
        const recon = reconcile([tx(-500), tx(200)], null, null);
        expect(recon.totalCheck).toBeNull();
        expect(importGate(recon, false)).toBeNull();
    });
});
