import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import Select from './Select';

// NOTE: This component wraps Radix UI Select which uses a portal for the dropdown.
// Portal-based interactions (open/select) are unreliable in JSDOM; tests here cover
// static rendering and accessible attributes only.

const mockOptions = [
    { value: '1', label: 'Phoenix Baker', subtext: '@phoenix', avatar: <span data-testid="avatar-1">P</span> },
    { value: '2', label: 'Olivia Rhye', subtext: '@olivia' },
    { value: '3', label: 'Lana Steiner' },
];

describe('Select Component', () => {
    it('renders the placeholder when no value is selected', () => {
        render(
            <Select options={mockOptions} value="" onChange={() => {}} placeholder="Select team member" />
        );
        expect(screen.getByText('Select team member')).toBeInTheDocument();
    });

    it('renders a label when provided', () => {
        render(
            <Select options={mockOptions} value="" onChange={() => {}} label="Team member" />
        );
        expect(screen.getByText('Team member')).toBeInTheDocument();
    });

    it('renders a required asterisk when required prop is set', () => {
        render(
            <Select options={mockOptions} value="" onChange={() => {}} label="Team member" required />
        );
        expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('does not render an asterisk without required prop', () => {
        render(
            <Select options={mockOptions} value="" onChange={() => {}} label="Team member" />
        );
        expect(screen.queryByText('*')).not.toBeInTheDocument();
    });

    it('renders the trigger with combobox role', () => {
        render(<Select options={mockOptions} value="" onChange={() => {}} />);
        expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('renders the trigger as disabled when disabled prop is set', () => {
        render(
            <Select options={mockOptions} value="" onChange={() => {}} disabled />
        );
        expect(screen.getByRole('combobox')).toBeDisabled();
    });

    it('renders an error message when error prop is provided', () => {
        render(
            <Select options={mockOptions} value="" onChange={() => {}} error="This field is required" />
        );
        expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('does not render an error message without error prop', () => {
        render(<Select options={mockOptions} value="" onChange={() => {}} />);
        expect(screen.queryByText('This field is required')).not.toBeInTheDocument();
    });
});
