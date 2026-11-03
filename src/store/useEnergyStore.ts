import { create } from 'zustand';
import { STORAGE_KEYS, persistAtomEffect } from '../utils/storage';
import {
  RoutineModel,
  DailyBiometrics,
  BoostOption,
  TimelineSlotMap,
  CircadianPhases,
  IdealMealsPlan,
  EnergyPoint,
} from '../types/energy';
import {
  DEFAULT_ROUTINE,
  DEFAULT_BIOMETRICS,
  DEFAULT_BOOST_OPTIONS,
  calculateCircadianPhases,
  compute24HourEnergyCurve,
  energyService,
} from '../api/energyService';

export interface EnergyState {
  // Atoms from ARCHITECTURE.md Section 5.1
  activeRoutineAtom: RoutineModel;
  boostingEnergyAtom: boolean;
  selectedEnergyBoostOptionsAtom: BoostOption[];
  energyboostOptionsTimelineAtom: TimelineSlotMap;

  // Live Biometrics & Cached remote data
  dailyBiometrics: DailyBiometrics;
  idealMealsPlan: IdealMealsPlan | null;
  isLoading: boolean;
  isHydrated: boolean;

  // Actions
  hydrate: () => Promise<void>;
  fetchDailyBiometrics: (dateStr?: string) => Promise<DailyBiometrics>;
  fetchRoutine: (userId?: string) => Promise<RoutineModel>;
  setActiveRoutine: (routine: RoutineModel) => Promise<void>;
  toggleBoostOption: (boostId: string) => Promise<void>;
  setBoostingEnergy: (boosting: boolean) => void;
  fetchCircadianData: (dateStr?: string) => Promise<void>;

  // Selectors (Available on state and as independent functions)
  circadianPhaseSelector: () => CircadianPhases;
  energyTimelineSelector: () => EnergyPoint[];
  currentEnergyScoreSelector: () => { score: number; phaseName: string; color: string };
}

const activeRoutinePersistence = persistAtomEffect<RoutineModel>(
  STORAGE_KEYS.activeRoutineAtom,
  { defaultValue: DEFAULT_ROUTINE }
);

const selectedBoostsPersistence = persistAtomEffect<BoostOption[]>(
  STORAGE_KEYS.selectedEnergyBoostOptionsAtom,
  { defaultValue: DEFAULT_BOOST_OPTIONS }
);

/**
 * Compute TimelineSlotMap from selected active boosts
 */
const deriveTimelineSlotMap = (boosts: BoostOption[]): TimelineSlotMap => {
  const map: TimelineSlotMap = {};
  for (const boost of boosts) {
    if (!boost.isActive) continue;
    const slotKey = boost.scheduledTime;
    if (!map[slotKey]) {
      map[slotKey] = {
        activeBoosts: [],
        totalEnergyOffset: 0,
      };
    }
    map[slotKey].activeBoosts.push(boost);
    map[slotKey].totalEnergyOffset += boost.energyDelta;
  }
  return map;
};

export const useEnergyStore = create<EnergyState>((set, get) => ({
  // Section 5.1 Atoms
  activeRoutineAtom: DEFAULT_ROUTINE,
  boostingEnergyAtom: false,
  selectedEnergyBoostOptionsAtom: DEFAULT_BOOST_OPTIONS,
  energyboostOptionsTimelineAtom: deriveTimelineSlotMap(DEFAULT_BOOST_OPTIONS),

  dailyBiometrics: DEFAULT_BIOMETRICS,
  idealMealsPlan: null,
  isLoading: false,
  isHydrated: false,

  hydrate: async () => {
    try {
      const [savedRoutine, savedBoosts] = await Promise.all([
        activeRoutinePersistence.load(),
        selectedBoostsPersistence.load(),
      ]);

      const routine = savedRoutine || DEFAULT_ROUTINE;
      const boosts = savedBoosts && savedBoosts.length > 0 ? savedBoosts : DEFAULT_BOOST_OPTIONS;
      const timelineMap = deriveTimelineSlotMap(boosts);

      set({
        activeRoutineAtom: routine,
        selectedEnergyBoostOptionsAtom: boosts,
        energyboostOptionsTimelineAtom: timelineMap,
        isHydrated: true,
      });

      // Concurrently query live routine & biometrics from Supabase
      await Promise.all([
        get().fetchRoutine(),
        get().fetchDailyBiometrics(),
        get().fetchCircadianData(),
      ]);
    } catch (err) {
      console.warn('[useEnergyStore] Hydration error:', err);
      set({ isHydrated: true });
    }
  },

  fetchDailyBiometrics: async (dateStr?: string): Promise<DailyBiometrics> => {
    try {
      const bio = await energyService.fetchDailyBiometrics(dateStr);
      set({ dailyBiometrics: bio });
      return bio;
    } catch (e) {
      console.warn('fetchDailyBiometrics error:', e);
      return get().dailyBiometrics;
    }
  },

  fetchRoutine: async (userId?: string): Promise<RoutineModel> => {
    try {
      const remoteRoutine = await energyService.fetchRoutine(userId);
      set({ activeRoutineAtom: remoteRoutine });
      await activeRoutinePersistence.save(remoteRoutine);
      return remoteRoutine;
    } catch (e) {
      console.warn('fetchRoutine error:', e);
      return get().activeRoutineAtom;
    }
  },

  setActiveRoutine: async (routine: RoutineModel) => {
    set({ activeRoutineAtom: routine });
    await activeRoutinePersistence.save(routine);
    try {
      await energyService.saveRoutine(routine);
    } catch (e) {
      console.log('[useEnergyStore] Error saving routine to Supabase:', e);
    }
    await get().fetchCircadianData();
  },

  toggleBoostOption: async (boostId: string) => {
    const current = get().selectedEnergyBoostOptionsAtom;
    const updated = current.map((b) =>
      b.id === boostId ? { ...b, isActive: !b.isActive } : b
    );
    const timelineMap = deriveTimelineSlotMap(updated);

    set({
      selectedEnergyBoostOptionsAtom: updated,
      energyboostOptionsTimelineAtom: timelineMap,
    });

    await selectedBoostsPersistence.save(updated);
  },

  setBoostingEnergy: (boosting: boolean) => {
    set({ boostingEnergyAtom: boosting });
  },

  fetchCircadianData: async (dateStr?: string) => {
    const todayStr = dateStr || new Date().toISOString().split('T')[0];
    const { activeRoutineAtom } = get();
    set({ isLoading: true });

    try {
      const meals = await energyService.generateIdealMeals(activeRoutineAtom, todayStr);
      set({
        idealMealsPlan: meals,
        isLoading: false,
      });
    } catch (err) {
      console.warn('Failed to fetch circadian data:', err);
      set({ isLoading: false });
    }
  },

  // Derived Selector: circadianPhaseSelector (ARCHITECTURE.md Section 5)
  circadianPhaseSelector: () => {
    return calculateCircadianPhases(get().activeRoutineAtom);
  },

  // Derived Selector: energyTimelineSelector (ARCHITECTURE.md Section 5)
  energyTimelineSelector: () => {
    const { activeRoutineAtom, selectedEnergyBoostOptionsAtom } = get();
    return compute24HourEnergyCurve(activeRoutineAtom, selectedEnergyBoostOptionsAtom);
  },

  // Current real-time energy score selector
  currentEnergyScoreSelector: () => {
    const curve = get().energyTimelineSelector();
    const now = new Date();
    const currentHourFloat = now.getHours() + now.getMinutes() / 60;

    // Find nearest curve point
    let closestPoint = curve[0];
    let minDiff = 999;
    for (const point of curve) {
      const diff = Math.abs(point.hour - currentHourFloat);
      if (diff < minDiff) {
        minDiff = diff;
        closestPoint = point;
      }
    }

    return {
      score: closestPoint.boostedScore,
      phaseName: closestPoint.phase,
      color: closestPoint.color,
    };
  },
}));

