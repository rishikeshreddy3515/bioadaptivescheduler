import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as AuthSession from 'expo-auth-session';

// Polyfill global crypto.getRandomValues for Hermes & Supabase PKCE state generation
if (typeof globalThis.crypto !== 'object') {
  (globalThis as any).crypto = {};
}
if (typeof (globalThis.crypto as any).getRandomValues !== 'function') {
  (globalThis.crypto as any).getRandomValues = (array: any) => Crypto.getRandomValues(array);
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const isSupabaseConfigured = (): boolean => {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key && url.trim().length > 0 && key.trim().length > 0);
};

/**
 * Custom dual-storage adapter for Supabase to persist PKCE state & session securely across app switches
 * Writes to both SecureStore and AsyncStorage to guarantee persistence even if OS clears memory.
 */
export const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const val = await SecureStore.getItemAsync(key);
      if (val !== null) return val;
      return await AsyncStorage.getItem(key);
    } catch {
      return await AsyncStorage.getItem(key);
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await Promise.all([
        SecureStore.setItemAsync(key, value).catch(() => {}),
        AsyncStorage.setItem(key, value).catch(() => {}),
      ]);
    } catch {
      await AsyncStorage.setItem(key, value).catch(() => {});
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(key).catch(() => {}),
        AsyncStorage.removeItem(key).catch(() => {}),
      ]);
    } catch {
      await AsyncStorage.removeItem(key).catch(() => {});
    }
  },
};

/**
 * Automatically generates exp://... in Expo Go and mylifestack://... in standalone builds
 */
export const getAuthRedirectUri = (): string => {
  return AuthSession.makeRedirectUri({
    scheme: 'mylifestack',
    path: 'auth/callback',
    preferLocalhost: false,
  });
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Handled manually in AuthScreen
    flowType: 'pkce',
  },
});
