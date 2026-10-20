import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import StatementReviewModal from './StatementReviewModal';

const ROW_FLAG = "Balance doesn't follow from the previous row";
const OVERRIDE = "I've checked these rows — import anyway";

// Opening 10,000 → -500 (9,500) → +1,000 (10,500)
const rows = (secondBalance = 10500) => ([
    { transaction_date: '2026-03-01', description: 'ATM', debit_amount: 500, credit_amount: null, balance: 9500 },
    { transaction_date: '2026-03-02', description: 'SALARY', debit_amount: null, credit_amount: 1000, balance: secondBalance },
]);

const renderModal = ({ transactions = rows(), closing = 10500, onConfirm = vi.fn() } = {}) => {
    render(
        <StatementReviewModal
            preview={{ transactions, opening: 10000, closing }}
            fileName="march.pdf"
            onConfirm={onConfirm}
            onCancel={vi.fn()}
            committing={false}
        />
    );
    return { onConfirm, importButton: screen.getByRole('button', { name: /import/i }) };
};

describe('StatementReviewModal reconciliation', () => {
    it('marks a row whose balance breaks the running total', () => {
        renderModal({ transactions: rows(99999), closing: 99999 });
        expect(screen.getAllByTitle(ROW_FLAG)).toHaveLength(1);
    });

    it("import disabled while totals don't reconcile", () => {
        const { importButton } = renderModal({ closing: 99999 });
        expect(importButton).toBeDisabled();
        expect(screen.getByText(OVERRIDE)).toBeInTheDocument();
    });

    it('checking the override enables import and sends acceptMismatch', () => {
        const { importButton, onConfirm } = renderModal({ closing: 99999 });
        fireEvent.click(screen.getByLabelText(OVERRIDE));
        expect(importButton).toBeEnabled();
        fireEvent.click(importButton);
        expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ acceptMismatch: true }));
    });

    it('newest-first statement is not flagged', () => {
        const { importButton } = renderModal({ transactions: [...rows()].reverse() });
        expect(screen.queryByTitle(ROW_FLAG)).not.toBeInTheDocument();
        expect(importButton).toBeEnabled();
    });

    it('balanced statement imports without override', () => {
        const { importButton, onConfirm } = renderModal();
        expect(screen.queryByText(OVERRIDE)).not.toBeInTheDocument();
        expect(screen.queryByTitle(ROW_FLAG)).not.toBeInTheDocument();
        fireEvent.click(importButton);
        expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ acceptMismatch: false }));
    });
});
