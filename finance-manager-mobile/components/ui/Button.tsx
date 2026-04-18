import { Button as RNPButton, ActivityIndicator, useTheme } from 'react-native-paper';
import { ViewStyle, TextStyle } from 'react-native';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  size = 'medium',
  style,
  textStyle,
}: Props) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  // Map custom variants to RNP button modes
  const getMode = (): 'text' | 'outlined' | 'contained' | 'elevated' | 'contained-tonal' => {
    if (variant === 'ghost') return 'text';
    if (variant === 'tertiary') return 'outlined';
    if (variant === 'secondary') return 'contained-tonal';
    return 'contained'; // primary, danger
  };

  // Get button color based on variant
  const getButtonColor = () => {
    if (variant === 'danger') return theme.colors.error;
    return undefined; // Use theme default
  };

  // Get text color based on variant
  const getTextColor = () => {
    if (variant === 'ghost' || variant === 'tertiary') return theme.colors.primary;
    return undefined; // Use theme default
  };

  return (
    <RNPButton
      mode={getMode()}
      onPress={onPress}
      disabled={isDisabled}
      loading={loading}
      buttonColor={getButtonColor()}
      textColor={getTextColor()}
      contentStyle={{
        paddingVertical: size === 'small' ? 4 : size === 'large' ? 12 : 8,
      }}
      style={[
        {
          minHeight: size === 'small' ? 32 : size === 'large' ? 48 : 40,
        },
        style,
      ]}
      labelStyle={textStyle}
    >
      {title}
    </RNPButton>
  );
}
