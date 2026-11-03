import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Platform,
} from 'react-native';
import { useTheme } from '../theme/useTheme';
import { FONTS } from '../theme/typography';
import { DotMatrixBackground } from '../components/common/DotMatrixBackground';
import { CircadianWave } from '../components/energy/CircadianWave';
import { RhythmSetupModal } from '../components/energy/RhythmSetupModal';
import { useEnergyStore } from '../store/useEnergyStore';
import { CadenceTabBar, NavTab } from '../navigation/CadenceTabBar';

interface CircadianRhythmScreenProps {
  onBack?: () => void;
  onNavigateTab?: (tab: NavTab) => void;
  onLongPressAi?: () => void;
}

interface KeyWindowItem {
  id: string;
  dotColor: string;
  title: string;
  subtitle: string;
  timeRange: string;
}

export const CircadianRhythmScreen: React.FC<CircadianRhythmScreenProps> = ({
  onBack,
  onNavigateTab,
  onLongPressAi,
}) => {
  const { theme, isDark, toggleTheme } = useTheme();
  const {
    currentEnergyScoreSelector,
    circadianPhaseSelector,
    activeRoutineAtom,
  } = useEnergyStore();

  const [showRhythmSetup, setShowRhythmSetup] = useState(false);

  // Live real-time device hour tracker
  const [nowHour, setNowHour] = useState(() => {
    const d = new Date();
    return d.getHours() + d.getMinutes() / 60;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setNowHour(d.getHours() + d.getMinutes() / 60);
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const scoreInfo = currentEnergyScoreSelector();
  const phases = circadianPhaseSelector();

  const wakeTime = activeRoutineAtom?.wakeTime || '06:30';
  const windDownTime = activeRoutineAtom?.windDownTime || '21:30';
  const caffeineTime = activeRoutineAtom?.caffeineCutoff || '14:00';
  const secondWindRange = `${activeRoutineAtom?.secondWindStart || '16:30'}–${activeRoutineAtom?.secondWindEnd || '18:00'}`;
  const peakRange = `${phases?.morningPeakFocus?.start || '08:30'}–${phases?.morningPeakFocus?.end || '11:00'}`;
  const slumpRange = `${phases?.postprandialDip?.start || '13:00'}–${phases?.postprandialDip?.end || '15:30'}`;

  // Dynamic phase title & description based on the user's live current hour
  const getPhaseStatus = () => {
    const [wakeH] = wakeTime.split(':').map(Number);
    const [peakEndH] = (phases?.morningPeakFocus?.end || '11:00').split(':').map(Number);
    const [slumpStartH] = (phases?.postprandialDip?.start || '13:00').split(':').map(Number);
    const [slumpEndH] = (phases?.postprandialDip?.end || '15:30').split(':').map(Number);
    const [windH] = windDownTime.split(':').map(Number);

    if (nowHour >= wakeH && nowHour <= peakEndH) {
      return {
        badge: 'In your peak',
        dotColor: theme.primaryOlive,
        sub: `Until ${phases?.morningPeakFocus?.end || '11:00'} · best for deep work`,
      };
    }
    if (nowHour > peakEndH && nowHour < slumpStartH) {
      return {
        badge: 'Steady flow',
        dotColor: theme.indicators.peak,
        sub: `Next slump at ${phases?.postprandialDip?.start || '13:00'} · execution mode`,
      };
    }
    if (nowHour >= slumpStartH && nowHour <= slumpEndH) {
      return {
        badge: 'Energy slump',
        dotColor: theme.indicators.slump,
        sub: `Until ${phases?.postprandialDip?.end || '15:30'} · admin, rest or a walk`,
      };
    }
    if (nowHour > slumpEndH && nowHour < windH) {
      return {
        badge: 'Second wind',
        dotColor: theme.indicators.peak,
        sub: `Active until ${secondWindRange.split('–')[1] || '18:00'} · workouts & meetings`,
      };
    }
    return {
      badge: 'Wind-down',
      dotColor: theme.secondaryText,
      sub: `Dim screens · prepare for sleep at ${activeRoutineAtom?.sleepTime || '22:30'}`,
    };
  };

  const currentStatus = getPhaseStatus();

  const keyWindows: KeyWindowItem[] = [
    {
      id: 'peak',
      dotColor: theme.indicators.peak,
      title: 'Peak focus',
      subtitle: 'Deep work, strategy',
      timeRange: peakRange,
    },
    {
      id: 'slump',
      dotColor: theme.indicators.slump,
      title: 'Energy slump',
      subtitle: 'Admin, rest, a short walk',
      timeRange: slumpRange,
    },
    {
      id: 'caffeine',
      dotColor: theme.indicators.caffeineCutoff,
      title: 'Caffeine cutoff',
      subtitle: 'Protects tonight’s sleep',
      timeRange: caffeineTime,
    },
    {
      id: 'second_wind',
      dotColor: theme.indicators.peak,
      title: 'Second wind',
      subtitle: 'Meetings, workout',
      timeRange: secondWindRange,
    },
    {
      id: 'wind_down',
      dotColor: theme.secondaryText,
      title: 'Wind-down',
      subtitle: 'Dim screens, no new tasks',
      timeRange: windDownTime,
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <DotMatrixBackground />

      <SafeAreaView style={styles.safeArea}>
        {/* Top Header Row with Back Button, Title & Theme Toggle (Android Safe-Area Adjusted) */}
        <View style={styles.topNavRow}>
          <TouchableOpacity
            style={[
              styles.navCircleBtn,
              { backgroundColor: theme.primarySurface, borderColor: theme.border },
            ]}
            onPress={onBack}
            activeOpacity={0.8}
          >
            <Text style={[styles.backArrow, { color: theme.text, fontFamily: FONTS.urbanistBold }]}>
              ←
            </Text>
          </TouchableOpacity>

          <Text style={[styles.navTitle, { color: theme.text, fontFamily: FONTS.urbanistSemiBold }]}>
            Circadian rhythm
          </Text>

          <TouchableOpacity
            style={[
              styles.navCircleBtn,
              { backgroundColor: theme.primarySurface, borderColor: theme.border },
            ]}
            onPress={toggleTheme}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 16 }}>{isDark ? '🌙' : '☀️'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Status Hero Block */}
          <View
            style={[
              styles.heroBlock,
              { backgroundColor: theme.primarySurface, borderColor: theme.border },
            ]}
          >
            <View style={styles.heroLeft}>
              <View style={styles.statusBadgeRow}>
                <View style={[styles.greenPulseDot, { backgroundColor: currentStatus.dotColor }]} />
                <Text style={[styles.statusBadgeText, { color: theme.text, fontFamily: FONTS.urbanistSemiBold }]}>
                  {currentStatus.badge}
                </Text>
              </View>

              <Text style={[styles.statusSubtitle, { color: theme.secondaryText, fontFamily: FONTS.urbanistRegular }]}>
                {currentStatus.sub}
              </Text>
            </View>

            <View style={styles.heroRightCol}>
              {/* Settings Gear Button to Edit Sleep Habits / Routine (Image Reference) */}
              <TouchableOpacity
                style={[styles.gearBtn, { backgroundColor: theme.secondarySurface, borderColor: theme.border }]}
                onPress={() => setShowRhythmSetup(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.gearIcon}>⚙️</Text>
              </TouchableOpacity>

              <Text style={[styles.heroScore, { color: theme.text, fontFamily: FONTS.dotoBold }]}>
                {scoreInfo.score}
              </Text>
            </View>
          </View>

          {/* Wave Chart Card */}
          <View
            style={[
              styles.chartCard,
              { backgroundColor: theme.primarySurface, borderColor: theme.border },
            ]}
          >
            {/* Skia Cubic Bezier Wave with Dynamic Live Hour & Routine Anchoring */}
            <CircadianWave currentHour={nowHour} routine={activeRoutineAtom} height={190} />

            {/* Boundary Tags: Wake and Wind-down (Tap to Edit Routine) */}
            <View style={styles.boundaryPillRow}>
              <TouchableOpacity
                style={[
                  styles.boundaryPill,
                  { backgroundColor: theme.secondarySurface, borderColor: theme.border },
                ]}
                onPress={() => setShowRhythmSetup(true)}
                activeOpacity={0.8}
              >
                <Text style={[styles.boundaryLabel, { color: theme.secondaryText, fontFamily: FONTS.urbanistMedium }]}>
                  Wake{' '}
                </Text>
                <Text style={[styles.boundaryTime, { color: theme.text, fontFamily: FONTS.dotoBold }]}>
                  {wakeTime}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.boundaryPill,
                  { backgroundColor: theme.secondarySurface, borderColor: theme.border },
                ]}
                onPress={() => setShowRhythmSetup(true)}
                activeOpacity={0.8}
              >
                <Text style={[styles.boundaryLabel, { color: theme.secondaryText, fontFamily: FONTS.urbanistMedium }]}>
                  Wind-down{' '}
                </Text>
                <Text style={[styles.boundaryTime, { color: theme.text, fontFamily: FONTS.dotoBold }]}>
                  {windDownTime}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Key Windows List Card */}
          <View
            style={[
              styles.windowsCard,
              { backgroundColor: theme.primarySurface, borderColor: theme.border },
            ]}
          >
            <View style={styles.windowsCardHeader}>
              <Text style={[styles.windowsCardTitle, { color: theme.text, fontFamily: FONTS.urbanistSemiBold }]}>
                Key windows
              </Text>

              <TouchableOpacity
                onPress={() => setShowRhythmSetup(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.customizeLink, { color: theme.primaryOlive, fontFamily: FONTS.urbanistMedium }]}>
                  Customize
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.windowsList}>
              {keyWindows.map((item, index) => (
                <View
                  key={item.id}
                  style={[
                    styles.windowRow,
                    index < keyWindows.length - 1 && [
                      styles.windowRowBorder,
                      { borderBottomColor: theme.border },
                    ],
                  ]}
                >
                  <View style={styles.windowLeftCol}>
                    <View style={styles.windowTitleRow}>
                      <View style={[styles.windowDot, { backgroundColor: item.dotColor }]} />
                      <Text style={[styles.windowTitleText, { color: theme.text, fontFamily: FONTS.urbanistSemiBold }]}>
                        {item.title}
                      </Text>
                    </View>
                    <Text style={[styles.windowSubtitleText, { color: theme.secondaryText, fontFamily: FONTS.urbanistRegular }]}>
                      {item.subtitle}
                    </Text>
                  </View>

                  <Text style={[styles.windowTimeText, { color: theme.text, fontFamily: FONTS.dotoSemiBold }]}>
                    {item.timeRange}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Sleeping Habits & Chronotype Questionnaire Modal */}
      <RhythmSetupModal
        visible={showRhythmSetup}
        onClose={() => setShowRhythmSetup(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 10 : 0,
  },
  topNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  navCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 16,
  },
  navTitle: {
    fontSize: 18,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  heroBlock: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroLeft: {
    flex: 1,
    marginRight: 12,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  greenPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 18,
  },
  statusSubtitle: {
    fontSize: 13,
  },
  heroRightCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  gearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  gearIcon: {
    fontSize: 14,
  },
  heroScore: {
    fontSize: 36,
  },
  chartCard: {
    borderRadius: 22,
    borderWidth: 1,
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  boundaryPillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginTop: 14,
  },
  boundaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  boundaryLabel: {
    fontSize: 12,
  },
  boundaryTime: {
    fontSize: 13,
  },
  windowsCard: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  windowsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  windowsCardTitle: {
    fontSize: 16,
  },
  customizeLink: {
    fontSize: 13,
  },
  windowsList: {
    gap: 2,
  },
  windowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  windowRowBorder: {
    borderBottomWidth: 1,
  },
  windowLeftCol: {
    flex: 1,
    marginRight: 10,
  },
  windowTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  windowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  windowTitleText: {
    fontSize: 14,
  },
  windowSubtitleText: {
    fontSize: 11.5,
    marginLeft: 16,
  },
  windowTimeText: {
    fontSize: 12,
  },
});
