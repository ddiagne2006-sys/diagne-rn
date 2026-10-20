import * as SecureStore from 'expo-secure-store';

// Jeton de l'appareil, uniquement dans SecureStore (jamais AsyncStorage ni journaux).
const KEY = 'viral.token';
let cached: string | null = null;

export async function loadToken(): Promise<string | null> {
  try {
    cached = await SecureStore.getItemAsync(KEY);
  } catch {
    cached = null;
  }
  return cached;
}

export const getToken = () => cached;

export async function saveToken(token: string): Promise<void> {
  cached = token;
  await SecureStore.setItemAsync(KEY, token);
}

export async function clearToken(): Promise<void> {
  cached = null;
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {
    // rien à effacer
  }
}
