import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  LayoutDashboard, LogOut, TrendingUp, CheckCircle2, XCircle, Clock,
  DollarSign, Key, Server, Fuel, Users, ChevronRight, Settings2,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Colors, Fonts, Radius, Spacing, Shadow, FontSizes } from '@/lib/theme';
import { getAdminSession, adminLogout, logAdminActivity } from '@/lib/admin-auth';
import { fetchFuelStationsWithCache, clearCache } from '@/lib/cache';
import type { Transaction, ServiceProvider, AdminUser, FuelStation } from '@/types/database';

export default function AdminDashboardScreen() {
  const router = useRouter();
  const [stats, setStats] = useState({ total: 0, success: 0, failed: 0, pending: 0, totalAmount: 0 });
  const [recentTxns, setRecentTxns] = useState<(Transaction & { service_providers?: ServiceProvider })[]>([]);
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [fuelStations, setFuelStations] = useState<FuelStation[]>([]);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const checkAuth = useCallback(async () => {
    const session = await getAdminSession();
    if (!session) {
      router.replace('/admin');
      return false;
    }
    setAdminUser(session.user);
    return true;
  }, [router]);

  const loadData = useCallback(async () => {
    const [{ data: txnData }, { data: providerData }, fuelData] = await Promise.all([
      supabase.from('transactions').select(`*, service_providers!inner(id, code, name_ar, name_en, type, icon_name, brand_color)`).order('created_at', { ascending: false }).limit(10),
      supabase.from('service_providers').select('*').order('sort_order', { ascending: true }),
      fetchFuelStationsWithCache(),
    ]);

    if (txnData) {
      const txns = txnData as (Transaction & { service_providers?: ServiceProvider })[];
      setRecentTxns(txns);
      setStats({
        total: txns.length,
        success: txns.filter((t) => t.status === 'success').length,
        failed: txns.filter((t) => t.status === 'failed').length,
        pending: txns.filter((t) => t.status === 'pending').length,
        totalAmount: txns.filter((t) => t.status === 'success').reduce((s, t) => s + Number(t.amount), 0),
      });
    }
    if (providerData) setProviders(providerData as ServiceProvider[]);
    setFuelStations(fuelData);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    (async () => {
      const authed = await checkAuth();
      if (authed) loadData();
    })();
  }, [checkAuth, loadData]);

  const handleLogout = async () => {
    if (adminUser) await logAdminActivity(adminUser.id, adminUser.username, 'logout');
    await adminLogout();
    clearCache();
    router.replace('/admin');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
        <Text style={styles.loadingText}>جاري تحميل لوحة التحكم...</Text>
      </View>
    );
  }

  const statCards = [
    { label: 'إجمالي المعاملات', value: stats.total.toString(), icon: TrendingUp, color: Colors.accent[500], bg: Colors.accent[50] },
    { label: 'عمليات ناجحة', value: stats.success.toString(), icon: CheckCircle2, color: Colors.success[500], bg: Colors.success[50] },
    { label: 'عمليات فاشلة', value: stats.failed.toString(), icon: XCircle, color: Colors.error[500], bg: Colors.error[50] },
    { label: 'قيد المعالجة', value: stats.pending.toString(), icon: Clock, color: Colors.warning[500], bg: Colors.warning[50] },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} colors={[Colors.primary[500]]} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerAvatar}>
            <LayoutDashboard size={22} color={Colors.surface} strokeWidth={2} />
          </View>
          <View>
            <Text style={styles.headerTitle}>لوحة التحكم</Text>
            <Text style={styles.headerUser}>{adminUser?.display_name || adminUser?.username || 'المدير'}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <LogOut size={18} color={Colors.error[500]} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Total amount banner */}
      <View style={[styles.amountBanner, Shadow.md]}>
        <View style={styles.amountIcon}>
          <DollarSign size={24} color={Colors.surface} strokeWidth={2} />
        </View>
        <View>
          <Text style={styles.amountLabel}>إجمالي المبالغ المسددة</Text>
          <Text style={styles.amountValue}>{stats.totalAmount.toLocaleString()} ريال</Text>
        </View>
      </View>

      {/* Stat cards */}
      <View style={styles.statsGrid}>
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <View key={i} style={[styles.statCard, Shadow.sm]}>
              <View style={[styles.statIcon, { backgroundColor: stat.bg }]}>
                <Icon size={20} color={stat.color} strokeWidth={2} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          );
        })}
      </View>

      {/* Quick actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>إدارة النظام</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.actionCard, Shadow.sm]} onPress={() => router.push('/admin/api-settings')} activeOpacity={0.7}>
            <View style={[styles.actionIcon, { backgroundColor: Colors.primary[50] }]}>
              <Key size={22} color={Colors.primary[600]} strokeWidth={2} />
            </View>
            <Text style={styles.actionTitle}>مفاتيح الربط</Text>
            <Text style={styles.actionSubtitle}>إعدادات API</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionCard, Shadow.sm]} onPress={() => router.push('/admin/providers')} activeOpacity={0.7}>
            <View style={[styles.actionIcon, { backgroundColor: Colors.accent[50] }]}>
              <Server size={22} color={Colors.accent[500]} strokeWidth={2} />
            </View>
            <Text style={styles.actionTitle}>المزودون</Text>
            <Text style={styles.actionSubtitle}>{providers.length} خدمة</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionCard, Shadow.sm]} onPress={() => router.push('/admin/transactions')} activeOpacity={0.7}>
            <View style={[styles.actionIcon, { backgroundColor: Colors.secondary[50] }]}>
              <TrendingUp size={22} color={Colors.secondary[500]} strokeWidth={2} />
            </View>
            <Text style={styles.actionTitle}>المعاملات</Text>
            <Text style={styles.actionSubtitle}>عرض الكل</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionCard, Shadow.sm]} onPress={() => router.push('/admin/fuel-stations')} activeOpacity={0.7}>
            <View style={[styles.actionIcon, { backgroundColor: '#FFEBEE' }]}>
              <Fuel size={22} color="#D32128" strokeWidth={2} />
            </View>
            <Text style={styles.actionTitle}>محطات الوقود</Text>
            <Text style={styles.actionSubtitle}>{fuelStations.length} محطة</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionCard, Shadow.sm]} onPress={() => router.push('/admin/accounts')} activeOpacity={0.7}>
            <View style={[styles.actionIcon, { backgroundColor: Colors.success[50] }]}>
              <Users size={22} color={Colors.success[600]} strokeWidth={2} />
            </View>
            <Text style={styles.actionTitle}>حسابات المسؤولين</Text>
            <Text style={styles.actionSubtitle}>إدارة الحسابات</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent transactions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitleNoMargin}>أحدث المعاملات</Text>
          <TouchableOpacity onPress={() => router.push('/admin/transactions')}>
            <Text style={styles.seeAll}>عرض الكل</Text>
          </TouchableOpacity>
        </View>

        {recentTxns.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>لا توجد معاملات بعد</Text>
          </View>
        ) : (
          <View style={styles.txnList}>
            {recentTxns.map((txn) => {
              const provider = txn.service_providers;
              const statusColor = txn.status === 'success' ? Colors.success[500] : txn.status === 'failed' ? Colors.error[500] : Colors.warning[500];
              return (
                <View key={txn.id} style={styles.txnRow}>
                  <View style={[styles.txnDot, { backgroundColor: (provider?.brand_color || Colors.primary[500]) + '30' }]}>
                    <Text style={[styles.txnDotText, { color: provider?.brand_color || Colors.primary[500] }]}>
                      {provider?.name_ar?.charAt(0) || '?'}
                    </Text>
                  </View>
                  <View style={styles.txnInfo}>
                    <Text style={styles.txnProvider}>{provider?.name_ar || 'خدمة'}</Text>
                    <Text style={styles.txnPhone}>{txn.phone_number}</Text>
                  </View>
                  <View style={styles.txnRight}>
                    <Text style={styles.txnAmount}>{Number(txn.amount).toLocaleString()} ريال</Text>
                    <View style={[styles.txnStatus, { backgroundColor: statusColor + '15' }]}>
                      <Text style={[styles.txnStatusText, { color: statusColor }]}>
                        {txn.status === 'success' ? 'ناجحة' : txn.status === 'failed' ? 'فاشلة' : 'معالجة'}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl, maxWidth: 900, width: '100%', alignSelf: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, gap: Spacing.md },
  loadingText: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: Colors.textSecondary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg, marginTop: Platform.OS === 'web' ? Spacing.sm : Spacing.md },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  headerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.neutral[800], justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontFamily: Fonts.cairoBold, fontSize: FontSizes.xl, color: Colors.text },
  headerUser: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.textSecondary, marginTop: 2 },
  logoutBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.error[50], justifyContent: 'center', alignItems: 'center' },
  amountBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.neutral[800], borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.lg },
  amountIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  amountLabel: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.neutral[400] },
  amountValue: { fontFamily: Fonts.cairoBold, fontSize: FontSizes.xxl, color: Colors.surface, marginTop: 2 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.xl },
  statCard: { flex: 1, minWidth: 130, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: Colors.neutral[100] },
  statIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontFamily: Fonts.cairoBold, fontSize: FontSizes.xl, color: Colors.text },
  statLabel: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.textSecondary, textAlign: 'center' },
  section: { marginBottom: Spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontFamily: Fonts.bold, fontSize: FontSizes.md, color: Colors.text, marginBottom: Spacing.md },
  sectionTitleNoMargin: { fontFamily: Fonts.bold, fontSize: FontSizes.md, color: Colors.text },
  seeAll: { fontFamily: Fonts.medium, fontSize: FontSizes.xs, color: Colors.primary[600] },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  actionCard: { flex: 1, minWidth: 120, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: Colors.neutral[100] },
  actionIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  actionTitle: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, color: Colors.text },
  actionSubtitle: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.textSecondary },
  emptyBox: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: Colors.neutral[100] },
  emptyText: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: Colors.textMuted },
  txnList: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.neutral[100] },
  txnRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.neutral[50] },
  txnDot: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  txnDotText: { fontFamily: Fonts.bold, fontSize: FontSizes.sm },
  txnInfo: { flex: 1 },
  txnProvider: { fontFamily: Fonts.medium, fontSize: FontSizes.sm, color: Colors.text },
  txnPhone: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.textSecondary, marginTop: 2 },
  txnRight: { alignItems: 'flex-end', gap: 4 },
  txnAmount: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, color: Colors.text },
  txnStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill },
  txnStatusText: { fontFamily: Fonts.medium, fontSize: 10 },
});
