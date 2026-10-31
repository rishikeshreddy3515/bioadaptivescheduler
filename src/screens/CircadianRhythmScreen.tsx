import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useTheme } from '../theme/useTheme';
import { FONTS } from '../theme/typography';
import { DotMatrixBackground } from '../components/common/DotMatrixBackground';
import { CircadianWave } from '../components/energy/CircadianWave';
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

  const scoreInfo = currentEnergyScoreSelector();
  const phases = circadianPhaseSelector();

  const wakeTime = activeRoutineAtom?.wakeTime || '06:30';
  const windDownTime = activeRoutineAtom?.windDownTime || '21:30';
  const caffeineTime = activeRoutineAtom?.caffeineCutoff || '14:00';
  const secondWindRange = `${activeRoutineAtom?.secondWindStart || '16:30'}–${activeRoutineAtom?.secondWindEnd || '18:00'}`;
  const peakRange = `${phases?.morningPeakFocus?.start || '08:30'}–${phases?.morningPeakFocus?.end || '11:00'}`;
  const slumpRange = `${phases?.postprandialDip?.start || '13:00'}–${phases?.postprandialDip?.end || '15:30'}`;

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
        {/* Top Header Row with Back Button, Title & Theme Toggle */}
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
                <View style={[styles.greenPulseDot, { backgroundColor: theme.primaryOlive }]} />
                <Text style={[styles.statusBadgeText, { color: theme.text, fontFamily: FONTS.urbanistSemiBold }]}>
                  In your peak
                </Text>
              </View>

              <Text style={[styles.statusSubtitle, { color: theme.secondaryText, fontFamily: FONTS.urbanistRegular }]}>
                Until <Text style={{ fontFamily: FONTS.dotoBold, color: theme.text }}>11:00</Text> · best for deep work
              </Text>
            </View>

            <Text style={[styles.heroScore, { color: theme.text, fontFamily: FONTS.dotoBold }]}>
              86
            </Text>
          </View>

          {/* Wave Chart Card */}
          <View
            style={[
              styles.chartCard,
              { backgroundColor: theme.primarySurface, borderColor: theme.border },
            ]}
          >
            {/* Skia Cubic Bezier Wave with Shaded Columns and Now Pin */}
            <CircadianWave currentHour={10.33} height={190} />

            {/* Boundary Tags: Wake and Wind-down */}
            <View style={styles.boundaryPillRow}>
              <View
                style={[
                  styles.boundaryPill,
                  { backgroundColor: theme.secondarySurface, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.boundaryLabel, { color: theme.secondaryText, fontFamily: FONTS.urbanistMedium }]}>
                  Wake{' '}
                </Text>
                <Text style={[styles.boundaryTime, { color: theme.text, fontFamily: FONTS.dotoBold }]}>
                  {wakeTime}
                </Text>
              </View>

              <View
                style={[
                  styles.boundaryPill,
                  { backgroundColor: theme.secondarySurface, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.boundaryLabel, { color: theme.secondaryText, fontFamily: FONTS.urbanistMedium }]}>
                  Wind-down{' '}
                </Text>
                <Text style={[styles.boundaryTime, { color: theme.text, fontFamily: FONTS.dotoBold }]}>
                  {windDownTime}
                </Text>
              </View>
            </View>
          </View>

          {/* Key Windows List Card */}
          <View
            style={[
              styles.windowsCard,
              { backgroundColor: theme.primarySurface, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.windowsCardTitle, { color: theme.text, fontFamily: FONTS.urbanistSemiBold }]}>
              Key windows
            </Text>

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
                  <View style={[styles.windowDot, { backgroundColor: item.dotColor }]} />

                  <View style={styles.windowInfo}>
                    <Text style={[styles.windowTitle, { color: theme.text, fontFamily: FONTS.urbanistSemiBold }]}>
                      {item.title}
                    </Text>
                    <Text style={[styles.windowSubtitle, { color: theme.secondaryText, fontFamily: FONTS.urbanistRegular }]}>
                      {item.subtitle}
                    </Text>
                  </View>

                  <Text style={[styles.windowTime, { color: theme.text, fontFamily: FONTS.dotoBold }]}>
                    {item.timeRange}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Floating 4-Tab Bottom Navigation Bar */}
        <CadenceTabBar
          activeTab="Energy"
          onSelectTab={onNavigateTab || (() => {})}
          onLongPressAi={onLongPressAi}
        />
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
  },
  topNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  navCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 20,
  },
  navTitle: {
    fontSize: 18,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 110,
  },
  heroBlock: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroLeft: {
    flex: 1,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  greenPulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusBadgeText: {
    fontSize: 18,
  },
  statusSubtitle: {
    fontSize: 13,
  },
  heroScore: {
    fontSize: 40,
    lineHeight: 42,
    marginLeft: 16,
  },
  chartCard: {
    borderRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 16,
    marginBottom: 18,
  },
  boundaryPillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginTop: 24,
  },
  boundaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  boundaryLabel: {
    fontSize: 13,
  },
  boundaryTime: {
    fontSize: 13,
  },
  windowsCard: {
    borderRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 20,
  },
  windowsCardTitle: {
    fontSize: 17,
    marginBottom: 10,
  },
  windowsList: {
    gap: 0,
  },
  windowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 13,
  },
  windowRowBorder: {
    borderBottomWidth: 1,
  },
  windowDot: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
  },
  windowInfo: {
    flex: 1,
  },
  windowTitle: {
    fontSize: 16,
    marginBottom: 2,
  },
  windowSubtitle: {
    fontSize: 12,
  },
  windowTime: {
    fontSize: 13,
  },
  floatingTabBar: {
    position: 'absolute',
    bottom: 22,
    left: 20,
    right: 20,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  tabItem: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  activeTabPill: {
    paddingHorizontal: 18,
  },
  activeTabText: {
    fontSize: 14,
  },
});

