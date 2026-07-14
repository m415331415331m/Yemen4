import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Plus, Fuel, Pencil, Trash2, X, Save } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Colors, Fonts, Radius, Spacing, Shadow, FontSizes } from '@/lib/theme';
import { getAdminSession, logAdminActivity } from '@/lib/admin-auth';
import type { FuelStation, Governorate } from '@/types/database';

export default function AdminFuelStationsScreen() {
  const router = useRouter();
  const [stations, setStations] = useState<FuelStation[]>([]);
  const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [code, setCode] = useState('');
  const [brandColor, setBrandColor] = useState('#D32128');
  const [selectedGov, setSelectedGov] = useState<string>('');
  const [sortOrder, setSortOrder] = useState('0');

  const checkAuth = useCallback(async () => {
    const session = await getAdminSession();
    if (!session) { router.replace('/admin'); return false; }
    return true;
  }, [router]);

  const loadData = useCallback(async () => {
    const [{ data: stationData }, { data: govData }] = await Promise.all([
      supabase.from('fuel_stations').select('*').order('sort_order', { ascending: true }),
      supabase.from('governorates').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
    ]);
    if (stationData) setStations(stationData as FuelStation[]);
    if (govData) setGovernorates(govData as Governorate[]);
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
    setEditingId(null);
    setNameAr('');
    setNameEn('');
    setCode('');
    setBrandColor('#D32128');
    setSelectedGov('');
    setSortOrder('0');
    setModalVisible(true);
  };

  const openEditModal = (station: FuelStation) => {
    setEditingId(station.id);
    setNameAr(station.name_ar);
    setNameEn(station.name_en || '');
    setCode(station.code);
    setBrandColor(station.brand_color);
    setSelectedGov(station.governorate_id || '');
    setSortOrder(String(station.sort_order));
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!nameAr.trim() || !code.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال الاسم والكود');
      return;
    }
    setSaving(true);
    const session = await getAdminSession();
    try {
      if (editingId) {
        const { error } = await supabase.from('fuel_stations').update({
          name_ar: nameAr.trim(),
          name_en: nameEn.trim() || null,
          brand_color: brandColor,
          governorate_id: selectedGov || null,
          sort_order: parseInt(sortOrder) || 0,
        }).eq('id', editingId);
        if (error) throw error;
        if (session) await logAdminActivity(session.user.id, session.user.username, 'update_fuel_station', { id: editingId, name: nameAr });
      } else {
        const { error } = await supabase.from('fuel_stations').insert({
          name_ar: nameAr.trim(),
          name_en: nameEn.trim() || null,
          code: code.trim(),
          brand_color: brandColor,
          governorate_id: selectedGov || null,
          sort_order: parseInt(sortOrder) || 0,
          is_active: true,
        });
        if (error) throw error;
        if (session) await logAdminActivity(session.user.id, session.user.username, 'add_fuel_station', { name: nameAr, code });
      }
      setModalVisible(false);
      loadData();
    } catch {
      Alert.alert('خطأ', 'تعذر الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (station: FuelStation) => {
    Alert.alert('تأكيد', `حذف "${station.name_ar}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف', style: 'destructive',
        onPress: async () => {
          await supabase.from('fuel_stations').delete().eq('id', station.id);
          const session = await getAdminSession();
          if (session) await logAdminActivity(session.user.id, session.user.username, 'delete_fuel_station', { id: station.id });
          loadData();
        },
      },
    ]);
  };

  const colorOptions = ['#D32128', '#E63946', '#1B7F3B', '#1565C0', '#E8A317', '#0D9488', '#6E7680', '#7C3AED'];

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
        <Text style={styles.headerTitle}>محطات الوقود</Text>
        <TouchableOpacity onPress={openAddModal} style={styles.addBtn}>
          <Plus size={22} color={Colors.primary[600]} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <View style={styles.list}>
        {stations.map((station) => (
          <View key={station.id} style={[styles.stationCard, Shadow.sm]}>
            <View style={[styles.stationIcon, { backgroundColor: station.brand_color + '18' }]}>
              <Fuel size={22} color={station.brand_color} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stationName}>{station.name_ar}</Text>
              <Text style={styles.stationCode}>{station.code} {station.name_en ? `· ${station.name_en}` : ''}</Text>
            </View>
            <TouchableOpacity onPress={() => openEditModal(station)} style={styles.iconBtn}>
              <Pencil size={16} color={Colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(station)} style={styles.iconBtn}>
              <Trash2 size={16} color={Colors.error[500]} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, Shadow.lg]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'تعديل محطة' : 'إضافة محطة وقود'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalClose}>
                <X size={20} color={Colors.neutral[400]} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.field}>
                <Text style={styles.label}>الاسم (عربي)</Text>
                <TextInput style={styles.input} value={nameAr} onChangeText={setNameAr} placeholder="محطات السفير" placeholderTextColor={Colors.textMuted} textAlign="right" />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>الاسم (إنجليزي)</Text>
                <TextInput style={styles.input} value={nameEn} onChangeText={setNameEn} placeholder="Al-Safir" placeholderTextColor={Colors.textMuted} textAlign="left" />
              </View>
              {!editingId && (
                <View style={styles.field}>
                  <Text style={styles.label}>الكود</Text>
                  <TextInput style={styles.input} value={code} onChangeText={setCode} placeholder="safir" placeholderTextColor={Colors.textMuted} autoCapitalize="none" textAlign="left" />
                </View>
              )}
              <View style={styles.field}>
                <Text style={styles.label}>اللون</Text>
                <View style={styles.colorRow}>
                  {colorOptions.map((c) => (
                    <TouchableOpacity key={c} style={[styles.colorDot, { backgroundColor: c }, brandColor === c && styles.colorDotSelected]} onPress={() => setBrandColor(c)} />
                  ))}
                </View>
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>المحافظة (اختياري)</Text>
                <View style={styles.govRow}>
                  <TouchableOpacity style={[styles.govChip, !selectedGov && styles.govChipActive]} onPress={() => setSelectedGov('')}>
                    <Text style={[styles.govChipText, !selectedGov && styles.govChipTextActive]}>الكل</Text>
                  </TouchableOpacity>
                  {governorates.map((gov) => (
                    <TouchableOpacity key={gov.id} style={[styles.govChip, selectedGov === gov.id && styles.govChipActive]} onPress={() => setSelectedGov(gov.id)}>
                      <Text style={[styles.govChipText, selectedGov === gov.id && styles.govChipTextActive]}>{gov.name_ar}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>ترتيب</Text>
                <TextInput style={styles.input} value={sortOrder} onChangeText={setSortOrder} keyboardType="number-pad" textAlign="center" />
              </View>
            </ScrollView>

            <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={Colors.surface} /> : <Text style={styles.saveBtnText}>حفظ</Text>}
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
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary[50], justifyContent: 'center', alignItems: 'center' },
  list: { gap: Spacing.sm },
  stationCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.neutral[100] },
  stationIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  stationName: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, color: Colors.text },
  stationCode: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.textSecondary, marginTop: 2 },
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
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  colorDot: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'transparent' },
  colorDotSelected: { borderColor: Colors.text, borderWidth: 3 },
  govRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  govChip: { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Colors.neutral[50], borderWidth: 1, borderColor: Colors.border },
  govChipActive: { backgroundColor: Colors.primary[600], borderColor: Colors.primary[600] },
  govChipText: { fontFamily: Fonts.medium, fontSize: FontSizes.xs, color: Colors.textSecondary },
  govChipTextActive: { color: Colors.surface },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary[600], paddingVertical: 14, borderBottomLeftRadius: Radius.xl, borderBottomRightRadius: Radius.xl },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, color: Colors.surface },
});
