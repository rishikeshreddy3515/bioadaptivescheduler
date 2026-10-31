import { supabase, isSupabaseConfigured } from './supabaseClient';
import {
  RoutineModel,
  DailyBiometrics,
  BoostOption,
  CircadianPhases,
  IdealMealsPlan,
  EnergyPoint,
  PhaseEmaData,
} from '../types/energy';

export const DEFAULT_ROUTINE: RoutineModel = {
  id: 'routine-default',
  name: 'Circadian Baseline',
  wakeTime: '06:30',
  sleepTime: '22:30',
  targetSleepHours: 8,
  morningRoutineMinutes: 45,
  eveningWindDownMinutes: 60,
  chronotype: 'MODERATE',
  caffeineCutoffHoursBeforeSleep: 9,
  caffeineCutoff: '14:00',
  windDownTime: '21:30',
  secondWindStart: '16:30',
  secondWindEnd: '18:00',
  naturalWakeTime: '06:30',
  isDefault: true,
};

export const DEFAULT_BIOMETRICS: DailyBiometrics = {
  date: new Date().toISOString().split('T')[0],
  sleepHours: 7.2,
  sleepHoursText: '7h 12',
  hrvMs: 64,
  restingHrBpm: 64,
  readinessScore: 82,
};

export const DEFAULT_BOOST_OPTIONS: BoostOption[] = [
  {
    id: 'boost-sunlight',
    type: 'SUNLIGHT',
    label: 'Morning Sunlight',
    icon: '☀️',
    energyDelta: 16,
    durationMinutes: 20,
    scheduledTime: '07:15',
    isActive: true,
    impactWindowHours: 2.5,
  },
  {
    id: 'boost-caffeine',
    type: 'CAFFEINE',
    label: 'Strategic Caffeine',
    icon: '☕',
    energyDelta: 22,
    durationMinutes: 15,
    scheduledTime: '08:45',
    isActive: true,
    impactWindowHours: 4.0,
  },
  {
    id: 'boost-nap',
    type: 'POWER_NAP',
    label: 'NSDR / Power Nap',
    icon: '🧘',
    energyDelta: 18,
    durationMinutes: 20,
    scheduledTime: '13:45',
    isActive: false,
    impactWindowHours: 2.0,
  },
  {
    id: 'boost-workout',
    type: 'ZONE2_WORKOUT',
    label: 'Zone 2 Cardio / Lift',
    icon: '⚡',
    energyDelta: 24,
    durationMinutes: 45,
    scheduledTime: '17:15',
    isActive: true,
    impactWindowHours: 3.0,
  },
];

/**
 * Time utility functions
 */
const timeToDecimalHour = (timeStr: string): number => {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) + (m || 0) / 60;
};

const decimalHourToTime = (hour: number): string => {
  const normalized = (hour + 24) % 24;
  const h = Math.floor(normalized);
  const m = Math.round((normalized - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/**
 * Compute mathematical circadian phases anchored to wakeTime & sleepTime
 */
export const calculateCircadianPhases = (routine: RoutineModel): CircadianPhases => {
  const wakeH = timeToDecimalHour(routine.wakeTime);
  const sleepH = timeToDecimalHour(routine.sleepTime);

  // Cortisol awakening response: wake to +1.5h
  const cortisolStart = wakeH;
  const cortisolEnd = wakeH + 1.5;
  const cortisolPeak = wakeH + 0.75;

  // Morning peak cognitive focus: +2.5h to +5.5h after wake
  const morningPeakStart = wakeH + 2.5;
  const morningPeakEnd = wakeH + 5.5;

  // Postprandial energy slump: +6.5h to +8.5h after wake
  const dipStart = wakeH + 6.5;
  const dipEnd = wakeH + 8.5;

  // Afternoon secondary peak: +9.5h to +12.0h after wake
  const afternoonPeakStart = wakeH + 9.5;
  const afternoonPeakEnd = wakeH + 12.0;

  // Melatonin onset: 2 hours prior to sleepTime
  const melatoninStart = sleepH - 2.0;
  const melatoninEnd = sleepH;

  return {
    cortisolAwakening: {
      name: 'Cortisol Awakening Response',
      start: decimalHourToTime(cortisolStart),
      end: decimalHourToTime(cortisolEnd),
      peak: decimalHourToTime(cortisolPeak),
      description: 'Morning cortisol surge anchors biological clock & clears sleep inertia.',
      category: 'TRANSITION',
      color: '#10B981',
    },
    morningPeakFocus: {
      name: 'Peak Cognitive Bandwidth',
      start: decimalHourToTime(morningPeakStart),
      end: decimalHourToTime(morningPeakEnd),
      description: 'Maximum prefrontal cortex alertness; ideal for complex problem solving.',
      category: 'PEAK',
      color: '#38BDF8',
    },
    postprandialDip: {
      name: 'Circadian Postprandial Trough',
      start: decimalHourToTime(dipStart),
      end: decimalHourToTime(dipEnd),
      description: 'Adenosine load dip and digestive blood diversion; schedule admin or rest.',
      category: 'DIP',
      color: '#F59E0B',
    },
    afternoonPeak: {
      name: 'Physical & Creative Rebound',
      start: decimalHourToTime(afternoonPeakStart),
      end: decimalHourToTime(afternoonPeakEnd),
      description: 'Peak body temperature, reaction speed, and physical endurance.',
      category: 'PEAK',
      color: '#06B6D4',
    },
    melatoninOnset: {
      name: 'Dim Light Melatonin Onset',
      start: decimalHourToTime(melatoninStart),
      end: decimalHourToTime(melatoninEnd),
      description: 'Pineal gland initiates melatonin synthesis; restrict blue photons.',
      category: 'RECOVERY',
      color: '#818CF8',
    },
    sleepWindow: {
      name: 'Sleep & Neuro-Restoration',
      start: decimalHourToTime(sleepH),
      end: decimalHourToTime(wakeH),
      description: 'Glymphatic waste clearance, cellular repair, and memory consolidation.',
      category: 'RECOVERY',
      color: '#475569',
    },
  };
};

/**
 * Generate 24-hour mathematical diurnal curve combining baseline and active boosts
 */
export const compute24HourEnergyCurve = (
  routine: RoutineModel,
  boosts: BoostOption[]
): EnergyPoint[] => {
  const wakeH = timeToDecimalHour(routine.wakeTime);
  const sleepH = timeToDecimalHour(routine.sleepTime);
  const points: EnergyPoint[] = [];

  for (let i = 0; i <= 24; i += 0.5) {
    const hour = i % 24;
    const timeStr = decimalHourToTime(hour);

    // Compute baseline diurnal score (0 to 100)
    let baseline = 20; // default nocturnal floor
    let phase = 'Rest & Sleep';
    let color = '#475569';

    // Sleep state
    const isSleeping =
      sleepH > wakeH ? hour >= sleepH || hour < wakeH : hour >= sleepH && hour < wakeH;

    if (!isSleeping) {
      // Calculate hours awake
      const hoursAwake = (hour - wakeH + 24) % 24;

      if (hoursAwake < 1.5) {
        // Cortisol rise
        const progress = hoursAwake / 1.5;
        baseline = 25 + progress * 45; // 25 -> 70
        phase = 'Cortisol Rise';
        color = '#10B981';
      } else if (hoursAwake >= 1.5 && hoursAwake < 5.5) {
        // Peak cognitive
        const center = 3.5;
        const dist = Math.abs(hoursAwake - center);
        baseline = 92 - dist * 4; // 84 -> 92
        phase = 'Peak Focus';
        color = '#38BDF8';
      } else if (hoursAwake >= 5.5 && hoursAwake < 8.5) {
        // Postprandial dip
        const dipCenter = 7.0;
        const dipDepth = Math.max(0, 1 - Math.abs(hoursAwake - dipCenter) / 1.5);
        baseline = 75 - dipDepth * 28; // dips down to ~47
        phase = 'Energy Dip';
        color = '#F59E0B';
      } else if (hoursAwake >= 8.5 && hoursAwake < 12.5) {
        // Afternoon rebound
        const reboundCenter = 10.5;
        const dist = Math.abs(hoursAwake - reboundCenter);
        baseline = 84 - dist * 5; // 74 -> 84
        phase = 'Afternoon Rebound';
        color = '#06B6D4';
      } else {
        // Wind-down to melatonin
        const remainingHours = (sleepH - hour + 24) % 24;
        baseline = Math.max(22, 35 + remainingHours * 12);
        phase = 'Melatonin Wind Down';
        color = '#818CF8';
      }
    }

    // Apply Active Boost Option Delays & Gaussians
    let boostDelta = 0;
    for (const b of boosts) {
      if (!b.isActive) continue;
      const boostH = timeToDecimalHour(b.scheduledTime);
      const hoursSinceBoost = (hour - boostH + 24) % 24;

      if (hoursSinceBoost >= 0 && hoursSinceBoost <= b.impactWindowHours) {
        // Smooth parabolic / half-sine boost dissipation
        const factor = Math.sin((Math.PI * hoursSinceBoost) / b.impactWindowHours);
        boostDelta += b.energyDelta * factor;
      }
    }

    const boostedScore = Math.min(100, Math.round(baseline + boostDelta));

    points.push({
      hour,
      time: timeStr,
      baselineScore: Math.round(baseline),
      boostedScore,
      phase,
      color,
    });
  }

  return points;
};

/**
 * Circadian & Energy API Service (mirroring ARCHITECTURE.md 3.3.B & 3.3.D)
 */
export const energyService = {
  /**
   * GET /api/v1/circadian/
   * Fetch/compute circadian phases (melatonin onset, cortisol awakening, peak focus)
   */
  async getCircadianModel(routine: RoutineModel = DEFAULT_ROUTINE): Promise<CircadianPhases> {
    if (!isSupabaseConfigured()) {
      return calculateCircadianPhases(routine);
    }

    try {
      const { data, error } = await supabase
        .from('routines')
        .select('*')
        .eq('is_default', true)
        .limit(1)
        .single();

      if (data && !error) {
        const fetchedRoutine: RoutineModel = {
          id: data.id,
          name: data.name,
          wakeTime: data.wake_time,
          sleepTime: data.sleep_time,
          targetSleepHours: data.target_sleep_hours || 8,
          morningRoutineMinutes: data.morning_routine_minutes || 45,
          eveningWindDownMinutes: data.evening_wind_down_minutes || 60,
          chronotype: data.chronotype || 'MODERATE',
          caffeineCutoffHoursBeforeSleep: data.caffeine_cutoff_hours || 9,
          naturalWakeTime: data.natural_wake_time || data.wake_time,
        };
        return calculateCircadianPhases(fetchedRoutine);
      }
    } catch (err) {
      console.warn('[/api/v1/circadian/] Routine fetch error, using local computation:', err);
    }

    return calculateCircadianPhases(routine);
  },

  /**
   * GET /api/v1/energy/trend/{dataTrendId}/
   * Longitudinal energy curve calculations for target date
   */
  async getEnergyTrend(
    dateStr: string,
    routine: RoutineModel = DEFAULT_ROUTINE,
    boosts: BoostOption[] = DEFAULT_BOOST_OPTIONS
  ): Promise<EnergyPoint[]> {
    if (!isSupabaseConfigured()) {
      return compute24HourEnergyCurve(routine, boosts);
    }

    try {
      const { data, error } = await supabase
        .from('energy_trends')
        .select('*')
        .eq('date', dateStr)
        .limit(1)
        .single();

      if (data && !error && data.curve_points) {
        return data.curve_points as EnergyPoint[];
      }
    } catch (err) {
      console.warn('[/api/v1/energy/trend/] Energy trend fetch error, synthesizing curve:', err);
    }

    return compute24HourEnergyCurve(routine, boosts);
  },

  /**
   * GET /api/v1/calendar/events/phaseEmasByDate
   * Exponential moving averages of daily circadian phases
   */
  async getPhaseEmasByDate(dateStr: string, routine: RoutineModel): Promise<PhaseEmaData> {
    const phases = calculateCircadianPhases(routine);
    return {
      date: dateStr,
      cortisolRiseEma: phases.cortisolAwakening.peak || phases.cortisolAwakening.start,
      peakHourEma: timeToDecimalHour(phases.morningPeakFocus.start) + 1.5,
      melatoninOnsetEma: phases.melatoninOnset.start,
      confidenceScore: 0.94,
    };
  },

  /**
   * GET /api/v1/biometrics/daily
   */
  async fetchDailyBiometrics(dateStr?: string): Promise<DailyBiometrics> {
    const today = dateStr || new Date().toISOString().split('T')[0];
    if (!isSupabaseConfigured()) {
      return { ...DEFAULT_BIOMETRICS, date: today };
    }

    try {
      const { data, error } = await supabase
        .from('biometrics_daily_metrics')
        .select('*')
        .eq('date', today)
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        const sleepHours = Number(data.sleep_hours) || 7.2;
        const h = Math.floor(sleepHours);
        const m = Math.round((sleepHours - h) * 60);
        const sleepFormatted = `${h}h ${String(m).padStart(2, '0')}`;

        return {
          date: today,
          sleepHours,
          sleepHoursText: sleepFormatted,
          hrvMs: Number(data.hrv_ms) || 64,
          restingHrBpm: Number(data.resting_hr_bpm) || 64,
          readinessScore: Number(data.readiness_score) || 82,
        };
      }
    } catch (err) {
      console.warn('Failed to fetch biometrics from Supabase, using baseline:', err);
    }

    return { ...DEFAULT_BIOMETRICS, date: today };
  },

  /**
   * GET /api/v1/routines
   */
  async fetchRoutine(): Promise<RoutineModel> {
    if (!isSupabaseConfigured()) {
      return DEFAULT_ROUTINE;
    }

    try {
      const { data, error } = await supabase
        .from('routines')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        return {
          id: data.id || 'routine-fetched',
          name: data.name || 'Circadian Routine',
          wakeTime: data.wake_time || '06:30',
          sleepTime: data.sleep_time || '22:30',
          targetSleepHours: Number(data.target_sleep_hours) || 8,
          morningRoutineMinutes: Number(data.morning_routine_minutes) || 45,
          eveningWindDownMinutes: Number(data.evening_wind_down_minutes) || 60,
          chronotype: data.chronotype || 'MODERATE',
          caffeineCutoffHoursBeforeSleep: Number(data.caffeine_cutoff_hours_before_sleep) || 9,
          caffeineCutoff: data.caffeine_cutoff || '14:00',
          windDownTime: data.wind_down_time || '21:30',
          secondWindStart: data.second_wind_start || '16:30',
          secondWindEnd: data.second_wind_end || '18:00',
        };
      }
    } catch (err) {
      console.warn('Failed to fetch routine from Supabase, using baseline:', err);
    }

    return DEFAULT_ROUTINE;
  },

  /**
   * POST /api/v1/meals/ideal_meals/generate
   * Calculate optimal breakfast, lunch, and dinner windows to avoid postprandial energy slumps
   */
  async generateIdealMeals(
    routine: RoutineModel = DEFAULT_ROUTINE,
    dateStr: string
  ): Promise<IdealMealsPlan> {
    const wakeH = timeToDecimalHour(routine.wakeTime);
    const sleepH = timeToDecimalHour(routine.sleepTime);

    const bStart = wakeH + 1.0;
    const bEnd = wakeH + 2.0;

    const lStart = wakeH + 5.5;
    const lEnd = wakeH + 6.5;

    const dStart = sleepH - 4.0;
    const dEnd = sleepH - 2.5;

    return {
      date: dateStr,
      breakfast: {
        name: 'Breakfast',
        start: decimalHourToTime(bStart),
        end: decimalHourToTime(bEnd),
        optimalTime: decimalHourToTime(bStart + 0.5),
        guidelines: 'High protein (30g+), healthy lipids. Delay carbs to maintain morning dopamine.',
        glycemicTarget: 'LOW',
      },
      lunch: {
        name: 'Lunch',
        start: decimalHourToTime(lStart),
        end: decimalHourToTime(lEnd),
        optimalTime: decimalHourToTime(lStart + 0.5),
        guidelines: 'Fibrous greens, complex carbs, lean protein. Moderate portions avoid deep slump.',
        glycemicTarget: 'MODERATE',
      },
      dinner: {
        name: 'Dinner',
        start: decimalHourToTime(dStart),
        end: decimalHourToTime(dEnd),
        optimalTime: decimalHourToTime(dStart + 0.5),
        guidelines: 'Easily digestible, complex carbohydrates promote serotonin & sleep onset.',
        glycemicTarget: 'MODERATE',
      },
    };
  },
};

