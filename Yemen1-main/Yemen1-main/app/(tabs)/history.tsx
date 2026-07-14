import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Clock, CheckCircle2, XCircle, Inbox, Wallet, Package, CreditCard, Download, Fuel } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Colors, Fonts, Radius, Spacing, Shadow, FontSizes } from '@/lib/theme';
import { getClientToken } from '@/lib/client-token';
import { getProviderLogo } from '@/components/ProviderLogos';
import { formatAmount } from '@/lib/provider-utils';
import type { TransactionWithProvider, TransactionType } from '@/types/database';

export default function HistoryScreen() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<TransactionWithProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = useCallback(async () => {
    const clientToken = await getClientToken();
    const { data, error } = await supabase
      .from('transactions')
      .select(`*, service_providers!inner(id, code, name_ar, name_en, type, icon_name, brand_color)`)
      .eq('client_token', clientToken)
      .order('created_at', { ascending: false })
      .limit(50);
    if (!error && data) setTransactions(data as TransactionWithProvider[]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const statusConfig = {
    pending: { icon: Clock, color: Colors.warning[500], bg: Colors.warning[50], label: 'معالجة' },
    success: { icon: CheckCircle2, color: Colors.success[500], bg: Colors.success[50], label: 'ناجحة' },
    failed: { icon: XCircle, color: Colors.error[500], bg: Colors.error[50], label: 'فاشلة' },
  };

  const typeIcons: Record<TransactionType, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>> = {
    recharge: Wallet,
    balance_inquiry: CreditCard,
    bill_payment: Package,
    fuel_payment: Fuel,
  };

  const handleExport = async () => {
    if (transactions.length === 0) return;
    let text = 'كشف عمليات رصيدي\n\n';
    transactions.forEach((t, i) => {
      const provider = t.service_providers;
      text += `${i + 1}. ${provider?.name_ar || ''} | ${t.phone_number} | ${formatAmount(Number(t.total_amount || t.amount))} ريال | ${t.status === 'success' ? 'ناجحة' : t.status === 'failed' ? 'فاشلة' : 'معالجة'} | ${formatDate(t.created_at)}\n`;
    });
    text += `\nالعمري تكنو - +967 771 540 727`;
    try { await Share.share({ message: text }); } catch {}
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
        <Text style={styles.loadingText}>جاري تحميل السجل...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadHistory} colors={[Colors.primary[500]]} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>سجل المعاملات</Text>
        {transactions.length > 0 && (
          <TouchableOpacity onPress={handleExport} style={styles.exportBtn}>
            <Download size={18} color={Colors.primary[600]} strokeWidth={2} />
            <Text style={styles.exportText}>كشف</Text>
          </TouchableOpacity>
        )}
      </View>

      {transactions.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Inbox size={48} color={Colors.neutral[300]} strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyTitle}>لا توجد معاملات بعد</Text>
          <Text style={styles.emptySubtext}>ستظهر هنا جميع عمليات السداد والشحن والاستعلام</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => router.push('/(tabs)/')}>
            <Text style={styles.emptyButtonText}>ابدأ عملية سداد</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.list}>
          {transactions.map((txn) => {
            const status = statusConfig[txn.status];
            const StatusIcon = status.icon;
            const provider = txn.service_providers;
            const txnType = (txn.transaction_type || 'recharge') as TransactionType;
            const TypeIcon = typeIcons[txnType];
            const typeLabels: Record<TransactionType, string> = { recharge: 'شحن', balance_inquiry: 'استعلام', bill_payment: 'سداد', fuel_payment: 'وقود' };

            return (
              <TouchableOpacity key={txn.id} style={styles.transactionCard} onPress={() => router.push(`/receipt/${txn.id}`)} activeOpacity={0.7}>
                <View style={styles.txnLogoContainer}>
                  {getProviderLogo(provider?.code || '', 36, provider?.brand_color)}
                </View>
                <View style={styles.txnInfo}>
                  <View style={styles.txnTopRow}>
                    <Text style={styles.txnProvider}>{provider?.name_ar || 'خدمة'}</Text>
                    <View style={[styles.txnTypeBadge, { backgroundColor: (provider?.brand_color || Colors.primary[500]) + '12' }]}>
                      <TypeIcon size={12} color={provider?.brand_color || Colors.primary[500]} strokeWidth={2} />
                      <Text style={[styles.txnTypeText, { color: provider?.brand_color || Colors.primary[500] }]}>{typeLabels[txnType]}</Text>
                    </View>
                  </View>
                  <Text style={styles.txnPhone}>{txn.phone_number}</Text>
                  <View style={styles.txnBottomRow}>
                    <Text style={styles.txnDate}>{formatDate(txn.created_at)}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                      <StatusIcon size={12} color={status.color} strokeWidth={2} />
                      <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                    </View>
                  </View>
                </View>
                {txn.status === 'success' && (
                  <View style={styles.txnAmountBox}>
                    <Text style={styles.txnAmount}>{formatAmount(Number(txn.total_amount || txn.amount))}</Text>
                    <Text style={styles.txnCurrency}>ريال</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F3' },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4F3', gap: Spacing.md },
  loadingText: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: Colors.textSecondary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Platform.OS === 'web' ? Spacing.sm : Spacing.md, marginBottom: Spacing.lg },
  headerTitle: { fontFamily: Fonts.cairoBold, fontSize: FontSizes.xxl, color: Colors.text },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary[50], paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.pill },
  exportText: { fontFamily: Fonts.medium, fontSize: FontSizes.xs, color: Colors.primary[600] },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl + Spacing.lg, gap: Spacing.md },
  emptyIcon: { width: 90, height: 90, borderRadius: 45, backgroundColor: Colors.neutral[50], justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontFamily: Fonts.bold, fontSize: FontSizes.lg, color: Colors.text },
  emptySubtext: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: Colors.textSecondary, textAlign: 'center', maxWidth: 250, lineHeight: 22 },
  emptyButton: { backgroundColor: Colors.primary[600], borderRadius: Radius.md, paddingVertical: 12, paddingHorizontal: Spacing.xl, marginTop: Spacing.sm },
  emptyButtonText: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, color: Colors.surface },
  list: { gap: Spacing.sm },
  transactionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.md, borderWidth: 1, borderColor: Colors.neutral[100] },
  txnLogoContainer: { justifyContent: 'center', alignItems: 'center' },
  txnInfo: { flex: 1, gap: 3 },
  txnTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  txnProvider: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, color: Colors.text },
  txnTypeBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill },
  txnTypeText: { fontFamily: Fonts.medium, fontSize: 10 },
  txnPhone: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.textSecondary },
  txnBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  txnDate: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.textMuted },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill },
  statusText: { fontFamily: Fonts.medium, fontSize: 10 },
  txnAmountBox: { alignItems: 'flex-end' },
  txnAmount: { fontFamily: Fonts.cairoBold, fontSize: FontSizes.md, color: Colors.text },
  txnCurrency: { fontFamily: Fonts.regular, fontSize: 10, color: Colors.textMuted },
});
