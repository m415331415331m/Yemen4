import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="api-settings" />
      <Stack.Screen name="providers" />
      <Stack.Screen name="transactions" />
      <Stack.Screen name="fuel-stations" />
      <Stack.Screen name="accounts" />
    </Stack>
  );
}
