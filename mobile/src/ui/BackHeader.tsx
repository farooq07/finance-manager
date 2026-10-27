import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text } from './Text';
import { tokens } from './tokens';
import { useTheme } from './useTheme';

/** Title row for screens opened from a tab: back chevron · title · optional action. */
export function BackHeader({ title, action }: { title: string; action?: ReactNode }) {
    const router = useRouter();
    const { colors } = useTheme();
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={12}
                onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))}>
                <Ionicons name="chevron-back" size={26} color={colors.text} />
            </Pressable>
            <Text variant="title" accessibilityRole="header" style={{ flex: 1 }} numberOfLines={1}>{title}</Text>
            {action}
        </View>
    );
}
