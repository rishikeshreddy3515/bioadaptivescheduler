import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useTheme } from '../theme/useTheme';
import { FONTS } from '../theme/typography';
import { DotMatrixBackground } from '../components/common/DotMatrixBackground';
import { supabase, isSupabaseConfigured } from '../api/supabaseClient';
import { STORAGE_KEYS, storage } from '../utils/storage';
import { useAuthStore } from '../store/useAuthStore';
import { useEnergyStore } from '../store/useEnergyStore';
import { RoutineModel } from '../types/energy';

interface OnboardingScreenProps {
  onComplete?: () => void;
}

export type ChronotypePreference = 'morning' | 'afternoon' | 'evening';

const WAKE_TIMES = ['05:30', '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00'];
const SLEEP_TIMES = ['21:00', '21:30', '22:00', '22:30', '23:00', '23:30', '00:00', '00:30'];

function timeToDecimalHour(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) + (m || 0) / 60;
}

function decimalHourToTime(hour: number): string {
  const normalized = (hour + 24) % 24;
  const h = Math.floor(normalized);
  const m = Math.round((normalized - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const { theme, isDark } = useTheme();
  const { user, profile } = useAuthStore();
  const { setActiveRoutine, fetchCircadianData } = useEnergyStore();

  const [wakeTime, setWakeTime] = useState('06:30');
  const [sleepTime, setSleepTime] = useState('21:30');
  const [chronotypePref, setChronotypePref] = useState<ChronotypePreference>('morning');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live calculation of personalized windows based on prompt requirements
  const calculatedWindows = useMemo(() => {
    const wakeH = timeToDecimalHour(wakeTime);
    const sleepH = timeToDecimalHour(sleepTime);

    let peakStartH: number;
    let peakEndH: number;
    let slumpStartH: number;
    let slumpEndH: number;
    let secondWindStartH: number;
    let secondWindEndH: number;

    if (chronotypePref === 'morning') {
      // Morning Lark: Peak 2h to 4.5h post-wake, slump 6.5h to 9h post-wake
      peakStartH = wakeH + 2.0;
      peakEndH = wakeH + 4.5;
      slumpStartH = wakeH + 6.5;
      slumpEndH = wakeH + 9.0;
      secondWindStartH = wakeH + 10.0;
      secondWindEndH = wakeH + 11.5;
    } else if (chronotypePref === 'afternoon') {
      // Afternoon / Intermediate: Peak 3h to 6h post-wake, slump 7h to 9.5h post-wake
      peakStartH = wakeH + 3.0;
      peakEndH = wakeH + 6.0;
      slumpStartH = wakeH + 7.0;
      slumpEndH = wakeH + 9.5;
      secondWindStartH = wakeH + 10.5;
      secondWindEndH = wakeH + 12.0;
    } else {
      // Evening / Night Owl: Peak shifted into late afternoon/evening
      peakStartH = wakeH + 6.5;
      peakEndH = wakeH + 10.5;
      slumpStartH = wakeH + 4.5;
      slumpEndH = wakeH + 6.5;
      secondWindStartH = wakeH + 11.0;
      secondWindEndH = wakeH + 13.0;
    }

    // Caffeine cutoff = sleep_time - 7.5h
    const caffeineCutoffH = Math.max(12.0, sleepH - 7.5);

    return {
      peakStart: decimalHourToTime(peakStartH),
      peakEnd: decimalHourToTime(peakEndH),
      slumpStart: decimalHourToTime(slumpStartH),
      slumpEnd: decimalHourToTime(slumpEndH),
      caffeineCutoff: decimalHourToTime(caffeineCutoffH),
      secondWindStart: decimalHourToTime(secondWindStartH),
      secondWindEnd: decimalHourToTime(secondWindEndH),
      windDownTime: sleepTime,
    };
  }, [wakeTime, sleepTime, chronotypePref]);

  const handleFinishOnboarding = async () => {
    setIsSubmitting(true);
    try {
      const activeUserId = user?.id || profile?.id || 'guest-user-12345';
      const isRemote = isSupabaseConfigured() && user?.id && !profile?.isGuest;

      const chronoCategory =
        chronotypePref === 'morning'
          ? 'EARLY_BIRD'
          : chronotypePref === 'evening'
          ? 'NIGHT_OWL'
          : 'MODERATE';

      // 1. Prepare local routine model
      const localRoutine: RoutineModel = {
        id: `routine-${activeUserId}`,
        userId: activeUserId,
        user_id: activeUserId,
        name: 'Personalized Circadian Routine',
        wakeTime,
        wake_time: `${wakeTime}:00`,
        sleepTime,
        sleep_time: `${sleepTime}:00`,
        windDownTime: calculatedWindows.windDownTime,
        wind_down_time: `${calculatedWindows.windDownTime}:00`,
        peakStart: calculatedWindows.peakStart,
        peak_start: `${calculatedWindows.peakStart}:00`,
        peakEnd: calculatedWindows.peakEnd,
        peak_end: `${calculatedWindows.peakEnd}:00`,
        slumpStart: calculatedWindows.slumpStart,
        slump_start: `${calculatedWindows.slumpStart}:00`,
        slumpEnd: calculatedWindows.slumpEnd,
        slump_end: `${calculatedWindows.slumpEnd}:00`,
        caffeineCutoff: calculatedWindows.caffeineCutoff,
        caffeine_cutoff: `${calculatedWindows.caffeineCutoff}:00`,
        secondWindStart: calculatedWindows.secondWindStart,
        second_wind_start: `${calculatedWindows.secondWindStart}:00`,
        secondWindEnd: calculatedWindows.secondWindEnd,
        second_wind_end: `${calculatedWindows.secondWindEnd}:00`,
        targetSleepHours: 8,
        target_sleep_hours: 8,
        chronotype: chronoCategory,
        selected_boosters: ['CAFFEINE', 'SUNLIGHT', 'POWER_NAP'],
      };

      // 2. Persist to active local energy store
      await setActiveRoutine(localRoutine);

      // 3. Remote Supabase persistence if authenticated
      if (isRemote) {
        // A) Upsert public.routines
        try {
          await supabase.from('routines').upsert(
            {
              user_id: activeUserId,
              wake_time: `${wakeTime}:00`,
              wind_down_time: `${calculatedWindows.windDownTime}:00`,
              peak_start: `${calculatedWindows.peakStart}:00`,
              peak_end: `${calculatedWindows.peakEnd}:00`,
              slump_start: `${calculatedWindows.slumpStart}:00`,
              slump_end: `${calculatedWindows.slumpEnd}:00`,
              caffeine_cutoff: `${calculatedWindows.caffeineCutoff}:00`,
              second_wind_start: `${calculatedWindows.secondWindStart}:00`,
              second_wind_end: `${calculatedWindows.secondWindEnd}:00`,
              selected_boosters: ['CAFFEINE', 'SUNLIGHT', 'POWER_NAP'],
            },
            { onConflict: 'user_id' }
          );
        } catch (rErr) {
          console.warn('[Onboarding] Error upserting routine:', rErr);
        }

        // B) Update profiles.has_completed_onboarding = true
        try {
          await supabase
            .from('profiles')
            .update({
              has_completed_onboarding: true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', activeUserId);
        } catch (pErr) {
          console.warn('[Onboarding] Error updating profile onboarding status:', pErr);
        }

        // C) Ensure initial biometrics baseline
        try {
          const today = new Date().toISOString().split('T')[0];
          await supabase.from('biometrics_daily_metrics').upsert(
            {
              user_id: activeUserId,
              date: today,
              sleep_hours: 7.5,
              hrv_ms: 65,
              resting_hr_bpm: 62,
              readiness_score: 82,
            },
            { onConflict: 'user_id,date' }
          );
        } catch (bErr) {
          console.warn('[Onboarding] Error seeding biometrics:', bErr);
        }
      }

      // 4. Update local storage flags
      await storage.set(STORAGE_KEYS.hasCompletedOnboarding, true);
      await fetchCircadianData();

      // Update auth store profile if present
      useAuthStore.setState((prev) => ({
        profile: prev.profile
          ? { ...prev.profile, has_completed_onboarding: true }
          : null,
      }));

      onComplete?.();
    } catch (err) {
      console.warn('[Onboarding] Exception finishing onboarding:', err);
      await storage.set(STORAGE_KEYS.hasCompletedOnboarding, true);
      onComplete?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#111510' : theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <DotMatrixBackground />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Brand Header */}
          <View style={styles.headerBlock}>
            <Text style={[styles.brandLabel, { color: theme.secondaryText, fontFamily: FONTS.urbanistSemiBold }]}>
              CADENCE · BIO-ADAPTIVE ONBOARDING
            </Text>
            <Text style={[styles.heading, { color: theme.text, fontFamily: FONTS.urbanistLight }]}>
              Personalize your rhythm
            </Text>
            <Text style={[styles.subheading, { color: theme.secondaryText, fontFamily: FONTS.urbanistRegular }]}>
              Tell us your natural biological markers so the AI can align tasks with your peak focus hours.
            </Text>
          </View>

          {/* Question 1: Natural Wake Time */}
          <View
            style={[
              styles.card,
              { backgroundColor: theme.primarySurface, borderColor: theme.border },
            ]}
          >
            <View style={styles.questionHeader}>
              <Text style={[styles.questionNumber, { color: theme.primaryOlive, fontFamily: FONTS.urbanistBold }]}>
                QUESTION 1 OF 3
              </Text>
              <Text style={[styles.questionTitle, { color: theme.text, fontFamily: FONTS.urbanistSemiBold }]}>
                Natural wake time
              </Text>
              <Text style={[styles.questionDesc, { color: theme.secondaryText, fontFamily: FONTS.urbanistRegular }]}>
                What time do you usually open your eyes and start your day?
              </Text>
            </View>

            <View style={styles.chipsRow}>
              {WAKE_TIMES.map((time) => {
                const isSelected = wakeTime === time;
                return (
                  <TouchableOpacity
                    key={time}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected
                          ? theme.primaryOlive
                          : isDark ? 'rgba(255, 255, 255, 0.05)' : '#EDE9DF',
                        borderColor: isSelected ? theme.primaryOlive : theme.border,
                      },
                    ]}
                    onPress={() => setWakeTime(time)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color: isSelected ? '#0A0B0D' : theme.text,
                          fontFamily: isSelected ? FONTS.dotoBold : FONTS.urbanistMedium,
                        },
                      ]}
                    >
                      {time}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Question 2: Usual Sleep / Wind-Down Time */}
          <View
            style={[
              styles.card,
              { backgroundColor: theme.primarySurface, borderColor: theme.border },
            ]}
          >
            <View style={styles.questionHeader}>
              <Text style={[styles.questionNumber, { color: theme.primaryOlive, fontFamily: FONTS.urbanistBold }]}>
                QUESTION 2 OF 3
              </Text>
              <Text style={[styles.questionTitle, { color: theme.text, fontFamily: FONTS.urbanistSemiBold }]}>
                Usual sleep / wind-down time
              </Text>
              <Text style={[styles.questionDesc, { color: theme.secondaryText, fontFamily: FONTS.urbanistRegular }]}>
                What time do you start winding down screens and prepare for sleep?
              </Text>
            </View>

            <View style={styles.chipsRow}>
              {SLEEP_TIMES.map((time) => {
                const isSelected = sleepTime === time;
                return (
                  <TouchableOpacity
                    key={time}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected
                          ? theme.primaryOlive
                          : isDark ? 'rgba(255, 255, 255, 0.05)' : '#EDE9DF',
                        borderColor: isSelected ? theme.primaryOlive : theme.border,
                      },
                    ]}
                    onPress={() => setSleepTime(time)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color: isSelected ? '#0A0B0D' : theme.text,
                          fontFamily: isSelected ? FONTS.dotoBold : FONTS.urbanistMedium,
                        },
                      ]}
                    >
                      {time}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Question 3: Natural Chronotype / Peak Energy Preference */}
          <View
            style={[
              styles.card,
              { backgroundColor: theme.primarySurface, borderColor: theme.border },
            ]}
          >
            <View style={styles.questionHeader}>
              <Text style={[styles.questionNumber, { color: theme.primaryOlive, fontFamily: FONTS.urbanistBold }]}>
                QUESTION 3 OF 3
              </Text>
              <Text style={[styles.questionTitle, { color: theme.text, fontFamily: FONTS.urbanistSemiBold }]}>
                Peak energy preference
              </Text>
              <Text style={[styles.questionDesc, { color: theme.secondaryText, fontFamily: FONTS.urbanistRegular }]}>
                When do you feel most alert, focused, and mentally energized?
              </Text>
            </View>

            <View style={styles.chronotypeList}>
              {[
                {
                  key: 'morning' as const,
                  icon: '🌅',
                  label: 'Morning (Early Bird)',
                  desc: 'Sharpest focus 2 to 4.5 hours after waking. Ready to tackle deep work before lunch.',
                },
                {
                  key: 'afternoon' as const,
                  icon: '☀️',
                  label: 'Afternoon (Intermediate)',
                  desc: 'Balanced diurnal rhythm. Peak cognitive stamina surges mid-morning through early afternoon.',
                },
                {
                  key: 'evening' as const,
                  icon: '🌙',
                  label: 'Evening (Night Owl)',
                  desc: 'Slow initial morning wake-up. Mental flow and creativity peak in late afternoon and night.',
                },
              ].map((item) => {
                const isSelected = chronotypePref === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.chronotypeCard,
                      {
                        backgroundColor: isSelected
                          ? (isDark ? 'rgba(56, 225, 176, 0.12)' : 'rgba(91, 138, 60, 0.12)')
                          : isDark ? 'rgba(255, 255, 255, 0.04)' : '#EDE9DF',
                        borderColor: isSelected ? theme.primaryOlive : theme.border,
                      },
                    ]}
                    onPress={() => setChronotypePref(item.key)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.chronoIcon}>{item.icon}</Text>
                    <View style={styles.chronoInfo}>
                      <Text style={[styles.chronoLabel, { color: theme.text, fontFamily: FONTS.urbanistBold }]}>
                        {item.label}
                      </Text>
                      <Text style={[styles.chronoDesc, { color: theme.secondaryText, fontFamily: FONTS.urbanistRegular }]}>
                        {item.desc}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Real-time Calculated Windows Preview */}
          <View
            style={[
              styles.previewCard,
              { backgroundColor: theme.primarySurface, borderColor: theme.primaryOlive },
            ]}
          >
            <View style={styles.previewHeaderRow}>
              <View>
                <Text style={[styles.previewBadgeText, { color: theme.primaryOlive, fontFamily: FONTS.urbanistBold }]}>
                  ✨ CALCULATED BIOLOGICAL INTERVALS
                </Text>
                <Text style={[styles.previewTitle, { color: theme.text, fontFamily: FONTS.urbanistBold }]}>
                  Your Personalized Daily Rhythm
                </Text>
              </View>
            </View>

            <View style={styles.intervalsGrid}>
              <View style={[styles.intervalRow, { borderBottomColor: theme.border }]}>
                <View style={styles.intervalLeft}>
                  <View style={[styles.indicatorDot, { backgroundColor: '#38BDF8' }]} />
                  <Text style={[styles.intervalLabel, { color: theme.text, fontFamily: FONTS.urbanistSemiBold }]}>
                    Peak Focus Window
                  </Text>
                </View>
                <Text style={[styles.intervalValue, { color: theme.text, fontFamily: FONTS.dotoBold }]}>
                  {calculatedWindows.peakStart} – {calculatedWindows.peakEnd}
                </Text>
              </View>

              <View style={[styles.intervalRow, { borderBottomColor: theme.border }]}>
                <View style={styles.intervalLeft}>
                  <View style={[styles.indicatorDot, { backgroundColor: '#F59E0B' }]} />
                  <Text style={[styles.intervalLabel, { color: theme.text, fontFamily: FONTS.urbanistSemiBold }]}>
                    Energy Slump Window
                  </Text>
                </View>
                <Text style={[styles.intervalValue, { color: theme.text, fontFamily: FONTS.dotoBold }]}>
                  {calculatedWindows.slumpStart} – {calculatedWindows.slumpEnd}
                </Text>
              </View>

              <View style={[styles.intervalRow, { borderBottomColor: theme.border }]}>
                <View style={styles.intervalLeft}>
                  <View style={[styles.indicatorDot, { backgroundColor: '#EF4444' }]} />
                  <Text style={[styles.intervalLabel, { color: theme.text, fontFamily: FONTS.urbanistSemiBold }]}>
                    Caffeine Cutoff
                  </Text>
                </View>
                <Text style={[styles.intervalValue, { color: theme.text, fontFamily: FONTS.dotoBold }]}>
                  {calculatedWindows.caffeineCutoff}
                </Text>
              </View>

              <View style={[styles.intervalRow, { borderBottomWidth: 0 }]}>
                <View style={styles.intervalLeft}>
                  <View style={[styles.indicatorDot, { backgroundColor: '#34D399' }]} />
                  <Text style={[styles.intervalLabel, { color: theme.text, fontFamily: FONTS.urbanistSemiBold }]}>
                    Second Wind Window
                  </Text>
                </View>
                <Text style={[styles.intervalValue, { color: theme.text, fontFamily: FONTS.dotoBold }]}>
                  {calculatedWindows.secondWindStart} – {calculatedWindows.secondWindEnd}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Bottom CTA Button */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.primaryOlive }]}
            onPress={handleFinishOnboarding}
            disabled={isSubmitting}
            activeOpacity={0.88}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#0A0B0D" />
            ) : (
              <Text style={[styles.primaryButtonText, { fontFamily: FONTS.urbanistBold }]}>
                Build My Bio-Adaptive Schedule →
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 8 : 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
    gap: 16,
  },
  headerBlock: {
    marginBottom: 8,
  },
  brandLabel: {
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heading: {
    fontSize: 32,
    lineHeight: 38,
    marginBottom: 8,
  },
  subheading: {
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  questionHeader: {
    marginBottom: 14,
  },
  questionNumber: {
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  questionTitle: {
    fontSize: 18,
    marginBottom: 4,
  },
  questionDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 68,
    alignItems: 'center',
  },
  chipText: {
    fontSize: 13,
  },
  chronotypeList: {
    gap: 10,
  },
  chronotypeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  chronoIcon: {
    fontSize: 24,
    marginTop: 2,
  },
  chronoInfo: {
    flex: 1,
  },
  chronoLabel: {
    fontSize: 15,
    marginBottom: 2,
  },
  chronoDesc: {
    fontSize: 12.5,
    lineHeight: 17,
  },
  previewCard: {
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 18,
  },
  previewHeaderRow: {
    marginBottom: 14,
  },
  previewBadgeText: {
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  previewTitle: {
    fontSize: 17,
  },
  intervalsGrid: {
    gap: 2,
  },
  intervalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  intervalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  intervalLabel: {
    fontSize: 13,
  },
  intervalValue: {
    fontSize: 13,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
  },
  primaryButton: {
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    color: '#0A0B0D',
  },
});

