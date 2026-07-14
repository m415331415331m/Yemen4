import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Search, Filter, TrendingUp, CheckCircle2, XCircle, Clock, Download } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Colors, Fonts, Radius, Spacing, Shadow, FontSizes } from '@/lib/theme';
import type { Transaction, ServiceProvider } from '@/types/database';

type TransactionWithProvider = Transaction & { service_providers?: ServiceProvider };
type StatusFilter = 'all' | 'success' | 'failed' | 'pending';

export default function AdminTransactionsScreen() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<TransactionWithProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const loadTransactions = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.replace('/admin');
      return;
    }

    let query = supabase
      .from('transactions')
      .select(`*, service_providers!inner(id, code, name_ar, name_en, type, icon_name, brand_color)`)
      .order('created_at', { ascending: false })
      .limit(100);

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;

    if (!error && data) {
      let txns = data as TransactionWithProvider[];
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        txns = txns.filter(
          (t) =>
            t.phone_number.includes(q) ||
            t.receipt_number?.toLowerCase().includes(q) ||
            t.service_providers?.name_ar.toLowerCase().includes(q)
        );
      }
      setTransactions(txns);
    }
    setLoading(false);
  }, [router, statusFilter, search]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('ar-EG', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filterTabs: { key: StatusFilter; label: string; icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }> }[] = [
    { key: 'all', label: 'الكل', icon: TrendingUp },
    { key: 'success', label: 'ناجحة', icon: CheckCircle2 },
    { key: 'failed', label: 'فاشلة', icon: XCircle },
    { key: 'pending', label: 'معالجة', icon: Clock },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronRight size={24} color={Colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>جميع المعاملات</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchInput}>
          <Search size={18} color={Colors.textMuted} strokeWidth={2} />
          <TextInput
            style={styles.searchField}
            placeholder="ابحث برقم الهاتف، الإيصال، أو المزود..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
            textAlign="right"
          />
        </View>
      </View>

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterTabsRow}>
        {filterTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = statusFilter === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.filterTab, isActive && styles.filterTabActive]}
              onPress={() => setStatusFilter(tab.key)}
            >
              <Icon
                size={16}
                color={isActive ? Colors.surface : Colors.textSecondary}
                strokeWidth={2}
              />
              <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Transactions */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>لا توجد معاملات مطابقة</Text>
        </View>
      ) : (
        <View style={styles.txnList}>
          {transactions.map((txn) => {
            const provider = txn.service_providers;
            const statusColor =
              txn.status === 'success' ? Colors.success[500] :
              txn.status === 'failed' ? Colors.error[500] :
              Colors.warning[500];
            const StatusIcon = txn.status === 'success' ? CheckCircle2 : txn.status === 'failed' ? XCircle : Clock;

            return (
              <TouchableOpacity
                key={txn.id}
                style={styles.txnCard}
                onPress={() => router.push(`/receipt/${txn.id}`)}
                activeOpacity={0.7}
              >
                <View style={[styles.txnIcon, { backgroundColor: (provider?.brand_color || Colors.primary[500]) + '18' }]}>
                  <Text style={[styles.txnIconText, { color: provider?.brand_color || Colors.primary[500] }]}>
                    {provider?.name_ar?.charAt(0) || '?'}
                  </Text>
                </View>
                <View style={styles.txnInfo}>
                  <View style={styles.txnTopRow}>
                    <Text style={styles.txnProvider}>{provider?.name_ar || 'خدمة'}</Text>
                    <Text style={styles.txnAmount}>{Number(txn.amount).toLocaleString()} ريال</Text>
                  </View>
                  <View style={styles.txnBottomRow}>
                    <Text style={styles.txnPhone}>{txn.phone_number}</Text>
                    <View style={[styles.txnStatus, { backgroundColor: statusColor + '15' }]}>
                      <StatusIcon size={12} color={statusColor} strokeWidth={2} />
                      <Text style={[styles.txnStatusText, { color: statusColor }]}>
                        {txn.status === 'success' ? 'ناجحة' : txn.status === 'failed' ? 'فاشلة' : 'معالجة'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.txnDate}>{formatDate(txn.created_at)}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
  },
  loadingBox: {
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
    marginTop: Platform.OS === 'web' ? Spacing.sm : Spacing.md,
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
  headerTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    color: Colors.text,
  },
  searchRow: {
    marginBottom: Spacing.md,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  searchField: {
    flex: 1,
    paddingVertical: 14,
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: Colors.text,
  },
  filterTabsRow: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
  },
  filterTabActive: {
    backgroundColor: Colors.primary[600],
    borderColor: Colors.primary[600],
  },
  filterTabText: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  filterTabTextActive: {
    color: Colors.surface,
  },
  emptyBox: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.neutral[100],
  },
  emptyText: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  txnList: {
    gap: Spacing.sm,
  },
  txnCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.neutral[100],
  },
  txnIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txnIconText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.md,
  },
  txnInfo: {
    flex: 1,
    gap: 4,
  },
  txnTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  txnProvider: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  txnAmount: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  txnBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txnPhone: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  txnStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  txnStatusText: {
    fontFamily: Fonts.medium,
    fontSize: 10,
  },
  txnDate: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
});
