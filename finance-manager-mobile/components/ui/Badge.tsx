import { Chip, useTheme } from 'react-native-paper';

interface Props {
  label: string;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'error' | 'success';
  size?: 'small' | 'medium' | 'large';
}

export function Badge({ label, variant = 'primary', size = 'medium' }: Props) {
  const theme = useTheme();

  const getBackgroundColor = () => {
    switch (variant) {
      case 'secondary':
        return theme.colors.secondaryContainer;
      case 'tertiary':
      case 'success':
        return theme.colors.tertiaryContainer;
      case 'error':
        return theme.colors.errorContainer;
      default:
        return theme.colors.primaryContainer;
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'secondary':
        return theme.colors.onSecondaryContainer;
      case 'tertiary':
      case 'success':
        return theme.colors.onTertiaryContainer;
      case 'error':
        return theme.colors.onErrorContainer;
      default:
        return theme.colors.onPrimaryContainer;
    }
  };

  return (
    <Chip
      label={label}
      style={{ backgroundColor: getBackgroundColor() }}
      textStyle={{ color: getTextColor(), fontSize: size === 'small' ? 11 : size === 'large' ? 13 : 12 }}
    />
  );
}
