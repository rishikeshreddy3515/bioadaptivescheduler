import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useTheme } from '../theme/useTheme';
import { FONTS } from '../theme/typography';
import { CadenceActivity, ACTIVITY_COLORS } from '../theme/colors';
import { DotMatrixBackground } from '../components/common/DotMatrixBackground';
import { TaskCoverFlow3D, CoverFlowTaskItem } from '../components/tasks/TaskCoverFlow3D';
import { useTaskStore } from '../store/useTaskStore';
import { useEnergyStore } from '../store/useEnergyStore';
import { aiScheduler, BestSlotResult } from '../services/aiScheduler';

interface NewTaskScreenProps {
  onClose?: () => void;
  onScheduled?: (taskTitle: string) => void;
}

const TEMPLATE_TASKS: CoverFlowTaskItem[] = [
  {
    id: 't-lic',
    title: 'Licensing & Contracts',
    category: 'administration',
    durationMinutes: 30,
    bestTime: '11:30',
    windowLabel: 'Admin Slump',
    userCount: 2,
    tabLabel: 'Lic',
  },
  {
    id: 't-fir',
    title: 'First Review',
    category: 'administration',
    durationMinutes: 30,
    bestTime: '13:00',
    windowLabel: 'Low Energy',
    userCount: 4,
    tabLabel: 'Fir',
  },
  {
    id: 't-design',
    title: 'Design Review',
    category: 'creative_work',
    durationMinutes: 45,
    bestTime: '16:00',
    windowLabel: 'Second Wind',
    userCount: 12,
    tabLabel: 'Design Review',
  },
  {
    id: 't-spec',
    title: 'Write product spec',
    category: 'deep_work',
    durationMinutes: 45,
    bestTime: '09:10',
    windowLabel: 'Inside Peak',
    userCount: 3,
    tabLabel: 'Write product spec',
  },
  {
    id: 't-peak',
    title: 'Peak focus',
    category: 'deep_work',
    durationMinutes: 60,
    bestTime: '08:30',
    windowLabel: 'Morning Peak',
    isEmerald: true, // The striking emerald glowing folder from Image 1, 2, 3!
    userCount: 4,
    tabLabel: 'Peak focus',
  },
  {
    id: 't-templates',
    title: 'Templates & Assets',
    category: 'creative_work',
    durationMinutes: 30,
    bestTime: '15:00',
    windowLabel: 'Creative Flow',
    userCount: 2,
    tabLabel: 'Templates',
  },
  {
    id: 't-sales',
    title: 'Sales Strategy',
    category: 'administration',
    durationMinutes: 45,
    bestTime: '17:00',
    windowLabel: 'Day Wrap',
    userCount: 3,
    tabLabel: 'Sales',
  },
];

export const NewTaskScreen: React.FC<NewTaskScreenProps> = ({
  onClose,
  onScheduled,
}) => {
  const { theme, isDark } = useTheme();
  const { tasks, createTask, scheduleTaskToTimeline } = useTaskStore();
  const { activeRoutineAtom } = useEnergyStore();

  const [title, setTitle] = useState('Write product spec');
  const [selectedActivity, setSelectedActivity] = useState<CadenceActivity>('deep_work');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [selectedCardIndex, setSelectedCardIndex] = useState(3); // Center on 'Write product spec'

  // AI-generated Best Slot state
  const [bestSlot, setBestSlot] = useState<BestSlotResult>({
    suggested_start_time: '09:10',
    reason: 'inside peak',
  });
  const [isLoadingBestSlot, setIsLoadingBestSlot] = useState(false);

  // Debounced Gemini call whenever duration or activity changes
  useEffect(() => {
    let isMounted = true;
    setIsLoadingBestSlot(true);

    const timer = setTimeout(async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const result = await aiScheduler.getBestSlot({
          taskTitle: title.trim() || 'New task',
          category: selectedActivity,
          durationMinutes,
          currentDate: today,
          routine: activeRoutineAtom,
          existingTasks: tasks.map((t) => ({
            title: t.title,
            startTime: t.scheduledStartTime,
            endTime: t.scheduledEndTime,
            category: t.taskCategory,
          })),
        });

        if (isMounted) {
          setBestSlot(result);
          setIsLoadingBestSlot(false);
        }
      } catch {
        if (isMounted) {
          setIsLoadingBestSlot(false);
        }
      }
    }, 350);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [selectedActivity, durationMinutes, title, activeRoutineAtom, tasks]);

  const activities: { key: CadenceActivity; label: string; tintBg: string; tintBorder: string; tintText: string }[] = [
    { key: 'deep_work', label: 'Deep work', tintBg: '#1A2A28', tintBorder: '#38E1B0', tintText: '#7FE4D1' },
    { key: 'creative_work', label: 'Creative', tintBg: '#2F2320', tintBorder: '#5C3E36', tintText: '#EBB195' },
    { key: 'learning', label: 'Learning', tintBg: '#2D291C', tintBorder: '#574A2E', tintText: '#F2CC68' },
    { key: 'exercise', label: 'Exercise', tintBg: '#331D21', tintBorder: '#633239', tintText: '#F87171' },
    { key: 'recovery', label: 'Recovery', tintBg: '#1E2B1C', tintBorder: '#3F573B', tintText: '#A4D991' },
    { key: 'meals', label: 'Meals', tintBg: '#2F291B', tintBorder: '#5A4D2E', tintText: '#E2B857' },
    { key: 'administration', label: 'Admin', tintBg: '#272633', tintBorder: '#454260', tintText: '#C9BCEB' },
    { key: 'personal', label: 'Personal', tintBg: '#311E29', tintBorder: '#573149', tintText: '#D885A3' },
  ];

  // 3D Duration Slider Math
  const sliderWidth = 160;
  const minMin = 15;
  const maxMin = 90;
  const knobX = useSharedValue(((durationMinutes - minMin) / (maxMin - minMin)) * sliderWidth);

  const updateDuration = (val: number) => {
    setDurationMinutes(val);
  };

  const panSlider = Gesture.Pan()
    .onUpdate((e) => {
      'worklet';
      const newX = Math.max(0, Math.min(sliderWidth, e.x));
      knobX.value = newX;
      const computed = Math.round(minMin + (newX / sliderWidth) * (maxMin - minMin));
      runOnJS(updateDuration)(computed);
    });

  const animatedKnobStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: knobX.value - 10 }],
    };
  });

  const animatedProgressStyle = useAnimatedStyle(() => {
    return {
      width: knobX.value,
    };
  });

  // 3D Press Scale for CTA button
  const ctaScale = useSharedValue(1);
  const ctaPressGesture = Gesture.Tap()
    .onBegin(() => {
      'worklet';
      ctaScale.value = withSpring(0.95, { damping: 12, stiffness: 200 });
    })
    .onFinalize(() => {
      'worklet';
      ctaScale.value = withSpring(1, { damping: 12, stiffness: 200 });
      runOnJS(handleScheduleWithAI)();
    });

  const animatedCtaStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: ctaScale.value }],
    };
  });

  const handleScheduleWithAI = async () => {
    const finalTitle = title.trim() || 'New task';

    try {
      const task = await createTask({
        title: finalTitle,
        priority: 'high',
        requiredEnergy: selectedActivity === 'deep_work' ? 'high' : 'medium',
        estimatedDurationMinutes: durationMinutes,
        taskCategory: selectedActivity,
        labelIds: [],
      });

      const today = new Date().toISOString().split('T')[0];
      const slotTime = bestSlot.suggested_start_time || '09:10';
      await scheduleTaskToTimeline(task.id, `${today}T${slotTime}:00`);
      onScheduled?.(finalTitle);
      onClose?.();
    } catch (e) {
      console.warn('Error scheduling task:', e);
      onClose?.();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#111510' : theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <DotMatrixBackground />

      <SafeAreaView style={styles.safeArea}>
        {/* Top Header: CADENCE, New Task, Close */}
        <View style={styles.topNavRow}>
          <Text style={[styles.brandLabel, { color: theme.secondaryText, fontFamily: FONTS.urbanistSemiBold }]}>
            CADENCE
          </Text>

          <Text style={[styles.navTitle, { color: theme.text, fontFamily: FONTS.urbanistRegular }]}>
            New Task
          </Text>

          <TouchableOpacity
            style={[
              styles.circleBtn,
              { backgroundColor: isDark ? 'rgba(29, 36, 26, 0.8)' : theme.primarySurface, borderColor: theme.border },
            ]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={[styles.closeIcon, { color: theme.text, fontFamily: FONTS.urbanistBold }]}>
              ✕
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* What needs doing */}
          <View style={styles.titleInputSection}>
            <Text style={[styles.fieldLabel, { color: theme.secondaryText, fontFamily: FONTS.urbanistMedium }]}>
              What needs doing
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: isDark ? 'rgba(24, 30, 22, 0.75)' : 'rgba(252, 251, 247, 0.85)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : theme.border,
                },
              ]}
            >
              <TextInput
                style={[
                  styles.textInputField,
                  {
                    color: theme.text,
                    fontFamily: FONTS.urbanistMedium,
                  },
                ]}
                value={title}
                onChangeText={setTitle}
                placeholder="Write product spec"
                placeholderTextColor={theme.secondaryText}
              />
            </View>
          </View>

          {/* 3D Glassmorphic Task Carousel (Cover Flow) */}
          <View style={styles.carouselSection}>
            <TaskCoverFlow3D
              tasks={TEMPLATE_TASKS}
              selectedIndex={selectedCardIndex}
              onSelectIndex={(idx) => {
                setSelectedCardIndex(idx);
                setSelectedActivity(TEMPLATE_TASKS[idx].category);
                setDurationMinutes(TEMPLATE_TASKS[idx].durationMinutes);
                knobX.value = ((TEMPLATE_TASKS[idx].durationMinutes - minMin) / (maxMin - minMin)) * sliderWidth;
              }}
              activeActivity={selectedActivity}
              activeDuration={durationMinutes}
              taskTitle={title}
              bestTime={bestSlot.suggested_start_time}
              windowLabel={bestSlot.reason}
            />
          </View>

          {/* Horizontal Activity Category Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activitiesRow}
          >
            {activities.map((act) => {
              const isSelected = selectedActivity === act.key;

              return (
                <TouchableOpacity
                  key={act.key}
                  style={[
                    styles.activityPill,
                    {
                      backgroundColor: isSelected
                        ? isDark ? '#203837' : '#DDEAE9'
                        : isDark ? act.tintBg : '#EAE6DD',
                      borderColor: isSelected
                        ? isDark ? '#38E1B0' : '#215359'
                        : isDark ? act.tintBorder : '#D8D4CA',
                      borderWidth: isSelected ? 1.6 : 1,
                    },
                  ]}
                  onPress={() => setSelectedActivity(act.key)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.activityPillText,
                      {
                        color: isSelected
                          ? isDark ? '#7FE4D1' : '#143C42'
                          : isDark ? act.tintText : '#4D5348',
                        fontFamily: isSelected ? FONTS.urbanistSemiBold : FONTS.urbanistMedium,
                      },
                    ]}
                  >
                    {act.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Duration Slider + Best Slot Row */}
          <View style={styles.sliderAndSlotRow}>
            {/* Duration Slider Box */}
            <View
              style={[
                styles.sliderCard,
                {
                  backgroundColor: isDark ? 'rgba(29, 36, 26, 0.72)' : 'rgba(252, 251, 247, 0.85)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : theme.border,
                },
              ]}
            >
              <View style={styles.sliderHeader}>
                <Text style={[styles.sliderLabel, { color: theme.text, fontFamily: FONTS.urbanistSemiBold }]}>
                  Duration
                </Text>
              </View>

              <GestureDetector gesture={panSlider}>
                <View style={styles.sliderTouchArea}>
                  <View
                    style={[
                      styles.sliderTrackLine,
                      { backgroundColor: isDark ? '#262E21' : '#E5E1D8' },
                    ]}
                  >
                    <Animated.View
                      style={[
                        styles.sliderTrackProgress,
                        { backgroundColor: theme.primaryOlive },
                        animatedProgressStyle,
                      ]}
                    />
                    <Animated.View
                      style={[
                        styles.sliderKnobCircle,
                        { backgroundColor: theme.primaryOlive },
                        animatedKnobStyle,
                      ]}
                    />
                  </View>
                </View>
              </GestureDetector>
            </View>

            {/* Best Slot 3D Glass Pill */}
            <View
              style={[
                styles.bestSlotGlassPill,
                {
                  backgroundColor: isDark ? 'rgba(32, 50, 53, 0.7)' : 'rgba(221, 234, 233, 0.8)',
                  borderColor: isDark ? 'rgba(149, 201, 209, 0.35)' : 'rgba(33, 83, 89, 0.2)',
                },
              ]}
            >
              <BlurView intensity={22} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
              <View style={styles.bestSlotHeaderRow}>
                <Text style={[styles.bestSlotTitle, { color: theme.text, fontFamily: FONTS.urbanistSemiBold }]}>
                  Best slot
                </Text>
                {isLoadingBestSlot && (
                  <ActivityIndicator size="small" color={theme.primaryOlive} style={{ marginLeft: 6 }} />
                )}
              </View>
              <Text style={[styles.bestSlotTime, { color: theme.primaryOlive, fontFamily: FONTS.dotoBold }]}>
                {bestSlot.suggested_start_time}
              </Text>
              <Text style={[styles.bestSlotDesc, { color: theme.secondaryText, fontFamily: FONTS.urbanistRegular }]} numberOfLines={1}>
                {bestSlot.reason}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Schedule with AI CTA Button */}
        <View style={styles.bottomBar}>
          <GestureDetector gesture={ctaPressGesture}>
            <Animated.View
              style={[
                styles.ctaButton,
                { backgroundColor: theme.primaryOlive },
                animatedCtaStyle,
              ]}
            >
              <Text style={[styles.ctaButtonText, { fontFamily: FONTS.urbanistBold }]}>
                Schedule with AI
              </Text>
            </Animated.View>
          </GestureDetector>
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
  },
  topNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
  },
  brandLabel: {
    fontSize: 12,
    letterSpacing: 1.5,
  },
  navTitle: {
    fontSize: 18,
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 13,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 110,
  },
  titleInputSection: {
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 13,
    marginBottom: 6,
  },
  inputWrapper: {
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  textInputField: {
    fontSize: 15,
  },
  carouselSection: {
    marginHorizontal: -20,
    marginBottom: 6,
  },
  activitiesRow: {
    gap: 8,
    paddingVertical: 6,
    marginBottom: 16,
  },
  activityPill: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 18,
  },
  activityPillText: {
    fontSize: 13,
  },
  sliderAndSlotRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'stretch',
    marginBottom: 16,
  },
  sliderCard: {
    flex: 1.5,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'space-between',
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sliderLabel: {
    fontSize: 14,
  },
  sliderTouchArea: {
    height: 28,
    justifyContent: 'center',
  },
  sliderTrackLine: {
    height: 5,
    borderRadius: 2.5,
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
  },
  sliderTrackProgress: {
    height: 5,
    borderRadius: 2.5,
    position: 'absolute',
    left: 0,
  },
  sliderKnobCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FCFBF7',
    position: 'absolute',
    top: -7.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  bestSlotGlassPill: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  bestSlotHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  bestSlotTitle: {
    fontSize: 13,
  },
  bestSlotTime: {
    fontSize: 19,
    marginVertical: 1,
  },
  bestSlotDesc: {
    fontSize: 10,
    textTransform: 'capitalize',
    textAlign: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
  },
  ctaButton: {
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 6,
  },
  ctaButtonText: {
    fontSize: 17,
    color: '#0A0B0D',
  },
});
