import { Text, processColor } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Screen } from '../Screen';
import { HeroCard } from '../HeroCard';
import { tokens } from '../tokens';

let mockScheme: 'light' | 'dark' = 'light';
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({ __esModule: true, default: () => mockScheme }));

describe('Screen', () => {
    beforeEach(() => { mockScheme = 'light'; });

    it('paints the light gradient', async () => {
        await render(<Screen><Text>Hi</Text></Screen>);
        // expo-linear-gradient hands colours to the native view already processed.
        expect(screen.getByTestId('screen-background').props.colors).toEqual(tokens.gradients.light.map((c) => processColor(c)));
        expect(tokens.gradients.light).toEqual(['#F3FBF7', '#FFFBF4', '#F1F6FC']);
    });

    it('paints the dark gradient in dark mode', async () => {
        mockScheme = 'dark';
        await render(<Screen><Text>Hi</Text></Screen>);
        expect(screen.getByTestId('screen-background').props.colors).toEqual(['#0F172A', '#111827'].map((c) => processColor(c)));
    });

    it('keeps forms above the keyboard when asked', async () => {
        await render(<Screen keyboard><Text>Form</Text></Screen>);
        expect(screen.getByTestId('keyboard-avoiding')).toBeTruthy();
    });

    it('has no keyboard wrapper by default', async () => {
        await render(<Screen><Text>List</Text></Screen>);
        expect(screen.queryByTestId('keyboard-avoiding')).toBeNull();
    });
});

describe('HeroCard', () => {
    it('shows label, value, caption and quick actions', async () => {
        const onAdd = jest.fn();
        await render(
            <HeroCard
                label="Net worth"
                value="PKR 1,250,000"
                caption="Across 3 accounts"
                actions={[{ label: 'Add expense', glyph: '↗', onPress: onAdd }]}
            />,
        );
        expect(screen.getByText('Net worth')).toBeTruthy();
        expect(screen.getByText('PKR 1,250,000')).toBeTruthy();
        expect(screen.getByText('Across 3 accounts')).toBeTruthy();
        await fireEvent.press(screen.getByRole('button', { name: 'Add expense ↗' }));
        expect(onAdd).toHaveBeenCalled();
    });
});
