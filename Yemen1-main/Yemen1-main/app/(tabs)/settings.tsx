import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Alert, Animated, Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronLeft, Shield, FileText, LayoutDashboard,
  Fingerprint, Bell, ShieldCheck, Star,
  HelpCircle, Zap, Lock,
} from 'lucide-react-native';
import { Colors, Fonts, Radius, Spacing, Shadow, FontSizes } from '@/lib/theme';
import { useBiometric } from '@/hooks/useBiometric';
import { useRef, useEffect } from 'react';

export default function SettingsScreen() {
  const router = useRouter();
  const { isSupported, isEnabled, toggleBiometric } = useBiometric();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  const handleBiometricToggle = async () => {
    if (!isSupported) {
      Alert.alert('غير متاح', 'جهازك لا يدعم البصمة أو لم يتم تسجيل بصمة في الإعدادات');
      return;
    }
    const success = await toggleBiometric(!isEnabled);
    if (!success) {
      Alert.alert('فشل', 'تعذر تفعيل البصمة. حاول مرة أخرى.');
    }
  };

  const menuItems = [
    { icon: Shield, title: 'الأمان والخصوصية', subtitle: 'حماية بياناتك ومعلوماتك', color: Colors.success[500] },
    { icon: Bell, title: 'الإشعارات', subtitle: 'إدارة تنبيهات التطبيق', color: Colors.accent[500] },
    { icon: FileText, title: 'الشروط والأحكام', subtitle: 'سياسة الاستخدام', color: Colors.secondary[500] },
    { icon: HelpCircle, title: 'الدعم والمساعدة', subtitle: 'الأسئلة الشائعة', color: Colors.primary[500] },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <Text style={styles.headerTitle}>الإعدادات</Text>
      </Animated.View>

      {/* App identity card */}
      <Animated.View style={[styles.appCard, Shadow.md, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.appLogo}>
          <Text style={styles.appLogoText}>ر</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.appName}>رصيدي</Text>
          <Text style={styles.appTagline}>سداد الفواتير وشحن الرصيد - اليمن</Text>
        </View>
        <View style={styles.versionBadge}>
          <Text style={styles.versionText}>v1.0</Text>
        </View>
      </Animated.View>

      {/* Security section */}
      <Text style={styles.sectionLabel}>الأمان والحماية</Text>
      <View style={styles.menuList}>
        <TouchableOpacity style={[styles.menuItem, styles.menuItemLast]} onPress={handleBiometricToggle} activeOpacity={0.7}>
          <View style={[styles.menuIcon, { backgroundColor: Colors.primary[50] }]}>
            <Fingerprint size={20} color={Colors.primary[600]} strokeWidth={2} />
          </View>
          <View style={styles.menuInfo}>
            <Text style={styles.menuTitle}>قفل بالبصمة</Text>
            <Text style={styles.menuSubtitle}>
              {isSupported ? (isEnabled ? 'مفعّل - افتح التطبيق بالبصمة' : 'فعّل البصمة لحماية التطبيق') : 'غير مدعوم على هذا الجهاز'}
            </Text>
          </View>
          <View style={[styles.toggle, isEnabled && styles.toggleActive, !isSupported && styles.toggleDisabled]}>
            <View style={[styles.toggleKnob, isEnabled && styles.toggleKnobActive]} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Quick stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: Colors.primary[50] }]}>
          <Zap size={18} color={Colors.primary[600]} strokeWidth={2} />
          <Text style={styles.statValue}>فوري</Text>
          <Text style={styles.statLabel}>سداد</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: Colors.success[50] }]}>
          <ShieldCheck size={18} color={Colors.success[600]} strokeWidth={2} />
          <Text style={styles.statValue}>آمن</Text>
          <Text style={styles.statLabel}>محمي</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: Colors.secondary[50] }]}>
          <Star size={18} color={Colors.secondary[600]} strokeWidth={2} />
          <Text style={styles.statValue}>24/7</Text>
          <Text style={styles.statLabel}>متاح</Text>
        </View>
      </View>

      {/* About menu */}
      <Text style={styles.sectionLabel}>عن التطبيق</Text>
      <View style={styles.menuList}>
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <TouchableOpacity key={index} style={[styles.menuItem, index === menuItems.length - 1 && styles.menuItemLast]} activeOpacity={0.7}>
              <View style={[styles.menuIcon, { backgroundColor: item.color + '18' }]}>
                <Icon size={20} color={item.color} strokeWidth={2} />
              </View>
              <View style={styles.menuInfo}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <ChevronLeft size={18} color={Colors.neutral[300]} strokeWidth={2} />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Admin button */}
      <TouchableOpacity style={styles.adminButton} onPress={() => router.push('/admin')} activeOpacity={0.8}>
        <LayoutDashboard size={20} color={Colors.surface} strokeWidth={2} />
        <Text style={styles.adminButtonText}>لوحة التحكم</Text>
      </TouchableOpacity>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerLogo}>
          <Text style={styles.footerLogoText}>ر</Text>
        </View>
        <Text style={styles.footerText}>رصيدي © 2026</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F3' },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  headerTitle: { fontFamily: Fonts.cairoBold, fontSize: FontSizes.xxl, color: Colors.text, marginTop: Platform.OS === 'web' ? Spacing.sm : Spacing.md, marginBottom: Spacing.lg },
  appCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg, gap: Spacing.md, borderWidth: 1, borderColor: Colors.neutral[100] },
  appLogo: { width: 56, height: 56, borderRadius: 16, backgroundColor: Colors.primary[600], justifyContent: 'center', alignItems: 'center' },
  appLogoText: { fontFamily: Fonts.cairoBold, fontSize: FontSizes.xxl, color: Colors.surface },
  appName: { fontFamily: Fonts.cairoBold, fontSize: FontSizes.xl, color: Colors.text },
  appTagline: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.textSecondary, marginTop: 2 },
  versionBadge: { backgroundColor: Colors.primary[50], paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill },
  versionText: { fontFamily: Fonts.bold, fontSize: FontSizes.xs, color: Colors.primary[600] },
  sectionLabel: { fontFamily: Fonts.bold, fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: Spacing.xl, marginBottom: Spacing.sm, paddingHorizontal: Spacing.xs },
  menuList: { backgroundColor: Colors.surface, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.neutral[100] },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.neutral[100] },
  menuItemLast: { borderBottomWidth: 0 },
  menuIcon: { width: 40, height: 40, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center' },
  menuInfo: { flex: 1 },
  menuTitle: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, color: Colors.text },
  menuSubtitle: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.textSecondary, marginTop: 2 },
  toggle: { width: 44, height: 24, borderRadius: 12, backgroundColor: Colors.neutral[300], justifyContent: 'center', padding: 2 },
  toggleActive: { backgroundColor: Colors.primary[600] },
  toggleDisabled: { opacity: 0.4 },
  toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.surface },
  toggleKnobActive: { transform: [{ translateX: 20 }] },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  statCard: { flex: 1, alignItems: 'center', gap: 4, borderRadius: Radius.lg, paddingVertical: Spacing.md },
  statValue: { fontFamily: Fonts.cairoBold, fontSize: FontSizes.sm, color: Colors.text },
  statLabel: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.textSecondary },
  adminButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.neutral[800], borderRadius: Radius.md, paddingVertical: 16, marginTop: Spacing.xl },
  adminButtonText: { fontFamily: Fonts.bold, fontSize: FontSizes.md, color: Colors.surface },
  footer: { alignItems: 'center', paddingVertical: Spacing.xl, gap: 4 },
  footerLogo: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.primary[600], justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm },
  footerLogoText: { fontFamily: Fonts.cairoBold, fontSize: FontSizes.lg, color: Colors.surface },
  footerText: { fontFamily: Fonts.medium, fontSize: FontSizes.xs, color: Colors.textMuted },
});
