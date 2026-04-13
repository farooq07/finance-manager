import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRouter, useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import Toast from 'react-native-toast-message';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { Colors } from '../constants/colors';
import api from '../services/api';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 30_000 },
  },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, setAuth, clearAuth } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await SecureStore.getItemAsync('auth_token');
        if (token) {
          try {
            const res = await api.get('/auth/me');
            setAuth(res.data);
          } catch (apiError) {
            console.warn('Auth check failed:', apiError);
            clearAuth();
            await SecureStore.deleteItemAsync('auth_token');
          }
        } else {
          clearAuth();
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        clearAuth();
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, isLoading]);

  if (isLoading) return <View style={{ flex: 1, backgroundColor: Colors.background }} />;
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthGuard>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="dues" />
              <Stack.Screen name="stocks" />
              <Stack.Screen name="banks" />
              <Stack.Screen name="rent" />
              <Stack.Screen name="zakat" />
              <Stack.Screen name="assets" />
              <Stack.Screen name="broker" />
              <Stack.Screen name="change-pin" />
              <Stack.Screen name="pin-entry" options={{ presentation: 'modal' }} />
            </Stack>
          </AuthGuard>
          <StatusBar style="auto" />
          <Toast />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
