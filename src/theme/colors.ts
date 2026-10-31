/**
 * CADENCE Botanical Theme & Color System
 * Strictly aligns with ARCHITECTURE.md and design_reference mockups
 */

export type ThemeMode = 'dark' | 'light';

export interface SurfaceTint {
  bg: string;
  text: string;
}

export interface CadenceTheme {
  mode: ThemeMode;
  background: string;
  primarySurface: string;
  secondarySurface: string;
  primaryOlive: string;
  butterAccent: string;
  text: string;
  secondaryText: string;
  border: string;
  cardGlassBg: string;
  cardGlassBorder: string;
  dotColor: string;
  tints: {
    oliveTint: SurfaceTint;
    peachTint: SurfaceTint;
    lavenderTint: SurfaceTint;
    tealTint: SurfaceTint;
  };
  indicators: {
    peak: string;
    meal: string;
    slump: string;
    caffeineCutoff: string;
    badgeRed: string;
  };
}

export const MoonlightTheme: CadenceTheme = {
  mode: 'dark',
  background: '#161C14',
  primarySurface: '#1D241A', // Deep botanical charcoal
  secondarySurface: '#262E21',
  primaryOlive: '#B7D36A',
  butterAccent: '#F2CC68',
  text: '#F5F5F5',
  secondaryText: '#A0A0A8',
  border: '#2E3829',
  cardGlassBg: 'rgba(255, 255, 255, 0.07)',
  cardGlassBorder: 'rgba(255, 255, 255, 0.14)',
  dotColor: 'rgba(255, 255, 255, 0.08)',
  tints: {
    oliveTint: { bg: '#2E3829', text: '#B9D49B' },
    peachTint: { bg: '#352923', text: '#EBB195' },
    lavenderTint: { bg: '#2C2638', text: '#C9BCEB' },
    tealTint: { bg: '#203235', text: '#95C9D1' },
  },
  indicators: {
    peak: '#2AD4F0',
    meal: '#68E78E',
    slump: '#FFC531',
    caffeineCutoff: '#FF3B30',
    badgeRed: '#FF3B30',
  },
};

export const DaylightTheme: CadenceTheme = {
  mode: 'light',
  background: '#F4F1EA',
  primarySurface: '#FCFBF7', // Clean, warm white
  secondarySurface: '#EDE9DF',
  primaryOlive: '#5B8A3C',
  butterAccent: '#C88A2B',
  text: '#161C14',
  secondaryText: '#7A8475',
  border: '#E4E0D5',
  cardGlassBg: 'rgba(255, 255, 255, 0.85)',
  cardGlassBorder: 'rgba(0, 0, 0, 0.08)',
  dotColor: 'rgba(0, 0, 0, 0.05)',
  tints: {
    oliveTint: { bg: '#E4E9D8', text: '#2E3B23' },
    peachTint: { bg: '#EFE3DC', text: '#6E3E2C' },
    lavenderTint: { bg: '#E6E2EE', text: '#4A3B69' },
    tealTint: { bg: '#DDEAE9', text: '#215359' },
  },
  indicators: {
    peak: '#1E9BB0',
    meal: '#3E9F5E',
    slump: '#D49B1E',
    caffeineCutoff: '#E03126',
    badgeRed: '#E03126',
  },
};

export type CadenceActivity =
  | 'deep_work'
  | 'creative_work'
  | 'learning'
  | 'exercise'
  | 'recovery'
  | 'meals'
  | 'administration'
  | 'personal';

export interface ActivityColorSpec {
  light: string;
  dark: string;
  label: string;
  description: string;
}

export const ACTIVITY_COLORS: Record<CadenceActivity, ActivityColorSpec> = {
  deep_work: {
    light: '#367E87',
    dark: '#64B5BE',
    label: 'Deep work',
    description: 'Concentration and uninterrupted work',
  },
  creative_work: {
    light: '#7E609B',
    dark: '#B592D6',
    label: 'Creative work',
    description: 'Design, writing and creative tasks',
  },
  learning: {
    light: '#66759B',
    dark: '#9CAAD6',
    label: 'Learning',
    description: 'Reading, studying and research',
  },
  exercise: {
    light: '#AC5B47',
    dark: '#E5856B',
    label: 'Exercise',
    description: 'Gym, sports and physical activity',
  },
  recovery: {
    light: '#557D48',
    dark: '#8FC476',
    label: 'Recovery',
    description: 'Rest, walks and breaks',
  },
  meals: {
    light: '#A67B37',
    dark: '#E2B857',
    label: 'Meals',
    description: 'Breakfast, lunch and dinner',
  },
  administration: {
    light: '#6E6C85',
    dark: '#ACA7C9',
    label: 'Administration',
    description: 'Emails, meetings and routine work',
  },
  personal: {
    light: '#9E5A75',
    dark: '#D885A3',
    label: 'Personal',
    description: 'Personal commitments and hobbies',
  },
};

