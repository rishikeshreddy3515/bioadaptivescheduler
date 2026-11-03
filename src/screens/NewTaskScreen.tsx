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
  LayoutChangeEvent,
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

// 10 Tasks matching Image 1, 2, and 3
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
    tabLabel: 'First',
  },
  {
    id: 't-con',
    title: 'Contracts & Terms',
    category: 'administration',
    durationMinutes: 30,
    bestTime: '14:00',
    windowLabel: 'Admin',
    userCount: 4,
    tabLabel: 'Con',
  },
  {
    id: 't-admin',
    title: 'Admin & Filing',
    category: 'administration',
    durationMinutes: 20,
    bestTime: '15:00',
    windowLabel: 'Low Focus',
    userCount: 12,
    tabLabel: 'Admin',
  },
  {
    id: 't-design',
    title: 'Design Review',
    category: 'creative_work',
    durationMinutes: 45,
    bestTime: '16:00',
    windowLabel: 'Second Wind',
    userCount: 4,
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
  {
    id: 't-assets',
    title: 'Digital Assets',
    category: 'creative_work',
    durationMinutes: 30,
    bestTime: '11:00',
    windowLabel: 'Creative',
    userCount: 2,
    tabLabel: 'Assets',
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
  const [selectedCardIndex, setSelectedCardIndex] = useState(5); // Default to 'Write product spec' (index 5)
  const [trackWidth, setTrackWidth] = useState(280);

  // AI-generated Best Slot state
  const [bestSlot, setBestSlot] = useState<BestSlotResult>({
    suggested_start_time: '09:10',
    reason: 'Inside Peak',
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
    { key: 'deep_work', label: 'Deep work', tintBg: '#18302A', tintBorder: '#38E1B0', tintText: '#38E1B0' },
    { key: 'creative_work', label: 'Creative', tintBg: '#2D2320', tintBorder: '#5C3E36', tintText: '#EBB195' },
    { key: 'learning', label: 'Learning', tintBg: '#2C281D', tintBorder: '#574A2E', tintText: '#F2CC68' },
    { key: 'exercise', label: 'Exercise', tintBg: '#321D22', tintBorder: '#633239', tintText: '#F87171' },
    { key: 'recovery', label: 'Recovery', tintBg: '#1D2A1C', tintBorder: '#3F573B', tintText: '#A4D991' },
    { key: 'meals', label: 'Meals', tintBg: '#2E281C', tintBorder: '#5A4D2E', tintText: '#E2B857' },
    { key: 'administration', label: 'Admin', tintBg: '#252432', tintBorder: '#454260', tintText: '#C9BCEB' },
    { key: 'personal', label: 'Personal', tintBg: '#2F1E28', tintBorder: '#573149', tintText: '#D885A3' },
  ];

  // 3D Duration Slider Math
  const minMin = 15;
  const maxMin = 90;
  const knobX = useSharedValue(((durationMinutes - minMin) / (maxMin - minMin)) * trackWidth);

  useEffect(() => {
    knobX.value = ((durationMinutes - minMin) / (maxMin - minMin)) * trackWidth;
  }, [trackWidth, durationMinutes]);

  const updateDuration = (val: number) => {
    setDurationMinutes(val);
  };

  const handleSliderLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== trackWidth) {
      setTrackWidth(w);
    }
  };

  const panSlider = Gesture.Pan()
    .onUpdate((e) => {
      'worklet';
      const newX = Math.max(0, Math.min(trackWidth, e.x));
      knobX.value = newX;
      const computed = Math.round(minMin + (newX / trackWidth) * (maxMin - minMin));
      runOnJS(updateDuration)(computed);
    });

  const tapSlider = Gesture.Tap()
    .onEnd((e) => {
      'worklet';
      const newX = Math.max(0, Math.min(trackWidth, e.x));
      knobX.value = newX;
      const computed = Math.round(minMin + (newX / trackWidth) * (maxMin - minMin));
      runOnJS(updateDuration)(computed);
    });

  const sliderGesture = Gesture.Race(panSlider, tapSlider);

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
      ctaScale.value = withSpring(0.96, { damping: 14, stiffness: 220 });
    })
    .onFinalize(() => {
      'worklet';
      ctaScale.value = withSpring(1, { damping: 14, stiffness: 220 });
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
          bounces={false}
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
                setTitle(TEMPLATE_TASKS[idx].title);
              }}
              activeActivity={selectedActivity}
              activeDuration={durationMinutes}
              taskTitle={title}
              bestTime={bestSlot.suggested_start_time}
              windowLabel={bestSlot.reason}
            />
          </View>

          {/* Horizontal Activity Category Pills (Matching Image 3) */}
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
                        ? '#38E1B0' // Luminous mint/teal background from Image 3!
                        : isDark ? act.tintBg : '#EAE6DD',
                      borderColor: isSelected
                        ? '#38E1B0'
                        : isDark ? act.tintBorder : '#D8D4CA',
                      borderWidth: 1,
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
                          ? '#0B2B26' // High-contrast dark text from Image 3!
                          : isDark ? act.tintText : '#4D5348',
                        fontFamily: isSelected ? FONTS.urbanistBold : FONTS.urbanistMedium,
                      },
                    ]}
                  >
                    {act.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Bottom Controls Card: Duration Slider + Schedule with AI + Best Slot (Matching Image 3) */}
          <View
            style={[
              styles.bottomControlsCard,
              {
                backgroundColor: isDark ? 'rgba(24, 30, 22, 0.85)' : 'rgba(252, 251, 247, 0.92)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : theme.border,
              },
            ]}
          >
            {/* Grabber Notch */}
            <View style={styles.sheetHandle} />

            {/* Duration Header & Value */}
            <View style={styles.durationHeaderRow}>
              <Text style={[styles.durationLabel, { color: theme.text, fontFamily: FONTS.urbanistSemiBold }]}>
                Duration
              </Text>
              <Text style={[styles.durationValueText, { color: theme.secondaryText, fontFamily: FONTS.dotoSemiBold }]}>
                {durationMinutes} min
              </Text>
            </View>

            {/* Full-width Draggable Slider */}
            <GestureDetector gesture={sliderGesture}>
              <View style={styles.sliderTouchArea} onLayout={handleSliderLayout}>
                <View
                  style={[
                    styles.sliderTrackLine,
                    { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#E5E1D8' },
                  ]}
                >
                  <Animated.View
                    style={[
                      styles.sliderTrackProgress,
                      { backgroundColor: isDark ? '#A3B142' : theme.primaryOlive },
                      animatedProgressStyle,
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.sliderKnobCircle,
                      { backgroundColor: isDark ? '#A3B142' : theme.primaryOlive },
                      animatedKnobStyle,
                    ]}
                  />
                </View>
              </View>
            </GestureDetector>

            {/* Bottom Actions Row: Schedule with AI (Olive) + Best Slot (Glass Card) */}
            <View style={styles.actionButtonsRow}>
              {/* Primary Schedule with AI CTA Button (Olive Moss Green from Image 3) */}
              <GestureDetector gesture={ctaPressGesture}>
                <Animated.View
                  style={[
                    styles.scheduleAiButton,
                    { backgroundColor: isDark ? '#8F9C3E' : '#7D8C33' },
                    animatedCtaStyle,
                  ]}
                >
                  <Text style={[styles.scheduleAiText, { fontFamily: FONTS.urbanistBold }]}>
                    Schedule with AI
                  </Text>
                </Animated.View>
              </GestureDetector>

              {/* Best Slot Glass Card (Matching Image 3) */}
              <View
                style={[
                  styles.bestSlotCard,
                  {
                    backgroundColor: isDark ? 'rgba(40, 50, 40, 0.6)' : 'rgba(221, 234, 233, 0.8)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(33, 83, 89, 0.2)',
                  },
                ]}
              >
                <BlurView intensity={24} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                <View style={styles.bestSlotHeaderRow}>
                  <Text style={[styles.bestSlotTitle, { color: theme.text, fontFamily: FONTS.urbanistSemiBold }]}>
                    Best slot
                  </Text>
                  {isLoadingBestSlot && (
                    <ActivityIndicator size="small" color="#8F9C3E" style={{ marginLeft: 4 }} />
                  )}
                </View>
                <Text
                  style={[
                    styles.bestSlotSub,
                    {
                      color: isDark ? 'rgba(255, 255, 255, 0.65)' : theme.secondaryText,
                      fontFamily: FONTS.urbanistRegular,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {bestSlot.suggested_start_time} · {bestSlot.reason}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
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
    paddingBottom: 4,
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
    paddingTop: 4,
    paddingBottom: 28,
  },
  titleInputSection: {
    marginBottom: 4,
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
    marginVertical: 4,
  },
  activitiesRow: {
    gap: 8,
    paddingVertical: 4,
    marginBottom: 14,
  },
  activityPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  activityPillText: {
    fontSize: 13,
  },

  // Bottom Controls Card (Matching Image 3)
  bottomControlsCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  durationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  durationLabel: {
    fontSize: 14,
  },
  durationValueText: {
    fontSize: 13,
  },
  sliderTouchArea: {
    height: 28,
    justifyContent: 'center',
    marginBottom: 14,
  },
  sliderTrackLine: {
    height: 4.5,
    borderRadius: 2.25,
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
  },
  sliderTrackProgress: {
    height: 4.5,
    borderRadius: 2.25,
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
    top: -7.75,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  scheduleAiButton: {
    flex: 1.5,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  scheduleAiText: {
    fontSize: 16,
    color: '#0D130C',
  },
  bestSlotCard: {
    flex: 1,
    height: 52,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bestSlotHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bestSlotTitle: {
    fontSize: 12.5,
  },
  bestSlotSub: {
    fontSize: 10.5,
    marginTop: 2,
  },
});
