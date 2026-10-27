import { View } from 'react-native';
import { Text } from './Text';
import { tokens } from './tokens';
import { useTheme } from './useTheme';

/** Slim notice shown while the app is working from cached data. */
export function OfflineBanner() {
    const { colors } = useTheme();
    return (
        <View accessibilityRole="alert" style={{ backgroundColor: colors.warningBg, borderRadius: tokens.radius.field, paddingVertical: 8, paddingHorizontal: 12 }}>
            <Text variant="caption" style={{ color: colors.warningText, textAlign: 'center' }}>You're offline — showing saved data</Text>
        </View>
    );
}
