import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tokens } from './tokens';
import { useTheme } from './useTheme';

type Props = {
    children: ReactNode;
    /** Wrap in a KeyboardAvoidingView so form fields stay visible on small phones. */
    keyboard?: boolean;
    refreshing?: boolean;
    onRefresh?: () => void;
};

/** Every screen: soft gradient background, safe area, scrollable content. */
export function Screen({ children, keyboard = false, refreshing = false, onRefresh }: Props) {
    const { gradient, colors } = useTheme();

    const body = (
        <ScrollView
            contentContainerStyle={{ padding: tokens.space.lg, gap: tokens.space.lg, flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} /> : undefined}
        >
            {children}
        </ScrollView>
    );

    return (
        <LinearGradient testID="screen-background" colors={gradient as unknown as [string, string, ...string[]]} style={{ flex: 1 }}>
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
                {keyboard
                    ? <KeyboardAvoidingView testID="keyboard-avoiding" style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>{body}</KeyboardAvoidingView>
                    : body}
            </SafeAreaView>
        </LinearGradient>
    );
}
