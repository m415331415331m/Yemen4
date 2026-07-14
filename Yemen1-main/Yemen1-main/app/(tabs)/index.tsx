import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform, Animated, Easing, RefreshControl, TextInput, Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Smartphone, Wifi, Zap, Droplet, Fuel, Wallet, TrendingUp,
  TrendingDown, Clock, Receipt, CheckCircle2, XCircle,
  Sparkles, ShieldCheck, HandCoins, PiggyBank, ArrowRight, ArrowLeftCircle,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Colors, Fonts, Radius, Spacing, Shadow, FontSizes } from '@/lib/theme';
import { getProviderLogo } from '@/components/ProviderLogos';
import { getClientToken } from '@/lib/client-token';
import { fetchProvidersWithCache } from '@/lib/cache';
import { formatAmount, detectProviderFromNumber, formatPhoneNumber } from '@/lib/provider-utils';
import type { ServiceProvider, TransactionWithProvider, Debt, Expense, Income } from '@/types/database';

export default function HomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [recentTxns, setRecentTxns] = useState<TransactionWithProvider[]>([]);
  const [totalDebts, setTotalDebts] = useState(0);
  const [totalOwed, setTotalOwed] = useState(0);
  const [todayExpenses, setTodayExpenses] = useState(0);
  const [monthIncome, setMonthIncome] = useState(0);
  const [monthExpenses, setMonthExpenses] = useState(0);
  const [activeDebtsCount, setActiveDebtsCount] = useState(0);

  // Phone recharge state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [detectedProvider, setDetectedProvider] = useState<ServiceProvider | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const providerBadgeAnim = useRef(new Animated.Value(0)).current;

  const loadData = useCallback(async () => {
    const clientToken = await getClientToken();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const todayStart = now.toISOString().slice(0, 10);

    const [providerData, { data: txnData }, { data: debtData }, { data: expenseData }, { data: incomeData }] = await Promise.all([
      fetchProvidersWithCache(),
      supabase
        .from('transactions')
        .select(`*, service_providers!inner(id, code, name_ar, name_en, type, icon_name, brand_color)`)
        .eq('client_token', clientToken)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase.from('debts').select('*').eq('client_token', clientToken).eq('status', 'active'),
      supabase.from('expenses').select('amount, expense_date').eq('client_token', clientToken),
      supabase.from('income').select('amount, income_date').eq('client_token', clientToken),
    ]);

    setProviders(providerData);
    if (txnData) setRecentTxns(txnData as TransactionWithProvider[]);

    if (debtData) {
      const debts = debtData as Debt[];
      setTotalDebts(debts.filter((d) => d.person_type === 'i_owe').reduce((s, d) => s + (Number(d.amount) - Number(d.paid_amount)), 0));
      setTotalOwed(debts.filter((d) => d.person_type === 'owed_to_me').reduce((s, d) => s + (Number(d.amount) - Number(d.paid_amount)), 0));
      setActiveDebtsCount(debts.length);
    }
    if (expenseData) {
      const expenses = expenseData as Expense[];
      setTodayExpenses(expenses.filter((e) => e.expense_date === todayStart).reduce((s, e) => s + Number(e.amount), 0));
      setMonthExpenses(expenses.filter((e) => e.expense_date >= monthStart).reduce((s, e) => s + Number(e.amount), 0));
    }
    if (incomeData) {
      setMonthIncome((incomeData as Income[]).filter((i) => i.income_date >= monthStart).reduce((s, i) => s + Number(i.amount), 0));
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadData();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    setPhoneNumber(formatted);
    const provider = detectProviderFromNumber(formatted, providers);
    setDetectedProvider(provider);
    Animated.timing(providerBadgeAnim, { toValue: provider ? 1 : 0, duration: 300, useNativeDriver: true }).start();
  };

  const handleProceed = () => {
    if (!detectedProvider) return;
    Keyboard.dismiss();
    router.push({
      pathname: '/service',
      params: {
        providerId: detectedProvider.id,
        providerCode: detectedProvider.code,
        providerName: detectedProvider.name_ar,
        providerType: detectedProvider.type,
        providerColor: detectedProvider.brand_color,
        providerIcon: detectedProvider.icon_name,
        phoneNumber,
      },
    });
  };

  const formatTxnDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
        <Text style={styles.loadingText}>جاري التحميل...</Text>
      </View>
    );
  }

  const balance = monthIncome - monthExpenses;
  const mobileProviders = providers.filter((p) => p.type === 'mobile');

  const serviceCategories = [
    { key: 'recharge', title: 'شحن رصيد', subtitle: 'جميع الشبكات', icon: Smartphone, color: Colors.primary[600], bgColor: Colors.primary[50], isRecharge: true },
    { key: 'packages', title: 'الباقات', subtitle: 'إنترنت واتصال', icon: Wifi, color: Colors.accent[600], bgColor: Colors.accent[50], route: '/service', params: { providerType: 'internet', providerName: 'باقات الإنترنت', providerColor: Colors.accent[500], providerCode: 'internet_packages', providerId: '', providerIcon: 'Wifi' } },
    { key: 'electricity', title: 'الكهرباء', subtitle: 'سداد فواتير', icon: Zap, color: Colors.secondary[600], bgColor: Colors.secondary[50], route: '/bills/electricity' },
    { key: 'water', title: 'المياه', subtitle: 'سداد فواتير', icon: Droplet, color: '#0277BD', bgColor: '#E3F2FD', route: '/bills/water' },
    { key: 'fuel', title: 'محطات الوقود', subtitle: 'سداد حسابات', icon: Fuel, color: '#D32128', bgColor: '#FFEBEE', route: '/fuel' },
    { key: 'debts', title: 'الديون', subtitle: 'إدارة وتقسيط', icon: HandCoins, color: Colors.warning[600], bgColor: Colors.warning[50], route: '/(tabs)/debts' },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} colors={[Colors.primary[500]]} />}
    >
      {/* Hero */}
      <Animated.View style={[styles.heroSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroGreeting}>أهلاً بك في</Text>
            <Text style={styles.heroTitle}>رصيدي</Text>
          </View>
          <View style={styles.heroBadge}>
            <Sparkles size={14} color={Colors.secondary[400]} strokeWidth={2} />
            <Text style={styles.heroBadgeText}>سداد فوري</Text>
          </View>
        </View>
      </Animated.View>

      {/* Phone Recharge Card - phone field stays visible */}
      <Animated.View style={[styles.rechargeCard, Shadow.md, { transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.rechargeCardHeader}>
          <View style={styles.rechargeIconContainer}>
            <Smartphone size={22} color={Colors.primary[600]} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rechargeCardTitle}>شحن رصيد هاتف</Text>
            <Text style={styles.rechargeCardSubtitle}>أدخل الرقم للتعرف على الشبكة</Text>
          </View>
        </View>

        {/* Phone input - ALWAYS visible, never disappears */}
        <View style={styles.phoneInputRow}>
          <View style={styles.phonePrefix}>
            <Text style={styles.phonePrefixText}>+967</Text>
          </View>
          <TextInput
            style={styles.phoneInput}
            placeholder="7XX XXX XXX"
            placeholderTextColor={Colors.textMuted}
            value={phoneNumber}
            onChangeText={handlePhoneChange}
            keyboardType="number-pad"
            textAlign="center"
            maxLength={9}
          />
        </View>

        {/* Detected provider badge - shows below the field, doesn't replace it */}
        {detectedProvider && (
          <Animated.View style={[styles.detectedBadge, { opacity: providerBadgeAnim, backgroundColor: detectedProvider.brand_color + '12' }]}>
            {getProviderLogo(detectedProvider.code, 28, detectedProvider.brand_color)}
            <Text style={[styles.detectedText, { color: detectedProvider.brand_color }]}>{detectedProvider.name_ar}</Text>
            <View style={[styles.detectedTag, { backgroundColor: detectedProvider.brand_color }]}>
              <Text style={styles.detectedTagText}>تم التعرف</Text>
            </View>
          </Animated.View>
        )}

        <TouchableOpacity
          style={[styles.proceedButton, !detectedProvider && styles.proceedButtonDisabled]}
          onPress={handleProceed}
          disabled={!detectedProvider}
          activeOpacity={0.8}
        >
          <Text style={styles.proceedButtonText}>متابعة</Text>
          <ArrowRight size={18} color={Colors.surface} strokeWidth={2} />
        </TouchableOpacity>
      </Animated.View>

      {/* Financial summary */}
      <Animated.View style={[styles.summaryCard, Shadow.md, { transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.summaryHeader}>
          <View style={styles.summaryHeaderLeft}>
            <View style={styles.summaryIconBox}>
              <PiggyBank size={20} color={Colors.surface} strokeWidth={2} />
            </View>
            <View>
              <Text style={styles.summaryTitle}>رصيدك الشهري</Text>
              <Text style={styles.summarySubtitle}>الدخل ناقص المصروفات</Text>
            </View>
          </View>
          <View style={[styles.balanceTag, balance >= 0 ? styles.balancePositive : styles.balanceNegative]}>
            <Text style={styles.balanceTagText}>{balance >= 0 ? 'فائض' : 'عجز'}</Text>
          </View>
        </View>
        <Text style={[styles.balanceAmount, { color: balance >= 0 ? Colors.success[600] : Colors.error[500] }]}>
          {formatAmount(Math.abs(balance))} ريال
        </Text>
        <View style={styles.summaryStatsRow}>
          <View style={styles.summaryStat}>
            <View style={[styles.summaryStatIcon, { backgroundColor: Colors.success[50] }]}>
              <TrendingUp size={14} color={Colors.success[600]} strokeWidth={2} />
            </View>
            <View>
              <Text style={styles.summaryStatValue}>{formatAmount(monthIncome)}</Text>
              <Text style={styles.summaryStatLabel}>دخل الشهر</Text>
            </View>
          </View>
          <View style={styles.summaryStatDivider} />
          <View style={styles.summaryStat}>
            <View style={[styles.summaryStatIcon, { backgroundColor: Colors.error[50] }]}>
              <TrendingDown size={14} color={Colors.error[500]} strokeWidth={2} />
            </View>
            <View>
              <Text style={styles.summaryStatValue}>{formatAmount(monthExpenses)}</Text>
              <Text style={styles.summaryStatLabel}>مصروفات الشهر</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Debts quick stats */}
      <View style={styles.debtsStatsRow}>
        <TouchableOpacity style={[styles.debtStatCard, { backgroundColor: Colors.warning[50] }]} onPress={() => router.push('/(tabs)/debts')} activeOpacity={0.7}>
          <View style={[styles.debtStatIcon, { backgroundColor: Colors.warning[500] }]}>
            <HandCoins size={18} color={Colors.surface} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.debtStatValue}>{formatAmount(totalDebts)}</Text>
            <Text style={styles.debtStatLabel}>ديون عليك</Text>
          </View>
          {activeDebtsCount > 0 && <View style={styles.debtCountBadge}><Text style={styles.debtCountText}>{activeDebtsCount}</Text></View>}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.debtStatCard, { backgroundColor: Colors.success[50] }]} onPress={() => router.push('/(tabs)/debts')} activeOpacity={0.7}>
          <View style={[styles.debtStatIcon, { backgroundColor: Colors.success[500] }]}>
            <ArrowLeftCircle size={18} color={Colors.surface} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.debtStatValue}>{formatAmount(totalOwed)}</Text>
            <Text style={styles.debtStatLabel}>ديون لك</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Service categories */}
      <Text style={styles.sectionTitle}>الخدمات</Text>
      <View style={styles.servicesGrid}>
        {serviceCategories.map((cat) => {
          const Icon = cat.icon;
          return (
            <TouchableOpacity
              key={cat.key}
              style={[styles.serviceCard, Shadow.sm]}
              onPress={() => {
                if (cat.isRecharge) {
                  // Scroll to top / focus the phone input
                  return;
                }
                if (cat.params) {
                  router.push({ pathname: cat.route!, params: cat.params });
                } else {
                  router.push(cat.route as never);
                }
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.serviceIcon, { backgroundColor: cat.bgColor }]}>
                <Icon size={26} color={cat.color} strokeWidth={2} />
              </View>
              <Text style={styles.serviceName}>{cat.title}</Text>
              <Text style={styles.serviceDesc} numberOfLines={1}>{cat.subtitle}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Quick actions */}
      <Text style={styles.sectionTitle}>إجراءات سريعة</Text>
      <View style={styles.quickActionsRow}>
        <TouchableOpacity style={[styles.quickActionCard, { backgroundColor: Colors.primary[50] }]} onPress={() => router.push('/(tabs)/expenses')} activeOpacity={0.7}>
          <View style={[styles.quickActionIcon, { backgroundColor: Colors.primary[600] }]}>
            <TrendingDown size={20} color={Colors.surface} strokeWidth={2} />
          </View>
          <Text style={styles.quickActionText}>مصروفاتي</Text>
          {todayExpenses > 0 && <Text style={styles.quickActionSubtext}>{formatAmount(todayExpenses)} ريال اليوم</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.quickActionCard, { backgroundColor: Colors.success[50] }]} onPress={() => router.push('/(tabs)/expenses')} activeOpacity={0.7}>
          <View style={[styles.quickActionIcon, { backgroundColor: Colors.success[500] }]}>
            <TrendingUp size={20} color={Colors.surface} strokeWidth={2} />
          </View>
          <Text style={styles.quickActionText}>الدخل</Text>
          <Text style={styles.quickActionSubtext}>إدارة الدخل</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.quickActionCard, { backgroundColor: Colors.accent[50] }]} onPress={() => router.push('/(tabs)/history')} activeOpacity={0.7}>
          <View style={[styles.quickActionIcon, { backgroundColor: Colors.accent[500] }]}>
            <Receipt size={20} color={Colors.surface} strokeWidth={2} />
          </View>
          <Text style={styles.quickActionText}>الإيصالات</Text>
          <Text style={styles.quickActionSubtext}>سجل العمليات</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.quickActionCard, { backgroundColor: Colors.warning[50] }]} onPress={() => router.push('/(tabs)/debts')} activeOpacity={0.7}>
          <View style={[styles.quickActionIcon, { backgroundColor: Colors.warning[500] }]}>
            <HandCoins size={20} color={Colors.surface} strokeWidth={2} />
          </View>
          <Text style={styles.quickActionText}>الديون</Text>
          <Text style={styles.quickActionSubtext}>إدارة الديون</Text>
        </TouchableOpacity>
      </View>

      {/* Recent transactions */}
      {recentTxns.length > 0 && (
        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitleNoMargin}>آخر العمليات</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/history')}>
              <Text style={styles.seeAll}>عرض الكل</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentScrollContent}>
            {recentTxns.map((txn) => {
              const provider = txn.service_providers;
              const statusColor = txn.status === 'success' ? Colors.success[500] : txn.status === 'failed' ? Colors.error[500] : Colors.warning[500];
              const StatusIcon = txn.status === 'success' ? CheckCircle2 : txn.status === 'failed' ? XCircle : Clock;
              return (
                <TouchableOpacity key={txn.id} style={[styles.recentCard, Shadow.sm]} onPress={() => router.push(`/receipt/${txn.id}`)} activeOpacity={0.7}>
                  <View style={styles.recentCardTop}>
                    {getProviderLogo(provider?.code || '', 32, provider?.brand_color)}
                    <View style={styles.recentCardInfo}>
                      <Text style={styles.recentProvider} numberOfLines={1}>{provider?.name_ar}</Text>
                      <Text style={styles.recentPhone}>{txn.phone_number}</Text>
                    </View>
                  </View>
                  <View style={styles.recentCardBottom}>
                    <Text style={styles.recentAmount}>{formatAmount(Number(txn.total_amount || txn.amount))} ريال</Text>
                    <View style={[styles.recentStatus, { backgroundColor: statusColor + '15' }]}>
                      <StatusIcon size={12} color={statusColor} strokeWidth={2} />
                      <Text style={[styles.recentStatusText, { color: statusColor }]}>{txn.status === 'success' ? 'ناجحة' : txn.status === 'failed' ? 'فاشلة' : 'معالجة'}</Text>
                    </View>
                  </View>
                  <Text style={styles.recentDate}>{formatTxnDate(txn.created_at)}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Trust indicators */}
      <View style={styles.trustRow}>
        <View style={styles.trustItem}>
          <View style={[styles.trustIcon, { backgroundColor: Colors.primary[50] }]}>
            <TrendingUp size={16} color={Colors.primary[600]} strokeWidth={2} />
          </View>
          <Text style={styles.trustValue}>فوري</Text>
          <Text style={styles.trustLabel}>سداد</Text>
        </View>
        <View style={styles.trustDivider} />
        <View style={styles.trustItem}>
          <View style={[styles.trustIcon, { backgroundColor: Colors.success[50] }]}>
            <ShieldCheck size={16} color={Colors.success[600]} strokeWidth={2} />
          </View>
          <Text style={styles.trustValue}>آمن</Text>
          <Text style={styles.trustLabel}>محمي</Text>
        </View>
        <View style={styles.trustDivider} />
        <View style={styles.trustItem}>
          <View style={[styles.trustIcon, { backgroundColor: Colors.accent[50] }]}>
            <Clock size={16} color={Colors.accent[500]} strokeWidth={2} />
          </View>
          <Text style={styles.trustValue}>24/7</Text>
          <Text style={styles.trustLabel}>متاح</Text>
        </View>
      </View>

      {/* Supported networks */}
      <View style={styles.networksCard}>
        <Text style={styles.networksTitle}>الشبكات المدعومة</Text>
        <View style={styles.networksList}>
          {mobileProviders.map((p) => (
            <View key={p.id} style={styles.networkChip}>
              {getProviderLogo(p.code, 28, p.brand_color)}
              <View style={{ flex: 1 }}>
                <Text style={styles.networkName}>{p.name_ar}</Text>
                <Text style={styles.networkPrefix}>{p.phone_prefixes?.join(' / ')}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>رصيدي © 2026 - العمري تكنو</Text>
        <Text style={styles.footerPhone}>+967 771 540 727</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F3' },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4F3', gap: Spacing.md },
  loadingText: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: Colors.textSecondary },
  heroSection: { marginTop: Platform.OS === 'web' ? Spacing.sm : Spacing.md, marginBottom: Spacing.lg },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroGreeting: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: Colors.textSecondary },
  heroTitle: { fontFamily: Fonts.cairoBold, fontSize: FontSizes.display, color: Colors.primary[700] },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.secondary[50], paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.pill },
  heroBadgeText: { fontFamily: Fonts.bold, fontSize: FontSizes.xs, color: Colors.secondary[600] },
  rechargeCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md, borderWidth: 1, borderColor: Colors.neutral[100] },
  rechargeCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  rechargeIconContainer: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.primary[50], justifyContent: 'center', alignItems: 'center' },
  rechargeCardTitle: { fontFamily: Fonts.bold, fontSize: FontSizes.md, color: Colors.text },
  rechargeCardSubtitle: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  phoneInputRow: { flexDirection: 'row', gap: Spacing.sm },
  phonePrefix: { backgroundColor: Colors.neutral[50], borderRadius: Radius.md, paddingHorizontal: Spacing.md, justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  phonePrefixText: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, color: Colors.textSecondary },
  phoneInput: { flex: 1, backgroundColor: Colors.neutral[50], borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 16, fontSize: FontSizes.xxl, fontFamily: Fonts.bold, color: Colors.text, borderWidth: 1, borderColor: Colors.border, letterSpacing: 2 },
  detectedBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderRadius: Radius.md, paddingVertical: 12, paddingHorizontal: Spacing.md },
  detectedText: { flex: 1, fontFamily: Fonts.bold, fontSize: FontSizes.sm },
  detectedTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill },
  detectedTagText: { fontFamily: Fonts.bold, fontSize: 10, color: Colors.surface },
  proceedButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.primary[600], borderRadius: Radius.md, paddingVertical: 16 },
  proceedButtonDisabled: { backgroundColor: Colors.neutral[300] },
  proceedButtonText: { fontFamily: Fonts.bold, fontSize: FontSizes.md, color: Colors.surface },
  summaryCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md, borderWidth: 1, borderColor: Colors.neutral[100] },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  summaryIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.primary[600], justifyContent: 'center', alignItems: 'center' },
  summaryTitle: { fontFamily: Fonts.bold, fontSize: FontSizes.md, color: Colors.text },
  summarySubtitle: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  balanceTag: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: Radius.pill },
  balancePositive: { backgroundColor: Colors.success[50] },
  balanceNegative: { backgroundColor: Colors.error[50] },
  balanceTagText: { fontFamily: Fonts.bold, fontSize: FontSizes.xs },
  balanceAmount: { fontFamily: Fonts.cairoBold, fontSize: FontSizes.display },
  summaryStatsRow: { flexDirection: 'row', alignItems: 'center' },
  summaryStat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  summaryStatIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  summaryStatValue: { fontFamily: Fonts.cairoBold, fontSize: FontSizes.sm, color: Colors.text },
  summaryStatLabel: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.textSecondary },
  summaryStatDivider: { width: 1, height: 32, backgroundColor: Colors.neutral[100], marginHorizontal: Spacing.sm },
  debtsStatsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  debtStatCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderRadius: Radius.lg, padding: Spacing.md },
  debtStatIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  debtStatValue: { fontFamily: Fonts.cairoBold, fontSize: FontSizes.md, color: Colors.text },
  debtStatLabel: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.textSecondary, marginTop: 2 },
  debtCountBadge: { minWidth: 24, height: 24, borderRadius: 12, backgroundColor: Colors.warning[600], justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  debtCountText: { fontFamily: Fonts.bold, fontSize: FontSizes.xs, color: Colors.surface },
  sectionTitle: { fontFamily: Fonts.bold, fontSize: FontSizes.md, color: Colors.text, marginTop: Spacing.xl, marginBottom: Spacing.md },
  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  serviceCard: { flex: 1, minWidth: 140, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: Colors.neutral[100] },
  serviceIcon: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  serviceName: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, color: Colors.text },
  serviceDesc: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.textSecondary, textAlign: 'center' },
  quickActionsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm },
  quickActionCard: { flex: 1, alignItems: 'center', gap: Spacing.sm, borderRadius: Radius.lg, paddingVertical: Spacing.md },
  quickActionIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  quickActionText: { fontFamily: Fonts.bold, fontSize: FontSizes.xs, color: Colors.text },
  quickActionSubtext: { fontFamily: Fonts.regular, fontSize: 10, color: Colors.textSecondary, textAlign: 'center' },
  recentSection: { marginTop: Spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitleNoMargin: { fontFamily: Fonts.bold, fontSize: FontSizes.md, color: Colors.text },
  seeAll: { fontFamily: Fonts.medium, fontSize: FontSizes.xs, color: Colors.primary[600] },
  recentScrollContent: { paddingRight: Spacing.lg },
  recentCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, width: 200, marginRight: Spacing.sm, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.neutral[100] },
  recentCardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  recentCardInfo: { flex: 1 },
  recentProvider: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, color: Colors.text },
  recentPhone: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.textSecondary, marginTop: 2 },
  recentCardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recentAmount: { fontFamily: Fonts.cairoBold, fontSize: FontSizes.sm, color: Colors.text },
  recentStatus: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill },
  recentStatusText: { fontFamily: Fonts.medium, fontSize: 10 },
  recentDate: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.textMuted },
  trustRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, marginTop: Spacing.xl, borderWidth: 1, borderColor: Colors.neutral[100] },
  trustItem: { alignItems: 'center', gap: 4 },
  trustIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  trustValue: { fontFamily: Fonts.cairoBold, fontSize: FontSizes.sm, color: Colors.text },
  trustLabel: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.textSecondary },
  trustDivider: { width: 1, height: 40, backgroundColor: Colors.neutral[100] },
  networksCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, marginTop: Spacing.lg, borderWidth: 1, borderColor: Colors.neutral[100] },
  networksTitle: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, color: Colors.text, marginBottom: Spacing.md },
  networksList: { gap: Spacing.sm },
  networkChip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  networkName: { fontFamily: Fonts.medium, fontSize: FontSizes.sm, color: Colors.text },
  networkPrefix: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  footer: { alignItems: 'center', paddingVertical: Spacing.xl, gap: 4 },
  footerText: { fontFamily: Fonts.medium, fontSize: FontSizes.xs, color: Colors.textMuted },
  footerPhone: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.neutral[400] },
});
