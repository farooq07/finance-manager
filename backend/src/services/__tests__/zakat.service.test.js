import { computeZakat, zakatDeductibleDebt } from '../zakat.service.js';

const debt = (debt_type, outstanding, minimum_payment = null) => ({ debt_type, outstanding, minimum_payment });

describe('zakatDeductibleDebt', () => {
    it('deducts credit cards, personal loans and other debts in full', () => {
        expect(zakatDeductibleDebt([debt('credit_card', 80000, 5000)])).toBe(80000);
        expect(zakatDeductibleDebt([debt('personal_loan', 300000, 20000)])).toBe(300000);
        expect(zakatDeductibleDebt([debt('other', 15000)])).toBe(15000);
    });

    it('deducts only the next 12 monthly payments of a mortgage', () => {
        expect(zakatDeductibleDebt([debt('mortgage', 5000000, 50000)])).toBe(600000);
    });

    it('never deducts more than a long loan\'s outstanding balance', () => {
        expect(zakatDeductibleDebt([debt('car_loan', 200000, 30000)])).toBe(200000);
    });

    it('deducts a long loan in full when no monthly payment is recorded', () => {
        expect(zakatDeductibleDebt([debt('mortgage', 5000000, null)])).toBe(5000000);
        expect(zakatDeductibleDebt([debt('car_loan', 900000, 0)])).toBe(900000);
    });

    it('sums mixed debts and accepts Prisma Decimal strings', () => {
        expect(zakatDeductibleDebt([
            debt('credit_card', '10000.10'),
            debt('car_loan', '1200000.00', '25000.00'),
        ])).toBe(310000.1);
    });

    it('no debts → 0', () => {
        expect(zakatDeductibleDebt([])).toBe(0);
    });
});

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
