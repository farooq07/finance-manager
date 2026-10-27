import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

// Proves the toolchain: jest-expo transforms TS/JSX and Testing Library can
// render a React Native component with this React version.
describe('test toolchain', () => {
    it('runs plain assertions', () => {
        expect(1 + 1).toBe(2);
    });

    // Testing Library 14: render is async and must be awaited.
    it('renders a React Native component', async () => {
        await render(<Text>WealthAxis</Text>);
        expect(screen.getByText('WealthAxis')).toBeTruthy();
    });
});
