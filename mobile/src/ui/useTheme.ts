import { useColorScheme } from 'react-native';
import { tokens, type ThemeColors } from './tokens';

export type Theme = {
    scheme: 'light' | 'dark';
    colors: ThemeColors;
    gradient: readonly string[];
};

/** Colours and background gradient for the device's light/dark setting. */
export function useTheme(): Theme {
    const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
    return { scheme, colors: tokens.colors[scheme], gradient: tokens.gradients[scheme] };
}
