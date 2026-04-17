import { TouchableOpacity, StyleSheet, ViewStyle, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Spacing, BorderRadius, Elevation } from '../../constants/typography';

interface Props {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
  variant?: 'standard' | 'extended';
  label?: string;
  bottom?: number;
  bottomOffset?: number; // For tab bar safety (default: 80px for Android)
}

export function FAB({
  onPress,
  icon = 'add',
  style,
  variant = 'standard',
  label,
  bottom,
  bottomOffset = 80, // M3: Clear tab bar (56px) + padding (24px)
}: Props) {
  return (
    <TouchableOpacity
      style={[
        styles.fab,
        variant === 'standard' && styles.standard,
        variant === 'extended' && styles.extended,
        { bottom: bottom ?? bottomOffset },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Ionicons
        name={icon}
        size={variant === 'extended' ? 24 : 24}
        color={Colors.onPrimary}
      />
      {variant === 'extended' && label && (
        <Text
          style={{
            marginLeft: Spacing.md,
            color: Colors.onPrimary,
            fontWeight: '600',
            fontSize: 14,
          }}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

import { Text } from 'react-native';

const styles = StyleSheet.create({
  // ═══════════════════════════════════════════════════════════════
  // Base FAB (M3 Standard)
  // ═══════════════════════════════════════════════════════════════
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    ...Elevation.elevation4,
  },

  // ═══════════════════════════════════════════════════════════════
  // Standard FAB (Icon only)
  // ═══════════════════════════════════════════════════════════════
  standard: {
    width: 56,
    height: 56,
  },

  // ═══════════════════════════════════════════════════════════════
  // Extended FAB (Icon + Label)
  // ═══════════════════════════════════════════════════════════════
  extended: {
    height: 56,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
});
