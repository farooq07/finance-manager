import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import UnreconciledBadge from './UnreconciledBadge';

describe('UnreconciledBadge', () => {
    it("marks a statement imported despite a mismatch", () => {
        render(<UnreconciledBadge status="unreconciled" />);
        expect(screen.getByText("Didn't add up")).toHaveAttribute(
            'title',
            "Imported even though its balances didn't reconcile — check its transactions.",
        );
    });

    it.each(['pending', 'reviewed', undefined])('renders nothing for %s', (status) => {
        const { container } = render(<UnreconciledBadge status={status} />);
        expect(container).toBeEmptyDOMElement();
    });
});
