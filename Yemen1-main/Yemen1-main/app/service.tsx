import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Animated,
  Easing,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ChevronRight, Package, Search, CreditCard, CheckCircle2,
  AlertCircle, RefreshCw, Wallet, Zap, Droplet, Wifi, Smartphone,
  ShieldCheck, TrendingUp, Clock,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Colors, Fonts, Radius, Spacing, Shadow, FontSizes } from '@/lib/theme';
import { PaymentResultModal } from '@/components/PaymentResultModal';
import { getProviderLogo } from '@/components/ProviderLogos';
import { getClientToken } from '@/lib/client-token';
import { formatDataSize, formatAmount } from '@/lib/provider-utils';
import type { ProviderPackage, PackageDuration, TransactionType } from '@/types/database';

type ServiceTab = 'recharge' | 'packages' | 'balance' | 'loan';

export default function ServiceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    providerId: string;
    providerCode: string;
    providerName: string;
    providerType: string;
    providerColor: string;
    providerIcon: string;
    phoneNumber: string;
  }>();

  const providerColor = params.providerColor || Colors.primary[500];
  const isUtility = params.providerType === 'electricity' || params.providerType === 'water';
  const isInternet = params.providerType === 'internet';

  const [packages, setPackages] = useState<ProviderPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ServiceTab>('recharge');
  const [activeDuration, setActiveDuration] = useState<PackageDuration>('daily');
  const [selectedPackage, setSelectedPackage] = useState<ProviderPackage | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(params.phoneNumber || '');
  const [submitting, setSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'processing' | 'success' | 'failed'>('processing');
  const [resultMessage, setResultMessage] = useState<string | undefined>();
  const [receiptNumber, setReceiptNumber] = useState<string | undefined>();
  const [lastTransactionId, setLastTransactionId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [balanceInfo, setBalanceInfo] = useState<{ balance: number; lastUpdate: string } | null>(null);
  const [loanInfo, setLoanInfo] = useState<{ hasLoan: boolean; loanAmount: number } | null>(null);
  const [checkingBalance, setCheckingBalance] = useState(false);
  const [checkingLoan, setCheckingLoan] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const tabContentAnim = useRef(new Animated.Value(0)).current;

  const loadPackages = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('provider_packages')
      .select('*')
      .eq('provider_id', params.providerId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (!err && data) setPackages(data as ProviderPackage[]);
    setLoading(false);
  }, [params.providerId]);

  useEffect(() => {
    loadPackages();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (isUtility || isInternet) setActiveTab('recharge');
  }, [isUtility, isInternet]);

  useEffect(() => {
    Animated.timing(tabContentAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

  const filteredPackages = packages.filter((p) => p.duration_type === activeDuration);
  const availableDurations = (['daily', 'weekly', 'monthly', 'max'] as PackageDuration[]).filter(
    (d) => packages.some((p) => p.duration_type === d)
  );

  const validate = (): string | null => {
    if (!phoneNumber.trim()) return 'يرجى إدخال رقم الهاتف';
    if (phoneNumber.trim().length < 7) return 'رقم الهاتف غير صحيح';
    if (activeTab === 'recharge') {
      const amt = parseFloat(customAmount);
      if (!amt || amt < 100) return 'الحد الأدنى للمبلغ هو 100 ريال';
      if (amt > 50000) return 'الحد الأقصى للمبلغ هو 50,000 ريال';
    }
    if (activeTab === 'packages' && !selectedPackage) return 'يرجى اختيار باقة';
    return null;
  };

  const callEdgeFunction = async (payload: Record<string, unknown>) => {
    const { callEdgeFunctionWithRetry } = await import('@/lib/cache');
    return callEdgeFunctionWithRetry(payload);
  };

  const processTransaction = async (amount: number, packageCode: string | null = null) => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setError(null);
    setSubmitting(true);
    setModalVisible(true);
    setPaymentStatus('processing');

    const clientToken = await getClientToken();
    const totalAmount = amount + (loanInfo?.hasLoan ? (loanInfo.loanAmount || 0) : 0);

    const { data: txnData, error: txnError } = await supabase
      .from('transactions')
      .insert({
        provider_id: params.providerId,
        phone_number: phoneNumber.trim(),
        amount,
        total_amount: totalAmount,
        package_code: packageCode,
        status: 'pending',
        transaction_type: isUtility ? 'bill_payment' : 'recharge',
        client_token: clientToken,
        loan_amount: loanInfo?.hasLoan ? loanInfo.loanAmount : 0,
      })
      .select()
      .single();

    if (txnError || !txnData) {
      setPaymentStatus('failed');
      setResultMessage('تعذر إنشاء معاملة السداد');
      setSubmitting(false);
      return;
    }

    setLastTransactionId(txnData.id);

    try {
      const result = await callEdgeFunction({
        transactionId: txnData.id,
        providerId: params.providerId,
        providerCode: params.providerCode,
        phoneNumber: phoneNumber.trim(),
        amount: totalAmount,
        packageCode,
        transactionType: isUtility ? 'bill_payment' : 'recharge',
        checkLoan: loanInfo?.hasLoan || false,
      });

      if (result.success) {
        setPaymentStatus('success');
        setReceiptNumber(result.receiptNumber);
        setResultMessage(result.message || 'تمت العملية بنجاح');
        if (result.balance !== undefined) setBalanceInfo({ balance: result.balance, lastUpdate: new Date().toLocaleString('ar-EG') });
      } else {
        setPaymentStatus('failed');
        setResultMessage(result.error || 'فشلت العملية');
      }
    } catch (err) {
      setPaymentStatus('failed');
      setResultMessage(err instanceof Error ? `خطأ: ${err.message}` : 'تعذر الاتصال بالخادم');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBalanceInquiry = async () => {
    if (!phoneNumber.trim() || phoneNumber.trim().length < 7) { setError('يرجى إدخال رقم الهاتف أولاً'); return; }
    setError(null);
    setCheckingBalance(true);
    setBalanceInfo(null);
    try {
      const result = await callEdgeFunction({
        providerId: params.providerId,
        providerCode: params.providerCode,
        phoneNumber: phoneNumber.trim(),
        transactionType: 'balance_inquiry',
      });
      if (result.success) setBalanceInfo({ balance: result.balance ?? 0, lastUpdate: result.lastUpdate || new Date().toLocaleString('ar-EG') });
      else setError(result.error || 'تعذر الاستعلام عن الرصيد');
    } catch { setError('تعذر الاتصال بالخادم'); } finally { setCheckingBalance(false); }
  };

  const handleLoanCheck = async () => {
    if (!phoneNumber.trim() || phoneNumber.trim().length < 7) { setError('يرجى إدخال رقم الهاتف أولاً'); return; }
    setError(null);
    setCheckingLoan(true);
    setLoanInfo(null);
    try {
      const result = await callEdgeFunction({
        providerId: params.providerId,
        providerCode: params.providerCode,
        phoneNumber: phoneNumber.trim(),
        transactionType: 'loan_check',
      });
      if (result.success) setLoanInfo({ hasLoan: result.hasLoan ?? false, loanAmount: result.loanAmount ?? 0 });
      else setError(result.error || 'تعذر التحقق من السلفة');
    } catch { setError('تعذر الاتصال بالخادم'); } finally { setCheckingLoan(false); }
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setPaymentStatus('processing');
    setResultMessage(undefined);
    setReceiptNumber(undefined);
  };

  const handleViewReceipt = () => {
    setModalVisible(false);
    if (lastTransactionId) router.push(`/receipt/${lastTransactionId}`);
  };

  const tabs: { key: ServiceTab; label: string; icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }> }[] = isUtility
    ? [{ key: 'recharge', label: 'سداد فاتورة', icon: CreditCard }]
    : isInternet
    ? [{ key: 'recharge', label: 'سداد اشتراك', icon: CreditCard }, { key: 'packages', label: 'الباقات', icon: Package }]
    : [
        { key: 'recharge', label: 'شحن رصيد', icon: Wallet },
        { key: 'packages', label: 'الباقات', icon: Package },
        { key: 'balance', label: 'استعلام', icon: Search },
        { key: 'loan', label: 'السلفة', icon: RefreshCw },
      ];

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} enabled>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronRight size={24} color={Colors.text} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{params.providerName}</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Provider banner with gradient */}
        <Animated.View
          style={[
            styles.providerBanner,
            { backgroundColor: providerColor, opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            Shadow.lg,
          ]}
        >
          <View style={styles.providerLogoContainer}>
            {getProviderLogo(params.providerCode, 44, '#FFFFFF')}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.providerBannerName}>{params.providerName}</Text>
            <Text style={styles.providerBannerType}>
              {isUtility ? 'سداد فواتير' : isInternet ? 'إنترنت أرضي' : 'شحن وباقات'}
            </Text>
          </View>
          {phoneNumber ? (
            <View style={styles.providerPhoneTag}>
              <Text style={styles.providerPhoneText}>{phoneNumber}</Text>
            </View>
          ) : null}
        </Animated.View>

        {/* Phone input */}
        {!phoneNumber && (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>رقم الهاتف / الحساب</Text>
            <View style={styles.phoneRow}>
              <View style={styles.phonePrefix}>
                <Text style={styles.phonePrefixText}>+967</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                placeholder="7XX XXX XXX"
                placeholderTextColor={Colors.textMuted}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="number-pad"
                textAlign="center"
                maxLength={9}
              />
            </View>
          </View>
        )}

        {/* Tabs - Jaib style pill tabs */}
        <View style={styles.tabsRow}>
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, isActive && { backgroundColor: providerColor, borderColor: providerColor }]}
                onPress={() => { setActiveTab(tab.key); tabContentAnim.setValue(0); }}
                activeOpacity={0.7}
              >
                <TabIcon size={16} color={isActive ? Colors.surface : Colors.textSecondary} strokeWidth={2} />
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tab content */}
        <Animated.View style={{ opacity: tabContentAnim }}>
          {/* Recharge */}
          {activeTab === 'recharge' && (
            <View style={styles.tabContent}>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>{isUtility ? 'مبلغ الفاتورة (ريال)' : 'مبلغ الشحن (ريال)'}</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="أدخل المبلغ"
                  placeholderTextColor={Colors.textMuted}
                  value={customAmount}
                  onChangeText={setCustomAmount}
                  keyboardType="number-pad"
                  textAlign="center"
                />
                <View style={styles.quickAmounts}>
                  {(isUtility ? [1000, 2000, 5000, 10000] : [500, 1000, 2000, 5000]).map((amt) => (
                    <TouchableOpacity
                      key={amt}
                      style={[styles.quickAmountBtn, customAmount === String(amt) && { backgroundColor: providerColor, borderColor: providerColor }]}
                      onPress={() => setCustomAmount(String(amt))}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.quickAmountText, customAmount === String(amt) && { color: Colors.surface }]}>
                        {formatAmount(amt)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              {loanInfo?.hasLoan && (
                <View style={styles.loanNotice}>
                  <AlertCircle size={18} color={Colors.warning[500]} strokeWidth={2} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.loanNoticeTitle}>يوجد سلفة على هذا الرقم</Text>
                    <Text style={styles.loanNoticeText}>
                      مبلغ السلفة: {formatAmount(loanInfo.loanAmount)} ريال - سيتم إضافته للمبلغ الإجمالي
                    </Text>
                  </View>
                </View>
              )}
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: providerColor }, submitting && styles.actionButtonDisabled]}
                onPress={() => processTransaction(parseFloat(customAmount))}
                disabled={submitting}
                activeOpacity={0.8}
              >
                <Text style={styles.actionButtonText}>{isUtility ? 'تأكيد السداد' : 'تأكيد الشحن'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Packages */}
          {activeTab === 'packages' && (
            <View style={styles.tabContent}>
              {availableDurations.length > 1 && (
                <View style={styles.durationRow}>
                  {availableDurations.map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[styles.durationBtn, activeDuration === d && { backgroundColor: providerColor, borderColor: providerColor }]}
                      onPress={() => { setActiveDuration(d); setSelectedPackage(null); }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.durationText, activeDuration === d && { color: Colors.surface }]}>
                        {d === 'daily' ? 'يومي' : d === 'weekly' ? 'أسبوعي' : d === 'monthly' ? 'شهري' : 'ماكس'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {loading ? (
                <ActivityIndicator color={providerColor} style={{ padding: Spacing.xl }} />
              ) : filteredPackages.length === 0 ? (
                <Text style={styles.noPackages}>لا توجد باقات في هذه الفئة</Text>
              ) : (
                <View style={styles.packageList}>
                  {filteredPackages.map((pkg) => {
                    const isSelected = selectedPackage?.id === pkg.id;
                    return (
                      <TouchableOpacity
                        key={pkg.id}
                        style={[styles.packageCard, isSelected && { borderColor: providerColor, backgroundColor: providerColor + '08' }]}
                        onPress={() => setSelectedPackage(pkg)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.packageHeader}>
                          <Text style={styles.packageName}>{pkg.name_ar}</Text>
                          {isSelected && <CheckCircle2 size={20} color={providerColor} strokeWidth={2} />}
                        </View>
                        <Text style={styles.packageDesc}>{pkg.description_ar}</Text>
                        {pkg.data_mb ? <Text style={styles.packageData}>{formatDataSize(pkg.data_mb)} 4G</Text> : null}
                        {pkg.minutes ? <Text style={styles.packageMeta}>{pkg.minutes} دقيقة</Text> : null}
                        {pkg.sms ? <Text style={styles.packageMeta}>{pkg.sms} رسالة</Text> : null}
                        {pkg.validity_days ? <Text style={styles.packageValidity}>الصلاحية: {pkg.validity_days} يوم</Text> : null}
                        <Text style={[styles.packageAmount, isSelected && { color: providerColor }]}>
                          {formatAmount(pkg.amount)} ريال
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              {selectedPackage && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: providerColor }, submitting && styles.actionButtonDisabled]}
                  onPress={() => processTransaction(selectedPackage.amount, selectedPackage.name_ar)}
                  disabled={submitting}
                  activeOpacity={0.8}
                >
                  <Text style={styles.actionButtonText}>اشترك في {selectedPackage.name_ar}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Balance */}
          {activeTab === 'balance' && (
            <View style={styles.tabContent}>
              <View style={styles.inquiryCard}>
                <View style={[styles.inquiryIcon, { backgroundColor: providerColor + '18' }]}>
                  <Search size={32} color={providerColor} strokeWidth={2} />
                </View>
                <Text style={styles.inquiryTitle}>استعلام عن الرصيد</Text>
                <Text style={styles.inquirySubtitle}>
                  أدخل رقم الهاتف واضغط للاستعلام عن رصيدك الحالي
                </Text>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: providerColor }, checkingBalance && styles.actionButtonDisabled]}
                  onPress={handleBalanceInquiry}
                  disabled={checkingBalance}
                  activeOpacity={0.8}
                >
                  {checkingBalance ? <ActivityIndicator size="small" color={Colors.surface} /> : <Text style={styles.actionButtonText}>استعلام عن الرصيد</Text>}
                </TouchableOpacity>
                {balanceInfo && (
                  <View style={styles.balanceResult}>
                    <View style={styles.balanceRow}>
                      <Text style={styles.balanceLabel}>الرصيد الحالي</Text>
                      <Text style={[styles.balanceValue, { color: providerColor }]}>{formatAmount(balanceInfo.balance)} ريال</Text>
                    </View>
                    <View style={styles.balanceRow}>
                      <Text style={styles.balanceLabel}>آخر تحديث</Text>
                      <Text style={styles.balanceDate}>{balanceInfo.lastUpdate}</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Loan */}
          {activeTab === 'loan' && (
            <View style={styles.tabContent}>
              <View style={styles.inquiryCard}>
                <View style={[styles.inquiryIcon, { backgroundColor: Colors.warning[50] }]}>
                  <RefreshCw size={32} color={Colors.warning[500]} strokeWidth={2} />
                </View>
                <Text style={styles.inquiryTitle}>فحص السلفة</Text>
                <Text style={styles.inquirySubtitle}>
                  تحقق من وجود سلفة على الرقم. عند وجود سلفة سيتم إضافتها لمبلغ الشحن
                </Text>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: Colors.warning[500] }, checkingLoan && styles.actionButtonDisabled]}
                  onPress={handleLoanCheck}
                  disabled={checkingLoan}
                  activeOpacity={0.8}
                >
                  {checkingLoan ? <ActivityIndicator size="small" color={Colors.surface} /> : <Text style={styles.actionButtonText}>فحص السلفة</Text>}
                </TouchableOpacity>
                {loanInfo && (
                  <View style={styles.balanceResult}>
                    <View style={styles.balanceRow}>
                      <Text style={styles.balanceLabel}>حالة السلفة</Text>
                      <View style={[styles.loanBadge, loanInfo.hasLoan ? { backgroundColor: Colors.warning[50] } : { backgroundColor: Colors.success[50] }]}>
                        <Text style={[styles.loanBadgeText, loanInfo.hasLoan ? { color: Colors.warning[600] } : { color: Colors.success[600] }]}>
                          {loanInfo.hasLoan ? 'يوجد سلفة' : 'لا توجد سلفة'}
                        </Text>
                      </View>
                    </View>
                    {loanInfo.hasLoan && (
                      <View style={styles.balanceRow}>
                        <Text style={styles.balanceLabel}>مبلغ السلفة</Text>
                        <Text style={[styles.balanceValue, { color: Colors.warning[600] }]}>{formatAmount(loanInfo.loanAmount)} ريال</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          )}
        </Animated.View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      <PaymentResultModal
        visible={modalVisible}
        status={paymentStatus}
        message={resultMessage}
        receiptNumber={receiptNumber}
        onClose={handleCloseModal}
        onViewReceipt={paymentStatus === 'success' ? handleViewReceipt : undefined}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F3' },
  scrollView: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Platform.OS === 'web' ? Spacing.sm : Spacing.md,
    marginBottom: Spacing.sm,
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
  providerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  providerLogoContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerBannerName: { fontFamily: Fonts.cairoBold, fontSize: FontSizes.lg, color: Colors.surface },
  providerBannerType: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.surface, opacity: 0.85, marginTop: 2 },
  providerPhoneTag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  providerPhoneText: { fontFamily: Fonts.bold, fontSize: FontSizes.xs, color: Colors.surface },
  fieldGroup: { gap: Spacing.sm },
  label: { fontFamily: Fonts.medium, fontSize: FontSizes.sm, color: Colors.text, paddingHorizontal: Spacing.xs },
  phoneRow: { flexDirection: 'row', gap: Spacing.sm },
  phonePrefix: {
    backgroundColor: Colors.neutral[50],
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  phonePrefixText: { fontFamily: Fonts.bold, fontSize: FontSizes.md, color: Colors.textSecondary },
  phoneInput: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    textAlign: 'center',
  },
  amountInput: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 16,
    fontSize: FontSizes.xxl,
    fontFamily: Fonts.bold,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    textAlign: 'center',
  },
  quickAmounts: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.xs },
  quickAmountBtn: {
    flex: 1,
    minWidth: 70,
    paddingVertical: 10,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  quickAmountText: { fontFamily: Fonts.medium, fontSize: FontSizes.sm, color: Colors.text },
  tabsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabText: { fontFamily: Fonts.medium, fontSize: FontSizes.xs, color: Colors.textSecondary },
  tabTextActive: { color: Colors.surface },
  tabContent: { gap: Spacing.md },
  durationRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  durationBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  durationText: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, color: Colors.text },
  packageList: { gap: Spacing.sm },
  packageCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  packageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  packageName: { fontFamily: Fonts.bold, fontSize: FontSizes.md, color: Colors.text },
  packageDesc: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: Colors.textSecondary, marginTop: 4 },
  packageData: { fontFamily: Fonts.medium, fontSize: FontSizes.xs, color: Colors.primary[600], marginTop: 4 },
  packageMeta: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.textSecondary, marginTop: 2 },
  packageValidity: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 4 },
  packageAmount: { fontFamily: Fonts.cairoBold, fontSize: FontSizes.xl, color: Colors.text, marginTop: 8 },
  noPackages: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: Colors.textMuted, padding: Spacing.md, textAlign: 'center' },
  actionButton: {
    borderRadius: Radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  actionButtonDisabled: { opacity: 0.6 },
  actionButtonText: { fontFamily: Fonts.bold, fontSize: FontSizes.md, color: Colors.surface },
  inquiryCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.neutral[100],
  },
  inquiryIcon: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  inquiryTitle: { fontFamily: Fonts.bold, fontSize: FontSizes.lg, color: Colors.text },
  inquirySubtitle: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  balanceResult: {
    backgroundColor: Colors.neutral[50],
    borderRadius: Radius.lg,
    padding: Spacing.md,
    width: '100%',
    gap: Spacing.sm,
  },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceLabel: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: Colors.textSecondary },
  balanceValue: { fontFamily: Fonts.cairoBold, fontSize: FontSizes.lg },
  balanceDate: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.textMuted },
  loanBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: Radius.pill },
  loanBadgeText: { fontFamily: Fonts.bold, fontSize: FontSizes.xs },
  loanNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.warning[50],
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  loanNoticeTitle: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, color: Colors.warning[700] },
  loanNoticeText: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.warning[600], marginTop: 2 },
  errorBox: {
    backgroundColor: Colors.error[50],
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.error[100],
  },
  errorText: { fontFamily: Fonts.medium, fontSize: FontSizes.sm, color: Colors.error[600], textAlign: 'center' },
});
