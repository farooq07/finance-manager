import { render, screen, fireEvent } from '@testing-library/react-native';
import { TabBar } from '../TabBar';
import { ComingSoon } from '../../features/shell/ComingSoon';

describe('TabBar', () => {
    it('shows the five tabs and marks the active one', async () => {
        await render(<TabBar active="home" onSelect={jest.fn()} />);
        for (const name of ['Home', 'Accounts', 'Add', 'Invest', 'More']) {
            expect(screen.getByRole('tab', { name })).toBeTruthy();
        }
        expect(screen.getByRole('tab', { name: 'Home' })).toBeSelected();
    });

    it('selecting a tab reports it', async () => {
        const onSelect = jest.fn();
        await render(<TabBar active="home" onSelect={onSelect} />);
        await fireEvent.press(screen.getByRole('tab', { name: 'Invest' }));
        expect(onSelect).toHaveBeenCalledWith('invest');
    });

    it('Add opens the quick-add sheet instead of a screen', async () => {
        const onSelect = jest.fn();
        await render(<TabBar active="home" onSelect={onSelect} />);
        await fireEvent.press(screen.getByRole('tab', { name: 'Add' }));
        expect(onSelect).not.toHaveBeenCalled();
        for (const item of ['Expense', 'Transfer', 'Import statement', 'Ask AI']) {
            expect(screen.getByText(item)).toBeTruthy();
        }
        expect(screen.getAllByText('Coming in the next update')).toHaveLength(4);
    });
});

describe('ComingSoon', () => {
    it('explains the area is not built yet', async () => {
        await render(<ComingSoon title="Accounts" />);
        expect(screen.getByRole('header', { name: 'Accounts' })).toBeTruthy();
        expect(screen.getByText('Coming in the next update')).toBeTruthy();
    });
});
