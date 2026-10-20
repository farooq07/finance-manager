import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fmtPKR } from '../utils/currency';
import { fmtDateLong } from '../utils/dates';
import Zakat from './Zakat';

let summary;
let summaryError;
let paidThisYear;

vi.mock('../context/PinContext', () => ({
    usePin: () => ({ isUnlocked: true, promptPin: vi.fn() }),
}));

vi.mock('../hooks/useZakat', () => ({
    useZakatEntries: () => ({ data: { entries: [], currentYearTotal: paidThisYear }, isLoading: false }),
    useZakatSummary: () => ({ data: summary, isLoading: false, isError: summaryError, refetch: vi.fn() }),
    useCreateZakatEntry: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useDeleteZakatEntry: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const baseSummary = {
    breakdown: {
        cash: 500000, investments: 300000, goldValue: 200000,
        receivables: 100000, payables: 50000, debts: 50000,
    },
    zakatableAssets: 1100000,
    deductions: 100000,
    netZakatable: 1000000,
    nisabValue: 600000,
    isNisabMet: true,
    zakatDue: 25000,
    goldPriceDate: '2026-10-19',
};

const renderPage = () => render(<Zakat />, { wrapper: BrowserRouter });

describe('Zakat page', () => {
    beforeEach(() => { summary = { ...baseSummary }; summaryError = false; paidThisYear = 0; });

    it('shows remaining zakat after this year\'s payments', () => {
        paidThisYear = 10000;
        renderPage();
        expect(screen.getByText('Remaining to pay')).toBeInTheDocument();
        expect(screen.getByText(fmtPKR(15000))).toBeInTheDocument();
    });

    it('says paid in full once payments cover the estimate', () => {
        paidThisYear = 30000;
        renderPage();
        expect(screen.getByText('Paid in full for this year')).toBeInTheDocument();
        expect(screen.queryByText('Remaining to pay')).not.toBeInTheDocument();
    });

    it('shows no remaining line when below nisab', () => {
        summary = { ...baseSummary, isNisabMet: false, zakatDue: 0 };
        renderPage();
        expect(screen.queryByText('Remaining to pay')).not.toBeInTheDocument();
        expect(screen.queryByText('Paid in full for this year')).not.toBeInTheDocument();
    });

    it('shows the date of the gold price used for nisab', () => {
        renderPage();
        expect(screen.getByText(`Gold price as of ${fmtDateLong('2026-10-19')}`)).toBeInTheDocument();
    });

    it('explains how long loans are deducted', () => {
        renderPage();
        expect(screen.getByText('Mortgages and car loans count only the next 12 monthly payments.')).toBeInTheDocument();
    });

    it('summary request failed: shows error, not a PKR 0 estimate', () => {
        summary = undefined;
        summaryError = true;
        renderPage();
        expect(screen.getByText("Couldn't calculate your Zakat right now.")).toBeInTheDocument();
        expect(screen.queryByText('How this is calculated')).not.toBeInTheDocument();
        expect(screen.queryByText(/nisab can't be checked/)).not.toBeInTheDocument();
    });

    it('shows zakat due', () => {
        renderPage();
        expect(screen.getByText(fmtPKR(25000))).toBeInTheDocument();
        expect(screen.getByText('Zakat is due on your wealth')).toBeInTheDocument();
    });

    it('shows below-nisab message', () => {
        summary = { ...baseSummary, isNisabMet: false, zakatDue: 0 };
        renderPage();
        expect(screen.getByText('Your wealth is below nisab — no Zakat due')).toBeInTheDocument();
    });

    it('shows nisab-unknown warning', () => {
        summary = { ...baseSummary, isNisabMet: null, nisabValue: null, goldPriceDate: null };
        renderPage();
        expect(screen.getByText("Gold price not available yet — nisab can't be checked. Estimate shown assumes Zakat is due.")).toBeInTheDocument();
    });

    it('renders all six breakdown rows', () => {
        renderPage();
        for (const label of ['Cash & bank', 'Investments', 'Gold', 'Owed to you', 'You owe', 'Debts']) {
            expect(screen.getByText(label)).toBeInTheDocument();
        }
        expect(screen.getByText(fmtPKR(300000))).toBeInTheDocument();
    });
});
