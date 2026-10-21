import { Stack } from 'expo-router';

// Minimal root while the foundation is rebuilt: providers, auth routing and
// the tab shell arrive in later tasks (see docs/superpowers/plans/2026-10-21-mobile-foundation.md).
export default function RootLayout() {
    return <Stack screenOptions={{ headerShown: false }} />;
}
