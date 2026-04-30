import { Stack } from 'expo-router';

export default function PortfolioLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="mutual-funds" />
      <Stack.Screen name="mutual-fund-snapshots" />
      <Stack.Screen name="stocks" />
      <Stack.Screen name="psx-snapshots" />
    </Stack>
  );
}
