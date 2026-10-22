import { Text as RNText, type TextProps } from 'react-native';
import { tokens } from './tokens';
import { useTheme } from './useTheme';

type Variant = 'title' | 'heading' | 'body' | 'caption' | 'label' | 'figure';

const VARIANTS: Record<Variant, { fontSize: number; fontFamily: string; muted?: boolean }> = {
    figure: { fontSize: 32, fontFamily: tokens.font.bold },
    title: { fontSize: 24, fontFamily: tokens.font.bold },
    heading: { fontSize: 17, fontFamily: tokens.font.semibold },
    body: { fontSize: 15, fontFamily: tokens.font.regular },
    label: { fontSize: 13, fontFamily: tokens.font.medium, muted: true },
    caption: { fontSize: 12, fontFamily: tokens.font.regular, muted: true },
};

/** Themed text. `variant` sets size/weight; muted variants use the muted colour. */
export function Text({ variant = 'body', style, ...props }: TextProps & { variant?: Variant }) {
    const { colors } = useTheme();
    const v = VARIANTS[variant];
    return (
        <RNText
            {...props}
            style={[{ fontSize: v.fontSize, fontFamily: v.fontFamily, color: v.muted ? colors.textMuted : colors.text }, style]}
        />
    );
}
