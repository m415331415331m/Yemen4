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
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Save, Key, CheckCircle2, AlertCircle, Plus, Server } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Colors, Fonts, Radius, Spacing, Shadow, FontSizes } from '@/lib/theme';
import type { ServiceProvider, ApiSetting } from '@/types/database';

type SettingsMap = Record<string, ApiSetting | null>;

export default function ApiSettingsScreen() {
  const router = useRouter();
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<Record<string, 'saved' | 'error'>>({});

  const loadData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.replace('/admin');
      return;
    }

    const [
      { data: providerData },
      { data: settingsData },
    ] = await Promise.all([
      supabase.from('service_providers').select('*').order('sort_order', { ascending: true }),
      supabase.from('api_settings').select('*'),
    ]);

    if (providerData) {
      setProviders(providerData as ServiceProvider[]);
    }

    const map: SettingsMap = {};
    if (settingsData) {
      (settingsData as ApiSetting[]).forEach((s) => {
        map[s.provider_id] = s;
      });
    }
    setSettings(map);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateField = (providerId: string, field: keyof ApiSetting, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [providerId]: {
        ...(prev[providerId] || {
          id: '',
          provider_id: providerId,
          api_url: '',
          api_key: '',
          api_token: '',
          api_secret: '',
          merchant_id: '',
          additional_config: {},
          is_active: true,
          updated_at: new Date().toISOString(),
        }),
        [field]: value,
      } as ApiSetting,
    }));
  };

  const handleSave = async (providerId: string) => {
    setSaving(providerId);
    const setting = settings[providerId];
    if (!setting) {
      setSaving(null);
      return;
    }

    try {
      if (setting.id) {
        // Update existing
        const { error } = await supabase
          .from('api_settings')
          .update({
            api_url: setting.api_url,
            api_key: setting.api_key,
            api_token: setting.api_token,
            api_secret: setting.api_secret,
            merchant_id: setting.merchant_id,
            is_active: setting.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', setting.id);

        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('api_settings')
          .insert({
            provider_id: providerId,
            api_url: setting.api_url,
            api_key: setting.api_key,
            api_token: setting.api_token,
            api_secret: setting.api_secret,
            merchant_id: setting.merchant_id,
            is_active: true,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setSettings((prev) => ({
            ...prev,
            [providerId]: data as ApiSetting,
          }));
        }
      }

      setSaveStatus((prev) => ({ ...prev, [providerId]: 'saved' }));
      setTimeout(() => setSaveStatus((prev) => {
        const next = { ...prev };
        delete next[providerId];
        return next;
      }), 3000);
    } catch (err) {
      setSaveStatus((prev) => ({ ...prev, [providerId]: 'error' }));
      Alert.alert('خطأ', 'تعذر حفظ الإعدادات. تحقق من اتصالك.');
    } finally {
      setSaving(null);
    }
  };

  const handleToggleActive = async (providerId: string) => {
    const setting = settings[providerId];
    if (!setting?.id) return;

    const newVal = !setting.is_active;
    updateField(providerId, 'is_active', String(newVal));

    const { error } = await supabase
      .from('api_settings')
      .update({ is_active: newVal, updated_at: new Date().toISOString() })
      .eq('id', setting.id);

    if (error) {
      updateField(providerId, 'is_active', String(!newVal));
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
        <Text style={styles.loadingText}>جاري تحميل الإعدادات...</Text>
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
        <Text style={styles.headerTitle}>مفاتيح الربط (API)</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Info banner */}
      <View style={styles.infoBanner}>
        <Server size={20} color={Colors.accent[500]} strokeWidth={2} />
        <Text style={styles.infoText}>
          أدخل مفاتيح الربط لكل مزود خدمة. يتم حفظها بشكل آمن في قاعدة البيانات السحابية
          ولا تحتاج لتحديث التطبيق عند تغييرها.
        </Text>
      </View>

      {/* Provider settings list */}
      <View style={styles.providerList}>
        {providers.map((provider) => {
          const setting = settings[provider.id];
          const isExpanded = expandedProvider === provider.id;
          const isConfigured = !!setting?.api_url || !!setting?.api_key;
          const saveState = saveStatus[provider.id];

          return (
            <View key={provider.id} style={[styles.providerCard, Shadow.sm]}>
              {/* Provider header row */}
              <TouchableOpacity
                style={styles.providerHeader}
                onPress={() => setExpandedProvider(isExpanded ? null : provider.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.providerDot, { backgroundColor: provider.brand_color + '20' }]}>
                  <Text style={[styles.providerDotText, { color: provider.brand_color }]}>
                    {provider.name_ar.charAt(0)}
                  </Text>
                </View>
                <View style={styles.providerInfo}>
                  <Text style={styles.providerName}>{provider.name_ar}</Text>
                  <Text style={styles.providerCode}>{provider.code}</Text>
                </View>
                <View style={styles.providerStatusRow}>
                  {isConfigured ? (
                    <View style={[styles.statusPill, { backgroundColor: Colors.success[50] }]}>
                      <CheckCircle2 size={14} color={Colors.success[500]} strokeWidth={2} />
                      <Text style={[styles.statusPillText, { color: Colors.success[600] }]}>مُعد</Text>
                    </View>
                  ) : (
                    <View style={[styles.statusPill, { backgroundColor: Colors.warning[50] }]}>
                      <AlertCircle size={14} color={Colors.warning[500]} strokeWidth={2} />
                      <Text style={[styles.statusPillText, { color: Colors.warning[600] }]}>غير مُعد</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              {/* Expanded settings form */}
              {isExpanded && (
                <View style={styles.settingsForm}>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>عنوان الـ API (URL)</Text>
                    <TextInput
                      style={styles.fieldInput}
                      placeholder="https://api.provider.com/v1/charge"
                      placeholderTextColor={Colors.textMuted}
                      value={setting?.api_url || ''}
                      onChangeText={(v) => updateField(provider.id, 'api_url', v)}
                      textAlign="left"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>API Key</Text>
                    <TextInput
                      style={styles.fieldInput}
                      placeholder="مفتاح الربط من المزود"
                      placeholderTextColor={Colors.textMuted}
                      value={setting?.api_key || ''}
                      onChangeText={(v) => updateField(provider.id, 'api_key', v)}
                      textAlign="left"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>API Token</Text>
                    <TextInput
                      style={styles.fieldInput}
                      placeholder="رمز المصادقة (Token)"
                      placeholderTextColor={Colors.textMuted}
                      value={setting?.api_token || ''}
                      onChangeText={(v) => updateField(provider.id, 'api_token', v)}
                      textAlign="left"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>API Secret</Text>
                    <TextInput
                      style={styles.fieldInput}
                      placeholder="المفتاح السري"
                      placeholderTextColor={Colors.textMuted}
                      value={setting?.api_secret || ''}
                      onChangeText={(v) => updateField(provider.id, 'api_secret', v)}
                      textAlign="left"
                      autoCapitalize="none"
                      autoCorrect={false}
                      secureTextEntry
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>معرف التاجر (Merchant ID)</Text>
                    <TextInput
                      style={styles.fieldInput}
                      placeholder="رمز التاجر لدى المزود"
                      placeholderTextColor={Colors.textMuted}
                      value={setting?.merchant_id || ''}
                      onChangeText={(v) => updateField(provider.id, 'merchant_id', v)}
                      textAlign="left"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  {/* Toggle active */}
                  <TouchableOpacity
                    style={styles.toggleRow}
                    onPress={() => handleToggleActive(provider.id)}
                  >
                    <Text style={styles.toggleLabel}>الربط مفعّل</Text>
                    <View style={[
                      styles.toggle,
                      setting?.is_active !== false && styles.toggleActive,
                    ]}>
                      <View style={[
                        styles.toggleKnob,
                        setting?.is_active !== false && styles.toggleKnobActive,
                      ]} />
                    </View>
                  </TouchableOpacity>

                  {/* Save button */}
                  <View style={styles.saveRow}>
                    {saveState === 'saved' && (
                      <View style={styles.savedBadge}>
                        <CheckCircle2 size={16} color={Colors.success[500]} strokeWidth={2} />
                        <Text style={styles.savedText}>تم الحفظ</Text>
                      </View>
                    )}
                    {saveState === 'error' && (
                      <View style={styles.errorBadge}>
                        <AlertCircle size={16} color={Colors.error[500]} strokeWidth={2} />
                        <Text style={styles.errorText}>فشل الحفظ</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={[styles.saveButton, saving === provider.id && styles.saveButtonDisabled]}
                      onPress={() => handleSave(provider.id)}
                      disabled={saving === provider.id}
                    >
                      {saving === provider.id ? (
                        <ActivityIndicator size="small" color={Colors.surface} />
                      ) : (
                        <>
                          <Save size={18} color={Colors.surface} strokeWidth={2} />
                          <Text style={styles.saveButtonText}>حفظ الإعدادات</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>
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
    gap: Spacing.md,
  },
  loadingText: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
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
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    backgroundColor: Colors.accent[50],
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  infoText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.accent[700],
    lineHeight: 20,
  },
  providerList: {
    gap: Spacing.sm,
  },
  providerCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.neutral[100],
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  providerDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerDotText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.md,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  providerCode: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  providerStatusRow: {
    alignItems: 'flex-end',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
  },
  statusPillText: {
    fontFamily: Fonts.medium,
    fontSize: 10,
  },
  settingsForm: {
    padding: Spacing.md,
    paddingTop: 0,
    gap: Spacing.md,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.xs,
    color: Colors.text,
  },
  fieldInput: {
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
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  savedText: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.xs,
    color: Colors.success[600],
  },
  errorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  errorText: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.xs,
    color: Colors.error[600],
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary[600],
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: Spacing.lg,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.sm,
    color: Colors.surface,
  },
});
