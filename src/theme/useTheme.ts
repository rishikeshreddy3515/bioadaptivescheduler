import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CadenceTheme,
  MoonlightTheme,
  DaylightTheme,
  ThemeMode,
  CadenceActivity,
  ACTIVITY_COLORS,
} from './colors';

interface ThemeState {
  mode: ThemeMode;
  theme: CadenceTheme;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  getActivityColor: (activity: CadenceActivity) => string;
}

const THEME_STORAGE_KEY = 'cadence_theme_mode';

export const useTheme = create<ThemeState>((set, get) => {
  // Try loading initial preference asynchronously
  AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
    if (stored === 'light' || stored === 'dark') {
      const isDark = stored === 'dark';
      set({
        mode: stored,
        isDark,
        theme: isDark ? MoonlightTheme : DaylightTheme,
      });
    }
  }).catch(() => {});

  return {
    mode: 'dark',
    theme: MoonlightTheme,
    isDark: true,
    setThemeMode: (mode: ThemeMode) => {
      const isDark = mode === 'dark';
      set({
        mode,
        isDark,
        theme: isDark ? MoonlightTheme : DaylightTheme,
      });
      AsyncStorage.setItem(THEME_STORAGE_KEY, mode).catch(() => {});
    },
    toggleTheme: () => {
      const nextMode: ThemeMode = get().mode === 'dark' ? 'light' : 'dark';
      get().setThemeMode(nextMode);
    },
    getActivityColor: (activity: CadenceActivity) => {
      const spec = ACTIVITY_COLORS[activity];
      if (!spec) return get().theme.primaryOlive;
      return get().isDark ? spec.dark : spec.light;
    },
  };
});

