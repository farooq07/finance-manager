import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api, { getApiError } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { Colors } from '../../constants/colors';

const KEYPAD = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', '⌫'],
];

export default function PinSetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, setAuth } = useAuthStore();
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [loading, setLoading] = useState(false);

  const handleKey = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (key === '⌫') {
      if (step === 'enter') setPin((p) => p.slice(0, -1));
      else setConfirm((c) => c.slice(0, -1));
      return;
    }
    if (!key) return;
    if (step === 'enter') {
      const next = pin + key;
      setPin(next);
      if (next.length === 6) setStep('confirm');
    } else {
      const next = confirm + key;
      setConfirm(next);
      if (next.length === 6) handleSave(next);
    }
  };

  const handleSave = async (confirmPin: string) => {
    if (pin !== confirmPin) {
      Toast.show({ type: 'error', text1: "PINs don't match", text2: 'Please try again' });
      setPin(''); setConfirm(''); setStep('enter');
      return;
    }
    setLoading(true);
    try {
      await api.put('/auth/pin', { pin });
      if (user) setAuth({ ...user, hasPin: true });
      Toast.show({ type: 'success', text1: 'PIN set successfully!' });
      router.replace('/(tabs)');
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: getApiError(e) });
      setPin(''); setConfirm(''); setStep('enter');
    } finally {
      setLoading(false);
    }
  };

  const current = step === 'enter' ? pin : confirm;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <View style={styles.topSection}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="shield-check" size={32} color={Colors.primary} />
        </View>
        <Text style={styles.title}>Secure your app</Text>
        <Text style={styles.subtitle}>Set a PIN to protect your financial data</Text>

        <View style={styles.dotsRow}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={[styles.dot, i < current.length ? styles.dotFilled : null]} />
          ))}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
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

      <View style={styles.footer}>
        <Text style={styles.stepText}>
          {step === 'enter' ? 'Step 1 of 2 — Enter PIN' : 'Step 2 of 2 — Confirm PIN'}
        </Text>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 24 },
  topSection: { alignItems: 'center', marginBottom: 36 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary + '33', justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginBottom: 28 },
  dotsRow: { flexDirection: 'row', gap: 14 },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#D1D5DB' },
  dotFilled: { backgroundColor: Colors.primary },
  keypad: { gap: 14 },
  keyRow: { flexDirection: 'row', justifyContent: 'center', gap: 20 },
  key: {
    width: 80, height: 80, borderRadius: 20,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  keyInvisible: { backgroundColor: 'transparent', elevation: 0, shadowOpacity: 0 },
  keyBackspace: { backgroundColor: Colors.accentPink },
  keyText: { fontSize: 26, fontWeight: '600', color: Colors.text },
  keyTextHidden: { color: 'transparent' },
  footer: { position: 'absolute', bottom: 32, left: 0, right: 0, alignItems: 'center', gap: 8 },
  stepText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  skipText: { fontSize: 13, color: Colors.textSecondary },
});
