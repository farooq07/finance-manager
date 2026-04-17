import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { Typography, Spacing, BorderRadius } from '../../constants/typography';

interface Props {
  label: string;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'error' | 'success';
  size?: 'small' | 'medium' | 'large';
}

export function Badge({ label, variant = 'primary', size = 'medium' }: Props) {
  const variantStyles = {
    primary: {
      backgroundColor: Colors.primaryContainer,
      textColor: Colors.onPrimaryContainer,
    },
    secondary: {
      backgroundColor: Colors.secondaryContainer,
      textColor: Colors.onSecondaryContainer,
    },
    tertiary: {
      backgroundColor: Colors.tertiaryContainer,
      textColor: Colors.onTertiaryContainer,
    },
    error: {
      backgroundColor: Colors.errorContainer,
      textColor: Colors.onErrorContainer,
    },
    success: {
      backgroundColor: Colors.tertiaryContainer,
      textColor: Colors.onTertiaryContainer,
    },
  };

  const { backgroundColor, textColor } = variantStyles[variant];

  return (
    <View
      style={[
        styles.badge,
        size === 'small' && styles.sizeSmall,
        size === 'medium' && styles.sizeMedium,
        size === 'large' && styles.sizeLarge,
        { backgroundColor },
      ]}
    >
      <Text
        style={[
          size === 'small' && Typography.labelSmall,
          size === 'medium' && Typography.labelMedium,
          size === 'large' && Typography.labelLarge,
          { color: textColor },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // ═══════════════════════════════════════════════════════════════
  // Base Badge (M3)
  // ═══════════════════════════════════════════════════════════════
  badge: {
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ═══════════════════════════════════════════════════════════════
  // Size Variants
  // ═══════════════════════════════════════════════════════════════
  sizeSmall: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },

  sizeMedium: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },

  sizeLarge: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
});
