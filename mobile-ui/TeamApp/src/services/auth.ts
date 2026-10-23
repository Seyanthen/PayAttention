import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const AUTH_TOKEN_KEY = 'pay-attention.auth-token';

let authToken: string | null = null;
let mockAuthenticated = false;

function getWebStorage(): Storage | null {
  if (Platform.OS !== 'web' || typeof globalThis.localStorage === 'undefined') {
    return null;
  }
  return globalThis.localStorage;
}

async function readStoredToken(): Promise<string | null> {
  const webStorage = getWebStorage();
  if (webStorage) {
    return webStorage.getItem(AUTH_TOKEN_KEY);
  }
  return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
}

async function removeStoredToken(): Promise<void> {
  const webStorage = getWebStorage();
  if (webStorage) {
    webStorage.removeItem(AUTH_TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  authToken = token;
}

export async function persistAuthToken(token: string): Promise<void> {
  const webStorage = getWebStorage();
  if (webStorage) {
    webStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
  }
}

export async function restoreAuthToken(): Promise<string | null> {
  try {
    const token = await readStoredToken();
    authToken = token;
    mockAuthenticated = false;
    return token;
  } catch {
    // A storage failure must not leave a stale in-memory token active.
    authToken = null;
    mockAuthenticated = false;
    return null;
  }
}

export function getAuthToken(): string | null {
  return authToken;
}

export function clearAuthToken(): void {
  authToken = null;
}

export function enableMockAuthentication(): boolean {
  if (!__DEV__) {
    return false;
  }

  mockAuthenticated = true;
  return true;
}

export function isMockAuthenticated(): boolean {
  return mockAuthenticated;
}

export function isAuthenticated(): boolean {
  return Boolean(authToken) || mockAuthenticated;
}

export async function logout(): Promise<void> {
  clearAuthToken();
  mockAuthenticated = false;
  await removeStoredToken();
}

export async function clearPersistedAuthToken(): Promise<void> {
  try {
    await removeStoredToken();
  } catch {
    // Storage cleanup is best effort when a request has already returned 401.
  }
}
