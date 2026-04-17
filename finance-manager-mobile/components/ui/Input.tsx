import { View, Text, TextInput, StyleSheet, TextInputProps, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';
import { Typography, Spacing, BorderRadius } from '../../constants/typography';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  helper?: string;
  containerStyle?: ViewStyle;
}

export function Input({ label, error, helper, containerStyle, style, ...props }: Props) {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, error && styles.inputError, style]}
        placeholderTextColor={Colors.textTertiary}
        {...props}
      />
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : helper ? (
        <Text style={styles.helper}>{helper}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // ═══════════════════════════════════════════════════════════════
  // Container (M3 Spacing)
  // ═══════════════════════════════════════════════════════════════
  container: {
    marginBottom: Spacing.lg,
  },

  // ═══════════════════════════════════════════════════════════════
  // Label (M3 Body Small)
  // ═══════════════════════════════════════════════════════════════
  label: {
    ...Typography.labelMedium,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },

  // ═══════════════════════════════════════════════════════════════
  // Input Field (M3 Outlined Text Field)
  // ═══════════════════════════════════════════════════════════════
  input: {
    ...Typography.bodyLarge,
    borderWidth: 1,
    borderColor: Colors.outline,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },

  // ═══════════════════════════════════════════════════════════════
  // Error State (M3 Error Color)
  // ═══════════════════════════════════════════════════════════════
  inputError: {
    borderColor: Colors.error,
  },

  // ═══════════════════════════════════════════════════════════════
  // Supporting Text (M3)
  // ═══════════════════════════════════════════════════════════════
  error: {
    ...Typography.labelSmall,
    color: Colors.error,
    marginTop: Spacing.xs,
  },

  helper: {
    ...Typography.labelSmall,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
});
