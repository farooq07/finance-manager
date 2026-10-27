import { Stack } from 'expo-router';

// Signed-in screens opened from the tabs (account detail, import, Zakat…).
export default function AppScreensLayout() {
    return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
