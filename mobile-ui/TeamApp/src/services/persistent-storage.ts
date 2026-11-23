import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

function webStorage(): Storage | null {
  return Platform.OS === 'web' && typeof globalThis.localStorage !== 'undefined' ? globalThis.localStorage : null;
}

export async function readPersistedJson<T>(key: string): Promise<T | null> {
  const storage = webStorage();
  const value = storage ? storage.getItem(key) : await SecureStore.getItemAsync(key);
  if (!value) return null;
  try { return JSON.parse(value) as T; } catch { return null; }
}

export async function writePersistedJson(key: string, value: unknown): Promise<void> {
  const serialized = JSON.stringify(value);
  const storage = webStorage();
  if (storage) storage.setItem(key, serialized);
  else await SecureStore.setItemAsync(key, serialized);
}
