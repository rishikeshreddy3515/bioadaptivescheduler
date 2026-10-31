import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Storage Keys derived from ARCHITECTURE.md Section 4.1 & Section 5.1
 * Backed by the native Android catalystLocalStorage SQLite table.
 */
export const STORAGE_KEYS = {
  // Session & Identity Keys
  userToken: 'userToken',
  refreshToken: 'refreshToken',
  userId: 'userId',
  deviceGroupId: 'deviceGroupId',

  // Preferences & Onboarding State
  userPreferencesAtom: 'userPreferencesAtom',
  hasCompletedOnboarding: 'hasCompletedOnboarding',
  hasConfiguredHealthConnect: 'hasConfiguredHealthConnect',

  // Calendar State Atoms (ARCHITECTURE.md Section 5.1)
  visibleCalendarIdsAtom: 'visibleCalendarIdsAtom',
  selectedDateAtom: 'selectedDateAtom',

  // Energy & Circadian Atoms (ARCHITECTURE.md Section 4.1 & 5.1)
  activeRoutineAtom: 'activeRoutineAtom',
  selectedEnergyBoostOptionsAtom: 'selectedEnergyBoostOptionsAtom',

  // Synchronization Telemetry
  lastSyncTimestamp_google: 'lastSyncTimestamp_google',
  lastSyncTimestamp_outlook: 'lastSyncTimestamp_outlook',
  pendingTaskMutations: 'pendingTaskMutations',

  // Tasks & Projects Atoms (ARCHITECTURE.md Section 4.1 & 5.1)
  hasFirstTodoSyncFinishedAtom: 'hasFirstTodoSyncFinishedAtom',
  processedIdsAtom: 'processedIdsAtom',
  tasksAtom: 'tasksAtom',
  taskProjectsAtom: 'taskProjectsAtom',
  taskLabelsAtom: 'taskLabelsAtom',

  // System State Keys (Section 5.1)
  featureFlagsAtom: 'featureFlagsAtom',
  autoSaveAtom: 'autoSaveAtom',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS] | (string & {});

/**
 * Low-level typed storage operations
 */
export const storage = {
  async get<T = any>(key: StorageKey): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value === null) return null;
      return JSON.parse(value) as T;
    } catch (err) {
      console.warn(`[persistAtomEffect] Failed to read persisted value for key "${key}":`, err);
      return null;
    }
  },

  async set<T = any>(key: StorageKey, value: T): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await AsyncStorage.setItem(key, serialized);
    } catch (err) {
      console.warn(`[persistAtomEffect] Failed to persist value for key "${key}":`, err);
    }
  },

  async remove(key: StorageKey): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (err) {
      console.warn(`[persistAtomEffect] Failed to remove persisted value for key "${key}":`, err);
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (err) {
      console.warn('[persistAtomEffect] Failed to clear storage:', err);
    }
  },
};

/**
 * Persist Effect Helper
 * Reconstructed from Hermes Bytecode (HBC v96) string tables:
 * Cites ARCHITECTURE.md Section 5.2 [persistAtomEffect]
 */
export interface PersistEffectOptions<T> {
  key: StorageKey;
  onHydrate?: (value: T) => void;
  defaultValue?: T;
}

export const persistAtomEffect = <T>(key: StorageKey, options?: { defaultValue?: T }) => {
  return {
    async load(): Promise<T | null> {
      try {
        const item = await AsyncStorage.getItem(key);
        if (item != null) {
          return JSON.parse(item) as T;
        }
        return options?.defaultValue ?? null;
      } catch (err) {
        console.warn(`[persistAtomEffect] Failed to read persisted value for key "${key}"`);
        return options?.defaultValue ?? null;
      }
    },

    async save(newValue: T | null | undefined): Promise<void> {
      try {
        if (newValue === null || newValue === undefined) {
          await AsyncStorage.removeItem(key);
        } else {
          const serialized = JSON.stringify(newValue);
          await AsyncStorage.setItem(key, serialized);
        }
      } catch (err) {
        console.warn(`[persistAtomEffect] Failed to persist value for key "${key}"`);
      }
    },

    async reset(): Promise<void> {
      try {
        await AsyncStorage.removeItem(key);
      } catch (err) {
        console.warn(`[persistAtomEffect] Failed to remove persisted value for key "${key}"`);
      }
    },
  };
};

