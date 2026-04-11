import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api, { getApiError } from '../services/api';
import { usePinStore } from '../stores/pinStore';
import { Colors } from '../constants/colors';

const KEYPAD = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', '⌫'],
];

export default function PinEntryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setPinVerified = usePinStore((s) => s.setPinVerified);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleKey = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (key === '⌫') { setPin((p) => p.slice(0, -1)); return; }
    if (!key) return;
    const next = pin + key;
    setPin(next);
    if (next.length === 6) handleVerify(next);
  };

  const handleVerify = async (code: string) => {
    setLoading(true);
    try {
      await api.post('/auth/verify-pin', { pin: code });
      setPinVerified(true);
      router.back();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Incorrect PIN', text2: getApiError(e) });
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.handle} />

      <View style={styles.topSection}>
        <Text style={styles.title}>Enter PIN</Text>
        <Text style={styles.subtitle}>To view your balances</Text>

        <View style={styles.dotsRow}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={[styles.dot, i < pin.length ? styles.dotFilled : null]} />
          ))}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 40 }} />
      ) : (
        <View style={styles.keypad}>
          {KEYPAD.map((row, ri) => (
            <View key={ri} style={styles.keyRow}>
              {row.map((k, ki) => (
                <TouchableOpacity
                  key={ki}
                  style={[
                    styles.key,
                    k === '' && styles.keyInvisible,
                    k === '⌫' && styles.keyBackspace,
                  ]}
                  onPress={() => k && handleKey(k)}
                  disabled={!k}
                  activeOpacity={k ? 0.7 : 1}
                >
                  {k === '⌫' ? (
                    <Ionicons name="backspace-outline" size={22} color={Colors.danger} />
                  ) : (
                    <Text style={[styles.keyText, !k && styles.keyTextHidden]}>{k}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 24, paddingTop: 12 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB', alignSelf: 'center', marginBottom: 24 },
  topSection: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: 28 },
  dotsRow: { flexDirection: 'row', gap: 14 },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#D1D5DB' },
  dotFilled: { backgroundColor: Colors.primary },
  keypad: { gap: 14 },
  keyRow: { flexDirection: 'row', justifyContent: 'center', gap: 20 },
  key: {
    width: 80, height: 80, borderRadius: 20,
    backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  keyInvisible: { backgroundColor: 'transparent', elevation: 0, shadowOpacity: 0 },
  keyBackspace: { backgroundColor: Colors.accentPink },
  keyText: { fontSize: 26, fontWeight: '600', color: Colors.text },
  keyTextHidden: { color: 'transparent' },
  cancelBtn: { alignItems: 'center', marginTop: 24 },
  cancelText: { fontSize: 15, fontWeight: '600', color: Colors.danger },
});
