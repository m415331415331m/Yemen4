import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronRight, Zap, Droplet, FileText, Clock, ShieldCheck } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Colors, Fonts, Radius, Spacing, Shadow, FontSizes } from '@/lib/theme';
import { getProviderLogo } from '@/components/ProviderLogos';
import type { ServiceProvider } from '@/types/database';

export default function BillsScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type: 'electricity' | 'water' }>();
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const loadProviders = useCallback(async () => {
    const { data, error } = await supabase
      .from('service_providers')
      .select('*')
      .eq('is_active', true)
      .eq('type', type || 'electricity')
      .order('sort_order', { ascending: true });
    if (!error && data) setProviders(data as ServiceProvider[]);
    setLoading(false);
  }, [type]);

  useEffect(() => {
    loadProviders();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  const isElectricity = type === 'electricity';
  const title = isElectricity ? 'فواتير الكهرباء' : 'فواتير المياه';
  const subtitle = isElectricity ? 'اختر شركة الكهرباء لسداد فاتورتك' : 'اختر شركة المياه لسداد فاتورتك';
  const accentColor = isElectricity ? Colors.secondary[500] : '#0277BD';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={accentColor} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronRight size={24} color={Colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Banner with gradient feel */}
      <Animated.View
        style={[
          styles.banner,
          { backgroundColor: accentColor, opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          Shadow.md,
        ]}
      >
        <View style={styles.bannerIcon}>
          {isElectricity ? <Zap size={32} color={Colors.surface} strokeWidth={2} /> : <Droplet size={32} color={Colors.surface} strokeWidth={2} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>{title}</Text>
          <Text style={styles.bannerSubtitle}>{subtitle}</Text>
          <View style={styles.bannerMeta}>
            <View style={styles.bannerMetaItem}>
              <Clock size={12} color={Colors.surface} strokeWidth={2} />
              <Text style={styles.bannerMetaText}>سداد فوري</Text>
            </View>
            <View style={styles.bannerMetaItem}>
              <ShieldCheck size={12} color={Colors.surface} strokeWidth={2} />
              <Text style={styles.bannerMetaText}>آمن وموثوق</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Info card */}
      <View style={styles.infoCard}>
        <FileText size={18} color={accentColor} strokeWidth={2} />
        <Text style={styles.infoText}>
          أدخل رقم الحساب أو العداد بعد اختيار الشركة، وحدد المبلغ الذي تريد سداده
        </Text>
      </View>

      {/* Providers list */}
      <View style={styles.list}>
        {providers.map((provider, index) => (
          <Animated.View
            key={provider.id}
            style={{
              opacity: fadeAnim,
              transform: [{
                translateY: slideAnim.interpolate({
                  inputRange: [0, 20],
                  outputRange: [0, 20 * (index + 1) * 0.1],
                }),
              }],
            }}
          >
            <TouchableOpacity
              style={[styles.providerCard, Shadow.sm]}
              onPress={() =>
                router.push({
                  pathname: '/service',
                  params: {
                    providerId: provider.id,
                    providerCode: provider.code,
                    providerName: provider.name_ar,
                    providerType: provider.type,
                    providerColor: provider.brand_color,
                    providerIcon: provider.icon_name,
                  },
                })
              }
              activeOpacity={0.7}
            >
              <View style={[styles.providerLogoBox, { backgroundColor: provider.brand_color + '12' }]}>
                {getProviderLogo(provider.code, 40, provider.brand_color)}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.providerName}>{provider.name_ar}</Text>
                <Text style={styles.providerDesc}>
                  {isElectricity ? 'سداد فاتورة كهرباء' : 'سداد فاتورة مياه'}
                </Text>
              </View>
              <View style={[styles.chevronBtn, { backgroundColor: accentColor + '12' }]}>
                <ChevronRight size={20} color={accentColor} strokeWidth={2} />
              </View>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>

      {/* Trust footer */}
      <View style={styles.trustFooter}>
        <ShieldCheck size={16} color={Colors.textMuted} strokeWidth={2} />
        <Text style={styles.trustText}>جميع المعاملات مشفرة وآمنة - رصيدي © 2026</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F3' },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl, maxWidth: 700, width: '100%', alignSelf: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4F3' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Platform.OS === 'web' ? Spacing.sm : Spacing.md,
    marginBottom: Spacing.lg,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerTitle: { fontFamily: Fonts.bold, fontSize: FontSizes.lg, color: Colors.text },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  bannerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerTitle: { fontFamily: Fonts.cairoBold, fontSize: FontSizes.xl, color: Colors.surface },
  bannerSubtitle: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: Colors.surface, opacity: 0.85, marginTop: 4 },
  bannerMeta: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  bannerMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bannerMetaText: { fontFamily: Fonts.medium, fontSize: 10, color: Colors.surface, opacity: 0.9 },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.neutral[100],
  },
  infoText: { flex: 1, fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.textSecondary, lineHeight: 20 },
  list: { gap: Spacing.sm },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.neutral[100],
  },
  providerLogoBox: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerName: { fontFamily: Fonts.bold, fontSize: FontSizes.md, color: Colors.text },
  providerDesc: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.textSecondary, marginTop: 2 },
  chevronBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trustFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
  },
  trustText: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.textMuted },
});
