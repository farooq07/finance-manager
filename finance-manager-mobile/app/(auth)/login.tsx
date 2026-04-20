import { useState } from 'react';
import {
  View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image, TouchableOpacity, TextInput as RNTextInput
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Toast from 'react-native-toast-message';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import api, { getApiError } from '../../services/api';
import { loginSchema } from '../../utils/schemas';
import { Colors } from '../../constants/colors';

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', data);
      router.push({
        pathname: '/(auth)/otp-verification',
        params: { userId: res.data.userId, email: res.data.email },
      });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Login Failed', text2: getApiError(e) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" bounces={false}>
        {/* Dark Header showcasing WealthAxis flavor */}
        <View style={[styles.header, { paddingTop: insets.top + 60 }]}>
          <Image
            source={require('../../assets/logosm.svg')}
            style={{ width: 140, height: 60 }}
            resizeMode="contain"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardSubtitle}>Sign in to your WealthAxis account to continue.</Text>

          <View style={styles.formSpace}>
            <Controller
              control={control}
              name="identifier"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email or Username</Text>
                  <View style={[styles.inputContainer, errors.identifier && styles.inputError]}>
                    <RNTextInput
                      placeholder="you@example.com"
                      placeholderTextColor="#9CA3AF"
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                  {errors.identifier && <Text style={styles.err}>{errors.identifier.message}</Text>}
                </View>
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>Password</Text>
                    <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} activeOpacity={0.7}>
                      <Text style={styles.forgotText}>Forgot password?</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.inputContainer, errors.password && styles.inputError]}>
                    <RNTextInput
                      placeholder="Enter your password"
                      placeholderTextColor="#9CA3AF"
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon} activeOpacity={0.7}>
                      <MaterialCommunityIcons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                  {errors.password && <Text style={styles.err}>{errors.password.message}</Text>}
                </View>
              )}
            />
          </View>

          <TouchableOpacity 
            style={[styles.signInBtn, loading && styles.signInBtnDisabled]} 
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.signInBtnText}>{loading ? 'Checking...' : 'Sign in'}</Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>New to WealthAxis?</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity 
            style={styles.createAccBtn} 
            onPress={() => router.push('/(auth)/register')}
            activeOpacity={0.8}
          >
            <Text style={styles.createAccText}>Create an account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0c1a17' }, // Deep gradient-like teal
  scroll: { flexGrow: 1, justifyContent: 'space-between' },
  header: { alignItems: 'center', paddingBottom: 50, paddingHorizontal: 24 },
  card: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 28,
    paddingTop: 40,
    paddingBottom: 48,
    flex: 1,
    minHeight: 520,
  },
  cardTitle: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 8, letterSpacing: -0.5 },
  cardSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 32 },
  formSpace: { marginBottom: 24, gap: 16 },
  inputGroup: { width: '100%' },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6 },
  forgotText: { fontSize: 13, fontWeight: '500', color: Colors.primary },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
  },
  inputError: { borderColor: Colors.danger, backgroundColor: Colors.danger + '0A' },
  input: { flex: 1, fontSize: 15, color: '#111827', height: '100%' },
  eyeIcon: { padding: 4 },
  err: { color: Colors.danger, fontSize: 12, marginTop: 6, fontWeight: '500' },
  signInBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  signInBtnDisabled: { opacity: 0.7 },
  signInBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 32 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#F3F4F6' },
  dividerLabel: { marginHorizontal: 14, fontSize: 13, color: '#9CA3AF', fontWeight: '500' },
  createAccBtn: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '1A',
  },
  createAccText: { color: Colors.primary, fontSize: 15, fontWeight: '600' },
});

