import { ActivityIndicator, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Text } from './Text';
import { tokens } from './tokens';
import { useTheme } from './useTheme';

type Props = {
    label: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'text';
    loading?: boolean;
    disabled?: boolean;
};

/** Full-width pill button with a light haptic tap. */
export function Button({ label, onPress, variant = 'primary', loading = false, disabled = false }: Props) {
    const { colors } = useTheme();
    const inactive = disabled || loading;
    const background = variant === 'primary' ? colors.accent : variant === 'secondary' ? colors.card : 'transparent';
    const textColor = variant === 'primary' ? colors.accentText : variant === 'text' ? colors.accent : colors.text;

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ disabled: inactive, busy: loading }}
            disabled={inactive}
            onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                onPress();
            }}
            style={({ pressed }) => ({
                backgroundColor: background,
                borderRadius: tokens.radius.pill,
                paddingVertical: 15,
                alignItems: 'center',
                borderWidth: variant === 'secondary' ? 1 : 0,
                borderColor: colors.cardBorder,
                opacity: inactive ? 0.5 : pressed ? 0.85 : 1,
            })}
        >
            {loading
                ? <ActivityIndicator color={textColor} />
                : <Text variant="heading" style={{ color: textColor }}>{label}</Text>}
        </Pressable>
    );
}
