export type Chronotype = 'EARLY_BIRD' | 'MODERATE' | 'NIGHT_OWL';

export interface RoutineModel {
  id: string;
  userId?: string;
  name: string;
  wakeTime: string;  // "06:30"
  sleepTime: string; // "22:30"
  targetSleepHours: number;
  morningRoutineMinutes: number;
  eveningWindDownMinutes: number;
  chronotype: Chronotype;
  caffeineCutoffHoursBeforeSleep: number;
  caffeineCutoff?: string; // "14:00"
  windDownTime?: string;   // "21:30"
  secondWindStart?: string; // "16:30"
  secondWindEnd?: string;   // "18:00"
  naturalWakeTime?: string;
  isDefault?: boolean;
}

export interface DailyBiometrics {
  date: string;
  sleepHours: number;
  sleepHoursText: string; // e.g. "7h 12"
  hrvMs: number;
  restingHrBpm: number;
  readinessScore: number;
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

