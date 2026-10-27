import { render, screen, fireEvent } from '@testing-library/react-native';
import { EmptyState } from '../EmptyState';
import { ErrorState } from '../ErrorState';
import { OfflineBanner } from '../OfflineBanner';
import { Button } from '../Button';
import { Field } from '../Field';

describe('states', () => {
    it('EmptyState shows its copy and action', async () => {
        const onPress = jest.fn();
        await render(<EmptyState title="Accounts" message="Coming in the next update" action={{ label: 'Go to Home', onPress }} />);
        expect(screen.getByText('Coming in the next update')).toBeTruthy();
        await fireEvent.press(screen.getByRole('button', { name: 'Go to Home' }));
        expect(onPress).toHaveBeenCalled();
    });

    it('ErrorState "Try again" calls onRetry', async () => {
        const onRetry = jest.fn();
        await render(<ErrorState message="Can't reach WealthAxis." onRetry={onRetry} />);
        expect(screen.getByText("Can't reach WealthAxis.")).toBeTruthy();
        await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
        expect(onRetry).toHaveBeenCalled();
    });

    it('OfflineBanner explains cached data', async () => {
        await render(<OfflineBanner />);
        expect(screen.getByText("You're offline — showing saved data")).toBeTruthy();
    });
});

describe('Button', () => {
    it('presses, and is disabled while loading', async () => {
        const onPress = jest.fn();
        const { rerender } = await render(<Button label="Continue" onPress={onPress} />);
        await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
        expect(onPress).toHaveBeenCalledTimes(1);

        await rerender(<Button label="Continue" onPress={onPress} loading />);
        expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    });
});

describe('Field', () => {
    it('is labelled and shows its error', async () => {
        const onChangeText = jest.fn();
        await render(<Field label="Email" value="" onChangeText={onChangeText} error="Enter your email" />);
        await fireEvent.changeText(screen.getByLabelText('Email'), 'a@b.co');
        expect(onChangeText).toHaveBeenCalledWith('a@b.co');
        expect(screen.getByText('Enter your email')).toBeTruthy();
    });
});
