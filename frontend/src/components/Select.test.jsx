import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import Select from './Select';

const mockOptions = [
    { value: '1', label: 'Phoenix Baker', subtext: '@phoenix', avatar: <span data-testid="avatar-1">P</span> },
    { value: '2', label: 'Olivia Rhye', subtext: '@olivia', avatar: <span data-testid="avatar-2">O</span> },
    { value: '3', label: 'Lana Steiner', subtext: '@lana' }
];

describe('Select Component', () => {
    it('renders with placeholder', () => {
        render(<Select options={mockOptions} value="" onChange={() => { }} placeholder="Select team member" />);
        expect(screen.getByText('Select team member')).toBeInTheDocument();
    });

    it('renders label and required asterisk', () => {
        render(<Select options={mockOptions} value="" onChange={() => { }} label="Team member" required />);
        expect(screen.getByText('Team member')).toBeInTheDocument();
        expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('opens dropdown on click', () => {
        render(<Select options={mockOptions} value="" onChange={() => { }} />);
        const button = screen.getByRole('button', { name: /Select an option/i });
        fireEvent.click(button);

        expect(screen.getByRole('listbox')).toBeInTheDocument();
        expect(screen.getByText('Phoenix Baker')).toBeInTheDocument();
        expect(screen.getByText('@phoenix')).toBeInTheDocument();
    });

    it('selects an option and calls onChange', () => {
        const handleChange = vi.fn();
        render(<Select options={mockOptions} value="" onChange={handleChange} />);

        // Open
        fireEvent.click(screen.getByRole('button'));

        // Click option
        fireEvent.click(screen.getByText('Phoenix Baker'));

        expect(handleChange).toHaveBeenCalledWith(mockOptions[0]);
    });

    it('renders avatar in selected value if available', () => {
        render(<Select options={mockOptions} value="1" onChange={() => { }} />);
        expect(screen.getByTestId('avatar-1')).toBeInTheDocument();
        expect(screen.getByText('Phoenix Baker')).toBeInTheDocument();
        expect(screen.getByText('@phoenix')).toBeInTheDocument();
    });

    it('respects disabled state', () => {
        render(<Select options={mockOptions} value="" onChange={() => { }} disabled />);
        const button = screen.getByRole('button');

        fireEvent.click(button);
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
});
