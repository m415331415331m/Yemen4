import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react-native';
import { Colors, Fonts, Radius, Spacing, Shadow, FontSizes } from '@/lib/theme';

type PaymentStatus = 'processing' | 'success' | 'failed';

type Props = {
  visible: boolean;
  status: PaymentStatus;
  message?: string;
  receiptNumber?: string;
  onClose: () => void;
  onViewReceipt?: () => void;
};

export function PaymentResultModal({
  visible,
  status,
  message,
  receiptNumber,
  onClose,
  onViewReceipt,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, Shadow.lg]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={20} color={Colors.neutral[400]} strokeWidth={2} />
          </TouchableOpacity>

          {status === 'processing' && (
            <View style={styles.content}>
              <ActivityIndicator size={56} color={Colors.primary[500]} />
              <Text style={styles.title}>جاري معالجة الدفع...</Text>
              <Text style={styles.subtitle}>
                نتواصل مع مزود الخدمة، يرجى الانتظار
              </Text>
            </View>
          )}

          {status === 'success' && (
            <View style={styles.content}>
              <View style={[styles.statusIcon, { backgroundColor: Colors.success[50] }]}>
                <CheckCircle2 size={48} color={Colors.success[500]} strokeWidth={2} />
              </View>
              <Text style={styles.title}>تمت العملية بنجاح</Text>
              {receiptNumber && (
                <View style={styles.receiptBox}>
                  <Text style={styles.receiptLabel}>رقم الإيصال</Text>
                  <Text style={styles.receiptNumber}>{receiptNumber}</Text>
                </View>
              )}
              {message && <Text style={styles.subtitle}>{message}</Text>}
              <View style={styles.buttonRow}>
                {onViewReceipt && (
                  <TouchableOpacity
                    style={[styles.button, styles.buttonPrimary]}
                    onPress={onViewReceipt}
                  >
                    <Text style={styles.buttonPrimaryText}>عرض الإيصال</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.button, styles.buttonSecondary]}
                  onPress={onClose}
                >
                  <Text style={styles.buttonSecondaryText}>إغلاق</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {status === 'failed' && (
            <View style={styles.content}>
              <View style={[styles.statusIcon, { backgroundColor: Colors.error[50] }]}>
                <AlertCircle size={48} color={Colors.error[500]} strokeWidth={2} />
              </View>
              <Text style={styles.title}>فشلت العملية</Text>
              <Text style={styles.subtitle}>{message ?? 'تعذرت عملية السداد، يرجى المحاولة مرة أخرى'}</Text>
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary, { flex: 1 }]}
                onPress={onClose}
              >
                <Text style={styles.buttonPrimaryText}>حاول مرة أخرى</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(14,16,18,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 380,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    padding: Spacing.xs,
    zIndex: 1,
  },
  content: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingTop: Spacing.md,
  },
  statusIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xl,
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  receiptBox: {
    backgroundColor: Colors.neutral[50],
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    width: '100%',
  },
  receiptLabel: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  receiptNumber: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    color: Colors.primary[600],
    letterSpacing: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
  },
  button: {
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: Colors.primary[600],
    flex: 1,
  },
  buttonPrimaryText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.sm,
    color: Colors.surface,
  },
  buttonSecondary: {
    backgroundColor: Colors.neutral[100],
    flex: 1,
  },
  buttonSecondaryText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
});
