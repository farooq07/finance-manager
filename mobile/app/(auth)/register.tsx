import { useState } from 'react';
import {
  View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Toast from 'react-native-toast-message';
import * as SecureStore from 'expo-secure-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TextInput, Text, Button } from 'react-native-paper';
import api, { getApiError } from '../../services/api';
import { registerSchema } from '../../utils/schemas';
import { useAuthStore } from '../../stores/authStore';
import { Colors } from '../../constants/colors';


type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/register', data);
      await SecureStore.setItemAsync('auth_token', res.data.token);
      setAuth(res.data.user);
      router.replace('/(auth)/pin-setup');
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Registration Failed', text2: getApiError(e) });
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
          <Text style={styles.appTagline}>Create your account</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Get Started</Text>

          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Full Name"
                placeholder="Your full name"
                mode="outlined"
                value={value}
                onChangeText={onChange}
                error={!!errors.name}
                style={styles.input}
              />
            )}
          />
          {errors.name && <Text style={styles.err}>{errors.name.message}</Text>}

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Email Address"
                placeholder="you@example.com"
                mode="outlined"
                value={value}
                onChangeText={onChange}
                autoCapitalize="none"
                keyboardType="email-address"
                error={!!errors.email}
                style={styles.input}
              />
            )}
          />
          {errors.email && <Text style={styles.err}>{errors.email.message}</Text>}

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Password"
                placeholder="Min 6 characters"
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
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
            loading={loading}
            style={styles.registerBtn}
          >
            CREATE ACCOUNT
          </Button>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.loginRow}>
            <Text style={styles.loginLabel}>Already have an account?</Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.loginLink}> Sign In</Text>
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
    paddingHorizontal: 24, paddingTop: 32, paddingBottom: 48, flex: 1, minHeight: 520,
  },
  cardTitle: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 20 },
  input: { marginBottom: 16 },
  err: { color: Colors.danger, fontSize: 12, marginTop: 4, marginBottom: 12 },
  registerBtn: { marginTop: 24, marginBottom: 16 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerLabel: { marginHorizontal: 14, fontSize: 13, color: Colors.textSecondary },
  loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  loginLabel: { fontSize: 14, color: Colors.textSecondary },
  loginLink: { fontSize: 14, fontWeight: '700', color: Colors.primary },
});
