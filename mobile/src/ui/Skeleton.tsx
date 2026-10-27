import { View, type DimensionValue } from 'react-native';
import { tokens } from './tokens';
import { useTheme } from './useTheme';

/** Grey placeholder block shown while data loads. */
export function Skeleton({ height = 16, width = '100%', radius = tokens.radius.field }: { height?: number; width?: DimensionValue; radius?: number }) {
    const { colors } = useTheme();
    return <View accessibilityLabel="Loading" style={{ height, width, borderRadius: radius, backgroundColor: colors.skeleton }} />;
}
