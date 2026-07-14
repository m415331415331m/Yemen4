import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Platform } from 'react-native';
import { Fingerprint, Lock, ShieldCheck } from 'lucide-react-native';
import { Colors, Fonts, Radius, Spacing, Shadow, FontSizes } from '@/lib/theme';
import { useBiometric } from '@/hooks/useBiometric';

export function BiometricLock({ onUnlocked }: { onUnlocked: () => void }) {
  const { isAuthenticated, authenticate, checking } = useBiometric();
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-trigger biometric on mount
    if (!isAuthenticated && Platform.OS !== 'web') {
      setTimeout(() => authenticate(), 600);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => onUnlocked());
    }
  }, [isAuthenticated]);

  if (isAuthenticated) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Animated.View style={[styles.content, { transform: [{ scale: scaleAnim }] }]}>
        {/* Logo */}
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>ر</Text>
        </View>

        <Text style={styles.appName}>رصيدي</Text>
        <Text style={styles.appTagline}>سداد الفواتير وشحن الرصيد</Text>

        {/* Fingerprint button */}
        <TouchableOpacity
          style={styles.fingerprintBtn}
          onPress={() => authenticate()}
          disabled={checking}
          activeOpacity={0.7}
        >
          <View style={styles.fingerprintCircle}>
            {Platform.OS === 'web' ? (
              <Lock size={40} color={Colors.primary[600]} strokeWidth={2} />
            ) : (
              <Fingerprint size={48} color={Colors.primary[600]} strokeWidth={2} />
            )}
          </View>
        </TouchableOpacity>

        <Text style={styles.instruction}>
          {checking ? 'جاري التحقق...' : 'المس لفتح التطبيق'}
        </Text>

        <View style={styles.securityNote}>
          <ShieldCheck size={14} color={Colors.success[500]} strokeWidth={2} />
          <Text style={styles.securityText}>
            بياناتك محمية بالبصمة
          </Text>
        </View>

        <Text style={styles.devText}>العمري تكنو</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.neutral[900],
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  content: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.lg,
  },
  logoText: {
    fontFamily: Fonts.cairoBold,
    fontSize: FontSizes.xxl,
    color: Colors.surface,
  },
  appName: {
    fontFamily: Fonts.cairoBold,
    fontSize: FontSizes.display,
    color: Colors.surface,
  },
  appTagline: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.neutral[400],
  },
  fingerprintBtn: {
    marginTop: Spacing.xl,
  },
  fingerprintCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(13,148,136,0.15)',
    borderWidth: 2,
    borderColor: Colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  instruction: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.sm,
    color: Colors.neutral[300],
    marginTop: Spacing.md,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.lg,
  },
  securityText: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.neutral[500],
  },
  devText: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.neutral[600],
    marginTop: Spacing.xl,
  },
});
