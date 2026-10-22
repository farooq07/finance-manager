import { TextInput, View, type TextInputProps } from 'react-native';
import { Text } from './Text';
import { tokens } from './tokens';
import { useTheme } from './useTheme';

type Props = TextInputProps & { label: string; error?: string | null };

/** Labelled text input with its error shown underneath. */
export function Field({ label, error, style, ...props }: Props) {
    const { colors } = useTheme();
    return (
        <View style={{ gap: 6 }}>
            <Text variant="label">{label}</Text>
            <TextInput
                accessibilityLabel={label}
                placeholderTextColor={colors.textFaint}
                {...props}
                style={[{
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: error ? colors.danger : colors.cardBorder,
                    borderRadius: tokens.radius.field,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontSize: 16,
                    fontFamily: tokens.font.regular,
                    color: colors.text,
                }, style]}
            />
            {error ? <Text variant="caption" style={{ color: colors.danger }}>{error}</Text> : null}
        </View>
    );
}
