import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Share,
  Animated,
  Easing,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronRight, CheckCircle2, XCircle, Clock, Share2, Printer, Wallet, Package, CreditCard, Fuel } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Colors, Fonts, Radius, Spacing, Shadow, FontSizes } from '@/lib/theme';
import { formatAmount } from '@/lib/provider-utils';
import { getProviderLogo } from '@/components/ProviderLogos';
import type { TransactionWithProvider, TransactionType } from '@/types/database';

const typeIcons: Record<TransactionType, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>> = {
  recharge: Wallet,
  balance_inquiry: CreditCard,
  bill_payment: Package,
  fuel_payment: Fuel,
};

export default function ReceiptScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [txn, setTxn] = useState<TransactionWithProvider | null>(null);
  const [loading, setLoading] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const loadTransaction = useCallback(async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select(`*, service_providers!inner(id, code, name_ar, name_en, type, icon_name, brand_color)`)
      .eq('id', id)
      .maybeSingle();
    if (!error && data) setTxn(data as TransactionWithProvider);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadTransaction();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [loadTransaction]);

  const handleShare = async () => {
    if (!txn) return;
    const provider = txn.service_providers;
    const text = `إيصال رصيدي\nرقم: ${txn.receipt_number || txn.id}\nالخدمة: ${provider?.name_ar}\nالمبلغ: ${formatAmount(Number(txn.total_amount || txn.amount))} ريال\nالحالة: ${txn.status === 'success' ? 'ناجحة' : txn.status === 'failed' ? 'فاشلة' : 'قيد المعالجة'}\nالتاريخ: ${new Date(txn.created_at).toLocaleString('ar-EG')}`;
    try { await Share.share({ message: text }); } catch {}
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
        <Text style={styles.loadingText}>جاري تحميل الإيصال...</Text>
      </View>
    );
  }

  if (!txn) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>لم يتم العثور على الإيصال</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>العودة</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const provider = txn.service_providers;
  const providerColor = provider?.brand_color || Colors.primary[500];
  const txnType = (txn.transaction_type || 'recharge') as TransactionType;
  const TypeIcon = typeIcons[txnType] ?? Wallet;

  const statusConfig = {
    pending: { icon: Clock, color: Colors.warning[500], label: 'قيد المعالجة' },
    success: { icon: CheckCircle2, color: Colors.success[500], label: 'تمت بنجاح' },
    failed: { icon: XCircle, color: Colors.error[500], label: 'فشلت' },
  };
  const status = statusConfig[txn.status];
  const StatusIcon = status.icon;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const typeLabels: Record<TransactionType, string> = {
    recharge: 'شحن رصيد',
    balance_inquiry: 'استعلام عن رصيد',
    bill_payment: 'سداد فاتورة',
    fuel_payment: 'سداد وقود',
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronRight size={24} color={Colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>الإيصال</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Receipt card with animation */}
      <Animated.View style={[styles.receipt, Shadow.lg, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {/* Top gradient section */}
        <View style={[styles.receiptTop, { backgroundColor: providerColor }]}>
          <View style={styles.receiptIconRow}>
            <View style={styles.receiptProviderIcon}>
              {getProviderLogo(provider?.code || '', 28, '#FFFFFF')}
            </View>
            <View>
              <Text style={styles.receiptProviderName}>{provider?.name_ar}</Text>
              <Text style={styles.receiptType}>{typeLabels[txnType]}</Text>
            </View>
          </View>
          <View style={styles.statusContainer}>
            <View style={[styles.statusCircle, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
              <StatusIcon size={32} color={Colors.surface} strokeWidth={2} />
            </View>
            <Text style={styles.statusText}>{status.label}</Text>
          </View>
        </View>

        {/* Body */}
        <View style={styles.receiptBody}>
          <View style={styles.receiptHeader}>
            <Text style={styles.receiptTitle}>إيصال رصيدي</Text>
            <Text style={styles.receiptNumber}>
              {txn.receipt_number || `RCP-${txn.id.slice(0, 8).toUpperCase()}`}
            </Text>
          </View>

          <View style={styles.dashedLine} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>نوع العملية</Text>
            <View style={styles.detailTypeRow}>
              <TypeIcon size={14} color={Colors.textSecondary} strokeWidth={2} />
              <Text style={styles.detailValue}>{typeLabels[txnType]}</Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>الخدمة</Text>
            <Text style={styles.detailValue}>{provider?.name_ar}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>رقم الهاتف</Text>
            <Text style={styles.detailValue}>{txn.phone_number}</Text>
          </View>
          {txn.package_code && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>الباقة</Text>
              <Text style={styles.detailValue}>{txn.package_code}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>التاريخ</Text>
            <Text style={styles.detailValue}>{formatDate(txn.created_at)}</Text>
          </View>
          {txn.provider_transaction_id && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>رقم معاملة المزود</Text>
              <Text style={styles.detailValue}>{txn.provider_transaction_id}</Text>
            </View>
          )}
          {txn.loan_amount && Number(txn.loan_amount) > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>مبلغ السلفة</Text>
              <Text style={[styles.detailValue, { color: Colors.warning[600] }]}>
                {formatAmount(Number(txn.loan_amount))} ريال
              </Text>
            </View>
          )}
          {txn.balance_after !== null && txn.status === 'success' && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>الرصيد بعد العملية</Text>
              <Text style={styles.detailValue}>{formatAmount(Number(txn.balance_after))} ريال</Text>
            </View>
          )}
          {txn.error_message && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>ملاحظات</Text>
              <Text style={[styles.detailValue, { color: Colors.error[600] }]}>{txn.error_message}</Text>
            </View>
          )}

          <View style={styles.dashedLine} />

          {/* Amount box */}
          <View style={[styles.amountBox, { backgroundColor: providerColor + '08' }]}>
            <Text style={styles.amountLabel}>المبلغ الإجمالي</Text>
            <Text style={[styles.amountValue, { color: providerColor }]}>
              {formatAmount(Number(txn.total_amount || txn.amount))} ريال يمني
            </Text>
          </View>

          <View style={styles.footerNote}>
            <Text style={styles.footerNoteText}>
              هذا الإيصال إلكتروني صادر عن نظام رصيدي - المعمري تكنو. يمكن استخدامه كإثبات للدفع.
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleShare} activeOpacity={0.7}>
          <Share2 size={20} color={Colors.text} strokeWidth={2} />
          <Text style={styles.actionText}>مشاركة</Text>
        </TouchableOpacity>
        {Platform.OS === 'web' && (
          <TouchableOpacity style={styles.actionButton} onPress={() => window.print()} activeOpacity={0.7}>
            <Printer size={20} color={Colors.text} strokeWidth={2} />
            <Text style={styles.actionText}>طباعة</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.devFooter}>
        <Text style={styles.devFooterText}>رصيدي - المعمري تكنو</Text>
        <Text style={styles.devFooterPhone}>+967 771 540 727</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F3' },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4F3', gap: Spacing.md },
  loadingText: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: Colors.textSecondary },
  backButton: { backgroundColor: Colors.primary[600], paddingHorizontal: Spacing.lg, paddingVertical: 10, borderRadius: Radius.md },
  backButtonText: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, color: Colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg, marginTop: Platform.OS === 'web' ? Spacing.sm : Spacing.md },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  headerTitle: { fontFamily: Fonts.bold, fontSize: FontSizes.lg, color: Colors.text },
  receipt: { backgroundColor: Colors.surface, borderRadius: Radius.xl, overflow: 'hidden' },
  receiptTop: { padding: Spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  receiptIconRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  receiptProviderIcon: { width: 48, height: 48, borderRadius: Radius.md, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  receiptProviderName: { fontFamily: Fonts.cairoBold, fontSize: FontSizes.lg, color: Colors.surface },
  receiptType: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.surface, opacity: 0.85, marginTop: 2 },
  statusContainer: { alignItems: 'center', gap: 4 },
  statusCircle: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  statusText: { fontFamily: Fonts.medium, fontSize: FontSizes.xs, color: Colors.surface },
  receiptBody: { padding: Spacing.lg },
  receiptHeader: { alignItems: 'center', marginBottom: Spacing.md },
  receiptTitle: { fontFamily: Fonts.cairoBold, fontSize: FontSizes.md, color: Colors.text },
  receiptNumber: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, color: Colors.primary[600], marginTop: 4, letterSpacing: 1 },
  dashedLine: { height: 1, backgroundColor: Colors.neutral[200], marginVertical: Spacing.md },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, alignItems: 'center' },
  detailLabel: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: Colors.textSecondary },
  detailValue: { fontFamily: Fonts.medium, fontSize: FontSizes.sm, color: Colors.text, textAlign: 'left' },
  detailTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  amountBox: { borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', gap: 4, marginVertical: Spacing.sm },
  amountLabel: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: Colors.textSecondary },
  amountValue: { fontFamily: Fonts.cairoBold, fontSize: FontSizes.xxl },
  footerNote: { marginTop: Spacing.md, padding: Spacing.md, backgroundColor: Colors.neutral[50], borderRadius: Radius.sm },
  footerNoteText: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.surface, borderRadius: Radius.md, paddingVertical: 14, borderWidth: 1, borderColor: Colors.border },
  actionText: { fontFamily: Fonts.medium, fontSize: FontSizes.sm, color: Colors.text },
  devFooter: { alignItems: 'center', paddingVertical: Spacing.xl, gap: 4 },
  devFooterText: { fontFamily: Fonts.medium, fontSize: FontSizes.xs, color: Colors.textMuted },
  devFooterPhone: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.neutral[400] },
});
