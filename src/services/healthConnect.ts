import { Platform, NativeModules } from 'react-native';
import { DailyBiometrics } from '../types/energy';
import { supabase, isSupabaseConfigured } from '../api/supabaseClient';
import { useEnergyStore } from '../store/useEnergyStore';

// Safe runtime detection of react-native-health-connect
let nativeHealthConnect: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  nativeHealthConnect = require('react-native-health-connect');
} catch {
  nativeHealthConnect = null;
}

export const isHealthConnectAvailable = (): boolean => {
  if (Platform.OS !== 'android') return false;
  // If running inside Expo Go or package not linked in native binaries
  return (
    nativeHealthConnect !== null &&
    (!!NativeModules.HealthConnect || !!NativeModules.HealthConnectManager)
  );
};

export const FALLBACK_BIOMETRICS: DailyBiometrics = {
  date: new Date().toISOString().split('T')[0],
  sleepHours: 7.2,
  sleepHoursText: '7h 12',
  hrvMs: 64,
  restingHrBpm: 64,
  readinessScore: 82,
};

export const healthConnectService = {
  /**
   * Request permissions for sleep, heart rate, and HRV if native module is present
   */
  async requestPermissions(): Promise<boolean> {
    if (!isHealthConnectAvailable()) {
      return false;
    }

    try {
      await nativeHealthConnect.initialize();
      const granted = await nativeHealthConnect.requestPermission([
        { accessType: 'read', recordType: 'SleepSession' },
        { accessType: 'read', recordType: 'HeartRate' },
        { accessType: 'read', recordType: 'HeartRateVariabilityRmssd' },
      ]);
      return !!granted;
    } catch (err) {
      console.warn('[HealthConnect] Permission request failed, falling back:', err);
      return false;
    }
  },

  /**
   * Fetch today's biometrics either from native Health Connect or fallback baseline
   */
  async getDailyBiometrics(targetDate?: string): Promise<DailyBiometrics> {
    const dateStr = targetDate || new Date().toISOString().split('T')[0];

    if (!isHealthConnectAvailable()) {
      return {
        ...FALLBACK_BIOMETRICS,
        date: dateStr,
      };
    }

    try {
      await nativeHealthConnect.initialize();

      const startTime = `${dateStr}T00:00:00.000Z`;
      const endTime = `${dateStr}T23:59:59.999Z`;

      // Read Sleep Session
      let sleepHours = 7.2;
      try {
        const sleepRes = await nativeHealthConnect.readRecords('SleepSession', {
          timeRangeFilter: {
            operator: 'between',
            startTime,
            endTime,
          },
        });
        if (sleepRes?.records?.length > 0) {
          const totalMs = sleepRes.records.reduce((acc: number, r: any) => {
            const start = new Date(r.startTime).getTime();
            const end = new Date(r.endTime).getTime();
            return acc + (end - start);
          }, 0);
          sleepHours = Math.round((totalMs / (1000 * 60 * 60)) * 10) / 10;
        }
      } catch (e) {
        console.warn('[HealthConnect] Error reading sleep, using baseline:', e);
      }

      // Read Resting Heart Rate
      let restingHr = 64;
      try {
        const hrRes = await nativeHealthConnect.readRecords('HeartRate', {
          timeRangeFilter: {
            operator: 'between',
            startTime,
            endTime,
          },
        });
        if (hrRes?.records?.length > 0) {
          const allSamples = hrRes.records.flatMap((r: any) => r.samples || []);
          if (allSamples.length > 0) {
            const sum = allSamples.reduce((acc: number, s: any) => acc + (s.beatsPerMinute || 64), 0);
            restingHr = Math.round(sum / allSamples.length);
          }
        }
      } catch (e) {
        console.warn('[HealthConnect] Error reading heart rate, using baseline:', e);
      }

      // Read HRV
      let hrvMs = 64;
      try {
        const hrvRes = await nativeHealthConnect.readRecords('HeartRateVariabilityRmssd', {
          timeRangeFilter: {
            operator: 'between',
            startTime,
            endTime,
          },
        });
        if (hrvRes?.records?.length > 0) {
          const sum = hrvRes.records.reduce((acc: number, r: any) => acc + (r.heartRateVariabilityMillis || 64), 0);
          hrvMs = Math.round(sum / hrvRes.records.length);
        }
      } catch (e) {
        console.warn('[HealthConnect] Error reading HRV, using baseline:', e);
      }

      // Calculate readiness percentage based on HRV, Sleep, and Resting HR
      const hrvScore = Math.min(100, Math.max(40, (hrvMs / 70) * 80));
      const sleepScore = Math.min(100, Math.max(40, (sleepHours / 8) * 85));
      const hrScore = Math.min(100, Math.max(40, (65 / restingHr) * 85));
      const readinessScore = Math.round((hrvScore * 0.45) + (sleepScore * 0.40) + (hrScore * 0.15));

      const h = Math.floor(sleepHours);
      const m = Math.round((sleepHours - h) * 60);

      return {
        date: dateStr,
        sleepHours,
        sleepHoursText: `${h}h ${m < 10 ? '0' : ''}${m}`,
        hrvMs,
        restingHrBpm: restingHr,
        readinessScore,
      };
    } catch (err) {
      console.warn('[HealthConnect] Query error, falling back gracefully:', err);
      return {
        ...FALLBACK_BIOMETRICS,
        date: dateStr,
      };
    }
  },

  /**
   * Synchronize today's biometrics to Supabase and update local state
   */
  async syncBiometrics(userId?: string): Promise<DailyBiometrics> {
    const biometrics = await this.getDailyBiometrics();

    // Update in-memory Zustand Energy Store
    useEnergyStore.setState({ dailyBiometrics: biometrics });

    // Upsert into Supabase if configured and authenticated
    if (isSupabaseConfigured() && userId && userId !== 'guest-user-12345') {
      try {
        await supabase.from('biometrics_daily_metrics').upsert(
          {
            user_id: userId,
            date: biometrics.date,
            sleep_hours: biometrics.sleepHours,
            hrv_ms: biometrics.hrvMs,
            resting_hr_bpm: biometrics.restingHrBpm,
            readiness_score: biometrics.readinessScore,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,date' }
        );
      } catch (err) {
        console.warn('[HealthConnect] Failed upserting to Supabase (continuing locally):', err);
      }
    }

    return biometrics;
  },
};
