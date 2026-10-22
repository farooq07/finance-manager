import { Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from './Text';
import { tokens } from './tokens';
import { useTheme } from './useTheme';

export type HeroAction = { label: string; glyph: '↗' | '↙'; onPress: () => void };
type Props = { label: string; value: string; caption?: string; actions?: HeroAction[] };

/**
 * The large rounded card at the top of key screens: a pastel bloom in one
 * corner, the screen's key figure, and quick actions underneath.
 */
export function HeroCard({ label, value, caption, actions = [] }: Props) {
    const { colors } = useTheme();
    return (
        <View>
            <View style={{ backgroundColor: colors.card, borderRadius: tokens.radius.hero, padding: tokens.space.xl, overflow: 'hidden', minHeight: 150, justifyContent: 'flex-end' }}>
                <LinearGradient
                    colors={colors.heroBloom as unknown as [string, string, ...string[]]}
                    start={{ x: 1, y: 0 }}
                    end={{ x: 0.3, y: 0.9 }}
                    style={{ position: 'absolute', top: 0, right: 0, width: '65%', height: '100%' }}
                />
                <Text variant="label">{label}</Text>
                <Text variant="figure" style={{ marginTop: 4 }} adjustsFontSizeToFit numberOfLines={1}>{value}</Text>
                {caption ? <Text variant="caption" style={{ marginTop: 4 }}>{caption}</Text> : null}
            </View>
            {actions.length > 0 && (
                <View style={{ flexDirection: 'row', gap: tokens.space.xl, paddingHorizontal: tokens.space.sm, paddingTop: tokens.space.lg }}>
                    {actions.map((a) => (
                        <Pressable key={a.label} accessibilityRole="button" accessibilityLabel={`${a.label} ${a.glyph}`} onPress={a.onPress} hitSlop={8}>
                            <Text variant="heading">{a.label} <Text variant="heading" style={{ color: colors.textMuted }}>{a.glyph}</Text></Text>
                        </Pressable>
                    ))}
                </View>
            )}
        </View>
    );
}
