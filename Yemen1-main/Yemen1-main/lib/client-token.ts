import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'yemen_bills_client_token';

export async function getClientToken(): Promise<string> {
  try {
    let token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) {
      token = `anon-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      await AsyncStorage.setItem(TOKEN_KEY, token);
    }
    return token;
  } catch {
    return `anon-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  }
}
