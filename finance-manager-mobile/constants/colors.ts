/**
 * Material Design 3 Color System
 * Based on your brand teal (#1f4741) as the primary color
 * Generated M3 tokens for semantic colors
 */

export const Colors = {
  // ═══════════════════════════════════════════════════════════════
  // M3 PRIMARY COLOR PALETTE (Teal-based)
  // ═══════════════════════════════════════════════════════════════
  primary: '#1f4741',           // M3 Primary (your brand teal)
  onPrimary: '#FFFFFF',         // Text/icons on primary
  primaryContainer: '#A3F0D8',   // M3 Light primary variant
  onPrimaryContainer: '#002018', // Text on primary container

  // ═══════════════════════════════════════════════════════════════
  // M3 SECONDARY COLOR PALETTE (Violet)
  // ═══════════════════════════════════════════════════════════════
  secondary: '#8B5CF6',         // M3 Secondary
  onSecondary: '#FFFFFF',       // Text/icons on secondary
  secondaryContainer: '#EDD5FF', // M3 Light secondary
  onSecondaryContainer: '#3F0061', // Text on secondary container

  // ═══════════════════════════════════════════════════════════════
  // M3 TERTIARY COLOR PALETTE (Emerald - for accents)
  // ═══════════════════════════════════════════════════════════════
  tertiary: '#10B981',          // M3 Tertiary (emerald)
  onTertiary: '#FFFFFF',        // Text/icons on tertiary
  tertiaryContainer: '#A3F0D8',  // M3 Light tertiary
  onTertiaryContainer: '#00210E', // Text on tertiary container

  // ═══════════════════════════════════════════════════════════════
  // M3 SEMANTIC STATUS COLORS
  // ═══════════════════════════════════════════════════════════════
  error: '#B3261E',             // M3 Error
  onError: '#FFFFFF',           // Text on error
  errorContainer: '#F9DEDC',     // M3 Light error
  onErrorContainer: '#410E0B',   // Text on error container

  success: '#10B981',           // Success state
  warning: '#F59E0B',           // Warning state
  info: '#3B82F6',              // Info state

  // ═══════════════════════════════════════════════════════════════
  // M3 NEUTRAL COLOR PALETTE (Surfaces & text)
  // ═══════════════════════════════════════════════════════════════
  background: '#FFFBFE',        // M3 Light background
  onBackground: '#1C1B1F',      // Text on background

  surface: '#FFFBFE',           // M3 Light surface
  onSurface: '#1C1B1F',         // Text on surface
  surfaceVariant: '#E7E0EC',    // M3 Light surface variant
  onSurfaceVariant: '#49454E',  // Text on surface variant

  surfaceElevated: '#F5EFF7',   // Elevated surface (M3 elevation 1)

  outline: '#79747E',           // M3 Outline (borders)
  outlineVariant: '#CAC4D0',    // M3 Light outline variant

  // ═══════════════════════════════════════════════════════════════
  // SEMANTIC TEXT COLORS (M3 compliant)
  // ═══════════════════════════════════════════════════════════════
  text: '#1C1B1F',              // Primary text
  textSecondary: '#49454E',     // Secondary text
  textTertiary: '#79747E',      // Tertiary text (muted)
  textInverse: '#F5EFF7',       // Text on dark backgrounds
  textHint: '#CAC4D0',          // Hint/placeholder text

  // ═══════════════════════════════════════════════════════════════
  // SEMANTIC BORDER COLORS
  // ═══════════════════════════════════════════════════════════════
  border: '#E7E0EC',            // Default border (surface variant)
  borderLight: '#F5EFF7',       // Light border
  borderFocus: '#1f4741',       // Border on focus (primary)

  // ═══════════════════════════════════════════════════════════════
  // LEGACY COLORS (for gradual migration)
  // ═══════════════════════════════════════════════════════════════
  primaryDark: '#1c312e',       // Darker teal
  accentPink: '#FFE4E4',        // Pink tint
  primaryTint: '#A3F0D8',       // Light teal (now primaryContainer)
  dangerTint: '#F9DEDC',        // Light red (now errorContainer)
  dangerTintBorder: '#F4CCCC',  // Light red border

  // ═══════════════════════════════════════════════════════════════
  // DARK MODE THEME (M3 Dark)
  // ═══════════════════════════════════════════════════════════════
  dark: {
    // Surfaces
    background: '#1C1B1F',      // M3 Dark background
    surface: '#1C1B1F',         // M3 Dark surface
    surfaceElevated: '#2B2930', // M3 Dark surface elevated

    // Text
    text: '#F5EFF7',            // Primary text (light)
    textSecondary: '#CAC4D0',   // Secondary text
    textTertiary: '#B0ACBC',    // Tertiary text

    // Borders
    border: '#49454E',          // Dark border
    borderLight: '#2B2930',     // Dark light border

    // Colors adjusted for dark
    primary: '#A3F0D8',         // Light variant for dark bg
    onPrimary: '#003828',       // Dark text on light primary
    secondary: '#EDD5FF',       // Light secondary for dark
    error: '#F9DEDC',           // Light error for dark

    // Surfaces
    onBackground: '#F5EFF7',
    onSurface: '#F5EFF7',
    surfaceVariant: '#49454E',
    onSurfaceVariant: '#CAC4D0',
  },
};
