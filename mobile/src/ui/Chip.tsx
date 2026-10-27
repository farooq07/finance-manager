import { Pressable } from 'react-native';
import { Text } from './Text';
import { useTheme } from './useTheme';

/** A small selectable pill (categories, quick dates). */
export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
    const { colors } = useTheme();
    return (
        <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: !!selected }}
            accessibilityLabel={label}
            onPress={onPress}
            style={{
                paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
                backgroundColor: selected ? colors.accent : colors.card,
                borderWidth: 1, borderColor: selected ? colors.accent : colors.cardBorder,
            }}
        >
            <Text variant="caption" style={{ color: selected ? colors.accentText : colors.text }}>{label}</Text>
        </Pressable>
    );
}
