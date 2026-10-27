import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { tokens } from './tokens';
import { useTheme } from './useTheme';

type Group = { label: string; rows: ReactNode[] };
type Props = { title: string; groups: Group[]; onFilter?: () => void; onSearch?: () => void };

/**
 * White card holding rows: header (filter · centred title · search) and
 * day-grouped sections ("Today", "Yesterday").
 */
export function ListCard({ title, groups, onFilter, onSearch }: Props) {
    const { colors } = useTheme();
    const iconButton = (name: 'options-outline' | 'search-outline', label: string, onPress?: () => void) => (
        <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} disabled={!onPress} hitSlop={12} style={{ width: 24, opacity: onPress ? 1 : 0 }}>
            <Ionicons name={name} size={20} color={colors.text} />
        </Pressable>
    );

    return (
        <View style={{ backgroundColor: colors.card, borderRadius: tokens.radius.hero, paddingHorizontal: tokens.space.lg, paddingVertical: tokens.space.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: tokens.space.sm }}>
                {iconButton('options-outline', 'Filter', onFilter)}
                <Text variant="heading" accessibilityRole="header">{title}</Text>
                {iconButton('search-outline', 'Search', onSearch)}
            </View>
            {groups.map((group) => (
                <View key={group.label} style={{ marginTop: tokens.space.sm }}>
                    <Text variant="caption" style={{ color: colors.textFaint }}>{group.label}</Text>
                    {group.rows}
                </View>
            ))}
        </View>
    );
}
