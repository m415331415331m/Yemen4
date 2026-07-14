import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform, Modal, TextInput, Animated, Easing, Alert,
} from 'react-native';
import {
  Plus, TrendingUp, TrendingDown, Trash2, X, Wallet,
  ShoppingBag, Car, Fuel, FileText, Heart, CreditCard,
  HandCoins, UtensilsCrossed, Calendar, PiggyBank, ChevronLeft,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Colors, Fonts, Radius, Spacing, Shadow, FontSizes } from '@/lib/theme';
import { getClientToken } from '@/lib/client-token';
import { formatAmount } from '@/lib/provider-utils';
import type { Expense, ExpenseCategory, Income, IncomeType } from '@/types/database';

type Tab = 'expenses' | 'income';
type Period = 'today' | 'week' | 'month';

const expenseCategoryConfig: Record<ExpenseCategory, { label: string; icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>; color: string }> = {
  food: { label: 'طعام', icon: UtensilsCrossed, color: '#E8A317' },
  transport: { label: 'نقل', icon: Car, color: '#1565C0' },
  fuel: { label: 'وقود', icon: Fuel, color: '#D32128' },
  bills: { label: 'فواتير', icon: FileText, color: '#0D9488' },
  health: { label: 'صحة', icon: Heart, color: '#E63946' },
  shopping: { label: 'تسوق', icon: ShoppingBag, color: '#7C3AED' },
  debt_payment: { label: 'سداد دين', icon: HandCoins, color: '#D1750A' },
  other: { label: 'أخرى', icon: Wallet, color: '#6E7680' },
};

const incomeTypeConfig: Record<IncomeType, { label: string; icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>; color: string }> = {
  monthly_salary: { label: 'راتب شهري', icon: PiggyBank, color: Colors.success[500] },
  daily: { label: 'دخل يومي', icon: Wallet, color: Colors.primary[500] },
  freelance: { label: 'عمل حر', icon: CreditCard, color: Colors.accent[500] },
  business: { label: 'تجارة', icon: TrendingUp, color: Colors.secondary[500] },
  other: { label: 'أخرى', icon: Plus, color: Colors.neutral[500] },
};

export default function ExpensesScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('expenses');
  const [period, setPeriod] = useState<Period>('today');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('food');
  const [formIncomeType, setFormIncomeType] = useState<IncomeType>('monthly_salary');
  const [formSource, setFormSource] = useState('');
  const [formDescription, setFormDescription] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const loadData = useCallback(async () => {
    const clientToken = await getClientToken();
    const now = new Date();
    let startDate: string;

    if (period === 'today') {
      startDate = now.toISOString().slice(0, 10);
    } else if (period === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      startDate = weekAgo.toISOString().slice(0, 10);
    } else {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate = monthStart.toISOString().slice(0, 10);
    }

    const [
      { data: expData },
      { data: incData },
    ] = await Promise.all([
      supabase
        .from('expenses')
        .select('*')
        .eq('client_token', clientToken)
        .gte('expense_date', startDate)
        .order('expense_date', { ascending: false }),
      supabase
        .from('income')
        .select('*')
        .eq('client_token', clientToken)
        .gte('income_date', startDate)
        .order('income_date', { ascending: false }),
    ]);

    if (expData) setExpenses(expData as Expense[]);
    if (incData) setIncomes(incData as Income[]);
    setLoading(false);
  }, [period]);

  useEffect(() => {
    setLoading(true);
    loadData();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [period]);

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalIncome = incomes.reduce((sum, i) => sum + Number(i.amount), 0);
  const balance = totalIncome - totalExpenses;

  const openAddModal = () => {
    setFormAmount('');
    setFormCategory('food');
    setFormIncomeType('monthly_salary');
    setFormSource('');
    setFormDescription('');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formAmount.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال المبلغ');
      return;
    }
    const amt = parseFloat(formAmount);
    if (!amt || amt <= 0) {
      Alert.alert('خطأ', 'المبلغ غير صحيح');
      return;
    }

    setSaving(true);
    const clientToken = await getClientToken();

    try {
      if (activeTab === 'expenses') {
        const { error } = await supabase.from('expenses').insert({
          client_token: clientToken,
          amount: amt,
          category: formCategory,
          description: formDescription.trim() || null,
          expense_date: new Date().toISOString().slice(0, 10),
        });
        if (error) throw error;
      } else {
        if (!formSource.trim()) {
          Alert.alert('خطأ', 'يرجى إدخال مصدر الدخل');
          setSaving(false);
          return;
        }
        const { error } = await supabase.from('income').insert({
          client_token: clientToken,
          amount: amt,
          source: formSource.trim(),
          income_type: formIncomeType,
          notes: formDescription.trim() || null,
          income_date: new Date().toISOString().slice(0, 10),
        });
        if (error) throw error;
      }
      setModalVisible(false);
      loadData();
    } catch {
      Alert.alert('خطأ', 'تعذر الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    await supabase.from('expenses').delete().eq('id', id);
    loadData();
  };

  const handleDeleteIncome = async (id: string) => {
    await supabase.from('income').delete().eq('id', id);
    loadData();
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
      </View>
    );
  }

  const periodLabels: Record<Period, string> = { today: 'اليوم', week: 'الأسبوع', month: 'الشهر' };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>المالية</Text>
        <TouchableOpacity onPress={openAddModal} style={styles.addBtn}>
          <Plus size={22} color={Colors.primary[600]} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Balance card */}
      <View style={[styles.balanceCard, Shadow.md]}>
        <View style={styles.balanceTopRow}>
          <View style={styles.balanceIconBox}>
            <PiggyBank size={20} color={Colors.surface} strokeWidth={2} />
          </View>
          <View>
            <Text style={styles.balanceTitle}>الرصيد ({periodLabels[period]})</Text>
            <Text style={styles.balanceSubtitle}>الدخل ناقص المصروفات</Text>
          </View>
        </View>
        <Text style={[styles.balanceAmount, { color: balance >= 0 ? Colors.success[600] : Colors.error[500] }]}>
          {formatAmount(Math.abs(balance))} ريال
        </Text>
        <View style={styles.balanceStatsRow}>
          <View style={styles.balanceStat}>
            <View style={[styles.balanceStatIcon, { backgroundColor: Colors.success[50] }]}>
              <TrendingUp size={14} color={Colors.success[600]} strokeWidth={2} />
            </View>
            <View>
              <Text style={styles.balanceStatValue}>{formatAmount(totalIncome)}</Text>
              <Text style={styles.balanceStatLabel}>دخل</Text>
            </View>
          </View>
          <View style={styles.balanceStatDivider} />
          <View style={styles.balanceStat}>
            <View style={[styles.balanceStatIcon, { backgroundColor: Colors.error[50] }]}>
              <TrendingDown size={14} color={Colors.error[500]} strokeWidth={2} />
            </View>
            <View>
              <Text style={styles.balanceStatValue}>{formatAmount(totalExpenses)}</Text>
              <Text style={styles.balanceStatLabel}>مصروفات</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Period selector */}
      <View style={styles.periodRow}>
        {(['today', 'week', 'month'] as Period[]).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodBtn, period === p && styles.periodBtnActive]}
            onPress={() => setPeriod(p)}
            activeOpacity={0.7}
          >
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
              {periodLabels[p]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'expenses' && styles.tabActiveExpenses]}
          onPress={() => setActiveTab('expenses')}
          activeOpacity={0.7}
        >
          <TrendingDown size={16} color={activeTab === 'expenses' ? Colors.surface : Colors.textSecondary} strokeWidth={2} />
          <Text style={[styles.tabText, activeTab === 'expenses' && styles.tabTextActive]}>المصروفات</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'income' && styles.tabActiveIncome]}
          onPress={() => setActiveTab('income')}
          activeOpacity={0.7}
        >
          <TrendingUp size={16} color={activeTab === 'income' ? Colors.surface : Colors.textSecondary} strokeWidth={2} />
          <Text style={[styles.tabText, activeTab === 'income' && styles.tabTextActive]}>الدخل</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {activeTab === 'expenses' ? (
        expenses.length === 0 ? (
          <View style={styles.emptyState}>
            <Wallet size={48} color={Colors.neutral[300]} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>لا توجد مصروفات</Text>
            <Text style={styles.emptySubtext}>اضغط على + لإضافة مصروف</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {expenses.map((exp) => {
              const cfg = expenseCategoryConfig[exp.category];
              const CatIcon = cfg.icon;
              return (
                <View key={exp.id} style={[styles.itemCard, Shadow.sm]}>
                  <View style={[styles.itemIcon, { backgroundColor: cfg.color + '18' }]}>
                    <CatIcon size={20} color={cfg.color} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{cfg.label}</Text>
                    {exp.description && <Text style={styles.itemDesc} numberOfLines={1}>{exp.description}</Text>}
                    <Text style={styles.itemDate}>{formatDate(exp.expense_date)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.itemAmount}>{formatAmount(Number(exp.amount))} ريال</Text>
                    <TouchableOpacity onPress={() => handleDeleteExpense(exp.id)} style={styles.deleteBtn}>
                      <Trash2 size={14} color={Colors.error[400]} strokeWidth={2} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )
      ) : (
        incomes.length === 0 ? (
          <View style={styles.emptyState}>
            <TrendingUp size={48} color={Colors.neutral[300]} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>لا يوجد دخل مسجل</Text>
            <Text style={styles.emptySubtext}>اضغط على + لإضافة دخل</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {incomes.map((inc) => {
              const cfg = incomeTypeConfig[inc.income_type];
              const CatIcon = cfg.icon;
              return (
                <View key={inc.id} style={[styles.itemCard, Shadow.sm]}>
                  <View style={[styles.itemIcon, { backgroundColor: cfg.color + '18' }]}>
                    <CatIcon size={20} color={cfg.color} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{inc.source}</Text>
                    <Text style={styles.itemDesc}>{cfg.label}</Text>
                    <Text style={styles.itemDate}>{formatDate(inc.income_date)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.itemAmount, { color: Colors.success[600] }]}>
                      {formatAmount(Number(inc.amount))} ريال
                    </Text>
                    <TouchableOpacity onPress={() => handleDeleteIncome(inc.id)} style={styles.deleteBtn}>
                      <Trash2 size={14} color={Colors.error[400]} strokeWidth={2} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )
      )}

      {/* Add Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, Shadow.lg]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {activeTab === 'expenses' ? 'إضافة مصروف' : 'إضافة دخل'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalClose}>
                <X size={20} color={Colors.neutral[400]} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>المبلغ (ريال)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={formAmount}
                  onChangeText={setFormAmount}
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad"
                  textAlign="center"
                />
              </View>

              {activeTab === 'expenses' ? (
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>الفئة</Text>
                  <View style={styles.categoryGrid}>
                    {(Object.entries(expenseCategoryConfig) as [ExpenseCategory, typeof expenseCategoryConfig[ExpenseCategory]][]).map(([key, cfg]) => {
                      const CatIcon = cfg.icon;
                      const isSelected = formCategory === key;
                      return (
                        <TouchableOpacity
                          key={key}
                          style={[styles.categoryOption, isSelected && { backgroundColor: cfg.color, borderColor: cfg.color }]}
                          onPress={() => setFormCategory(key)}
                        >
                          <CatIcon size={16} color={isSelected ? Colors.surface : cfg.color} strokeWidth={2} />
                          <Text style={[styles.categoryOptionText, isSelected && styles.categoryOptionTextActive]}>
                            {cfg.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ) : (
                <>
                  <View style={styles.modalField}>
                    <Text style={styles.modalLabel}>نوع الدخل</Text>
                    <View style={styles.categoryGrid}>
                      {(Object.entries(incomeTypeConfig) as [IncomeType, typeof incomeTypeConfig[IncomeType]][]).map(([key, cfg]) => {
                        const CatIcon = cfg.icon;
                        const isSelected = formIncomeType === key;
                        return (
                          <TouchableOpacity
                            key={key}
                            style={[styles.categoryOption, isSelected && { backgroundColor: cfg.color, borderColor: cfg.color }]}
                            onPress={() => setFormIncomeType(key)}
                          >
                            <CatIcon size={16} color={isSelected ? Colors.surface : cfg.color} strokeWidth={2} />
                            <Text style={[styles.categoryOptionText, isSelected && styles.categoryOptionTextActive]}>
                              {cfg.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                  <View style={styles.modalField}>
                    <Text style={styles.modalLabel}>المصدر</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={formSource}
                      onChangeText={setFormSource}
                      placeholder="مثال: راتب، بيع، عمل حر"
                      placeholderTextColor={Colors.textMuted}
                      textAlign="right"
                    />
                  </View>
                </>
              )}

              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>وصف (اختياري)</Text>
                <TextInput
                  style={[styles.modalInput, { minHeight: 50 }]}
                  value={formDescription}
                  onChangeText={setFormDescription}
                  placeholder="ملاحظات..."
                  placeholderTextColor={Colors.textMuted}
                  textAlign="right"
                  multiline
                />
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalSaveBtn, saving && styles.modalSaveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={Colors.surface} />
              ) : (
                <Text style={styles.modalSaveText}>حفظ</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F3' },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4F3' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: Platform.OS === 'web' ? Spacing.sm : Spacing.md, marginBottom: Spacing.lg,
  },
  headerTitle: { fontFamily: Fonts.cairoBold, fontSize: FontSizes.xxl, color: Colors.text },
  addBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary[50],
    justifyContent: 'center', alignItems: 'center',
  },
  balanceCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.xl,
    gap: Spacing.md, borderWidth: 1, borderColor: Colors.neutral[100],
  },
  balanceTopRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  balanceIconBox: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.primary[600],
    justifyContent: 'center', alignItems: 'center',
  },
  balanceTitle: { fontFamily: Fonts.bold, fontSize: FontSizes.md, color: Colors.text },
  balanceSubtitle: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  balanceAmount: { fontFamily: Fonts.cairoBold, fontSize: FontSizes.display },
  balanceStatsRow: { flexDirection: 'row', alignItems: 'center' },
  balanceStat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  balanceStatIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  balanceStatValue: { fontFamily: Fonts.cairoBold, fontSize: FontSizes.sm, color: Colors.text },
  balanceStatLabel: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.textSecondary },
  balanceStatDivider: { width: 1, height: 32, backgroundColor: Colors.neutral[100], marginHorizontal: Spacing.sm },
  periodRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg, marginBottom: Spacing.md },
  periodBtn: {
    flex: 1, paddingVertical: 10, borderRadius: Radius.sm,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  periodBtnActive: { backgroundColor: Colors.primary[600], borderColor: Colors.primary[600] },
  periodText: { fontFamily: Fonts.medium, fontSize: FontSizes.sm, color: Colors.textSecondary },
  periodTextActive: { color: Colors.surface },
  tabsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.surface, borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border,
  },
  tabActiveExpenses: { backgroundColor: Colors.error[500], borderColor: Colors.error[500] },
  tabActiveIncome: { backgroundColor: Colors.success[500], borderColor: Colors.success[500] },
  tabText: { fontFamily: Fonts.medium, fontSize: FontSizes.xs, color: Colors.textSecondary },
  tabTextActive: { color: Colors.surface },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl + Spacing.lg, gap: Spacing.md },
  emptyTitle: { fontFamily: Fonts.bold, fontSize: FontSizes.lg, color: Colors.text },
  emptySubtext: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: Colors.textSecondary },
  list: { gap: Spacing.sm },
  itemCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.neutral[100],
  },
  itemIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  itemTitle: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, color: Colors.text },
  itemDesc: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.textSecondary, marginTop: 2 },
  itemDate: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  itemAmount: { fontFamily: Fonts.cairoBold, fontSize: FontSizes.md, color: Colors.text },
  deleteBtn: { padding: 4, marginTop: 4 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(14,16,18,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: Spacing.lg,
  },
  modalCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    width: '100%', maxWidth: 450, maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.neutral[100],
  },
  modalTitle: { fontFamily: Fonts.bold, fontSize: FontSizes.md, color: Colors.text },
  modalClose: { padding: Spacing.xs },
  modalBody: { padding: Spacing.lg },
  modalField: { marginBottom: Spacing.md },
  modalLabel: { fontFamily: Fonts.medium, fontSize: FontSizes.xs, color: Colors.text, marginBottom: 6 },
  modalInput: {
    backgroundColor: Colors.neutral[50], borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: Colors.text,
    borderWidth: 1, borderColor: Colors.border,
  },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  categoryOption: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.neutral[50], borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border,
  },
  categoryOptionText: { fontFamily: Fonts.medium, fontSize: FontSizes.xs, color: Colors.textSecondary },
  categoryOptionTextActive: { color: Colors.surface },
  modalSaveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary[600], paddingVertical: 14,
    borderBottomLeftRadius: Radius.xl, borderBottomRightRadius: Radius.xl,
  },
  modalSaveBtnDisabled: { opacity: 0.6 },
  modalSaveText: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, color: Colors.surface },
});
