import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { useSession } from '../src/features/session/sessionStore';
import { useClearCacheOnSignOut } from '../src/features/session/useClearCacheOnSignOut';
import { routeFor, isOnTarget } from '../src/features/routing/routeFor';
import { useTheme } from '../src/ui';

void SplashScreen.preventAutoHideAsync().catch(() => {});

// Sends the user wherever their session says they belong (see routeFor).
function useRouteGuard(ready: boolean) {
    const status = useSession((s) => s.status);
    const user = useSession((s) => s.user);
    const locked = false; // PIN / fingerprint lock arrives in Task 8
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        if (!ready) return;
        const target = routeFor({ status, user, locked });
        // Href cast: expo-router's generated route list (.expo/types) is rebuilt
        // only by `expo start`, so it can lag behind newly added screens.
        if (target && !isOnTarget(segments as string[], target)) router.replace(target as Href);
    }, [ready, status, user, locked, segments, router]);
}

export default function RootLayout() {
    const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } }));
    const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
    const status = useSession((s) => s.status);
    const { scheme } = useTheme();

    useEffect(() => { void useSession.getState().boot(); }, []);
    useClearCacheOnSignOut(queryClient);

    const ready = fontsLoaded && status !== 'loading';
    useEffect(() => { if (ready) void SplashScreen.hideAsync().catch(() => {}); }, [ready]);
    useRouteGuard(ready);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <QueryClientProvider client={queryClient}>
                    <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
                    <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
                </QueryClientProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}
