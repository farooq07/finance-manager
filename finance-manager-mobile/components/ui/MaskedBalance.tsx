import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { usePinStore } from '../../stores/pinStore';
import { Colors } from '../../constants/colors';

interface Props {
  value: string;
  fontSize?: number;
  color?: string;
}

export function MaskedBalance({ value, fontSize = 28, color = Colors.text }: Props) {
  const isPinVerified = usePinStore((s) => s.isPinVerified);
  const router = useRouter();

  if (isPinVerified) {
    return <Text style={[styles.value, { fontSize, color }]}>{value}</Text>;
  }

  return (
    <TouchableOpacity style={styles.row} onPress={() => router.push('/pin-entry')}>
      <Text style={[styles.masked, { fontSize, color }]}>PKR ••••••</Text>
      <Ionicons name="eye-outline" size={18} color={Colors.textTertiary} style={{ marginLeft: 6 }} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  value: { fontWeight: '700' },
  masked: { fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center' },
});
