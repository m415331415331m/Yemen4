import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Lock, User, Eye, EyeOff, ShieldCheck, ArrowRight, UserPlus, LogIn, X } from 'lucide-react-native';
import { Colors, Fonts, Radius, Spacing, Shadow, FontSizes } from '@/lib/theme';
import { adminLogin, getAdminSession, createAdminAccount, adminLogout } from '@/lib/admin-auth';

type Mode = 'login' | 'signup';

export default function AdminLoginScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    getAdminSession().then((session) => {
      if (session) {
        router.replace('/admin/dashboard');
      } else {
        setCheckingAuth(false);
      }
    });
  }, [router]);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }
    setError(null);
    setLoading(true);
    const result = await adminLogin(username.trim(), password);
    if (result.success) {
      router.replace('/admin/dashboard');
    } else {
      setError(result.error || 'فشل تسجيل الدخول');
    }
    setLoading(false);
  };

  const handleSignUp = async () => {
    if (!username.trim() || !password.trim()) {
      setError('يرجى إدخال جميع البيانات المطلوبة');
      return;
    }
    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    setError(null);
    setLoading(true);
    const result = await createAdminAccount(username.trim(), password, displayName.trim());
    if (result.success) {
      Alert.alert('تم', 'تم إنشاء حساب المسؤول بنجاح. يمكنك الآن تسجيل الدخول.', [
        { text: 'حسناً', onPress: () => { setMode('login'); setDisplayName(''); setPassword(''); } },
      ]);
    } else {
      setError(result.error || 'تعذر إنشاء الحساب');
    }
    setLoading(false);
  };

  if (checkingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      enabled
    >
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={[styles.logoIcon, Shadow.md]}>
            <ShieldCheck size={36} color={Colors.primary[600]} strokeWidth={2} />
          </View>
          <Text style={styles.logoTitle}>لوحة التحكم</Text>
          <Text style={styles.logoSubtitle}>رصيدي - الإدارة</Text>
        </View>

        {/* Mode tabs */}
        <View style={styles.modeTabs}>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'login' && styles.modeTabActive]}
            onPress={() => { setMode('login'); setError(null); }}
            activeOpacity={0.7}
          >
            <LogIn size={16} color={mode === 'login' ? Colors.surface : Colors.textSecondary} strokeWidth={2} />
            <Text style={[styles.modeTabText, mode === 'login' && styles.modeTabTextActive]}>تسجيل الدخول</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'signup' && styles.modeTabActive]}
            onPress={() => { setMode('signup'); setError(null); }}
            activeOpacity={0.7}
          >
            <UserPlus size={16} color={mode === 'signup' ? Colors.surface : Colors.textSecondary} strokeWidth={2} />
            <Text style={[styles.modeTabText, mode === 'signup' && styles.modeTabTextActive]}>حساب جديد</Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={[styles.formCard, Shadow.lg]}>
          {/* Username */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>اسم المستخدم</Text>
            <View style={styles.inputWrapper}>
              <User size={18} color={Colors.textMuted} strokeWidth={2} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="admin"
                placeholderTextColor={Colors.textMuted}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                textAlign="left"
              />
            </View>
          </View>

          {/* Display name (signup only) */}
          {mode === 'signup' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>الاسم المعروض (اختياري)</Text>
              <View style={styles.inputWrapper}>
                <ShieldCheck size={18} color={Colors.textMuted} strokeWidth={2} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="المدير"
                  placeholderTextColor={Colors.textMuted}
                  value={displayName}
                  onChangeText={setDisplayName}
                  textAlign="right"
                />
              </View>
            </View>
          )}

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>كلمة المرور</Text>
            <View style={styles.inputWrapper}>
              <Lock size={18} color={Colors.textMuted} strokeWidth={2} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                textAlign="left"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                {showPassword ? <EyeOff size={18} color={Colors.textMuted} strokeWidth={2} /> : <Eye size={18} color={Colors.textMuted} strokeWidth={2} />}
              </TouchableOpacity>
            </View>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <X size={16} color={Colors.error[600]} strokeWidth={2} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Action button */}
          <TouchableOpacity
            style={[styles.actionButton, loading && styles.actionButtonDisabled]}
            onPress={mode === 'login' ? handleLogin : handleSignUp}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={Colors.surface} size="small" />
            ) : (
              <>
                <Text style={styles.actionButtonText}>
                  {mode === 'login' ? 'دخول' : 'إنشاء حساب'}
                </Text>
                <ArrowRight size={18} color={Colors.surface} strokeWidth={2} />
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.securityNote}>
          هذه الصفحة مخصصة للمسؤولين فقط. جميع العمليات مشفرة وآمنة.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[900] },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.neutral[900] },
  logoSection: { alignItems: 'center', marginBottom: Spacing.xl },
  logoIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md },
  logoTitle: { fontFamily: Fonts.cairoBold, fontSize: FontSizes.xl, color: Colors.surface },
  logoSubtitle: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: Colors.neutral[400], marginTop: 4 },
  modeTabs: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg, backgroundColor: Colors.neutral[800], borderRadius: Radius.pill, padding: 4 },
  modeTab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.lg, paddingVertical: 10, borderRadius: Radius.pill },
  modeTabActive: { backgroundColor: Colors.primary[600] },
  modeTabText: { fontFamily: Fonts.medium, fontSize: FontSizes.sm, color: Colors.textSecondary },
  modeTabTextActive: { color: Colors.surface },
  formCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.xl, width: '100%', maxWidth: 420 },
  inputGroup: { gap: Spacing.sm, marginBottom: Spacing.md },
  label: { fontFamily: Fonts.medium, fontSize: FontSizes.sm, color: Colors.text },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.neutral[50], borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingRight: Spacing.md },
  inputIcon: { paddingLeft: Spacing.md, paddingRight: Spacing.sm },
  input: { flex: 1, paddingVertical: 14, fontSize: FontSizes.md, fontFamily: Fonts.regular, color: Colors.text },
  eyeButton: { padding: Spacing.sm },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.error[50], borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.error[100], marginBottom: Spacing.md },
  errorText: { flex: 1, fontFamily: Fonts.medium, fontSize: FontSizes.xs, color: Colors.error[600] },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.primary[600], borderRadius: Radius.md, paddingVertical: 16, marginTop: Spacing.sm },
  actionButtonDisabled: { opacity: 0.6 },
  actionButtonText: { fontFamily: Fonts.bold, fontSize: FontSizes.md, color: Colors.surface },
  securityNote: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: Colors.neutral[500], textAlign: 'center', marginTop: Spacing.xl, maxWidth: 350, lineHeight: 20 },
});
