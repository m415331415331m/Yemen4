import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform, Animated, Easing, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Fuel, FileText, Clock, ShieldCheck, Search } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Colors, Fonts, Radius, Spacing, Shadow, FontSizes } from '@/lib/theme';
import { getClientToken } from '@/lib/client-token';
import { formatAmount } from '@/lib/provider-utils';
import { PaymentResultModal } from '@/components/PaymentResultModal';
import type { FuelStation } from '@/types/database';

export default function FuelScreen() {
  const router = useRouter();
  const [stations, setStations] = useState<FuelStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStation, setSelectedStation] = useState<FuelStation | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'processing' | 'success' | 'failed'>('processing');
  const [resultMessage, setResultMessage] = useState<string | undefined>();
  const [receiptNumber, setReceiptNumber] = useState<string | undefined>();
  const [lastTransactionId, setLastTransactionId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const loadStations = useCallback(async () => {
    const { fetchFuelStationsWithCache } = await import('@/lib/cache');
    const data = await fetchFuelStationsWithCache();
    setStations(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadStations();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  const callEdgeFunction = async (payload: Record<string, unknown>) => {
    const { callEdgeFunctionWithRetry } = await import('@/lib/cache');
    return callEdgeFunctionWithRetry(payload);
  };

  const handlePay = async () => {
    if (!selectedStation) { setError('يرجى اختيار محطة وقود'); return; }
    if (!accountNumber.trim()) { setError('يرجى إدخال رقم الحساب'); return; }
    const amt = parseFloat(amount);
    if (!amt || amt < 100) { setError('الحد الأدنى للمبلغ هو 100 ريال'); return; }
    setError(null);
    setSubmitting(true);
    setModalVisible(true);
    setPaymentStatus('processing');

    const clientToken = await getClientToken();

    const { data: fuelProvider } = await supabase
      .from('service_providers')
      .select('id')
      .eq('code', 'fuel_payment')
      .maybeSingle();

    const providerId = fuelProvider?.id || '';

    const { data: txnData, error: txnError } = await supabase
      .from('transactions')
      .insert({
        provider_id: providerId,
        phone_number: accountNumber.trim(),
        amount: amt,
        total_amount: amt,
        status: 'pending',
        transaction_type: 'bill_payment',
        client_token: clientToken,
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
        providerId,
        providerCode: selectedStation.code,
        phoneNumber: accountNumber.trim(),
        amount: amt,
        transactionType: 'bill_payment',
      });

      if (result.success) {
        setPaymentStatus('success');
        setReceiptNumber(result.receiptNumber);
        setResultMessage(result.message || 'تمت العملية بنجاح');
      } else {
        setPaymentStatus('failed');
        setResultMessage(result.error || 'فشلت العملية');
      }
    } catch (err) {
      setPaymentStatus('failed');
      setResultMessage(err instanceof Error ? err.message : 'تعذر الاتصال بالخادم');
    } finally {
      setSubmitting(false);
    }
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.secondary[500]} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronRight size={24} color={Colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>محطات الوقود</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Banner */}
      <Animated.View style={[styles.banner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }, Shadow.md]}>
        <View style={styles.bannerIcon}>
          <Fuel size={32} color={Colors.surface} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>سداد حسابات المحطات</Text>
          <Text style={styles.bannerSubtitle}>اختر المحطة وأدخل رقم حسابك للسداد</Text>
          <View style={styles.bannerMeta}>
            <View style={styles.bannerMetaItem}>
              <Clock size={12} color={Colors.surface} strokeWidth={2} />
              <Text style={styles.bannerMetaText}>سداد فوري</Text>
            </View>
            <View style={styles.bannerMetaItem}>
              <ShieldCheck size={12} color={Colors.surface} strokeWidth={2} />
              <Text style={styles.bannerMetaText}>آمن</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Info card */}
      <View style={styles.infoCard}>
        <FileText size={18} color={Colors.secondary[600]} strokeWidth={2} />
        <Text style={styles.infoText}>
          أدخل رقم حسابك لدى المحطة وحدد المبلغ الذي تريد سداده
        </Text>
      </View>

      {/* Stations grid */}
      <Text style={styles.sectionLabel}>اختر المحطة</Text>
      <View style={styles.stationsGrid}>
        {stations.map((station) => {
          const isSelected = selectedStation?.id === station.id;
          return (
            <TouchableOpacity
              key={station.id}
              style={[
                styles.stationCard,
                isSelected && { borderColor: station.brand_color, backgroundColor: station.brand_color + '08' },
              ]}
              onPress={() => setSelectedStation(station)}
              activeOpacity={0.7}
            >
              <View style={[styles.stationLogo, { backgroundColor: station.brand_color + '15' }]}>
                <Fuel size={24} color={station.brand_color} strokeWidth={2} />
              </View>
              <Text style={styles.stationName} numberOfLines={1}>{station.name_ar}</Text>
              {isSelected && (
                <View style={[styles.selectedDot, { backgroundColor: station.brand_color }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Payment form */}
      {selectedStation && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>سداد لـ {selectedStation.name_ar}</Text>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>رقم الحساب</Text>
            <TextInput
              style={styles.input}
              placeholder="أدخل رقم حسابك"
              placeholderTextColor={Colors.textMuted}
              value={accountNumber}
              onChangeText={setAccountNumber}
              keyboardType="number-pad"
              textAlign="center"
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>المبلغ (ريال)</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="أدخل المبلغ"
              placeholderTextColor={Colors.textMuted}
              value={amount}
              onChangeText={setAmount}
              keyboardType="number-pad"
              textAlign="center"
            />
            <View style={styles.quickAmounts}>
              {[1000, 2000, 5000, 10000].map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={[styles.quickAmountBtn, amount === String(amt) && { backgroundColor: selectedStation.brand_color, borderColor: selectedStation.brand_color }]}
                  onPress={() => setAmount(String(amt))}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.quickAmountText, amount === String(amt) && { color: Colors.surface }]}>
                    {formatAmount(amt)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.payButton, { backgroundColor: selectedStation.brand_color }, submitting && styles.payButtonDisabled]}
            onPress={handlePay}
            disabled={submitting}
            activeOpacity={0.8}
          >
            <Text style={styles.payButtonText}>تأكيد السداد</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.trustFooter}>
        <ShieldCheck size={16} color={Colors.textMuted} strokeWidth={2} />
        <Text style={styles.trustText}>جميع المعاملات مشفرة وآمنة - رصيدي © 2026</Text>
      </View>

      <PaymentResultModal
        visible={modalVisible}
        status={paymentStatus}
        message={resultMessage}
        receiptNumber={receiptNumber}
        onClose={handleCloseModal}
        onViewReceipt={paymentStatus === 'success' ? handleViewReceipt : undefined}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F3' },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl, maxWidth: 700, width: '100%', alignSelf: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4F3' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: Platform.OS === 'web' ? Spacing.sm : Spacing.md, marginBottom: Spacing.lg,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surface,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  headerTitle: { fontFamily: Fonts.bold, fontSize: FontSizes.lg, color: Colors.text },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: '#D32128', borderRadius: Radius.xl, padding: Spacing.xl, marginBottom: Spacing.lg,
  },
  bannerIcon: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  bannerTitle: { fontFamily: Fonts.cairoBold, fontSize: FontSizes.xl, color: Colors.surface },
  bannerSubtitle: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: Colors.surface, opacity: 0.85, marginTop: 4 },
  bannerMeta: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  bannerMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bannerMetaText: { fontFamily: Fonts.medium, fontSize: 10, color: Colors.surface, opacity: 0.9 },
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md,
    marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.neutral[100],
  },
  infoText: { flex: 1, fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.textSecondary, lineHeight: 20 },
  sectionLabel: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, color: Colors.text, marginBottom: Spacing.md },
  stationsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  stationCard: {
    flex: 1, minWidth: 100, backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  stationLogo: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  stationName: { fontFamily: Fonts.bold, fontSize: FontSizes.xs, color: Colors.text, textAlign: 'center' },
  selectedDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  formCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.xl,
    marginTop: Spacing.lg, gap: Spacing.md, borderWidth: 1, borderColor: Colors.neutral[100],
  },
  formTitle: { fontFamily: Fonts.bold, fontSize: FontSizes.md, color: Colors.text },
  fieldGroup: { gap: Spacing.sm },
  label: { fontFamily: Fonts.medium, fontSize: FontSizes.sm, color: Colors.text, paddingHorizontal: Spacing.xs },
  input: {
    backgroundColor: Colors.neutral[50], borderRadius: Radius.md, paddingHorizontal: Spacing.md,
    paddingVertical: 14, fontSize: FontSizes.lg, fontFamily: Fonts.bold, color: Colors.text,
    borderWidth: 1, borderColor: Colors.border, textAlign: 'center',
  },
  amountInput: {
    backgroundColor: Colors.neutral[50], borderRadius: Radius.md, paddingHorizontal: Spacing.md,
    paddingVertical: 16, fontSize: FontSizes.xxl, fontFamily: Fonts.bold, color: Colors.text,
    borderWidth: 1, borderColor: Colors.border, textAlign: 'center',
  },
  quickAmounts: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.xs },
  quickAmountBtn: {
    flex: 1, minWidth: 70, paddingVertical: 10, borderRadius: Radius.sm,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  quickAmountText: { fontFamily: Fonts.medium, fontSize: FontSizes.sm, color: Colors.text },
  errorBox: {
    backgroundColor: Colors.error[50], borderRadius: Radius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.error[100],
  },
  errorText: { fontFamily: Fonts.medium, fontSize: FontSizes.sm, color: Colors.error[600], textAlign: 'center' },
  payButton: {
    borderRadius: Radius.md, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.sm,
  },
  payButtonDisabled: { opacity: 0.6 },
  payButtonText: { fontFamily: Fonts.bold, fontSize: FontSizes.md, color: Colors.surface },
  trustFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, paddingVertical: Spacing.xl,
  },
  trustText: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.textMuted },
});
