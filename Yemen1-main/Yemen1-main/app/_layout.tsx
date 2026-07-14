import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SplashScreen } from 'expo-router';
import { Platform } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import {
  Tajawal_400Regular,
  Tajawal_500Medium,
  Tajawal_700Bold,
} from '@expo-google-fonts/tajawal';
import { Cairo_700Bold } from '@expo-google-fonts/cairo';
import { BiometricLock } from '@/components/BiometricLock';
import { useBiometric } from '@/hooks/useBiometric';
import AsyncStorage from '@react-native-async-storage/async-storage';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);

  const { isAuthenticated, authenticate, isEnabled } = useBiometric();

  const [fontsLoaded, fontError] = useFonts({
    'Tajawal-Regular': Tajawal_400Regular,
    'Tajawal-Medium': Tajawal_500Medium,
    'Tajawal-Bold': Tajawal_700Bold,
    'Cairo-Bold': Cairo_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    (async () => {
      if (!isEnabled || Platform.OS === 'web') {
        setUnlocked(true);
        setChecking(false);
        return;
      }

      // Check if biometric is enabled
      const passed = await AsyncStorage.getItem('rasidi_biometric_passed');
      if (passed === 'true') {
        // Still need to re-authenticate on app open
        setChecking(false);
        // The BiometricLock component will auto-trigger
      } else {
        setUnlocked(true);
        setChecking(false);
      }
    })();
  }, [isEnabled]);

  useEffect(() => {
    if (isAuthenticated) {
      setUnlocked(true);
    }
  }, [isAuthenticated]);

  if (!fontsLoaded && !fontError) return null;
  if (checking) return null;

  return (
    <>
      <Stack screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F0F4F3' },
      }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen name="service" options={{ headerShown: false }} />
        <Stack.Screen name="bills" options={{ headerShown: false }} />
        <Stack.Screen name="receipt/[id]" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="dark" />
      {!unlocked && isEnabled && Platform.OS !== 'web' && (
        <BiometricLock onUnlocked={() => setUnlocked(true)} />
      )}
    </>
  );
}
