import React, { useState, useEffect } from 'react';
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
import { CadenceActivity, ACTIVITY_COLORS } from '../theme/colors';
import { DotMatrixBackground } from '../components/common/DotMatrixBackground';
import { useTaskStore } from '../store/useTaskStore';
import { CadenceTabBar, NavTab } from '../navigation/CadenceTabBar';

interface TasksScreenProps {
  onAddTask?: () => void;
  onNavigateTab?: (tab: NavTab) => void;
  onLongPressAi?: () => void;
}

export const TasksScreen: React.FC<TasksScreenProps> = ({
  onAddTask,
  onNavigateTab,
  onLongPressAi,
}) => {
  const { theme, isDark, toggleTheme } = useTheme();
  const { tasks, toggleTaskCompletion, fetchTasks } = useTaskStore();

  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const filterOptions = [
    { id: 'all', label: 'All' },
    { id: 'deep_work', label: 'Deep work' },
    { id: 'creative_work', label: 'Creative' },
    { id: 'administration', label: 'Admin' },
    { id: 'exercise', label: 'Exercise' },
    { id: 'recovery', label: 'Recovery' },
    { id: 'done', label: 'Done' },
  ];

  // Calculate dynamic % scheduled in peak windows based on is_in_peak_window
  const totalTasks = tasks.length;
  const peakTasksCount = tasks.filter((t) => t.isInPeakWindow !== false).length;
  const peakPercentage = totalTasks > 0 ? Math.round((peakTasksCount / totalTasks) * 100) : 87;

  // Breakdown of tasks by activity category for progress bar segments
  const deepCount = tasks.filter((t) => (t.taskCategory || t.category) === 'deep_work').length || 1;
  const creativeCount = tasks.filter((t) => (t.taskCategory || t.category) === 'creative_work').length || 1;
  const adminCount = tasks.filter((t) => (t.taskCategory || t.category) === 'administration').length || 1;
  const otherCount = tasks.filter((t) => !['deep_work', 'creative_work', 'administration'].includes((t.taskCategory || t.category) as any)).length || 1;

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (selectedFilter === 'all') return !t.isCompleted;
    if (selectedFilter === 'done') return t.isCompleted;
    return (t.taskCategory || t.category) === selectedFilter;
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <DotMatrixBackground />

      <SafeAreaView style={styles.safeArea}>
        {/* Top Header */}
        <View style={styles.topHeaderRow}>
          <Text style={[styles.screenHeading, { color: theme.text, fontFamily: FONTS.urbanistLight }]}>
            Tasks
          </Text>

          <View style={styles.topActionsRow}>
            <TouchableOpacity
              style={[
                styles.iconBtn,
                { backgroundColor: theme.primarySurface, borderColor: theme.border },
              ]}
              onPress={toggleTheme}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 16 }}>{isDark ? '🌙' : '☀️'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.iconBtn,
                { backgroundColor: theme.primarySurface, borderColor: theme.border },
              ]}
              onPress={onAddTask}
              activeOpacity={0.8}
            >
              <Text style={[styles.plusIcon, { color: theme.text, fontFamily: FONTS.urbanistBold }]}>
                +
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top OliveTint Summary Hero Card */}
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: theme.tints.oliveTint.bg,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
              },
            ]}
          >
            <View style={styles.summaryTopRow}>
              <View>
                <Text style={[styles.summaryCategory, { color: theme.text, fontFamily: FONTS.urbanistSemiBold }]}>
                  This week
                </Text>
                <Text style={[styles.summaryTaskCount, { color: theme.secondaryText, fontFamily: FONTS.urbanistRegular }]}>
                  <Text style={{ fontFamily: FONTS.dotoBold }}>{tasks.length}</Text> tasks scheduled
                </Text>
              </View>

              <View style={[styles.leafCircle, { backgroundColor: theme.primaryOlive }]}>
                <View style={[styles.leafInnerDot, { backgroundColor: theme.background }]} />
              </View>
            </View>

            <View style={styles.summaryMetricRow}>
              <Text style={[styles.percentageDoto, { color: theme.text, fontFamily: FONTS.dotoBold }]}>
                {peakPercentage}%
              </Text>
              <Text style={[styles.percentageSubtitle, { color: theme.secondaryText, fontFamily: FONTS.urbanistRegular }]}>
                scheduled in peak windows
              </Text>
            </View>

            {/* Multi-Segment Horizontal Progress Bar */}
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBarSegment,
                  { flex: deepCount, backgroundColor: isDark ? ACTIVITY_COLORS.deep_work.dark : ACTIVITY_COLORS.deep_work.light },
                ]}
              />
              <View
                style={[
                  styles.progressBarSegment,
                  { flex: creativeCount, backgroundColor: isDark ? ACTIVITY_COLORS.creative_work.dark : ACTIVITY_COLORS.creative_work.light },
                ]}
              />
              <View
                style={[
                  styles.progressBarSegment,
                  { flex: adminCount, backgroundColor: isDark ? ACTIVITY_COLORS.administration.dark : ACTIVITY_COLORS.administration.light },
                ]}
              />
              <View
                style={[
                  styles.progressBarSegment,
                  { flex: otherCount, backgroundColor: isDark ? ACTIVITY_COLORS.recovery.dark : ACTIVITY_COLORS.recovery.light },
                ]}
              />
            </View>
          </View>

          {/* Activity Category Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersScrollRow}
          >
            {filterOptions.map((f) => {
              const isSelected = selectedFilter === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor: isSelected ? theme.text : theme.primarySurface,
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={() => setSelectedFilter(f.id)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      {
                        color: isSelected ? theme.background : theme.secondaryText,
                        fontFamily: isSelected ? FONTS.urbanistBold : FONTS.urbanistMedium,
                      },
                    ]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Tasks List */}
          <View style={styles.tasksListContainer}>
            {filteredTasks.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: theme.primarySurface, borderColor: theme.border }]}>
                <Text style={[styles.emptyText, { color: theme.secondaryText, fontFamily: FONTS.urbanistMedium }]}>
                  No tasks in this category
                </Text>
              </View>
            ) : (
              filteredTasks.map((t) => {
                const category = (t.taskCategory || t.category || 'deep_work') as CadenceActivity;
                const spec = ACTIVITY_COLORS[category] || ACTIVITY_COLORS.deep_work;
                const color = isDark ? spec.dark : spec.light;

                return (
                  <View
                    key={t.id}
                    style={[
                      styles.taskCard,
                      {
                        backgroundColor: theme.primarySurface,
                        borderColor: theme.border,
                        opacity: t.isCompleted ? 0.6 : 1,
                      },
                    ]}
                  >
                    {/* Circular Checkbox */}
                    <TouchableOpacity
                      style={[
                        styles.checkboxCircle,
                        {
                          borderColor: t.isCompleted ? theme.primaryOlive : theme.secondaryText,
                          backgroundColor: t.isCompleted ? theme.primaryOlive : 'transparent',
                        },
                      ]}
                      onPress={() => toggleTaskCompletion(t.id)}
                      activeOpacity={0.7}
                    >
                      {t.isCompleted && (
                        <Text style={[styles.checkMark, { color: '#0A0B0D' }]}>✓</Text>
                      )}
                    </TouchableOpacity>

                    {/* Task Title & Details */}
                    <View style={styles.taskMiddle}>
                      <Text
                        style={[
                          styles.taskTitle,
                          {
                            color: theme.text,
                            fontFamily: FONTS.urbanistSemiBold,
                            textDecorationLine: t.isCompleted ? 'line-through' : 'none',
                          },
                        ]}
                      >
                        {t.title}
                      </Text>

                      <View style={styles.taskMetaRow}>
                        <View style={[styles.categoryDot, { backgroundColor: color }]} />
                        <Text style={[styles.categoryName, { color: theme.secondaryText, fontFamily: FONTS.urbanistMedium }]}>
                          {spec.label} · <Text style={{ fontFamily: FONTS.dotoBold }}>{t.estimatedDurationMinutes}</Text> min
                        </Text>
                      </View>
                    </View>

                    {/* Right Scheduled Time */}
                    {t.scheduledStartTime && (
                      <Text style={[styles.scheduledTimeDoto, { color: theme.text, fontFamily: FONTS.dotoBold }]}>
                        {t.scheduledStartTime.split('T')[1]?.slice(0, 5) || '09:00'}
                      </Text>
                    )}
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>

        {/* Floating 4-Tab Bottom Navigation Bar */}
        <CadenceTabBar
          activeTab="Tasks"
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
  topHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  screenHeading: {
    fontSize: 32,
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusIcon: {
    fontSize: 22,
    lineHeight: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 110,
  },
  summaryCard: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  summaryCategory: {
    fontSize: 17,
  },
  summaryTaskCount: {
    fontSize: 13,
    marginTop: 2,
  },
  leafCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leafInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  summaryMetricRow: {
    marginBottom: 14,
  },
  percentageDoto: {
    fontSize: 42,
    lineHeight: 44,
  },
  percentageSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  progressBarContainer: {
    height: 6,
    borderRadius: 3,
    flexDirection: 'row',
    overflow: 'hidden',
    gap: 2,
  },
  progressBarSegment: {
    height: '100%',
    borderRadius: 2,
  },
  filtersScrollRow: {
    gap: 8,
    marginBottom: 18,
    paddingVertical: 2,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 13,
  },
  tasksListContainer: {
    gap: 10,
  },
  emptyCard: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  taskCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  checkboxCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    fontSize: 13,
    fontWeight: '700',
  },
  taskMiddle: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    marginBottom: 3,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  categoryName: {
    fontSize: 12,
  },
  scheduledTimeDoto: {
    fontSize: 14,
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
