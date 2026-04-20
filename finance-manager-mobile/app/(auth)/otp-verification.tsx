import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Toast from 'react-native-toast-message';
import * as SecureStore from 'expo-secure-store';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api, { getApiError } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { Colors } from '../../constants/colors';

export default function OtpVerificationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId, email } = useLocalSearchParams<{ userId: string; email: string }>();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 min
  const inputs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const handleChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text && index < 5) inputs.current[index + 1]?.focus();
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 6) {
      Toast.show({ type: 'error', text1: 'Enter all 6 digits' });
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { userId, otp: code });
      await SecureStore.setItemAsync('auth_token', res.data.token);
      setAuth(res.data.user);
      if (!res.data.user.hasPin) {
        router.replace('/(auth)/pin-setup');
      } else {
        router.replace('/(tabs)');
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Invalid OTP', text2: getApiError(e) });
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.text} />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="email" size={32} color={Colors.primary} />
        </View>

        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>We sent a 6-digit code to</Text>
        <Text style={styles.email}>{email}</Text>

        <View style={styles.otpRow}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={(r) => { inputs.current[i] = r; }}
              style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
              value={digit}
              onChangeText={(t) => handleChange(t.replace(/[^0-9]/g, '').slice(-1), i)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        <Text style={styles.timer}>Time remaining: {formatTime(timeLeft)}</Text>

        <Button
          mode="contained"
          onPress={handleVerify}
          disabled={loading}
          loading={loading}
          style={styles.verifyBtn}
        >
          VERIFY OTP
        </Button>

        <View style={styles.resendRow}>
          <Text style={styles.resendLabel}>Didn't receive the code? </Text>
          <TouchableOpacity onPress={() => { setTimeLeft(600); setOtp(['', '', '', '', '', '']); }}>
            <Text style={styles.resendLink}>Resend OTP</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  backBtn: { padding: 26 },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 32, paddingTop: 16 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary + '16', justifyContent: 'center', alignItems: 'center', marginBottom: 24,
  },
  title: { fontSize: 24, fontWeight: '700', color: Colors.text, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  email: { fontSize: 15, fontWeight: '700', color: Colors.text, marginTop: 4, marginBottom: 32, textAlign: 'center' },
  otpRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  otpBox: {
    width: 48, height: 56, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: 12, fontSize: 22, fontWeight: '700',
    textAlign: 'center', color: Colors.text, backgroundColor: '#fff',
  },
  otpBoxFilled: { borderColor: Colors.primary, backgroundColor: Colors.primary + '1A' },
  timer: { fontSize: 13, color: Colors.textSecondary, marginBottom: 28 },
  verifyBtn: {
    backgroundColor: Colors.primary, borderRadius: 12,
    alignItems: 'center', width: '100%', marginBottom: 16,
  },
  verifyText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 1.2 },
  resendRow: { flexDirection: 'row', alignItems: 'center' },
  resendLabel: { fontSize: 13, color: Colors.textSecondary },
  resendLink: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
});
