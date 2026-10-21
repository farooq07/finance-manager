import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import OnboardingGate from '../OnboardingGate';

let currentUser;
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: currentUser }) }));

const renderAt = (path) => render(
    <MemoryRouter initialEntries={[path]}>
        <Routes>
            <Route path="/" element={<OnboardingGate mode="app"><p>APP</p></OnboardingGate>} />
            <Route path="/onboarding" element={<OnboardingGate mode="onboarding"><p>ONBOARDING</p></OnboardingGate>} />
            <Route path="/welcome" element={<p>WELCOME</p>} />
            <Route path="/change-password" element={<p>CHANGE PASSWORD</p>} />
        </Routes>
    </MemoryRouter>,
);

const newUser = { role: 'user', must_change_password: false, onboarded_at: null };
const onboardedUser = { ...newUser, onboarded_at: '2026-10-21T00:00:00Z' };

describe('OnboardingGate', () => {
    it('signed-out user goes to /welcome', () => {
        currentUser = null;
        renderAt('/');
        expect(screen.getByText('WELCOME')).toBeInTheDocument();
    });

    it('new user is sent to /onboarding', () => {
        currentUser = newUser;
        renderAt('/');
        expect(screen.getByText('ONBOARDING')).toBeInTheDocument();
    });

    it('already-onboarded user is not redirected', () => {
        currentUser = onboardedUser;
        renderAt('/');
        expect(screen.getByText('APP')).toBeInTheDocument();
    });

    it('a user object without the field (older response) is not redirected', () => {
        currentUser = { role: 'user', must_change_password: false };
        renderAt('/');
        expect(screen.getByText('APP')).toBeInTheDocument();
    });

    it('must_change_password wins over onboarding', () => {
        currentUser = { ...newUser, must_change_password: true };
        renderAt('/');
        expect(screen.getByText('CHANGE PASSWORD')).toBeInTheDocument();
    });

    it('onboarded user visiting /onboarding goes to /', () => {
        currentUser = onboardedUser;
        renderAt('/onboarding');
        expect(screen.getByText('APP')).toBeInTheDocument();
    });

    it('new user can open /onboarding', () => {
        currentUser = newUser;
        renderAt('/onboarding');
        expect(screen.getByText('ONBOARDING')).toBeInTheDocument();
    });
});
