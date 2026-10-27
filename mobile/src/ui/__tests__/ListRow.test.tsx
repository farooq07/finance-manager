import { render, screen, fireEvent } from '@testing-library/react-native';
import { ListRow } from '../ListRow';
import { ListCard } from '../ListCard';

describe('ListRow', () => {
    it('shows title, subtitle, amount and caption', async () => {
        await render(<ListRow title="Meezan Bank" subtitle="Bank" amount={100000} amountCaption="Balance" />);
        expect(screen.getByText('Meezan Bank')).toBeTruthy();
        expect(screen.getByText('Bank')).toBeTruthy();
        expect(screen.getByText('PKR 100,000')).toBeTruthy();
        expect(screen.getByText('Balance')).toBeTruthy();
    });

    it('fires onPress', async () => {
        const onPress = jest.fn();
        await render(<ListRow title="JazzCash" onPress={onPress} />);
        await fireEvent.press(screen.getByRole('button', { name: /JazzCash/ }));
        expect(onPress).toHaveBeenCalled();
    });

    it('is not a button without onPress', async () => {
        await render(<ListRow title="Cash" />);
        expect(screen.queryByRole('button')).toBeNull();
    });
});

describe('ListCard', () => {
    it('shows its title, group label and rows', async () => {
        await render(
            <ListCard title="Daily Cash" groups={[{ label: 'Today', rows: [<ListRow key="1" title="Uber" />] }]} />,
        );
        expect(screen.getByRole('header', { name: 'Daily Cash' })).toBeTruthy();
        expect(screen.getByText('Today')).toBeTruthy();
        expect(screen.getByText('Uber')).toBeTruthy();
    });
});
