import { useState } from 'react';
import {
  View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Toast from 'react-native-toast-message';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TextInput, Text } from 'react-native-paper';
import api, { getApiError } from '../../services/api';
import { loginSchema } from '../../utils/schemas';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/ui/Button';

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
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={[styles.header, { paddingTop: insets.top + 40 }]}>
          <Image
            source={require('../../assets/logosm.svg')}
            style={{ width: 120, height: 60, marginBottom: 16 }}
            resizeMode="contain"
          />
          <Text style={styles.appTagline}>Sign in to continue</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>

          <Controller
            control={control}
            name="identifier"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Email Address"
                placeholder="you@example.com"
                mode="outlined"
                value={value}
                onChangeText={onChange}
                autoCapitalize="none"
                keyboardType="email-address"
                error={!!errors.identifier}
                style={styles.input}
              />
            )}
          />
          {errors.identifier && <Text style={styles.err}>{errors.identifier.message}</Text>}

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Password"
                placeholder="••••••••"
                mode="outlined"
                value={value}
                onChangeText={onChange}
                secureTextEntry={!showPassword}
                error={!!errors.password}
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
                style={styles.input}
              />
            )}
          />
          {errors.password && <Text style={styles.err}>{errors.password.message}</Text>}

          <Button
            title="SIGN IN"
            variant="primary"
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
            loading={loading}
            style={styles.signInBtn}
          />

          <TouchableOpacity style={styles.forgotWrap} onPress={() => router.push('/(auth)/forgot-password')}>
            <Text variant="labelLarge" style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.registerRow}>
            <Text style={styles.registerLabel}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.registerLink}> Register</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  scroll: { flexGrow: 1 },
  header: { alignItems: 'center', paddingBottom: 40, paddingHorizontal: 24 },
  appTagline: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  card: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 32, paddingBottom: 48, flex: 1,
    minHeight: 480,
  },
  cardTitle: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 20 },
  input: { marginBottom: 16 },
  err: { color: Colors.danger, fontSize: 12, marginTop: 4, marginBottom: 12 },
  signInBtn: { marginTop: 24, marginBottom: 16 },
  forgotWrap: { alignItems: 'center', marginBottom: 24 },
  forgotText: { color: Colors.primary },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerLabel: { marginHorizontal: 14, fontSize: 13, color: Colors.textSecondary },
  registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  registerLabel: { fontSize: 14, color: Colors.textSecondary },
  registerLink: { fontSize: 14, fontWeight: '700', color: Colors.primary },
});
