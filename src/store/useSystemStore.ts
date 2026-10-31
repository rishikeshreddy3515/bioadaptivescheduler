import { create } from 'zustand';
import { STORAGE_KEYS, persistAtomEffect } from '../utils/storage';

export interface SystemState {
  // Atoms from ARCHITECTURE.md Section 5.1
  featureFlagsAtom: Record<string, boolean>;
  autoSaveAtom: boolean;
  currentRouteNameAtom: string;

  // Hydration & Status
  isHydrated: boolean;

  // Actions
  hydrate: () => Promise<void>;
  setFeatureFlag: (flag: string, enabled: boolean) => Promise<void>;
  setAutoSave: (enabled: boolean) => Promise<void>;
  setCurrentRouteName: (route: string) => void;
  resetSystemState: () => Promise<void>;
}

const featureFlagsPersistence = persistAtomEffect<Record<string, boolean>>(
  STORAGE_KEYS.featureFlagsAtom,
  { defaultValue: { aiSchedulerV6: true, healthConnectSync: true, experimentalSkiaCanvas: false } }
);

const autoSavePersistence = persistAtomEffect<boolean>(
  STORAGE_KEYS.autoSaveAtom,
  { defaultValue: true }
);

export const useSystemStore = create<SystemState>((set, get) => ({
  featureFlagsAtom: {
    aiSchedulerV6: true,
    healthConnectSync: true,
    experimentalSkiaCanvas: false,
  },
  autoSaveAtom: true,
  currentRouteNameAtom: 'Auth',
  isHydrated: false,

  hydrate: async () => {
    try {
      const [savedFlags, savedAutoSave] = await Promise.all([
        featureFlagsPersistence.load(),
        autoSavePersistence.load(),
      ]);

      set((state) => ({
        featureFlagsAtom: savedFlags ? { ...state.featureFlagsAtom, ...savedFlags } : state.featureFlagsAtom,
        autoSaveAtom: savedAutoSave !== null ? savedAutoSave : state.autoSaveAtom,
        isHydrated: true,
      }));
    } catch (err) {
      console.warn('[useSystemStore] Hydration warning:', err);
      set({ isHydrated: true });
    }
  },

  setFeatureFlag: async (flag: string, enabled: boolean) => {
    const updated = {
      ...get().featureFlagsAtom,
      [flag]: enabled,
    };
    set({ featureFlagsAtom: updated });
    await featureFlagsPersistence.save(updated);
  },

  setAutoSave: async (enabled: boolean) => {
    set({ autoSaveAtom: enabled });
    await autoSavePersistence.save(enabled);
  },

  setCurrentRouteName: (route: string) => {
    set({ currentRouteNameAtom: route });
  },

  resetSystemState: async () => {
    await Promise.all([
      featureFlagsPersistence.reset(),
      autoSavePersistence.reset(),
    ]);
    set({
      featureFlagsAtom: {
        aiSchedulerV6: true,
        healthConnectSync: true,
        experimentalSkiaCanvas: false,
      },
      autoSaveAtom: true,
      currentRouteNameAtom: 'Auth',
    });
  },
}));

