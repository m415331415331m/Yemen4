import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Plus, Pencil, Trash2, X, Save, Smartphone, Wifi, Zap, Droplet, Check } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Colors, Fonts, Radius, Spacing, Shadow, FontSizes } from '@/lib/theme';
import type { ServiceProvider } from '@/types/database';

const iconMap: Record<string, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>> = {
  Smartphone,
  Wifi,
  Zap,
  Droplet,
};

type EditModal = {
  visible: boolean;
  provider: ServiceProvider | null;
  name: string;
  code: string;
  type: string;
  color: string;
  iconName: string;
  active: boolean;
};

export default function AdminProvidersScreen() {
  const router = useRouter();
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<EditModal>({
    visible: false,
    provider: null,
    name: '',
    code: '',
    type: 'mobile',
    color: '#0D9488',
    iconName: 'Smartphone',
    active: true,
  });
  const [saving, setSaving] = useState(false);

  const loadProviders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.replace('/admin');
      return;
    }
    const { data, error } = await supabase
      .from('service_providers')
      .select('*')
      .order('sort_order', { ascending: true });
    if (!error && data) {
      setProviders(data as ServiceProvider[]);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const openAddModal = () => {
    setModal({
      visible: true,
      provider: null,
      name: '',
      code: '',
      type: 'mobile',
      color: '#0D9488',
      iconName: 'Smartphone',
      active: true,
    });
  };

  const openEditModal = (provider: ServiceProvider) => {
    setModal({
      visible: true,
      provider,
      name: provider.name_ar,
      code: provider.code,
      type: provider.type,
      color: provider.brand_color,
      iconName: provider.icon_name,
      active: provider.is_active,
    });
  };

  const closeModal = () => {
    setModal((prev) => ({ ...prev, visible: false }));
  };

  const handleSave = async () => {
    if (!modal.name.trim() || !modal.code.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال اسم المزود والرمز');
      return;
    }

    setSaving(true);
    try {
      if (modal.provider) {
        const { error } = await supabase
          .from('service_providers')
          .update({
            name_ar: modal.name.trim(),
            type: modal.type,
            brand_color: modal.color,
            icon_name: modal.iconName,
            is_active: modal.active,
          })
          .eq('id', modal.provider.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('service_providers').insert({
          name_ar: modal.name.trim(),
          name_en: modal.name.trim(),
          code: modal.code.trim().toLowerCase().replace(/\s/g, '_'),
          type: modal.type,
          brand_color: modal.color,
          icon_name: modal.iconName,
          is_active: modal.active,
          sort_order: providers.length + 1,
        });
        if (error) throw error;
      }
      closeModal();
      loadProviders();
    } catch (err) {
      Alert.alert('خطأ', 'تعذر حفظ المزود');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (provider: ServiceProvider) => {
    Alert.alert(
      'تأكيد الحذف',
      `هل تريد حذف "${provider.name_ar}"؟ سيتم حذف جميع الباقات والإعدادات المرتبطة به.`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('service_providers').delete().eq('id', provider.id);
            if (error) {
              Alert.alert('خطأ', 'تعذر حذف المزود');
            } else {
              loadProviders();
            }
          },
        },
      ]
    );
  };

  const typeOptions = [
    { value: 'mobile', label: 'شحن رصيد', icon: Smartphone },
    { value: 'internet', label: 'إنترنت', icon: Wifi },
    { value: 'electricity', label: 'كهرباء', icon: Zap },
    { value: 'water', label: 'مياه', icon: Droplet },
  ];

  const colorOptions = ['#0D9488', '#1565C0', '#E63946', '#1B7F3B', '#E8A317', '#D32128', '#7C3AED', '#0277BD'];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronRight size={24} color={Colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>مزودو الخدمة</Text>
        <TouchableOpacity onPress={openAddModal} style={styles.addBtn}>
          <Plus size={22} color={Colors.primary[600]} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Providers list */}
      <View style={styles.list}>
        {providers.map((provider) => {
          const Icon = iconMap[provider.icon_name] ?? Smartphone;
          return (
            <View key={provider.id} style={[styles.providerCard, Shadow.sm]}>
              <View style={[styles.providerIcon, { backgroundColor: provider.brand_color + '18' }]}>
                <Icon size={22} color={provider.brand_color} strokeWidth={2} />
              </View>
              <View style={styles.providerInfo}>
                <Text style={styles.providerName}>{provider.name_ar}</Text>
                <Text style={styles.providerMeta}>
                  {provider.code} · {provider.type === 'mobile' ? 'شحن' : provider.type === 'internet' ? 'إنترنت' : provider.type === 'electricity' ? 'كهرباء' : 'مياه'}
                </Text>
              </View>
              <View style={styles.providerActions}>
                {provider.is_active ? (
                  <View style={[styles.activeBadge]}>
                    <Check size={12} color={Colors.success[500]} strokeWidth={2} />
                    <Text style={styles.activeText}>مفعّل</Text>
                  </View>
                ) : (
                  <View style={[styles.inactiveBadge]}>
                    <Text style={styles.inactiveText}>معطّل</Text>
                  </View>
                )}
                <TouchableOpacity onPress={() => openEditModal(provider)} style={styles.editBtn}>
                  <Pencil size={16} color={Colors.textSecondary} strokeWidth={2} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(provider)} style={styles.deleteBtn}>
                  <Trash2 size={16} color={Colors.error[500]} strokeWidth={2} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>

      {/* Edit/Add Modal */}
      <Modal visible={modal.visible} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, Shadow.lg]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modal.provider ? 'تعديل مزود' : 'إضافة مزود جديد'}
              </Text>
              <TouchableOpacity onPress={closeModal} style={styles.modalClose}>
                <X size={20} color={Colors.neutral[400]} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>الاسم (عربي)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={modal.name}
                  onChangeText={(v) => setModal((p) => ({ ...p, name: v }))}
                  placeholder="مثال: يمن موبايل"
                  placeholderTextColor={Colors.textMuted}
                  textAlign="right"
                />
              </View>

              {!modal.provider && (
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>الرمز (إنجليزي)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={modal.code}
                    onChangeText={(v) => setModal((p) => ({ ...p, code: v }))}
                    placeholder="yemen_mobile"
                    placeholderTextColor={Colors.textMuted}
                    textAlign="left"
                    autoCapitalize="none"
                  />
                </View>
              )}

              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>نوع الخدمة</Text>
                <View style={styles.typeGrid}>
                  {typeOptions.map((opt) => {
                    const TypeIcon = opt.icon;
                    const isSelected = modal.type === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.typeOption, isSelected && styles.typeOptionActive]}
                        onPress={() => setModal((p) => ({ ...p, type: opt.value, iconName: opt.icon.name || 'Smartphone' }))}
                      >
                        <TypeIcon
                          size={18}
                          color={isSelected ? Colors.surface : Colors.textSecondary}
                          strokeWidth={2}
                        />
                        <Text style={[styles.typeOptionText, isSelected && styles.typeOptionTextActive]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>اللون</Text>
                <View style={styles.colorRow}>
                  {colorOptions.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.colorDot,
                        { backgroundColor: c },
                        modal.color === c && styles.colorDotActive,
                      ]}
                      onPress={() => setModal((p) => ({ ...p, color: c }))}
                    >
                      {modal.color === c && <Check size={14} color={Colors.surface} strokeWidth={2} />}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setModal((p) => ({ ...p, active: !p.active }))}
              >
                <Text style={styles.toggleLabel}>الخدمة مفعّلة</Text>
                <View style={[styles.toggle, modal.active && styles.toggleActive]}>
                  <View style={[styles.toggleKnob, modal.active && styles.toggleKnobActive]} />
                </View>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalSaveBtn, saving && styles.modalSaveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={Colors.surface} />
              ) : (
                <>
                  <Save size={18} color={Colors.surface} strokeWidth={2} />
                  <Text style={styles.modalSaveText}>حفظ</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
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
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    gap: Spacing.sm,
  },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.neutral[100],
  },
  providerIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  providerMeta: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  providerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.success[50],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  activeText: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    color: Colors.success[600],
  },
  inactiveBadge: {
    backgroundColor: Colors.neutral[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  inactiveText: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    color: Colors.neutral[500],
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.neutral[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.error[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(14,16,18,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    width: '100%',
    maxWidth: 450,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  modalTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  modalClose: {
    padding: Spacing.xs,
  },
  modalBody: {
    padding: Spacing.lg,
  },
  modalField: {
    marginBottom: Spacing.md,
  },
  modalLabel: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.xs,
    color: Colors.text,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: Colors.neutral[50],
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.neutral[50],
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeOptionActive: {
    backgroundColor: Colors.primary[600],
    borderColor: Colors.primary[600],
  },
  typeOptionText: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  typeOptionTextActive: {
    color: Colors.surface,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorDotActive: {
    borderWidth: 3,
    borderColor: Colors.neutral[800],
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  toggleLabel: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.neutral[300],
    justifyContent: 'center',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: Colors.success[500],
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.surface,
  },
  toggleKnobActive: {
    transform: [{ translateX: 20 }],
  },
  modalSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary[600],
    paddingVertical: 14,
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
  },
  modalSaveBtnDisabled: {
    opacity: 0.6,
  },
  modalSaveText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.sm,
    color: Colors.surface,
  },
});
