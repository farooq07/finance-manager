import { View, ViewStyle, TextInputProps } from 'react-native';
import { TextInput as RNPTextInput, Text as RNPText } from 'react-native-paper';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  helper?: string;
  containerStyle?: ViewStyle;
}

export function Input({ label, error, helper, containerStyle, style, ...props }: Props) {
  return (
    <View style={[{ marginBottom: 16 }, containerStyle]}>
      <RNPTextInput
        label={label}
        mode="outlined"
        error={!!error}
        style={style}
        {...props}
      />
      {error ? (
        <RNPText style={{ color: '#B3261E', fontSize: 12, marginTop: 4 }}>
          {error}
        </RNPText>
      ) : helper ? (
        <RNPText style={{ color: '#79747E', fontSize: 12, marginTop: 4 }}>
          {helper}
        </RNPText>
      ) : null}
    </View>
  );
}
