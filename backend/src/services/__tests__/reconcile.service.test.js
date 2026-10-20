import { reconcile, importGate } from '../reconcile.service.js';

const tx = (net_amount, balance = null) => ({ net_amount, balance });

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
