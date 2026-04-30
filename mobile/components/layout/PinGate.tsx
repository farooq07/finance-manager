import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePinStore } from '../../stores/pinStore';
import { Colors } from '../../constants/colors';

interface Props {
  children: React.ReactNode;
}

export function PinGate({ children }: Props) {
  const isPinVerified = usePinStore((s) => s.isPinVerified);
  const router = useRouter();

  if (isPinVerified) return <>{children}</>;

  return (
    <View style={styles.container}>
      <Ionicons name="lock-closed" size={56} color={Colors.textTertiary} />
      <Text style={styles.title}>PIN Required</Text>
      <Text style={styles.subtitle}>Verify your PIN to access this screen</Text>
      <TouchableOpacity style={styles.btn} onPress={() => router.push('/pin-entry')}>
        <Text style={styles.btnText}>Enter PIN</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, padding: 32 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text, marginTop: 20, marginBottom: 8 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 32 },
  btn: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 40 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
