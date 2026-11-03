export type Chronotype = 'EARLY_BIRD' | 'MODERATE' | 'NIGHT_OWL';

export interface RoutineModel {
  id: string;
  userId?: string;
  user_id?: string;
  name?: string;
  wakeTime: string;  // "06:30"
  wake_time?: string;
  sleepTime: string; // "22:30"
  sleep_time?: string;
  targetSleepHours?: number;
  target_sleep_hours?: number;
  morningRoutineMinutes?: number;
  eveningWindDownMinutes?: number;
  chronotype?: Chronotype;
  caffeineCutoffHoursBeforeSleep?: number;
  caffeineCutoff?: string; // "14:00"
  caffeine_cutoff?: string;
  windDownTime?: string;   // "21:30"
  wind_down_time?: string;
  peakStart?: string;
  peak_start?: string;
  peakEnd?: string;
  peak_end?: string;
  slumpStart?: string;
  slump_start?: string;
  slumpEnd?: string;
  slump_end?: string;
  secondWindStart?: string; // "16:30"
  second_wind_start?: string;
  secondWindEnd?: string;   // "18:00"
  second_wind_end?: string;
  selected_boosters?: string[];
  naturalWakeTime?: string;
  isDefault?: boolean;
}

export interface DailyBiometrics {
  id?: string;
  userId?: string;
  user_id?: string;
  date: string;
  sleepHours: number;
  sleep_hours?: number;
  sleepHoursText?: string; // e.g. "7h 12"
  hrvMs: number;
  hrv_ms?: number;
  restingHrBpm: number;
  resting_hr_bpm?: number;
  readinessScore: number;
  readiness_score?: number;
}

export type BoostOptionType =
  | 'CAFFEINE'
  | 'POWER_NAP'
  | 'SUNLIGHT'
  | 'ZONE2_WORKOUT'
  | 'COLD_SHOWER'
  | 'BREATHWORK';

export interface BoostOption {
  id: string;
  type: BoostOptionType;
  label: string;
  icon: string;
  energyDelta: number; // e.g. +15, +20
  durationMinutes: number;
  scheduledTime: string; // "09:00"
  isActive: boolean;
  impactWindowHours: number; // how long it boosts energy
}

export interface TimelineSlotMap {
  [timeSlot: string]: {
    activeBoosts: BoostOption[];
    totalEnergyOffset: number;
  };
}

export interface CircadianPhaseInterval {
  name: string;
  start: string; // "06:30"
  end: string;   // "09:00"
  peak?: string; // "07:45"
  description: string;
  category: 'RECOVERY' | 'PEAK' | 'DIP' | 'TRANSITION';
  color: string;
}

export interface CircadianPhases {
  cortisolAwakening: CircadianPhaseInterval;
  morningPeakFocus: CircadianPhaseInterval;
  postprandialDip: CircadianPhaseInterval;
  afternoonPeak: CircadianPhaseInterval;
  melatoninOnset: CircadianPhaseInterval;
  sleepWindow: CircadianPhaseInterval;
}

export interface IdealMealWindow {
  name: 'Breakfast' | 'Lunch' | 'Dinner';
  start: string; // "07:30"
  end: string;   // "08:30"
  optimalTime: string;
  guidelines: string;
  glycemicTarget: 'LOW' | 'MODERATE';
}

export interface IdealMealsPlan {
  date: string;
  breakfast: IdealMealWindow;
  lunch: IdealMealWindow;
  dinner: IdealMealWindow;
}

export interface EnergyPoint {
  hour: number;          // 0 to 24
  time: string;          // "09:00"
  baselineScore: number; // 0 to 100
  boostedScore: number;  // 0 to 100 (with active boosts applied)
  phase: string;
  color: string;
}

export interface PhaseEmaData {
  date: string;
  cortisolRiseEma: string;
  peakHourEma: number;
  melatoninOnsetEma: string;
  confidenceScore: number;
}

