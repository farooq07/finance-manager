import { useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, useTheme } from '../../ui';

/**
 * Covers the whole app while it's in the background/app switcher, so
 * balances never show in the recent-apps preview.
 */
export function PrivacyCover() {
    const { gradient } = useTheme();
    const [hidden, setHidden] = useState(false);

    useEffect(() => {
        const sub = AppState.addEventListener('change', (state) => setHidden(state !== 'active'));
        return () => sub.remove();
    }, []);

    if (!hidden) return null;
    return (
        <View testID="privacy-cover" style={StyleSheet.absoluteFill} pointerEvents="none">
            <LinearGradient colors={gradient as unknown as [string, string, ...string[]]} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text variant="title">WealthAxis</Text>
            </LinearGradient>
        </View>
    );
}
