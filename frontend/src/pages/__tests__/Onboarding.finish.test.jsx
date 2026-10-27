import { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi } from 'vitest';
import api from '../../services/api';
import { AuthTestContext } from '../../context/AuthContext';
import Onboarding from '../Onboarding';
import OnboardingGate from '../../components/OnboardingGate';

vi.mock('../../services/api', () => ({ setSessionEndedHandler: vi.fn(), default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
// A real stateful auth: refreshUser re-reads the "server" user, so finishing
// onboarding flips onboarded_at exactly as it does in the app.
vi.mock('../../context/AuthContext', async () => {
    const React = await import('react');
    const AuthTestContext = React.createContext(null);
    return { AuthTestContext, useAuth: () => React.useContext(AuthTestContext) };
});

const server = { onboarded_at: null };

function Harness({ children }) {
    const [user, setUser] = useState({ id: 'u1', role: 'user', must_change_password: false, interests: null, onboarded_at: null });
    const refreshUser = async () => setUser((u) => ({ ...u, onboarded_at: server.onboarded_at }));
    return <AuthTestContext.Provider value={{ user, refreshUser }}>{children}</AuthTestContext.Provider>;
}

describe('finishing onboarding from a next-step link', () => {
    it('lands on the page the user picked, not the dashboard', async () => {
        vi.mocked(api.get).mockImplementation((url) => Promise.resolve({
            data: url === '/banks' ? [{ id: 'b0', name: 'HBL', current_balance: '2500' }]
                : url === '/dashboard/summary' ? { metrics: { netWorth: 2500 } } : [],
        }));
        vi.mocked(api.patch).mockImplementation(async (_url, body) => {
            if (body.completeOnboarding) server.onboarded_at = '2026-10-21T00:00:00Z';
            return { data: {} };
        });

        render(
            <QueryClientProvider client={new QueryClient()}>
                <Harness>
                    <MemoryRouter initialEntries={['/onboarding']}>
                        <Routes>
                            <Route path="/onboarding" element={<OnboardingGate mode="onboarding"><Onboarding /></OnboardingGate>} />
                            <Route path="/personal" element={<p>PERSONAL</p>} />
                            <Route path="/" element={<p>DASHBOARD</p>} />
                        </Routes>
                    </MemoryRouter>
                </Harness>
            </QueryClientProvider>,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
        await screen.findByRole('heading', { name: 'Add your accounts' });
        await waitFor(() => expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled());
        fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
        fireEvent.click(await screen.findByRole('button', { name: /Check your Zakat/ }));

        expect(await screen.findByText('PERSONAL')).toBeInTheDocument();
    });
});
