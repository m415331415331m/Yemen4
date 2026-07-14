import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AdminUser } from '@/types/database';

const SESSION_KEY = 'rasidi_admin_session';

export type AdminSession = {
  user: AdminUser;
  loginAt: number;
};

export async function adminLogin(username: string, password: string): Promise<{ success: boolean; error?: string; user?: AdminUser }> {
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('username', username)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) {
      return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
    }

    const adminUser = data as AdminUser;

    // Verify password using the database's crypt function
    const { data: verifyData, error: verifyError } = await supabase
      .rpc('verify_admin_password', {
        input_password: password,
        stored_hash: adminUser.password_hash,
      });

    if (verifyError || !verifyData) {
      // Fallback: try direct comparison (for backwards compat)
      return { success: false, error: 'فشل التحقق من كلمة المرور' };
    }

    if (!verifyData) {
      return { success: false, error: 'كلمة المرور غير صحيحة' };
    }

    // Update last login
    await supabase
      .from('admin_users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', adminUser.id);

    // Save session
    const session: AdminSession = {
      user: adminUser,
      loginAt: Date.now(),
    };
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));

    // Log activity
    await supabase.from('admin_activity').insert({
      admin_id: adminUser.id,
      admin_username: adminUser.username,
      action: 'login',
      details: { timestamp: new Date().toISOString() },
    });

    return { success: true, user: adminUser };
  } catch {
    return { success: false, error: 'تعذر الاتصال بالخادم' };
  }
}

export async function adminLogout(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}

export async function getAdminSession(): Promise<AdminSession | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AdminSession;
    // Session expires after 24 hours
    if (Date.now() - session.loginAt > 24 * 60 * 60 * 1000) {
      await AsyncStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export async function createAdminAccount(
  username: string,
  password: string,
  displayName: string,
  role: 'admin' | 'super_admin' = 'admin'
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!username.trim() || !password.trim()) {
      return { success: false, error: 'يرجى إدخال جميع البيانات' };
    }
    if (password.length < 6) {
      return { success: false, error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' };
    }

    // Hash password using the database
    const { data: hash, error: hashError } = await supabase
      .rpc('hash_admin_password', { input_password: password });

    if (hashError || !hash) {
      return { success: false, error: 'تعذر إنشاء الحساب' };
    }

    const { error } = await supabase
      .from('admin_users')
      .insert({
        username: username.trim(),
        password_hash: hash,
        display_name: displayName.trim() || null,
        role,
        is_active: true,
      });

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'اسم المستخدم موجود مسبقاً' };
      }
      return { success: false, error: 'تعذر إنشاء الحساب' };
    }

    return { success: true };
  } catch {
    return { success: false, error: 'تعذر الاتصال بالخادم' };
  }
}

export async function logAdminActivity(
  adminId: string,
  adminUsername: string,
  action: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from('admin_activity').insert({
      admin_id: adminId,
      admin_username: adminUsername,
      action,
      details: details || {},
    });
  } catch {
    // Silent fail - logging is best-effort
  }
}
