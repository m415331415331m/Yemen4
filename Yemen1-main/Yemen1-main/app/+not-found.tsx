import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Fonts, Colors } from '@/lib/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'الصفحة غير موجودة' }} />
      <View style={styles.container}>
        <Text style={styles.text}>عذراً، هذه الصفحة غير موجودة</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>العودة للرئيسية</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: Colors.background },
  text: { fontSize: 18, fontFamily: Fonts.bold, color: Colors.text },
  link: { marginTop: 15, paddingVertical: 15 },
  linkText: { fontFamily: Fonts.medium, fontSize: 16, color: Colors.primary[600] },
});
