import { MD3LightTheme, MD3DarkTheme, type MD3Theme } from 'react-native-paper';
import { Colors } from './colors';

/**
 * React Native Paper Theme Configuration
 * Maps existing M3 color tokens to RNP theme structure
 */

export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: Colors.primary,
    onPrimary: Colors.onPrimary,
    primaryContainer: Colors.primaryContainer,
    onPrimaryContainer: Colors.onPrimaryContainer,

    secondary: Colors.secondary,
    onSecondary: Colors.onSecondary,
    secondaryContainer: Colors.secondaryContainer,
    onSecondaryContainer: Colors.onSecondaryContainer,

    tertiary: Colors.tertiary,
    onTertiary: Colors.onTertiary,
    tertiaryContainer: Colors.tertiaryContainer,
    onTertiaryContainer: Colors.onTertiaryContainer,

    error: Colors.error,
    onError: Colors.onError,
    errorContainer: Colors.errorContainer,
    onErrorContainer: Colors.onErrorContainer,

    background: Colors.background,
    onBackground: Colors.onBackground,

    surface: Colors.surface,
    onSurface: Colors.onSurface,
    surfaceVariant: Colors.surfaceVariant,
    onSurfaceVariant: Colors.onSurfaceVariant,

    outline: Colors.outline,
    outlineVariant: Colors.outlineVariant,

    // Additional RNP specific colors
    inverseOnSurface: Colors.textInverse,
    inverseSurface: Colors.primaryDark,
    scrim: '#000000',
    backdrop: 'rgba(0, 0, 0, 0.4)',
  },
};

export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: Colors.dark.primary,
    onPrimary: Colors.dark.onPrimary,
    primaryContainer: '#003828',
    onPrimaryContainer: Colors.primary,

    secondary: Colors.dark.secondary,
    onSecondary: '#2D0052',
    secondaryContainer: '#5D2B81',
    onSecondaryContainer: Colors.dark.secondary,

    tertiary: '#81F4D5',
    onTertiary: '#00373D',
    tertiaryContainer: '#00505A',
    onTertiaryContainer: '#81F4D5',

    error: Colors.dark.error,
    onError: '#601410',
    errorContainer: '#8C1D18',
    onErrorContainer: Colors.dark.error,

    background: Colors.dark.background,
    onBackground: Colors.dark.text,

    surface: Colors.dark.surface,
    onSurface: Colors.dark.text,
    surfaceVariant: Colors.dark.surfaceVariant,
    onSurfaceVariant: Colors.dark.textSecondary,

    outline: Colors.dark.border,
    outlineVariant: '#49454E',

    // Additional RNP specific colors
    inverseOnSurface: Colors.dark.background,
    inverseSurface: Colors.background,
    scrim: '#000000',
    backdrop: 'rgba(0, 0, 0, 0.4)',
  },
};
