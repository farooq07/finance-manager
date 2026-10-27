import type { TextStyle, StyleProp } from 'react-native';
import { fmtPKR } from '../lib/currency';
import { Text } from './Text';
import { useTheme } from './useTheme';

type Props = { value: number; signed?: boolean; style?: StyleProp<TextStyle> };

/**
 * A rupee amount. `signed` shows money in as green "+PKR 5,000" and money
 * out in the normal text colour "PKR -1,500".
 */
export function Amount({ value, signed = false, style }: Props) {
    const { colors } = useTheme();
    const isIn = signed && value > 0;
    return (
        <Text variant="heading" style={[{ color: isIn ? colors.moneyIn : colors.moneyOut }, style]}>
            {isIn ? `+${fmtPKR(value)}` : fmtPKR(value)}
        </Text>
    );
}
