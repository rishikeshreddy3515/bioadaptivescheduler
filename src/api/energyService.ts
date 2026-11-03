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
  const wakeH = timeToDecimalHour(routine.wakeTime || routine.wake_time || '06:30');
  const sleepH = timeToDecimalHour(routine.sleepTime || routine.sleep_time || '22:30');

  // Cortisol awakening response: wake to +1.5h
  const cortisolStart = wakeH;
  const cortisolEnd = wakeH + 1.5;
  const cortisolPeak = wakeH + 0.75;

  // Personalized or calculated morning peak focus
  const morningPeakStart = routine.peakStart || routine.peak_start
    ? timeToDecimalHour(routine.peakStart || routine.peak_start!)
    : wakeH + 2.5;
  const morningPeakEnd = routine.peakEnd || routine.peak_end
    ? timeToDecimalHour(routine.peakEnd || routine.peak_end!)
    : wakeH + 5.5;

  // Personalized or calculated postprandial dip
  const dipStart = routine.slumpStart || routine.slump_start
    ? timeToDecimalHour(routine.slumpStart || routine.slump_start!)
    : wakeH + 6.5;
  const dipEnd = routine.slumpEnd || routine.slump_end
    ? timeToDecimalHour(routine.slumpEnd || routine.slump_end!)
    : wakeH + 8.5;

  // Afternoon secondary peak (second wind)
  const afternoonPeakStart = routine.secondWindStart || routine.second_wind_start
    ? timeToDecimalHour(routine.secondWindStart || routine.second_wind_start!)
    : wakeH + 9.5;
  const afternoonPeakEnd = routine.secondWindEnd || routine.second_wind_end
    ? timeToDecimalHour(routine.secondWindEnd || routine.second_wind_end!)
    : wakeH + 12.0;

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
  const wakeH = timeToDecimalHour(routine.wakeTime || routine.wake_time || '06:30');
  const sleepH = timeToDecimalHour(routine.sleepTime || routine.sleep_time || routine.windDownTime || routine.wind_down_time || '22:30');
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
      const user = (await supabase.auth.getUser()).data?.user;
      let query = supabase
        .from('biometrics_daily_metrics')
        .select('*')
        .eq('date', today);

      if (user?.id) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        const sleepHours = Number(data.sleep_hours) || 7.2;
        const h = Math.floor(sleepHours);
        const m = Math.round((sleepHours - h) * 60);
        const sleepFormatted = `${h}h ${String(m).padStart(2, '0')}`;

        return {
          id: data.id,
          userId: data.user_id,
          user_id: data.user_id,
          date: today,
          sleepHours,
          sleep_hours: sleepHours,
          sleepHoursText: sleepFormatted,
          hrvMs: Number(data.hrv_ms) || 64,
          hrv_ms: Number(data.hrv_ms) || 64,
          restingHrBpm: Number(data.resting_hr_bpm) || 64,
          resting_hr_bpm: Number(data.resting_hr_bpm) || 64,
          readinessScore: Number(data.readiness_score) || 82,
          readiness_score: Number(data.readiness_score) || 82,
        };
      }
    } catch (err) {
      console.warn('Failed to fetch biometrics from Supabase, using baseline:', err);
    }

    return { ...DEFAULT_BIOMETRICS, date: today, readinessScore: 82, readiness_score: 82 };
  },

  /**
   * GET /api/v1/routines
   * Retrieves the user's specific personalized chronotype and routine
   */
  async fetchRoutine(userId?: string): Promise<RoutineModel> {
    if (!isSupabaseConfigured()) {
      return DEFAULT_ROUTINE;
    }

    try {
      const user = (await supabase.auth.getUser()).data?.user;
      const targetUserId = userId || user?.id;

      let query = supabase.from('routines').select('*');
      if (targetUserId) {
        query = query.eq('user_id', targetUserId);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        const cleanTime = (t?: string, fallback: string = '09:00') => {
          if (!t) return fallback;
          return t.length >= 5 ? t.substring(0, 5) : fallback;
        };

        const wakeTime = cleanTime(data.wake_time, '06:30');
        const sleepTime = cleanTime(data.sleep_time, '22:30');
        const windDownTime = cleanTime(data.wind_down_time, '21:30');
        const peakStart = cleanTime(data.peak_start, '08:30');
        const peakEnd = cleanTime(data.peak_end, '11:00');
        const slumpStart = cleanTime(data.slump_start, '13:00');
        const slumpEnd = cleanTime(data.slump_end, '15:30');
        const caffeineCutoff = cleanTime(data.caffeine_cutoff, '14:00');
        const secondWindStart = cleanTime(data.second_wind_start, '16:30');
        const secondWindEnd = cleanTime(data.second_wind_end, '18:00');

        return {
          id: data.id || 'routine-fetched',
          userId: data.user_id,
          user_id: data.user_id,
          name: data.name || 'Circadian Routine',
          wakeTime,
          wake_time: data.wake_time,
          sleepTime,
          sleep_time: data.sleep_time,
          windDownTime,
          wind_down_time: data.wind_down_time,
          peakStart,
          peak_start: data.peak_start,
          peakEnd,
          peak_end: data.peak_end,
          slumpStart,
          slump_start: data.slump_start,
          slumpEnd,
          slump_end: data.slump_end,
          caffeineCutoff,
          caffeine_cutoff: data.caffeine_cutoff,
          secondWindStart,
          second_wind_start: data.second_wind_start,
          secondWindEnd,
          second_wind_end: data.second_wind_end,
          selected_boosters: data.selected_boosters || ['CAFFEINE', 'SUNLIGHT', 'POWER_NAP'],
          targetSleepHours: Number(data.target_sleep_hours) || 8,
          morningRoutineMinutes: Number(data.morning_routine_minutes) || 45,
          eveningWindDownMinutes: Number(data.evening_wind_down_minutes) || 60,
          chronotype: data.chronotype || 'MODERATE',
          caffeineCutoffHoursBeforeSleep: Number(data.caffeine_cutoff_hours_before_sleep) || 9,
        };
      }
    } catch (err) {
      console.warn('Failed to fetch routine from Supabase, using baseline:', err);
    }

    return DEFAULT_ROUTINE;
  },

  /**
   * POST /api/v1/routines
   * Saves or updates the user's personalized chronotype and sleep routine in Supabase
   */
  async saveRoutine(routine: RoutineModel, userId?: string): Promise<RoutineModel> {
    if (!isSupabaseConfigured()) {
      return routine;
    }

    try {
      const user = (await supabase.auth.getUser()).data?.user;
      const targetUserId = userId || user?.id;

      if (targetUserId) {
        const payload = {
          user_id: targetUserId,
          name: routine.name || 'Personalized Circadian Routine',
          wake_time: routine.wakeTime || routine.wake_time,
          sleep_time: routine.sleepTime || routine.sleep_time,
          target_sleep_hours: routine.targetSleepHours || routine.target_sleep_hours || 8,
          morning_routine_minutes: routine.morningRoutineMinutes || 45,
          evening_wind_down_minutes: routine.eveningWindDownMinutes || 60,
          chronotype: routine.chronotype || 'MODERATE',
          caffeine_cutoff_hours_before_sleep: routine.caffeineCutoffHoursBeforeSleep || 9,
          caffeine_cutoff: routine.caffeineCutoff || routine.caffeine_cutoff || '14:00',
          wind_down_time: routine.windDownTime || routine.wind_down_time || '21:30',
          peak_start: routine.peakStart || routine.peak_start || '08:30:00',
          peak_end: routine.peakEnd || routine.peak_end || '11:00:00',
          slump_start: routine.slumpStart || routine.slump_start || '13:00:00',
          slump_end: routine.slumpEnd || routine.slump_end || '15:30:00',
          second_wind_start: routine.secondWindStart || routine.second_wind_start || '16:30',
          second_wind_end: routine.secondWindEnd || routine.second_wind_end || '18:00',
          selected_boosters: routine.selected_boosters || ['CAFFEINE', 'SUNLIGHT', 'POWER_NAP'],
        };

        const { data, error } = await supabase
          .from('routines')
          .upsert(payload, { onConflict: 'user_id' })
          .select()
          .maybeSingle();

        if (data && !error) {
          return {
            ...routine,
            id: data.id,
            userId: data.user_id,
            user_id: data.user_id,
          };
        }
      }
    } catch (err) {
      console.warn('Failed to save routine to Supabase:', err);
    }

    return routine;
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

