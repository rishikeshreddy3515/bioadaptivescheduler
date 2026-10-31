import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { Canvas, Circle, RadialGradient, vec } from '@shopify/react-native-skia';
import { useTheme } from '../theme/useTheme';
import { FONTS } from '../theme/typography';
import { ACTIVITY_COLORS, CadenceActivity } from '../theme/colors';
import { DotMatrixBackground } from '../components/common/DotMatrixBackground';
import { TickGauge } from '../components/common/TickGauge';
import { RhythmRuler } from '../components/common/RhythmRuler';
import { CadenceTabBar, NavTab } from '../navigation/CadenceTabBar';
import { useEnergyStore } from '../store/useEnergyStore';
import { useTaskStore } from '../store/useTaskStore';
import { useCalendarStore } from '../store/useCalendarStore';
import { syncService, ConnectedSourcesConfig, DEFAULT_CONNECTED_SOURCES } from '../services/syncService';
import { classifyEventCategory } from '../services/googleCalendar';
import { calculateCircadianPhases } from '../api/energyService';

interface TodayScreenProps {
  onNavigateTab?: (tab: NavTab) => void;
  onAddTask?: () => void;
  onReplan?: () => void;
  onViewTasks?: () => void;
  onResetOnboarding?: () => void;
  onLongPressAi?: () => void;
}

export const TodayScreen: React.FC<TodayScreenProps> = ({
  onNavigateTab,
  onAddTask,
  onReplan,
  onViewTasks,
  onResetOnboarding,
  onLongPressAi,
}) => {
  const { theme, isDark, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'Today' | 'Tasks' | 'Energy' | 'Profile'>('Today');

  // Stores for live data hydration
  const { dailyBiometrics, activeRoutineAtom } = useEnergyStore();
  const { tasks, fetchTasks } = useTaskStore();
  const { events } = useCalendarStore();

  const [connectedSources, setConnectedSources] = useState<ConnectedSourcesConfig>(DEFAULT_CONNECTED_SOURCES);

  useEffect(() => {
    fetchTasks().catch(() => {});
    syncService.getConnectedSources().then(setConnectedSources).catch(() => {});
  }, [fetchTasks]);

  const handleTabPress = (tab: 'Today' | 'Tasks' | 'Energy' | 'Profile') => {
    setActiveTab(tab);
    onNavigateTab?.(tab);
  };

  // Formatted date string (e.g. "Saturday, 31 October")
  const dateFormatted = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date());
  }, []);

  // Readiness percentage from live biometrics
  const readiness = dailyBiometrics?.readinessScore ?? 82;
  const peakUntil = useMemo(() => {
    if (activeRoutineAtom) {
      try {
        const phases = calculateCircadianPhases(activeRoutineAtom);
        return phases.morningPeakFocus.end;
      } catch {
        return '11:00';
      }
    }
    return '11:00';
  }, [activeRoutineAtom]);

  // Live Up Next items (combining uncompleted tasks + scheduled calendar events)
  const upNextItems = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const items: Array<{
      id: string;
      title: string;
      category: CadenceActivity;
      time: string;
      subtitle: string;
    }> = [];

    // 1. Scheduled uncompleted tasks
    tasks
      .filter((t) => !t.isCompleted && t.scheduledStartTime)
      .forEach((t) => {
        const timePart = t.scheduledStartTime?.includes('T')
          ? t.scheduledStartTime.split('T')[1].substring(0, 5)
          : '09:00';
        const cat = t.taskCategory || 'deep_work';
        const spec = ACTIVITY_COLORS[cat] || ACTIVITY_COLORS.deep_work;
        items.push({
          id: `task-${t.id}`,
          title: t.title,
          category: cat,
          time: timePart,
          subtitle: `${spec.label} · ${cat === 'deep_work' ? 'peak' : 'scheduled'}`,
        });
      });

    // 2. Calendar events for today
    events
      .filter((ev) => ev.startTime && ev.startTime.startsWith(todayStr))
      .forEach((ev) => {
        const timePart = ev.startTime.includes('T')
          ? ev.startTime.split('T')[1].substring(0, 5)
          : '09:00';
        const cat = classifyEventCategory(ev.title, ev.description);
        const spec = ACTIVITY_COLORS[cat] || ACTIVITY_COLORS.deep_work;
        items.push({
          id: `ev-${ev.id}`,
          title: ev.title,
          category: cat,
          time: timePart,
          subtitle: `${spec.label} · calendar`,
        });
      });

    // If empty, return standard baseline items
    if (items.length === 0) {
      return [
        {
          id: 'seed-1',
          title: 'Draft Q4 strategy',
          category: 'deep_work' as CadenceActivity,
          time: '09:00',
          subtitle: 'Deep work · peak',
        },
        {
          id: 'seed-2',
          title: 'Inbox and admin',
          category: 'administration' as CadenceActivity,
          time: '13:30',
          subtitle: 'Low-energy task',
        },
      ];
    }

    return items.sort((a, b) => a.time.localeCompare(b.time)).slice(0, 4);
  }, [tasks, events]);

  // Deep work remaining duration
  const deepWorkLeftText = useMemo(() => {
    const deepMinutes = tasks
      .filter((t) => !t.isCompleted && t.taskCategory === 'deep_work')
      .reduce((acc, t) => acc + (t.durationMinutes || t.estimatedDurationMinutes || 45), 0);

    if (deepMinutes <= 0) return '1h 40m deep work left';
    const h = Math.floor(deepMinutes / 60);
    const m = deepMinutes % 60;
    return `${h > 0 ? `${h}h ` : ''}${m}m deep work left`;
  }, [tasks]);

  // Dynamic current hour for RhythmRuler
  const currentHour = useMemo(() => {
    const now = new Date();
    return now.getHours() + now.getMinutes() / 60;
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <DotMatrixBackground />

      {/* Soft Radial Ambient Glow */}
      <View style={styles.glowContainer} pointerEvents="none">
        <Canvas style={styles.glowCanvas}>
          <Circle cx={120} cy={120} r={120}>
            <RadialGradient
              c={vec(120, 120)}
              r={120}
              colors={[
                isDark ? 'rgba(104, 231, 142, 0.22)' : 'rgba(91, 138, 60, 0.15)',
                'transparent',
              ]}
            />
          </Circle>
        </Canvas>
      </View>

      <SafeAreaView style={styles.safeArea}>
        {/* Top Bar: Connected Pills (H G T) + Theme Switcher + Bell */}
        <View style={styles.topBar}>
          {/* Connected source badges (H G T) dynamically highlighted */}
          <View style={styles.sourcePillGroup}>
            <View
              style={[
                styles.sourceCircle,
                {
                  backgroundColor: connectedSources.health
                    ? isDark
                      ? '#2A3B29'
                      : '#DDEAE9'
                    : theme.primarySurface,
                  borderColor: connectedSources.health ? theme.primaryOlive : theme.border,
                  zIndex: 3,
                },
              ]}
            >
              <Text
                style={[
                  styles.sourceCircleText,
                  {
                    color: connectedSources.health ? theme.primaryOlive : theme.secondaryText,
                    fontFamily: FONTS.urbanistBold,
                  },
                ]}
              >
                H
              </Text>
            </View>
            <View
              style={[
                styles.sourceCircle,
                {
                  backgroundColor: connectedSources.gcal
                    ? isDark
                      ? '#2A3B29'
                      : '#DDEAE9'
                    : theme.primarySurface,
                  borderColor: connectedSources.gcal ? theme.primaryOlive : theme.border,
                  marginLeft: -10,
                  zIndex: 2,
                },
              ]}
            >
              <Text
                style={[
                  styles.sourceCircleText,
                  {
                    color: connectedSources.gcal ? theme.primaryOlive : theme.secondaryText,
                    fontFamily: FONTS.urbanistBold,
                  },
                ]}
              >
                G
              </Text>
            </View>
            <View
              style={[
                styles.sourceCircle,
                {
                  backgroundColor: connectedSources.todoist
                    ? isDark
                      ? '#2A3B29'
                      : '#DDEAE9'
                    : theme.primarySurface,
                  borderColor: connectedSources.todoist ? theme.primaryOlive : theme.border,
                  marginLeft: -10,
                  zIndex: 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.sourceCircleText,
                  {
                    color: connectedSources.todoist ? theme.primaryOlive : theme.secondaryText,
                    fontFamily: FONTS.urbanistBold,
                  },
                ]}
              >
                T
              </Text>
            </View>
          </View>

          {/* Right actions: Theme toggle + Notification bell */}
          <View style={styles.topRightActions}>
            <TouchableOpacity
              style={[
                styles.themeToggleBtn,
                { backgroundColor: theme.primarySurface, borderColor: theme.border },
              ]}
              onPress={toggleTheme}
              activeOpacity={0.8}
            >
              <Text style={[styles.themeToggleText, { color: theme.text }]}>
                {isDark ? '🌙' : '☀️'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.bellButton,
                { backgroundColor: theme.primarySurface, borderColor: theme.border },
              ]}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 18 }}>🔔</Text>
              <View
                style={[
                  styles.bellBadge,
                  { backgroundColor: theme.indicators.badgeRed },
                ]}
              >
                <Text style={styles.bellBadgeText}>2</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Screen Title & Live Date */}
          <View style={styles.headerBlock}>
            <Text style={[styles.screenTitle, { color: theme.text, fontFamily: FONTS.urbanistLight }]}>
              Today
            </Text>
            <Text style={[styles.dateSubtitle, { color: theme.secondaryText, fontFamily: FONTS.urbanistMedium }]}>
              {dateFormatted}
            </Text>
          </View>

          {/* Readiness Hero Card - Live Hydration */}
          <View
            style={[
              styles.heroCard,
              {
                backgroundColor: isDark
                  ? theme.tints.oliveTint.bg
                  : theme.tints.oliveTint.bg,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
              },
            ]}
          >
            <View style={styles.heroCardLeft}>
              <View>
                <Text style={[styles.heroCardTitle, { color: theme.text, fontFamily: FONTS.urbanistSemiBold }]}>
                  Readiness
                </Text>
                <Text style={[styles.heroCardSubtitle, { color: theme.secondaryText, fontFamily: FONTS.urbanistRegular }]}>
                  Peak until {peakUntil}
                </Text>
              </View>

              <Text style={[styles.readinessMetric, { color: theme.text, fontFamily: FONTS.dotoBold }]}>
                {readiness}%
              </Text>
            </View>

            <View style={styles.heroCardRight}>
              <TickGauge percentage={readiness} size={84} needleColor={theme.primaryOlive} />
            </View>
          </View>

          {/* Action Pills Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.actionPill,
                { backgroundColor: theme.primarySurface, borderColor: theme.border },
              ]}
              onPress={onViewTasks}
              activeOpacity={0.8}
            >
              <Text style={[styles.actionPillText, { color: theme.text, fontFamily: FONTS.urbanistSemiBold }]}>
                View tasks
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionPill,
                { backgroundColor: theme.primaryOlive, borderColor: theme.primaryOlive },
              ]}
              onPress={onAddTask}
              activeOpacity={0.8}
            >
              <Text style={[styles.actionPillTextPrimary, { fontFamily: FONTS.urbanistBold }]}>
                + Add task
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionPill,
                { backgroundColor: theme.primarySurface, borderColor: theme.border },
              ]}
              onPress={onReplan}
              activeOpacity={0.8}
            >
              <Text style={[styles.actionPillText, { color: theme.text, fontFamily: FONTS.urbanistSemiBold }]}>
                Replan
              </Text>
            </TouchableOpacity>
          </View>

          {/* Up Next Section - Live Hydrated */}
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: FONTS.urbanistSemiBold }]}>
              Up next
            </Text>

            <View style={styles.eventsList}>
              {upNextItems.map((item) => {
                const spec = ACTIVITY_COLORS[item.category] || ACTIVITY_COLORS.deep_work;
                const dotColor = isDark ? spec.dark : spec.light;

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.eventCard,
                      { backgroundColor: theme.primarySurface, borderColor: theme.border },
                    ]}
                  >
                    <View style={styles.eventCardLeft}>
                      <Text style={[styles.eventTitle, { color: theme.text, fontFamily: FONTS.urbanistSemiBold }]}>
                        {item.title}
                      </Text>
                      <View style={styles.eventCategoryRow}>
                        <View
                          style={[
                            styles.categoryDot,
                            { backgroundColor: dotColor },
                          ]}
                        />
                        <Text
                          style={[
                            styles.eventCategoryText,
                            { color: theme.secondaryText, fontFamily: FONTS.urbanistMedium },
                          ]}
                        >
                          {item.subtitle}
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.eventTimeText, { color: theme.text, fontFamily: FONTS.dotoBold }]}>
                      {item.time}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Today's Rhythm Card - Live Hydrated */}
          <View
            style={[
              styles.rhythmCard,
              { backgroundColor: theme.primarySurface, borderColor: theme.border },
            ]}
          >
            <View style={styles.rhythmHeader}>
              <Text style={[styles.rhythmTitle, { color: theme.text, fontFamily: FONTS.urbanistSemiBold }]}>
                {deepWorkLeftText}
              </Text>
              <Text style={[styles.rhythmTag, { color: theme.secondaryText, fontFamily: FONTS.urbanistRegular }]}>
                Today's rhythm
              </Text>
            </View>

            {/* Skia Horizontal Tick Ruler with Live Now marker */}
            <RhythmRuler currentHour={currentHour} />
          </View>

          {/* Reset Onboarding Option for Testing / Verification */}
          {onResetOnboarding && (
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={onResetOnboarding}
              activeOpacity={0.7}
            >
              <Text style={[styles.resetBtnText, { color: theme.secondaryText, fontFamily: FONTS.urbanistMedium }]}>
                ← Return to Connect Onboarding
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Floating 4-Tab Bottom Navigation Bar */}
        <CadenceTabBar
          activeTab={activeTab}
          onSelectTab={handleTabPress}
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
  glowContainer: {
    position: 'absolute',
    top: 140,
    right: 20,
    width: 240,
    height: 240,
  },
  glowCanvas: {
    width: 240,
    height: 240,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
  },
  sourcePillGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceCircleText: {
    fontSize: 12,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  themeToggleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeToggleText: {
    fontSize: 14,
  },
  bellButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: {
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
  },
  headerBlock: {
    marginBottom: 18,
  },
  screenTitle: {
    fontSize: 32,
    letterSpacing: -0.5,
  },
  dateSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroCardLeft: {
    justifyContent: 'space-between',
    height: 80,
  },
  heroCardTitle: {
    fontSize: 17,
  },
  heroCardSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  readinessMetric: {
    fontSize: 32,
    lineHeight: 36,
  },
  heroCardRight: {
    width: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  actionPill: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPillText: {
    fontSize: 14,
  },
  actionPillTextPrimary: {
    fontSize: 14,
    color: '#0A0B0D',
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    marginBottom: 12,
  },
  eventsList: {
    gap: 10,
  },
  eventCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventCardLeft: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 15,
    marginBottom: 3,
  },
  eventCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  eventCategoryText: {
    fontSize: 12,
  },
  eventTimeText: {
    fontSize: 18,
    marginLeft: 10,
  },
  rhythmCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 24,
  },
  rhythmHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rhythmTitle: {
    fontSize: 15,
  },
  rhythmTag: {
    fontSize: 12,
  },
  resetBtn: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  resetBtnText: {
    fontSize: 13,
  },
});
