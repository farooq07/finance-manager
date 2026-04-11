import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

interface Props {
  label: string;
  color?: string;
  bg?: string;
}

export function Badge({ label, color = Colors.primary, bg }: Props) {
  return (
    <View style={[styles.badge, { backgroundColor: bg ?? color + '20' }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 20, paddingVertical: 3, paddingHorizontal: 10 },
  text: { fontSize: 12, fontWeight: '600' },
});
