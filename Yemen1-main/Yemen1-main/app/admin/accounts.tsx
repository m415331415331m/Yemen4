import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Plus, Users, Pencil, Trash2, X, Shield, ShieldCheck, UserCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Colors, Fonts, Radius, Spacing, Shadow, FontSizes } from '@/lib/theme';
import { getAdminSession, createAdminAccount, logAdminActivity } from '@/lib/admin-auth';
import type { AdminUser } from '@/types/database';

export default function AdminAccountsScreen() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'admin' | 'super_admin'>('admin');

  const checkAuth = useCallback(async () => {
    const session = await getAdminSession();
    if (!session) { router.replace('/admin'); return false; }
    return true;
  }, [router]);

  const loadData = useCallback(async () => {
    const { data, error } = await supabase.from('admin_users').select('*').order('created_at', { ascending: false });
    if (!error && data) setAccounts(data as AdminUser[]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    (async () => {
      const authed = await checkAuth();
      if (authed) loadData();
    })();
  }, [checkAuth, loadData]);

  const openAddModal = () => {
    setUsername('');
    setPassword('');
    setDisplayName('');
    setRole('admin');
    setError(null);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!username.trim() || !password.trim()) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }
    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    setSaving(true);
    setError(null);
    const session = await getAdminSession();
    const result = await createAdminAccount(username.trim(), password, displayName.trim(), role);
    if (result.success) {
      if (session) await logAdminActivity(session.user.id, session.user.username, 'create_admin_account', { username });
      setModalVisible(false);
      loadData();
    } else {
      setError(result.error || 'تعذر إنشاء الحساب');
    }
    setSaving(false);
  };

  const handleToggleActive = async (account: AdminUser) => {
    await supabase.from('admin_users').update({ is_active: !account.is_active }).eq('id', account.id);
    loadData();
  };

  const handleDelete = (account: AdminUser) => {
    Alert.alert('تأكيد', `حذف حساب "${account.username}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف', style: 'destructive',
        onPress: async () => {
          await supabase.from('admin_users').delete().eq('id', account.id);
          const session = await getAdminSession();
          if (session) await logAdminActivity(session.user.id, session.user.username, 'delete_admin_account', { username: account.username });
          loadData();
        },
      },
    ]);
  };

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={Colors.primary[500]} /></View>;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} colors={[Colors.primary[500]]} />}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronRight size={24} color={Colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>حسابات المسؤولين</Text>
        <TouchableOpacity onPress={openAddModal} style={styles.addBtn}>
          <Plus size={22} color={Colors.success[600]} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <View style={styles.list}>
        {accounts.map((account) => (
          <View key={account.id} style={[styles.accountCard, Shadow.sm]}>
            <View style={[styles.accountIcon, { backgroundColor: account.role === 'super_admin' ? Colors.primary[50] : Colors.neutral[100] }]}>
              {account.role === 'super_admin' ? <ShieldCheck size={22} color={Colors.primary[600]} strokeWidth={2} /> : <Shield size={22} color={Colors.neutral[500]} strokeWidth={2} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.accountName}>{account.display_name || account.username}</Text>
              <Text style={styles.accountUsername}>@{account.username}</Text>
              <View style={styles.accountMeta}>
                <View style={[styles.roleBadge, account.role === 'super_admin' ? styles.roleSuperAdmin : styles.roleAdmin]}>
                  <Text style={styles.roleText}>{account.role === 'super_admin' ? 'مدير عام' : 'مسؤول'}</Text>
                </View>
                {!account.is_active && (
                  <View style={styles.inactiveBadge}>
                    <Text style={styles.inactiveText}>معطل</Text>
                  </View>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={() => handleToggleActive(account)} style={styles.iconBtn}>
              <Text style={{ fontFamily: Fonts.bold, fontSize: 10, color: account.is_active ? Colors.success[600] : Colors.neutral[400] }}>
                {account.is_active ? 'نشط' : 'معطل'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(account)} style={styles.iconBtn}>
              <Trash2 size={16} color={Colors.error[500]} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Add Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, Shadow.lg]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>إضافة حساب مسؤول</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalClose}>
                <X size={20} color={Colors.neutral[400]} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.field}>
                <Text style={styles.label}>اسم المستخدم</Text>
                <TextInput style={styles.input} value={username} onChangeText={setUsername} placeholder="admin2" placeholderTextColor={Colors.textMuted} autoCapitalize="none" textAlign="left" />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>الاسم المعروض</Text>
                <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} placeholder="المدير" placeholderTextColor={Colors.textMuted} textAlign="right" />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>كلمة المرور</Text>
                <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="••••••" placeholderTextColor={Colors.textMuted} secureTextEntry textAlign="left" />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>الدور</Text>
                <View style={styles.roleRow}>
                  <TouchableOpacity style={[styles.roleOption, role === 'admin' && styles.roleOptionActive]} onPress={() => setRole('admin')}>
                    <Shield size={16} color={role === 'admin' ? Colors.surface : Colors.textSecondary} strokeWidth={2} />
                    <Text style={[styles.roleOptionText, role === 'admin' && styles.roleOptionTextActive]}>مسؤول</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.roleOption, role === 'super_admin' && styles.roleOptionActivePrimary]} onPress={() => setRole('super_admin')}>
                    <ShieldCheck size={16} color={role === 'super_admin' ? Colors.surface : Colors.textSecondary} strokeWidth={2} />
                    <Text style={[styles.roleOptionText, role === 'super_admin' && styles.roleOptionTextActive]}>مدير عام</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={Colors.surface} /> : <Text style={styles.saveBtnText}>إنشاء الحساب</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl, maxWidth: 700, width: '100%', alignSelf: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  headerTitle: { fontFamily: Fonts.bold, fontSize: FontSizes.lg, color: Colors.text },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.success[50], justifyContent: 'center', alignItems: 'center' },
  list: { gap: Spacing.sm },
  accountCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.neutral[100] },
  accountIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  accountName: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, color: Colors.text },
  accountUsername: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.textSecondary, marginTop: 2 },
  accountMeta: { flexDirection: 'row', gap: 6, marginTop: 4 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill },
  roleSuperAdmin: { backgroundColor: Colors.primary[50] },
  roleAdmin: { backgroundColor: Colors.neutral[100] },
  roleText: { fontFamily: Fonts.bold, fontSize: 10 },
  inactiveBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill, backgroundColor: Colors.error[50] },
  inactiveText: { fontFamily: Fonts.bold, fontSize: 10, color: Colors.error[600] },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.neutral[50], justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(14,16,18,0.5)', justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  modalCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, width: '100%', maxWidth: 450, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.neutral[100] },
  modalTitle: { fontFamily: Fonts.bold, fontSize: FontSizes.md, color: Colors.text },
  modalClose: { padding: Spacing.xs },
  modalBody: { padding: Spacing.lg },
  field: { marginBottom: Spacing.md },
  label: { fontFamily: Fonts.medium, fontSize: FontSizes.xs, color: Colors.text, marginBottom: 6 },
  input: { backgroundColor: Colors.neutral[50], borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: 12, fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  roleRow: { flexDirection: 'row', gap: Spacing.sm },
  roleOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.neutral[50], borderRadius: Radius.sm, paddingVertical: 12, borderWidth: 1, borderColor: Colors.border },
  roleOptionActive: { backgroundColor: Colors.neutral[600], borderColor: Colors.neutral[600] },
  roleOptionActivePrimary: { backgroundColor: Colors.primary[600], borderColor: Colors.primary[600] },
  roleOptionText: { fontFamily: Fonts.medium, fontSize: FontSizes.sm, color: Colors.textSecondary },
  roleOptionTextActive: { color: Colors.surface },
  errorBox: { backgroundColor: Colors.error[50], borderRadius: Radius.sm, padding: Spacing.md, borderWidth: 1, borderColor: Colors.error[100] },
  errorText: { fontFamily: Fonts.medium, fontSize: FontSizes.xs, color: Colors.error[600], textAlign: 'center' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.success[600], paddingVertical: 14, borderBottomLeftRadius: Radius.xl, borderBottomRightRadius: Radius.xl },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, color: Colors.surface },
});
