import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Screen, Text, tokens, useTheme } from '../../ui';

/** Shared frame for the signed-out screens: title, subtitle, form, error. */
export function AuthForm({ title, subtitle, error, children }: { title: string; subtitle?: string; error?: string | null; children: ReactNode }) {
    const { colors } = useTheme();
    return (
        <Screen keyboard>
            <View style={{ marginTop: tokens.space.xxl, gap: tokens.space.sm }}>
                <Text variant="caption" style={{ letterSpacing: 1.5 }}>WEALTHAXIS</Text>
                <Text variant="title" accessibilityRole="header">{title}</Text>
                {subtitle ? <Text variant="body" style={{ color: colors.textMuted }}>{subtitle}</Text> : null}
            </View>
            <View style={{ backgroundColor: colors.card, borderRadius: tokens.radius.hero, padding: tokens.space.xl, gap: tokens.space.lg }}>
                {children}
                {error ? <Text testID="form-error" variant="caption" accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text> : null}
            </View>
        </Screen>
    );
}
