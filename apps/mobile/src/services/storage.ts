import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

const STORAGE_DIR = `${FileSystem.documentDirectory || ''}app_storage/`;

// In-memory fallback if file system is inaccessible
const memoryStore: Record<string, string> = {};

export const AppStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        return window.localStorage.getItem(key);
      }
      if (!FileSystem.documentDirectory) {
        return memoryStore[key] || null;
      }
      const fileUri = `${STORAGE_DIR}${encodeURIComponent(key)}.json`;
      const info = await FileSystem.getInfoAsync(fileUri);
      if (!info.exists) return null;
      return await FileSystem.readAsStringAsync(fileUri);
    } catch {
      return memoryStore[key] || null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      memoryStore[key] = value;
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.localStorage.setItem(key, value);
        return;
      }
      if (!FileSystem.documentDirectory) return;

      const dirInfo = await FileSystem.getInfoAsync(STORAGE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(STORAGE_DIR, { intermediates: true });
      }
      const fileUri = `${STORAGE_DIR}${encodeURIComponent(key)}.json`;
      await FileSystem.writeAsStringAsync(fileUri, value);
    } catch {
      // Memory store already updated
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      delete memoryStore[key];
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
        return;
      }
      if (!FileSystem.documentDirectory) return;

      const fileUri = `${STORAGE_DIR}${encodeURIComponent(key)}.json`;
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    } catch {
      // Memory store already deleted
    }
  },
};
