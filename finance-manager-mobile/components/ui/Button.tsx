import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { Colors } from '../../constants/colors';
import { Typography, Spacing, BorderRadius, Elevation } from '../../constants/typography';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  size = 'medium',
  style,
  textStyle,
}: Props) {
  const btnStyle = [
    styles.base,
    size === 'small' && styles.sizeSmall,
    size === 'medium' && styles.sizeMedium,
    size === 'large' && styles.sizeLarge,
    variant === 'primary' && styles.primary,
    variant === 'secondary' && styles.secondary,
    variant === 'tertiary' && styles.tertiary,
    variant === 'danger' && styles.danger,
    variant === 'ghost' && styles.ghost,
    (disabled || loading) && styles.disabled,
    style,
  ];

  const txtStyle = [
    Typography.labelLarge,
    variant === 'secondary' && styles.textSecondary,
    variant === 'tertiary' && styles.textTertiary,
    variant === 'ghost' && styles.textGhost,
    variant === 'danger' && styles.textDanger,
    textStyle,
  ];

  const indicatorColor = variant === 'primary' || variant === 'danger' ? Colors.onPrimary : Colors.primary;

  return (
    <TouchableOpacity
      style={btnStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={indicatorColor} />
      ) : (
        <Text style={txtStyle}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // ═══════════════════════════════════════════════════════════════
  // Base Button Styles (M3 Compliant)
  // ═══════════════════════════════════════════════════════════════
  base: {
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
  },

  // Size Variants
  sizeSmall: {
    paddingVertical: Spacing.sm,
    minHeight: 32,
  },
  sizeMedium: {
    paddingVertical: Spacing.md,
    minHeight: 40,
  },
  sizeLarge: {
    paddingVertical: Spacing.lg,
    minHeight: 48,
  },

  // ═══════════════════════════════════════════════════════════════
  // Button Style Variants (M3 Filled, Outlined, Text)
  // ═══════════════════════════════════════════════════════════════

  // Primary (Filled) - High emphasis
  primary: {
    backgroundColor: Colors.primary,
  },

  // Secondary (Tonal) - Medium emphasis
  secondary: {
    backgroundColor: Colors.primaryContainer,
    borderWidth: 0,
  },

  // Tertiary (Outlined) - Medium emphasis, alternative
  tertiary: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.outline,
  },

  // Danger (Error Filled)
  danger: {
    backgroundColor: Colors.error,
  },

  // Ghost (Text only)
  ghost: {
    backgroundColor: 'transparent',
    paddingVertical: Spacing.sm,
  },

  // ═══════════════════════════════════════════════════════════════
  // Disabled State (M3: 38% opacity on surface)
  // ═══════════════════════════════════════════════════════════════
  disabled: {
    opacity: 0.38,
  },

  // ═══════════════════════════════════════════════════════════════
  // Text Styles
  // ═══════════════════════════════════════════════════════════════
  textSecondary: {
    color: Colors.onPrimaryContainer,
  },
  textTertiary: {
    color: Colors.primary,
  },
  textGhost: {
    color: Colors.primary,
  },
  textDanger: {
    color: Colors.onError,
  },
});
