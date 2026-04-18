import { useState } from 'react';
import {
  View, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TextInput, Text, Button as RNPButton } from 'react-native-paper';
import api, { getApiError } from '../../services/api';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/ui/Button';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
      Toast.show({ type: 'success', text1: 'OTP Sent', text2: 'Check your email' });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: getApiError(e) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.text} />
        </TouchableOpacity>

        <View style={styles.content}>
          {/* Step Indicator */}
          <View style={styles.stepIndicator}>
            {[
              { num: 1, label: 'Email', active: !sent },
              { num: 2, label: 'OTP', active: sent },
              { num: 3, label: 'Reset', active: false },
            ].map((step, i) => (
              <View key={step.num} style={styles.stepContainer}>
                <View style={[styles.stepCircle, step.active && styles.stepCircleActive]}>
                  <Text style={[styles.stepNum, step.active && styles.stepNumActive]}>
                    {step.num}
                  </Text>
                </View>
                <Text style={[styles.stepLabel, step.active && styles.stepLabelActive]}>
                  {step.label}
                </Text>
                {i < 2 && <View style={[styles.stepLine, step.active && styles.stepLineActive]} />}
              </View>
            ))}
          </View>

          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>Enter your email to receive a reset code</Text>

          <TextInput
            label="Email Address"
            placeholder="you@example.com"
            mode="outlined"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!sent}
            style={styles.input}
          />

          <Button
            title={sent ? '✓ OTP SENT' : 'SEND OTP'}
            variant="primary"
            onPress={handleSubmit}
            disabled={loading || sent}
            loading={loading}
            style={[styles.btn, sent && styles.btnSent]}
          />

          {sent && (
            <View style={styles.nextStepsSection}>
              <Text style={styles.nextStepsTitle}>NEXT STEPS</Text>

              <View style={styles.nextStepCard}>
                <View style={styles.stepCardNum}>
                  <Text style={styles.stepCardNumText}>2</Text>
                </View>
                <View style={styles.stepCardContent}>
                  <Text style={styles.stepCardTitle}>Verify OTP</Text>
                  <Text style={styles.stepCardSubtitle}>Enter the 6-digit code sent to your email</Text>
                </View>
              </View>

              <View style={styles.nextStepCard}>
                <View style={styles.stepCardNum}>
                  <Text style={styles.stepCardNumText}>3</Text>
                </View>
                <View style={styles.stepCardContent}>
                  <Text style={styles.stepCardTitle}>Reset Password</Text>
                  <Text style={styles.stepCardSubtitle}>Set your new secure password</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.proceedBtn} onPress={() => router.push('/(auth)/reset-password')}>
                <Text style={styles.proceedText}>Proceed to Reset Password</Text>
                <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  backBtn: { padding: 16 },
  content: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 },

  // Step Indicator
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  stepContainer: { alignItems: 'center', flex: 1 },
  stepCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.border,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
  },
  stepCircleActive: { backgroundColor: Colors.primary },
  stepNum: { fontSize: 16, fontWeight: '700', color: Colors.textTertiary },
  stepNumActive: { color: '#fff' },
  stepLabel: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },
  stepLabelActive: { color: Colors.primary },
  stepLine: { position: 'absolute', width: '85%', height: 2, backgroundColor: Colors.border, top: 22, left: '60%' },
  stepLineActive: { backgroundColor: Colors.primary },

  // Form
  title: { fontSize: 24, fontWeight: '700', color: Colors.text, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 8 },
  input: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: Colors.text, marginBottom: 24,
  },
  inputActive: { borderColor: Colors.primary },
  btn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  btnSent: { backgroundColor: Colors.success },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 1 },

  // Next Steps Section
  nextStepsSection: { marginTop: 32 },
  nextStepsTitle: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginBottom: 16, letterSpacing: 0.5 },
  nextStepCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepCardNum: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.border,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  stepCardNumText: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
  stepCardContent: { flex: 1 },
  stepCardTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  stepCardSubtitle: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  proceedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 16,
    gap: 6,
  },
  proceedText: { fontSize: 15, fontWeight: '600', color: Colors.primary },
});
