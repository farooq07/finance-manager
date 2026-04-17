import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';
import { BorderRadius, Spacing, Elevation } from '../../constants/typography';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'elevated' | 'outlined' | 'filled';
}

export function Card({ children, style, variant = 'outlined' }: Props) {
  return (
    <View style={[styles.base, styles[variant], style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  // ═══════════════════════════════════════════════════════════════
  // Base Card Styles (M3)
  // ═══════════════════════════════════════════════════════════════
  base: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    overflow: 'hidden',
  },

  // ═══════════════════════════════════════════════════════════════
  // Card Variants (M3: Elevated, Outlined, Filled)
  // ═══════════════════════════════════════════════════════════════

  // Elevated Card - Subtle shadow for surface variation
  elevated: {
    backgroundColor: Colors.surface,
    ...Elevation.elevation1,
    borderWidth: 0,
  },

  // Outlined Card - Border for clear distinction (default)
  outlined: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.outline,
    ...Elevation.none,
  },

  // Filled Card - Colored background for emphasis
  filled: {
    backgroundColor: Colors.surfaceVariant,
    borderWidth: 0,
    ...Elevation.none,
  },
});
