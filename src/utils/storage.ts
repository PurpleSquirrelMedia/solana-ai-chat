import { Platform } from 'react-native';

// Lazy load SecureStore only on native platforms
let SecureStore: typeof import('expo-secure-store') | null = null;

if (Platform.OS !== 'web') {
  SecureStore = require('expo-secure-store');
}

// Cross-platform storage that uses SecureStore on native and localStorage on web
export const storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(key);
      }
      return await SecureStore!.getItemAsync(key);
    } catch (error) {
      console.warn(`Storage getItem error for ${key}:`, error);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
        return;
      }
      await SecureStore!.setItemAsync(key, value);
    } catch (error) {
      console.warn(`Storage setItem error for ${key}:`, error);
    }
  },

  async deleteItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(key);
        return;
      }
      await SecureStore!.deleteItemAsync(key);
    } catch (error) {
      console.warn(`Storage deleteItem error for ${key}:`, error);
    }
  },
};
