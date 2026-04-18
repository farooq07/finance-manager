import { Card as RNPCard } from 'react-native-paper';
import { ViewStyle } from 'react-native';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'elevated' | 'outlined' | 'filled';
}

export function Card({ children, style, variant = 'outlined' }: Props) {
  // Map custom variant to RNP mode
  const getMode = (): 'elevated' | 'outlined' => {
    if (variant === 'filled' || variant === 'elevated') return 'elevated';
    return 'outlined';
  };

  return (
    <RNPCard
      mode={getMode()}
      style={[{ marginBottom: 12 }, style]}
    >
      <RNPCard.Content style={{ paddingVertical: 8, paddingHorizontal: 12 }}>
        {children}
      </RNPCard.Content>
    </RNPCard>
  );
}
