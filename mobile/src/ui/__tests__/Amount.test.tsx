import { render, screen } from '@testing-library/react-native';
import { Amount } from '../Amount';
import { tokens } from '../tokens';

describe('Amount', () => {
    it('shows money in as green with a plus sign when signed', async () => {
        await render(<Amount value={5000} signed />);
        const text = screen.getByText('+PKR 5,000');
        expect(text).toHaveStyle({ color: tokens.colors.light.moneyIn });
        expect(tokens.colors.light.moneyIn).toBe('#059669');
    });

    it('shows money out without green', async () => {
        await render(<Amount value={-1500} signed />);
        const text = screen.getByText('PKR -1,500');
        expect(text).not.toHaveStyle({ color: tokens.colors.light.moneyIn });
    });

    it('unsigned amounts have no plus sign', async () => {
        await render(<Amount value={2500} />);
        expect(screen.getByText('PKR 2,500')).toBeTruthy();
    });
});
