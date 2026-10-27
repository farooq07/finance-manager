import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { INTERESTS, type InterestKey } from '../../lib/interests';
import { Text, tokens, useTheme } from '../../ui';

/** Tick-cards for the six optional interests (controlled). */
export function InterestPicker({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
    const { colors } = useTheme();
    const toggle = (key: InterestKey) => onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key]);

    return (
        <View style={{ gap: tokens.space.sm }}>
            {INTERESTS.map(({ key, label, description }) => {
                const checked = value.includes(key);
                return (
                    <Pressable
                        key={key}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked }}
                        accessibilityLabel={`${label}, ${description}`}
                        onPress={() => toggle(key)}
                        style={{
                            flexDirection: 'row', alignItems: 'center', gap: tokens.space.md,
                            padding: tokens.space.lg, borderRadius: tokens.radius.card,
                            backgroundColor: colors.card, borderWidth: 1.5,
                            borderColor: checked ? colors.accent : colors.cardBorder,
                        }}
                    >
                        <View style={{
                            width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center',
                            backgroundColor: checked ? colors.accent : 'transparent', borderWidth: checked ? 0 : 1.5, borderColor: colors.textFaint,
                        }}>
                            {checked && <Ionicons name="checkmark" size={16} color={colors.accentText} />}
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text variant="heading">{label}</Text>
                            <Text variant="caption">{description}</Text>
                        </View>
                    </Pressable>
                );
            })}
        </View>
    );
}
