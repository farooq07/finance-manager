import { Card as RNPCard } from 'react-native-paper';
import { ViewStyle, StyleProp, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'elevated' | 'outlined' | 'filled';
  elevated?: boolean;
}

export function Card({ children, style, variant = 'outlined', elevated }: Props) {
  // Map custom variant to RNP mode
  const getMode = (): 'elevated' | 'outlined' => {
    if (elevated || variant === 'filled' || variant === 'elevated') return 'elevated';
    return 'outlined';
  };

  const flattenedStyle = StyleSheet.flatten(style) || {};
  const { padding, paddingVertical, paddingHorizontal, paddingTop, paddingBottom, paddingLeft, paddingRight, ...cardStyle } = flattenedStyle as any;

  // Apply default padding if no custom padding is provided
  const hasCustomPadding = padding !== undefined || paddingVertical !== undefined || paddingHorizontal !== undefined || paddingTop !== undefined || paddingBottom !== undefined;
  
  const contentStyle = hasCustomPadding ? {
    padding, paddingVertical, paddingHorizontal, paddingTop, paddingBottom, paddingLeft, paddingRight
  } : {
    paddingVertical: 16, paddingHorizontal: 16
  };

  return (
    <RNPCard
      mode={getMode()}
      style={[{ marginBottom: 0, backgroundColor: '#ffffff' }, cardStyle]}
      theme={{ colors: { surfaceVariant: '#ffffff', outline: Colors.borderLight, elevation: { level1: '#ffffff' } } }}
    >
      <RNPCard.Content style={contentStyle}>
        {children}
      </RNPCard.Content>
    </RNPCard>
  );
}
