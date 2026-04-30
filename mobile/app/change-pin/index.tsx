import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import { useChangePin } from '../../hooks/useAuth';
import { ScreenHeader } from '../../components/layout/ScreenHeader';

const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

type Step = 'current' | 'new' | 'confirm';

export default function ChangePinScreen() {
  const router = useRouter();
  const changePin = useChangePin();
  const [step, setStep] = useState<Step>('current');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const getActive = (): string =>
    step === 'current' ? currentPin : step === 'new' ? newPin : confirmPin;

  const getTitle = (): string =>
    step === 'current' ? 'Enter Current PIN'
    : step === 'new' ? 'Enter New PIN'
    : 'Confirm New PIN';

  const handleKey = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (key === '⌫') {
      if (step === 'current') setCurrentPin((p) => p.slice(0, -1));
      else if (step === 'new') setNewPin((p) => p.slice(0, -1));
      else setConfirmPin((p) => p.slice(0, -1));
      return;
    }
    if (key === '') return;

    if (step === 'current') {
      const next = currentPin + key;
      setCurrentPin(next);
      if (next.length === 6) setStep('new');
    } else if (step === 'new') {
      const next = newPin + key;
      setNewPin(next);
      if (next.length === 6) setStep('confirm');
    } else {
      const next = confirmPin + key;
      setConfirmPin(next);
      if (next.length === 6) handleChange(next);
    }
  };

  const handleChange = async (confirmed: string) => {
    if (newPin !== confirmed) {
      Toast.show({ type: 'error', text1: 'PINs do not match', text2: 'Please try again' });
      setNewPin(''); setConfirmPin(''); setStep('new');
      return;
    }
    try {
      await changePin.mutateAsync({ currentPin, newPin });
      Toast.show({ type: 'success', text1: 'PIN changed successfully' });
      router.back();
    } catch {
      Toast.show({ type: 'error', text1: 'Failed', text2: 'Check your current PIN and try again' });
      setCurrentPin(''); setNewPin(''); setConfirmPin(''); setStep('current');
    }
  };

  const current = getActive();

  return (
    <View style={styles.container}>
      <ScreenHeader title="Change PIN" showBack />
      <View style={styles.content}>
        <Text style={styles.subtitle}>{getTitle()}</Text>

        <View style={styles.dotsRow}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={[styles.dot, i < current.length ? styles.dotFilled : null]} />
          ))}
        </View>

        {changePin.isPending ? (
          <ActivityIndicator size="large" color={Colors.primary} />
        ) : (
          <View style={styles.keypad}>
            {KEYS.map((k, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.key, k === '' && styles.keyEmpty]}
                onPress={() => handleKey(k)}
                disabled={k === ''}
              >
                <Text style={styles.keyText}>{k}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  subtitle: { fontSize: 18, fontWeight: '600', color: Colors.text, marginBottom: 32 },
  dotsRow: { flexDirection: 'row', gap: 16, marginBottom: 48 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: Colors.border },
  dotFilled: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', width: 280, justifyContent: 'center', gap: 16 },
  key: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  keyEmpty: { backgroundColor: 'transparent', elevation: 0, shadowOpacity: 0 },
  keyText: { fontSize: 24, fontWeight: '600', color: Colors.text },
});
