import { FAB as RNPFAB } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ViewStyle } from 'react-native';

interface Props {
  onPress: () => void;
  icon?: string;
  style?: ViewStyle;
  variant?: 'standard' | 'extended';
  label?: string;
  bottom?: number;
  bottomOffset?: number; // For tab bar safety (default: 80px for Android)
}

export function FAB({
  onPress,
  icon = 'plus',
  style,
  variant = 'standard',
  label,
  bottom,
  bottomOffset = 80,
}: Props) {
  return (
    <RNPFAB
      icon={icon}
      label={variant === 'extended' ? label : undefined}
      onPress={onPress}
      style={[
        {
          position: 'absolute',
          right: 16,
          bottom: bottom ?? bottomOffset,
        },
        style,
      ]}
      extended={variant === 'extended'}
    />
  );
}
