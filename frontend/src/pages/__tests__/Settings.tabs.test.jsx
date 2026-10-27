import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi } from 'vitest';
import Settings from '../Settings';

vi.mock('../../services/api', () => ({ setSessionEndedHandler: vi.fn(), default: { get: vi.fn(async () => ({ data: [] })), patch: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', role: 'user', interests: null }, refreshUser: vi.fn() }) }));
vi.mock('../../context/PinContext', () => ({ usePin: () => ({ isUnlocked: true, promptPin: vi.fn(), hasPin: false }) }));
vi.mock('../../hooks/useInstitutions', () => ({
    useInstitutions: () => ({ data: [], isLoading: false }),
    useCreateInstitution: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
    useDeleteInstitution: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
    useSeedInstitutions: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('../../hooks/useBrokerAccounts', () => ({
    useBrokerAccounts: () => ({ data: [], isLoading: false }),
    useCreateBrokerAccount: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
    useDeleteBrokerAccount: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
}));

const renderAt = (url) => render(
    <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={[url]}>
            <Settings />
        </MemoryRouter>
    </QueryClientProvider>,
);

describe('Settings tabs', () => {
    it('opens "What I track" from ?tab=tracking', () => {
        renderAt('/settings?tab=tracking');
        expect(screen.getByRole('heading', { name: 'What I track' })).toBeInTheDocument();
    });

    it('lists "What I track" in the tab menu', () => {
        renderAt('/settings');
        expect(screen.getAllByText('What I track').length).toBeGreaterThan(0);
    });
});
