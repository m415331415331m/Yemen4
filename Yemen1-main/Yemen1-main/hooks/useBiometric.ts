import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_ENABLED_KEY = 'rasidi_biometric_enabled';
const BIOMETRIC_CHECK_KEY = 'rasidi_biometric_passed';

export function useBiometric() {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'web') {
        setIsSupported(false);
        setIsAuthenticated(true);
        return;
      }
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setIsSupported(compatible && enrolled);

      const stored = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
      setIsEnabled(stored === 'true');

      // If biometric is not enabled, auto-authenticate
      if (stored !== 'true') {
        setIsAuthenticated(true);
      }
    })();
  }, []);

  const authenticate = useCallback(async () => {
    if (Platform.OS === 'web') {
      setIsAuthenticated(true);
      return true;
    }

    setChecking(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'استخدم البصمة أو الوجه للدخول إلى رصيدي',
        fallbackLabel: 'استخدام كلمة المرور',
        cancelLabel: 'إلغاء',
      });

      if (result.success) {
        setIsAuthenticated(true);
        await AsyncStorage.setItem(BIOMETRIC_CHECK_KEY, 'true');
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      setChecking(false);
    }
  }, []);

  const toggleBiometric = useCallback(async (enable: boolean) => {
    if (enable) {
      // Verify biometric before enabling
      if (Platform.OS !== 'web') {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'فعّل البصمة لحماية التطبيق',
          fallbackLabel: 'استخدام كلمة المرور',
          cancelLabel: 'إلغاء',
        });
        if (!result.success) return false;
      }
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
      setIsEnabled(true);
    } else {
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'false');
      setIsEnabled(false);
    }
    return true;
  }, []);

  return {
    isSupported,
    isEnabled,
    isAuthenticated,
    checking,
    authenticate,
    toggleBiometric,
  };
}
