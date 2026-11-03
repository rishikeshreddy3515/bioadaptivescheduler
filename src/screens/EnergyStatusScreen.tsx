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
import { TickGauge } from '../components/common/TickGauge';
import { useEnergyStore } from '../store/useEnergyStore';
import { CadenceTabBar, NavTab } from '../navigation/CadenceTabBar';

interface EnergyStatusScreenProps {
  onOpenCircadianRhythm?: () => void;
  onNavigateTab?: (tab: NavTab) => void;
  onLongPressAi?: () => void;
}

export const EnergyStatusScreen: React.FC<EnergyStatusScreenProps> = ({
  onOpenCircadianRhythm,
  onNavigateTab,
  onLongPressAi,
}) => {
  const { theme, isDark, toggleTheme } = useTheme();
  const {
    currentEnergyScoreSelector,
    circadianPhaseSelector,
    dailyBiometrics,
    activeRoutineAtom,
  } = useEnergyStore();

  const scoreInfo = currentEnergyScoreSelector();
  const phases = circadianPhaseSelector();

  const [liveTimeString, setLiveTimeString] = React.useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  React.useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setLiveTimeString(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const sleepHours = dailyBiometrics?.sleepHours || 7.2;
  const sleepH = Math.floor(sleepHours);
  const sleepM = Math.round((sleepHours - sleepH) * 60);

  const hrvValue = dailyBiometrics?.hrvMs || 64;
  const restingHrValue = dailyBiometrics?.restingHrBpm || 64;
  const readinessValue = dailyBiometrics?.readinessScore || 82;

  const caffeineTime = activeRoutineAtom?.caffeineCutoff || '14:00';
  const windDownTime = activeRoutineAtom?.windDownTime || '21:30';
  const peakStart = phases?.morningPeakFocus?.start || '08:30';
  const peakEnd = phases?.morningPeakFocus?.end || '11:00';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <DotMatrixBackground />

      <SafeAreaView style={styles.safeArea}>
        {/* Top Header */}
        <View style={styles.topHeader}>
          <View style={styles.topHeaderSide} />
          <Text style={[styles.screenHeaderTitle, { color: theme.text, fontFamily: FONTS.urbanistRegular }]}>
            Energy
          </Text>
          <TouchableOpacity
            style={[
              styles.themeToggleBtn,
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
          {/* Sub-header row */}
          <View style={styles.subHeaderRow}>
            <Text style={[styles.sectionHeading, { color: theme.text, fontFamily: FONTS.urbanistSemiBold }]}>
              Energy status
            </Text>
            <Text style={[styles.nowText, { color: theme.secondaryText, fontFamily: FONTS.urbanistMedium }]}>
              Now <Text style={{ fontFamily: FONTS.dotoBold, color: theme.text }}>{liveTimeString}</Text>
            </Text>
          </View>

          {/* Top Status Pill: tealTint with 'Peak 08:30 - 11:00' */}
          <TouchableOpacity
            style={[
              styles.statusPill,
              {
                backgroundColor: theme.tints.tealTint.bg,
                borderColor: isDark ? 'rgba(149, 201, 209, 0.25)' : 'rgba(33, 83, 89, 0.15)',
              },
            ]}
            onPress={onOpenCircadianRhythm}
            activeOpacity={0.82}
          >
            <View style={[styles.tealPillDot, { backgroundColor: theme.indicators.peak }]} />
            <Text style={[styles.pillTitle, { color: theme.tints.tealTint.text, fontFamily: FONTS.urbanistSemiBold }]}>
              Peak{' '}
            </Text>
            <Text style={[styles.pillTime, { color: theme.tints.tealTint.text, fontFamily: FONTS.dotoBold }]}>
              {peakStart} – {peakEnd}
            </Text>
            <Text style={[styles.pillArrow, { color: theme.tints.tealTint.text, fontFamily: FONTS.urbanistBold }]}>
              {' '}→
            </Text>
          </TouchableOpacity>

          {/* Center Radial Tick-Ring Gauge Section */}
          <TouchableOpacity
            style={styles.centerGaugeBlock}
            onPress={onOpenCircadianRhythm}
            activeOpacity={0.9}
          >
            {/* Flanking Metrics and Ring Row */}
            <View style={styles.gaugeWithFlanksRow}>
              {/* Left Flank: Sleep */}
              <View style={styles.flankColumn}>
                <Text style={[styles.flankLabel, { color: theme.secondaryText, fontFamily: FONTS.urbanistMedium }]}>
                  Sleep
                </Text>
                <Text style={[styles.flankValue, { color: theme.text }]}>
                  <Text style={{ fontFamily: FONTS.dotoBold }}>{sleepH}</Text>
                  <Text style={{ fontFamily: FONTS.urbanistMedium }}>h </Text>
                  <Text style={{ fontFamily: FONTS.dotoBold }}>{String(sleepM).padStart(2, '0')}</Text>
                </Text>
              </View>

              {/* Center 240x240 Ring */}
              <View style={styles.ringContainer}>
                <TickGauge
                  percentage={readinessValue}
                  size={240}
                  totalTicks={48}
                  needleColor={theme.primaryOlive}
                />
                {/* Center Content Inside Ring */}
                <View style={styles.ringCenterContent} pointerEvents="none">
                  <Text style={[styles.centerMetricValue, { color: theme.text, fontFamily: FONTS.dotoBold }]}>
                    {readinessValue}
                  </Text>
                  <Text style={[styles.centerMetricLabel, { color: theme.secondaryText, fontFamily: FONTS.urbanistMedium }]}>
                    Readiness
                  </Text>
                </View>
              </View>

              {/* Right Flank: HRV */}
              <View style={styles.flankColumn}>
                <Text style={[styles.flankLabel, { color: theme.secondaryText, fontFamily: FONTS.urbanistMedium }]}>
                  HRV
                </Text>
                <Text style={[styles.flankValue, { color: theme.text }]}>
                  <Text style={{ fontFamily: FONTS.dotoBold }}>{hrvValue}</Text>
                  <Text style={{ fontFamily: FONTS.urbanistMedium }}> ms</Text>
                </Text>
              </View>
            </View>

            {/* Sub-Ring Timestamps: Now and Wind-down */}
            <View style={styles.subRingTimeRow}>
              <View
                style={[
                  styles.subTimePill,
                  { backgroundColor: theme.primarySurface, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.subTimeLabel, { color: theme.secondaryText, fontFamily: FONTS.urbanistMedium }]}>
                  Now{' '}
                </Text>
                <Text style={[styles.subTimeValue, { color: theme.text, fontFamily: FONTS.dotoBold }]}>
                  10:20
                </Text>
              </View>

              <View
                style={[
                  styles.subTimePill,
                  { backgroundColor: theme.primarySurface, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.subTimeLabel, { color: theme.secondaryText, fontFamily: FONTS.urbanistMedium }]}>
                  Wind-down{' '}
                </Text>
                <Text style={[styles.subTimeValue, { color: theme.text, fontFamily: FONTS.dotoBold }]}>
                  {windDownTime}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Bottom Metric Cards */}
          <View style={styles.bottomCardsContainer}>
            {/* Card 1: Resting HR */}
            <View
              style={[
                styles.metricCard,
                {
                  backgroundColor: theme.secondarySurface,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.metricCardHeader}>
                <Text style={[styles.metricCardTitle, { color: theme.text, fontFamily: FONTS.urbanistSemiBold }]}>
                  Resting HR
                </Text>
                <Text style={[styles.metricCardVal, { color: theme.text }]}>
                  <Text style={{ fontFamily: FONTS.dotoBold, fontSize: 20 }}>{restingHrValue}</Text>
                  <Text style={{ fontFamily: FONTS.urbanistMedium, fontSize: 14 }}> bpm</Text>
                </Text>
              </View>
              <Text style={[styles.metricCardSubtitle, { color: theme.secondaryText, fontFamily: FONTS.urbanistRegular }]}>
                Within your range
              </Text>
            </View>

            {/* Card 2: Caffeine Cutoff (peachTint) */}
            <View
              style={[
                styles.metricCard,
                {
                  backgroundColor: theme.tints.peachTint.bg,
                  borderColor: isDark ? 'rgba(235, 177, 149, 0.2)' : 'rgba(110, 62, 44, 0.15)',
                },
              ]}
            >
              <View style={styles.metricCardHeader}>
                <Text
                  style={[
                    styles.metricCardTitle,
                    {
                      color: isDark ? theme.tints.peachTint.text : theme.tints.peachTint.text,
                      fontFamily: FONTS.urbanistSemiBold,
                    },
                  ]}
                >
                  Caffeine cutoff
                </Text>
                <Text
                  style={[
                    styles.metricCardVal,
                    {
                      color: isDark ? theme.tints.peachTint.text : theme.tints.peachTint.text,
                      fontFamily: FONTS.dotoBold,
                      fontSize: 20,
                    },
                  ]}
                >
                  {caffeineTime}
                </Text>
              </View>
              <Text
                style={[
                  styles.metricCardSubtitle,
                  {
                    color: isDark ? 'rgba(235, 177, 149, 0.8)' : 'rgba(110, 62, 44, 0.8)',
                    fontFamily: FONTS.urbanistRegular,
                  },
                ]}
              >
                in <Text style={{ fontFamily: FONTS.dotoBold }}>3</Text>h{' '}
                <Text style={{ fontFamily: FONTS.dotoBold }}>40</Text>m
              </Text>
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
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
  },
  topHeaderSide: {
    width: 40,
  },
  screenHeaderTitle: {
    fontSize: 18,
  },
  themeToggleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 110,
  },
  subHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 16,
  },
  nowText: {
    fontSize: 13,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  tealPillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  pillTitle: {
    fontSize: 14,
  },
  pillTime: {
    fontSize: 14,
  },
  pillArrow: {
    fontSize: 14,
  },
  centerGaugeBlock: {
    alignItems: 'center',
    marginBottom: 24,
  },
  gaugeWithFlanksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 6,
  },
  flankColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
  },
  flankLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  flankValue: {
    fontSize: 16,
  },
  ringContainer: {
    width: 240,
    height: 240,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenterContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerMetricValue: {
    fontSize: 60,
    lineHeight: 64,
  },
  centerMetricLabel: {
    fontSize: 14,
    marginTop: 2,
  },
  subRingTimeRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  subTimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  subTimeLabel: {
    fontSize: 12,
  },
  subTimeValue: {
    fontSize: 12,
  },
  bottomCardsContainer: {
    gap: 12,
  },
  metricCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  metricCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  metricCardTitle: {
    fontSize: 16,
  },
  metricCardVal: {
    fontSize: 16,
  },
  metricCardSubtitle: {
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

