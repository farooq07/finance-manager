import { Text, TextStyle } from 'react-native';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

interface Props {
  amount: number;
  isVisible: boolean;
  style?: TextStyle;
  currency?: string;
  format?: (amount: number) => string;
}

/**
 * Component that shows or hides amount values
 * When hidden, displays asterisks (*) instead of actual amount
 * Used for dashboard privacy with PIN verification
 */
export function AmountMask({
  amount,
  isVisible,
  style,
  currency = 'PKR',
  format = defaultFormat,
}: Props) {
  const displayAmount = isVisible ? format(amount) : '••••••';

  return (
    <Text
      style={[
        Typography.titleMedium,
        { color: Colors.text },
        !isVisible && { letterSpacing: 2 }, // Spread out asterisks
        style,
      ]}
    >
      {isVisible ? `${currency} ` : ''}{displayAmount}
    </Text>
  );
}

/**
 * Default currency formatter
 * @param amount - Amount in base currency
 * @returns Formatted string (e.g., "1,234,567")
 */
function defaultFormat(amount: number): string {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}
