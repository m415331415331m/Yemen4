import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function AdminLinkScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin');
  }, [router]);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>جاري التحويل إلى لوحة التحكم...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F7F6',
  },
  text: {
    fontSize: 16,
    color: '#52595F',
  },
});
