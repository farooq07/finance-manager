import { computeZakat } from '../zakat.service.js';

const base = {
    cash: 500000, investments: 300000, goldValue: 200000,
    receivables: 100000, payables: 50000, debts: 50000, nisabValue: 600000,
};

describe('computeZakat', () => {
    it('sums zakatable assets and deductions', () => {
        const r = computeZakat(base);
        expect(r.zakatableAssets).toBe(1100000);
        expect(r.deductions).toBe(100000);
        expect(r.netZakatable).toBe(1000000);
        expect(r.isNisabMet).toBe(true);
        expect(r.zakatDue).toBe(25000);
    });

    it('below nisab owes nothing', () => {
        const r = computeZakat({
            ...base, cash: 0, investments: 0, goldValue: 0,
            receivables: 500000, payables: 0, debts: 0,
        });
        expect(r.isNisabMet).toBe(false);
        expect(r.zakatDue).toBe(0);
    });

    it('exactly at nisab is due', () => {
        const r = computeZakat({
            cash: 600000, investments: 0, goldValue: 0,
            receivables: 0, payables: 0, debts: 0, nisabValue: 600000,
        });
        expect(r.isNisabMet).toBe(true);
        expect(r.zakatDue).toBe(15000);
    });

    it('clamps negative net to zero', () => {
        const r = computeZakat({ ...base, debts: 5000000 });
        expect(r.netZakatable).toBe(0);
        expect(r.zakatDue).toBe(0);
    });

    it('nisab unknown: isNisabMet null, zakatDue still reported on net', () => {
        const r = computeZakat({ ...base, nisabValue: null });
        expect(r.isNisabMet).toBeNull();
        expect(r.nisabValue).toBeNull();
        expect(r.zakatDue).toBe(25000);
    });

    it('no float drift', () => {
        const r = computeZakat({
            cash: 0.1, investments: 0.2, goldValue: 0,
            receivables: 0, payables: 0, debts: 0, nisabValue: 0.3,
        });
        expect(r.netZakatable).toBe(0.3);
        expect(r.isNisabMet).toBe(true);
    });
});
