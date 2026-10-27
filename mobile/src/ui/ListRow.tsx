import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from './Text';
import { Amount } from './Amount';
import { tokens } from './tokens';
import { useTheme } from './useTheme';

type Props = {
    title: string;
    subtitle?: string;
    amount?: number;
    signed?: boolean;
    amountCaption?: string;
    /** 40px round leading element: a logo, icon or initials */
    icon?: ReactNode;
    onPress?: () => void;
};

/** One row in a ListCard: icon · title/subtitle · amount/caption. */
export function ListRow({ title, subtitle, amount, signed, amountCaption, icon, onPress }: Props) {
    const { colors } = useTheme();
    const content = (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: tokens.space.md, gap: tokens.space.md }}>
            {icon && (
                <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardBorder }}>
                    {icon}
                </View>
            )}
            <View style={{ flex: 1 }}>
                <Text variant="heading" numberOfLines={1}>{title}</Text>
                {subtitle ? <Text variant="caption" numberOfLines={1}>{subtitle}</Text> : null}
            </View>
            {amount !== undefined && (
                <View style={{ alignItems: 'flex-end' }}>
                    <Amount value={amount} signed={signed} />
                    {amountCaption ? <Text variant="caption">{amountCaption}</Text> : null}
                </View>
            )}
        </View>
    );

    if (!onPress) return content;
    return (
        <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            {content}
        </Pressable>
    );
}
