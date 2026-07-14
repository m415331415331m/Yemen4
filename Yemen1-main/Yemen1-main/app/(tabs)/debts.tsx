import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform, Modal, TextInput, Animated, Easing, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronRight, Plus, HandCoins, ArrowLeftCircle, ArrowRightCircle,
  Trash2, Pencil, X, Check, Clock, AlertCircle, Store, Home as HomeIcon,
  User, CreditCard, Fuel,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Colors, Fonts, Radius, Spacing, Shadow, FontSizes } from '@/lib/theme';
import { getClientToken } from '@/lib/client-token';
import { formatAmount } from '@/lib/provider-utils';
import type { Debt, DebtPersonType, DebtCategory } from '@/types/database';

type Tab = 'i_owe' | 'owed_to_me' | 'reminders';

const categoryConfig: Record<DebtCategory, { label: string; icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }> }> = {
  grocery: { label: 'بقالة', icon: Store },
  house: { label: 'بيت', icon: HomeIcon },
  personal: { label: 'شخصي', icon: User },
  loan: { label: 'قرض', icon: CreditCard },
  fuel: { label: 'وقود', icon: Fuel },
  other: { label: 'أخرى', icon: AlertCircle },
};

export default function DebtsScreen() {
  const router = useRouter();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('i_owe');
  const [modalVisible, setModalVisible] = useState(false);
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [saving, setSaving] = useState(false);

  // Form state
  const [personName, setPersonName] = useState('');
  const [personType, setPersonType] = useState<DebtPersonType>('i_owe');
  const [amount, setAmount] = useState('');
  const [installmentsCount, setInstallmentsCount] = useState('0');
  const [category, setCategory] = useState<DebtCategory>('other');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const loadDebts = useCallback(async () => {
    const clientToken = await getClientToken();
    const { data, error } = await supabase
      .from('debts')
      .select('*')
      .eq('client_token', clientToken)
      .order('created_at', { ascending: false });
    if (!error && data) setDebts(data as Debt[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDebts();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  const filteredDebts = debts.filter((d) => {
    if (activeTab === 'i_owe') return d.person_type === 'i_owe' && d.status === 'active';
    if (activeTab === 'owed_to_me') return d.person_type === 'owed_to_me' && d.status === 'active';
    return false;
  });

  const totalIOwe = debts
    .filter((d) => d.person_type === 'i_owe' && d.status === 'active')
    .reduce((sum, d) => sum + (Number(d.amount) - Number(d.paid_amount)), 0);
  const totalOwedToMe = debts
    .filter((d) => d.person_type === 'owed_to_me' && d.status === 'active')
    .reduce((sum, d) => sum + (Number(d.amount) - Number(d.paid_amount)), 0);

  const openAddModal = () => {
    setEditingId(null);
    setPersonName('');
    setPersonType(activeTab === 'owed_to_me' ? 'owed_to_me' : 'i_owe');
    setAmount('');
    setInstallmentsCount('0');
    setCategory('other');
    setNotes('');
    setDueDate('');
    setModalVisible(true);
  };

  const openEditModal = (debt: Debt) => {
    setEditingId(debt.id);
    setPersonName(debt.person_name);
    setPersonType(debt.person_type);
    setAmount(String(debt.amount));
    setInstallmentsCount(String(debt.installments_count));
    setCategory(debt.category);
    setNotes(debt.notes || '');
    setDueDate(debt.due_date || '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!personName.trim() || !amount.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال الاسم والمبلغ');
      return;
    }
    setSaving(true);
    const clientToken = await getClientToken();
    const amt = parseFloat(amount);
    const installments = parseInt(installmentsCount) || 0;
    const installmentAmt = installments > 0 ? amt / installments : 0;

    try {
      if (editingId) {
        const { error } = await supabase
          .from('debts')
          .update({
            person_name: personName.trim(),
            person_type: personType,
            amount: amt,
            installments_count: installments,
            installment_amount: installmentAmt,
            category,
            notes: notes.trim() || null,
            due_date: dueDate || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('debts').insert({
          client_token: clientToken,
          person_name: personName.trim(),
          person_type: personType,
          amount: amt,
          paid_amount: 0,
          installments_count: installments,
          installments_paid: 0,
          installment_amount: installmentAmt,
          category,
          notes: notes.trim() || null,
          due_date: dueDate || null,
          status: 'active',
        });
        if (error) throw error;
      }
      setModalVisible(false);
      loadDebts();
    } catch {
      Alert.alert('خطأ', 'تعذر حفظ الدين');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (debt: Debt) => {
    Alert.alert(
      'تأكيد الحذف',
      `هل تريد حذف دين "${debt.person_name}"؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('debts').delete().eq('id', debt.id);
            loadDebts();
          },
        },
      ]
    );
  };

  const openPayModal = (debt: Debt) => {
    setSelectedDebt(debt);
    const remaining = Number(debt.amount) - Number(debt.paid_amount);
    setPayAmount(String(remaining));
    setPayModalVisible(true);
  };

  const handlePayInstallment = async () => {
    if (!selectedDebt || !payAmount.trim()) return;
    const payAmt = parseFloat(payAmount);
    if (!payAmt || payAmt <= 0) return;

    const newPaidAmount = Number(selectedDebt.paid_amount) + payAmt;
    const newInstallmentsPaid = selectedDebt.installments_count > 0
      ? Math.min(selectedDebt.installments_paid + 1, selectedDebt.installments_count)
      : 0;
    const isFullyPaid = newPaidAmount >= Number(selectedDebt.amount);

    setSaving(true);
    try {
      const { error } = await supabase
        .from('debts')
        .update({
          paid_amount: newPaidAmount,
          installments_paid: newInstallmentsPaid,
          status: isFullyPaid ? 'paid' : 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedDebt.id);
      if (error) throw error;
      setPayModalVisible(false);
      loadDebts();
    } catch {
      Alert.alert('خطأ', 'تعذر تسجيل الدفعة');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.warning[500]} />
      </View>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }> }[] = [
    { key: 'i_owe', label: 'ديون علي', icon: ArrowRightCircle },
    { key: 'owed_to_me', label: 'ديون لي', icon: ArrowLeftCircle },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>الديون</Text>
        <TouchableOpacity onPress={openAddModal} style={styles.addBtn}>
          <Plus size={22} color={Colors.warning[600]} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Summary cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: Colors.warning[50] }]}>
          <View style={[styles.summaryIcon, { backgroundColor: Colors.warning[500] }]}>
            <ArrowRightCircle size={18} color={Colors.surface} strokeWidth={2} />
          </View>
          <View>
            <Text style={styles.summaryValue}>{formatAmount(totalIOwe)}</Text>
            <Text style={styles.summaryLabel}>إجمالي ما عليك</Text>
          </View>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: Colors.success[50] }]}>
          <View style={[styles.summaryIcon, { backgroundColor: Colors.success[500] }]}>
            <ArrowLeftCircle size={18} color={Colors.surface} strokeWidth={2} />
          </View>
          <View>
            <Text style={styles.summaryValue}>{formatAmount(totalOwedToMe)}</Text>
            <Text style={styles.summaryLabel}>إجمالي ما لك</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <TabIcon size={16} color={isActive ? Colors.surface : Colors.textSecondary} strokeWidth={2} />
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Debts list */}
      {filteredDebts.length === 0 ? (
        <View style={styles.emptyState}>
          <HandCoins size={48} color={Colors.neutral[300]} strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>لا توجد ديون</Text>
          <Text style={styles.emptySubtext}>اضغط على + لإضافة دين جديد</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {filteredDebts.map((debt) => {
            const remaining = Number(debt.amount) - Number(debt.paid_amount);
            const progress = Number(debt.amount) > 0 ? (Number(debt.paid_amount) / Number(debt.amount)) * 100 : 0;
            const CatIcon = categoryConfig[debt.category].icon;
            const isOverdue = debt.due_date && new Date(debt.due_date) < new Date() && remaining > 0;

            return (
              <View key={debt.id} style={[styles.debtCard, Shadow.sm]}>
                <View style={styles.debtCardHeader}>
                  <View style={[styles.debtCatIcon, { backgroundColor: (debt.person_type === 'i_owe' ? Colors.warning[500] : Colors.success[500]) + '18' }]}>
                    <CatIcon size={18} color={debt.person_type === 'i_owe' ? Colors.warning[600] : Colors.success[600]} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.debtPersonName}>{debt.person_name}</Text>
                    <Text style={styles.debtCategory}>{categoryConfig[debt.category].label}</Text>
                  </View>
                  <TouchableOpacity onPress={() => openEditModal(debt)} style={styles.iconBtn}>
                    <Pencil size={16} color={Colors.textSecondary} strokeWidth={2} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(debt)} style={styles.iconBtn}>
                    <Trash2 size={16} color={Colors.error[500]} strokeWidth={2} />
                  </TouchableOpacity>
                </View>

                <View style={styles.debtAmountRow}>
                  <View>
                    <Text style={styles.debtAmountLabel}>المبلغ الإجمالي</Text>
                    <Text style={styles.debtAmountValue}>{formatAmount(Number(debt.amount))} ريال</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.debtAmountLabel}>المتبقي</Text>
                    <Text style={[styles.debtAmountValue, { color: isOverdue ? Colors.error[500] : Colors.warning[600] }]}>
                      {formatAmount(remaining)} ريال
                    </Text>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={styles.progressBar}>
                  <View style={[styles.progressBarFill, { width: `${progress}%`, backgroundColor: debt.person_type === 'i_owe' ? Colors.warning[500] : Colors.success[500] }]} />
                </View>

                {/* Installments info */}
                {debt.installments_count > 0 && (
                  <View style={styles.installmentsRow}>
                    <Text style={styles.installmentsText}>
                      الأقساط: {debt.installments_paid}/{debt.installments_count}
                    </Text>
                    <Text style={styles.installmentAmount}>
                      القسط: {formatAmount(Number(debt.installment_amount))} ريال
                    </Text>
                  </View>
                )}

                {/* Due date */}
                {debt.due_date && (
                  <View style={[styles.dueDateRow, isOverdue && styles.dueDateOverdue]}>
                    <Clock size={12} color={isOverdue ? Colors.error[500] : Colors.textMuted} strokeWidth={2} />
                    <Text style={[styles.dueDateText, isOverdue && { color: Colors.error[500] }]}>
                      {isOverdue ? 'متأخر - ' : ''}الاستحقاق: {new Date(debt.due_date).toLocaleDateString('ar-EG')}
                    </Text>
                  </View>
                )}

                {/* Pay button */}
                {remaining > 0 && (
                  <TouchableOpacity
                    style={[styles.payBtn, { backgroundColor: debt.person_type === 'i_owe' ? Colors.warning[600] : Colors.success[600] }]}
                    onPress={() => openPayModal(debt)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.payBtnText}>
                      {debt.installments_count > 0 ? 'سداد قسط' : 'سداد دفعة'}
                    </Text>
                  </TouchableOpacity>
                )}

                {remaining <= 0 && (
                  <View style={styles.paidBadge}>
                    <Check size={14} color={Colors.success[600]} strokeWidth={2} />
                    <Text style={styles.paidText}>تم السداد</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, Shadow.lg]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'تعديل دين' : 'إضافة دين جديد'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalClose}>
                <X size={20} color={Colors.neutral[400]} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Person type selector */}
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>النوع</Text>
                <View style={styles.typeSelector}>
                  <TouchableOpacity
                    style={[styles.typeOption, personType === 'i_owe' && styles.typeOptionActive]}
                    onPress={() => setPersonType('i_owe')}
                  >
                    <ArrowRightCircle size={16} color={personType === 'i_owe' ? Colors.surface : Colors.textSecondary} strokeWidth={2} />
                    <Text style={[styles.typeOptionText, personType === 'i_owe' && styles.typeOptionTextActive]}>عليّ دين</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeOption, personType === 'owed_to_me' && styles.typeOptionActiveSuccess]}
                    onPress={() => setPersonType('owed_to_me')}
                  >
                    <ArrowLeftCircle size={16} color={personType === 'owed_to_me' ? Colors.surface : Colors.textSecondary} strokeWidth={2} />
                    <Text style={[styles.typeOptionText, personType === 'owed_to_me' && styles.typeOptionTextActive]}>لي دين</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>الاسم</Text>
                <TextInput
                  style={styles.modalInput}
                  value={personName}
                  onChangeText={setPersonName}
                  placeholder="اسم الشخص أو الجهة"
                  placeholderTextColor={Colors.textMuted}
                  textAlign="right"
                />
              </View>

              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>المبلغ (ريال)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad"
                  textAlign="center"
                />
              </View>

              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>عدد الأقساط (0 = دفعة واحدة)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={installmentsCount}
                  onChangeText={setInstallmentsCount}
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad"
                  textAlign="center"
                />
              </View>

              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>الفئة</Text>
                <View style={styles.categoryGrid}>
                  {(Object.entries(categoryConfig) as [DebtCategory, { label: string; icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }> }][]).map(([key, cfg]) => {
                    const CatIcon = cfg.icon;
                    const isSelected = category === key;
                    return (
                      <TouchableOpacity
                        key={key}
                        style={[styles.categoryOption, isSelected && styles.categoryOptionActive]}
                        onPress={() => setCategory(key)}
                      >
                        <CatIcon size={16} color={isSelected ? Colors.surface : Colors.textSecondary} strokeWidth={2} />
                        <Text style={[styles.categoryOptionText, isSelected && styles.categoryOptionTextActive]}>
                          {cfg.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>تاريخ الاستحقاق (اختياري)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={dueDate}
                  onChangeText={setDueDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.textMuted}
                  textAlign="center"
                />
              </View>

              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>ملاحظات</Text>
                <TextInput
                  style={[styles.modalInput, { minHeight: 60 }]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="ملاحظات إضافية..."
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

      {/* Pay Modal */}
      <Modal visible={payModalVisible} transparent animationType="fade" onRequestClose={() => setPayModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, Shadow.lg]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>سداد دفعة</Text>
              <TouchableOpacity onPress={() => setPayModalVisible(false)} style={styles.modalClose}>
                <X size={20} color={Colors.neutral[400]} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              {selectedDebt && (
                <>
                  <Text style={styles.payModalName}>{selectedDebt.person_name}</Text>
                  <Text style={styles.payModalRemaining}>
                    المتبقي: {formatAmount(Number(selectedDebt.amount) - Number(selectedDebt.paid_amount))} ريال
                  </Text>
                  <View style={styles.modalField}>
                    <Text style={styles.modalLabel}>مبلغ السداد</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={payAmount}
                      onChangeText={setPayAmount}
                      placeholder="0"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="number-pad"
                      textAlign="center"
                    />
                  </View>
                </>
              )}
            </View>
            <TouchableOpacity
              style={[styles.modalSaveBtn, saving && styles.modalSaveBtnDisabled]}
              onPress={handlePayInstallment}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={Colors.surface} />
              ) : (
                <Text style={styles.modalSaveText}>تأكيد السداد</Text>
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
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.warning[50],
    justifyContent: 'center', alignItems: 'center',
  },
  summaryRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  summaryCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: Radius.lg, padding: Spacing.md,
  },
  summaryIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  summaryValue: { fontFamily: Fonts.cairoBold, fontSize: FontSizes.md, color: Colors.text },
  summaryLabel: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.textSecondary, marginTop: 2 },
  tabsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.surface, borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border,
  },
  tabActive: { backgroundColor: Colors.warning[600], borderColor: Colors.warning[600] },
  tabText: { fontFamily: Fonts.medium, fontSize: FontSizes.xs, color: Colors.textSecondary },
  tabTextActive: { color: Colors.surface },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl + Spacing.lg, gap: Spacing.md },
  emptyTitle: { fontFamily: Fonts.bold, fontSize: FontSizes.lg, color: Colors.text },
  emptySubtext: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: Colors.textSecondary },
  list: { gap: Spacing.sm },
  debtCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md,
    gap: Spacing.sm, borderWidth: 1, borderColor: Colors.neutral[100],
  },
  debtCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  debtCatIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  debtPersonName: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, color: Colors.text },
  debtCategory: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.textSecondary, marginTop: 2 },
  iconBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.neutral[50], justifyContent: 'center', alignItems: 'center' },
  debtAmountRow: { flexDirection: 'row', justifyContent: 'space-between' },
  debtAmountLabel: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.textMuted },
  debtAmountValue: { fontFamily: Fonts.cairoBold, fontSize: FontSizes.md, color: Colors.text, marginTop: 2 },
  progressBar: { height: 6, backgroundColor: Colors.neutral[100], borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  installmentsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  installmentsText: { fontFamily: Fonts.medium, fontSize: FontSizes.xs, color: Colors.textSecondary },
  installmentAmount: { fontFamily: Fonts.medium, fontSize: FontSizes.xs, color: Colors.textSecondary },
  dueDateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dueDateOverdue: {},
  dueDateText: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.textMuted },
  payBtn: {
    borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center', marginTop: Spacing.xs,
  },
  payBtnText: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, color: Colors.surface },
  paidBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: Colors.success[50], borderRadius: Radius.md, paddingVertical: 10,
  },
  paidText: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, color: Colors.success[600] },

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
  typeSelector: { flexDirection: 'row', gap: Spacing.sm },
  typeOption: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.neutral[50], borderRadius: Radius.sm,
    paddingVertical: 12, borderWidth: 1, borderColor: Colors.border,
  },
  typeOptionActive: { backgroundColor: Colors.warning[600], borderColor: Colors.warning[600] },
  typeOptionActiveSuccess: { backgroundColor: Colors.success[600], borderColor: Colors.success[600] },
  typeOptionText: { fontFamily: Fonts.medium, fontSize: FontSizes.sm, color: Colors.textSecondary },
  typeOptionTextActive: { color: Colors.surface },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  categoryOption: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.neutral[50], borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border,
  },
  categoryOptionActive: { backgroundColor: Colors.primary[600], borderColor: Colors.primary[600] },
  categoryOptionText: { fontFamily: Fonts.medium, fontSize: FontSizes.xs, color: Colors.textSecondary },
  categoryOptionTextActive: { color: Colors.surface },
  modalSaveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary[600], paddingVertical: 14,
    borderBottomLeftRadius: Radius.xl, borderBottomRightRadius: Radius.xl,
  },
  modalSaveBtnDisabled: { opacity: 0.6 },
  modalSaveText: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, color: Colors.surface },
  payModalName: { fontFamily: Fonts.bold, fontSize: FontSizes.md, color: Colors.text, textAlign: 'center' },
  payModalRemaining: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: Colors.textSecondary, textAlign: 'center', marginTop: 4, marginBottom: Spacing.md },
});
