/**
 * Material Design 3 Typography System
 * Based on M3 type scale with responsive sizing
 */

import { StyleSheet, TextStyle } from 'react-native';

// ═══════════════════════════════════════════════════════════════
// M3 TYPE SCALE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export const Typography = {
  // Display Styles (Large headlines)
  displayLarge: {
    fontSize: 57,
    lineHeight: 64,
    letterSpacing: 0,
    fontWeight: '400' as const,
    fontFamily: 'System', // Uses system font
  } as TextStyle,

  displayMedium: {
    fontSize: 45,
    lineHeight: 52,
    letterSpacing: 0,
    fontWeight: '400' as const,
  } as TextStyle,

  displaySmall: {
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: 0,
    fontWeight: '400' as const,
  } as TextStyle,

  // Headline Styles
  headlineLarge: {
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: 0,
    fontWeight: '600' as const,
  } as TextStyle,

  headlineMedium: {
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: 0,
    fontWeight: '600' as const,
  } as TextStyle,

  headlineSmall: {
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: 0,
    fontWeight: '600' as const,
  } as TextStyle,

  // Title Styles
  titleLarge: {
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 0,
    fontWeight: '600' as const,
  } as TextStyle,

  titleMedium: {
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.15,
    fontWeight: '600' as const,
  } as TextStyle,

  titleSmall: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
    fontWeight: '600' as const,
  } as TextStyle,

  // Body Styles
  bodyLarge: {
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.5,
    fontWeight: '400' as const,
  } as TextStyle,

  bodyMedium: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.25,
    fontWeight: '400' as const,
  } as TextStyle,

  bodySmall: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
    fontWeight: '400' as const,
  } as TextStyle,

  // Label Styles (for buttons, chips, tags)
  labelLarge: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
    fontWeight: '600' as const,
  } as TextStyle,

  labelMedium: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
    fontWeight: '600' as const,
  } as TextStyle,

  labelSmall: {
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.5,
    fontWeight: '600' as const,
  } as TextStyle,
};

// ═══════════════════════════════════════════════════════════════
// SPACING SYSTEM (M3 8px baseline)
// ═══════════════════════════════════════════════════════════════

export const Spacing = {
  xs: 4,      // 4px - smallest
  sm: 8,      // 8px - baseline
  md: 12,     // 12px
  lg: 16,     // 16px
  xl: 24,     // 24px
  xxl: 32,    // 32px
  xxxl: 48,   // 48px
};

// ═══════════════════════════════════════════════════════════════
// BORDER RADIUS (M3 rounded corners)
// ═══════════════════════════════════════════════════════════════

export const BorderRadius = {
  xs: 4,      // Extra small corners
  sm: 8,      // Small corners
  md: 12,     // Medium corners
  lg: 16,     // Large corners (default for cards)
  xl: 20,     // Extra large
  full: 999,  // Fully rounded (pills, badges)
};

// ═══════════════════════════════════════════════════════════════
// ELEVATION/SHADOW (M3 elevation system)
// ═══════════════════════════════════════════════════════════════

export const Elevation = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  } as TextStyle,

  elevation1: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  } as TextStyle,

  elevation2: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  } as TextStyle,

  elevation3: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  } as TextStyle,

  elevation4: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  } as TextStyle,

  elevation5: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  } as TextStyle,
};
