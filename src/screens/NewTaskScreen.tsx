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
  Platform,
} from 'react-native';
import { useTheme } from '../theme/useTheme';
import { FONTS } from '../theme/typography';
import { CadenceActivity, ACTIVITY_COLORS } from '../theme/colors';
import { DotMatrixBackground } from '../components/common/DotMatrixBackground';
import { useTaskStore } from '../store/useTaskStore';
import { useEnergyStore } from '../store/useEnergyStore';
import { aiScheduler, BestSlotResult } from '../services/aiScheduler';

interface NewTaskScreenProps {
  onClose?: () => void;
  onScheduled?: (taskTitle: string) => void;
}

export const NewTaskScreen: React.FC<NewTaskScreenProps> = ({
  onClose,
  onScheduled,
}) => {
  const { theme, isDark } = useTheme();
  const { tasks, createTask, scheduleTaskToTimeline } = useTaskStore();
  const { activeRoutineAtom } = useEnergyStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedActivity, setSelectedActivity] = useState<CadenceActivity>('deep_work');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('high');
  const [customTime, setCustomTime] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI-generated Best Slot state
  const [bestSlot, setBestSlot] = useState<BestSlotResult>({
    suggested_start_time: '09:10',
    reason: 'Inside morning peak focus window',
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
          taskTitle: title.trim() || 'Task',
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
    }, 400);

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

  const durationOptions = [15, 30, 45, 60, 90, 120];

  const handleScheduleTask = async (useAiSlot: boolean = true) => {
    const finalTitle = title.trim();
    if (!finalTitle) return;

    setIsSubmitting(true);
    try {
      const task = await createTask({
        title: finalTitle,
        description: description.trim() || undefined,
        priority,
        requiredEnergy: selectedActivity === 'deep_work' ? 'high' : 'medium',
        estimatedDurationMinutes: durationMinutes,
        taskCategory: selectedActivity,
        labelIds: [],
      });

      if (useAiSlot) {
        const today = new Date().toISOString().split('T')[0];
        const slotTime = customTime || bestSlot.suggested_start_time || '09:10';
        await scheduleTaskToTimeline(task.id, `${today}T${slotTime}:00`);
      }

      onScheduled?.(finalTitle);
      onClose?.();
    } catch (e) {
      console.warn('Error creating/scheduling task:', e);
      onClose?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#111510' : theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <DotMatrixBackground />

      <SafeAreaView style={styles.safeArea}>
        {/* Top Header: CADENCE, New Task, Close */}
        <View style={styles.topNavRow}>
          <View>
            <Text style={[styles.brandLabel, { color: theme.secondaryText, fontFamily: FONTS.urbanistSemiBold }]}>
              CADENCE
            </Text>
            <Text style={[styles.navTitle, { color: theme.text, fontFamily: FONTS.urbanistBold }]}>
              New Task
            </Text>
          </View>

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
          keyboardShouldPersistTaps="handled"
        >
          {/* 1. Task Title Input */}
          <View style={styles.section}>
            <Text style={[styles.fieldLabel, { color: theme.secondaryText, fontFamily: FONTS.urbanistSemiBold }]}>
              WHAT NEEDS DOING
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: isDark ? 'rgba(24, 30, 22, 0.8)' : 'rgba(252, 251, 247, 0.9)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : theme.border,
                },
              ]}
            >
              <TextInput
                style={[
                  styles.titleInput,
                  {
                    color: theme.text,
                    fontFamily: FONTS.urbanistMedium,
                  },
                ]}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Write product spec, review budget..."
                placeholderTextColor={theme.secondaryText}
                autoFocus
              />
            </View>
          </View>

          {/* 2. Notes & Description */}
          <View style={styles.section}>
            <Text style={[styles.fieldLabel, { color: theme.secondaryText, fontFamily: FONTS.urbanistSemiBold }]}>
              NOTES & DETAILS (OPTIONAL)
            </Text>
            <View
              style={[
                styles.inputWrapperMulti,
                {
                  backgroundColor: isDark ? 'rgba(24, 30, 22, 0.8)' : 'rgba(252, 251, 247, 0.9)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : theme.border,
                },
              ]}
            >
              <TextInput
                style={[
                  styles.descriptionInput,
                  {
                    color: theme.text,
                    fontFamily: FONTS.urbanistRegular,
                  },
                ]}
                value={description}
                onChangeText={setDescription}
                placeholder="Add subtasks, links, or context..."
                placeholderTextColor={theme.secondaryText}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* 3. Activity Category Pills */}
          <View style={styles.section}>
            <Text style={[styles.fieldLabel, { color: theme.secondaryText, fontFamily: FONTS.urbanistSemiBold }]}>
              ACTIVITY CATEGORY
            </Text>
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
                          ? '#38E1B0'
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
                            ? '#0B2B26'
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
          </View>

          {/* 4. Duration Selector Chips */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.fieldLabel, { color: theme.secondaryText, fontFamily: FONTS.urbanistSemiBold }]}>
                ESTIMATED DURATION
              </Text>
              <Text style={[styles.durationHighlight, { color: theme.primaryOlive, fontFamily: FONTS.dotoBold }]}>
                {durationMinutes} min
              </Text>
            </View>

            <View style={styles.durationChipsRow}>
              {durationOptions.map((mins) => {
                const isSelected = durationMinutes === mins;
                return (
                  <TouchableOpacity
                    key={mins}
                    style={[
                      styles.durationChip,
                      {
                        backgroundColor: isSelected
                          ? theme.primaryOlive
                          : isDark ? 'rgba(24, 30, 22, 0.8)' : theme.primarySurface,
                        borderColor: isSelected ? theme.primaryOlive : theme.border,
                      },
                    ]}
                    onPress={() => setDurationMinutes(mins)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.durationChipText,
                        {
                          color: isSelected ? '#0A0B0D' : theme.text,
                          fontFamily: isSelected ? FONTS.dotoBold : FONTS.urbanistMedium,
                        },
                      ]}
                    >
                      {mins}m
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 5. Priority Selector */}
          <View style={styles.section}>
            <Text style={[styles.fieldLabel, { color: theme.secondaryText, fontFamily: FONTS.urbanistSemiBold }]}>
              PRIORITY
            </Text>
            <View style={styles.priorityRow}>
              {(['low', 'medium', 'high'] as const).map((p) => {
                const isSelected = priority === p;
                const pColor = p === 'high' ? '#F87171' : p === 'medium' ? '#F2CC68' : '#38E1B0';
                return (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.priorityBtn,
                      {
                        backgroundColor: isSelected
                          ? (isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)')
                          : (isDark ? 'rgba(24, 30, 22, 0.6)' : theme.primarySurface),
                        borderColor: isSelected ? pColor : theme.border,
                      },
                    ]}
                    onPress={() => setPriority(p)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.priorityDot, { backgroundColor: pColor }]} />
                    <Text
                      style={[
                        styles.priorityText,
                        {
                          color: isSelected ? theme.text : theme.secondaryText,
                          fontFamily: isSelected ? FONTS.urbanistBold : FONTS.urbanistMedium,
                          textTransform: 'capitalize',
                        },
                      ]}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 6. AI Recommended Best Slot Card */}
          <View
            style={[
              styles.aiSlotCard,
              {
                backgroundColor: isDark ? 'rgba(24, 30, 22, 0.85)' : 'rgba(252, 251, 247, 0.92)',
                borderColor: theme.primaryOlive,
              },
            ]}
          >
            <View style={styles.aiCardHeaderRow}>
              <View style={styles.aiCardLeft}>
                <View style={styles.aiTagBadge}>
                  <Text style={styles.aiTagText}>✨ AI CHRONOBIOLOGY</Text>
                </View>
                <Text style={[styles.aiCardTitle, { color: theme.text, fontFamily: FONTS.urbanistBold }]}>
                  Best Slot Today
                </Text>
              </View>

              {isLoadingBestSlot ? (
                <ActivityIndicator size="small" color={theme.primaryOlive} />
              ) : (
                <Text style={[styles.aiTimeBadge, { color: theme.primaryOlive, fontFamily: FONTS.dotoBold }]}>
                  {bestSlot.suggested_start_time || '09:10'}
                </Text>
              )}
            </View>

            <Text style={[styles.aiReasonText, { color: theme.secondaryText, fontFamily: FONTS.urbanistRegular }]}>
              {isLoadingBestSlot ? 'Consulting Gemini chronobiology engine...' : bestSlot.reason}
            </Text>
          </View>

          {/* 7. Action CTA Buttons */}
          <View style={styles.actionButtonsCol}>
            <TouchableOpacity
              style={[
                styles.primaryCtaBtn,
                { backgroundColor: theme.primaryOlive },
                (!title.trim() || isSubmitting) && styles.btnDisabled,
              ]}
              onPress={() => handleScheduleTask(true)}
              disabled={!title.trim() || isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#0A0B0D" />
              ) : (
                <Text style={[styles.primaryCtaText, { fontFamily: FONTS.urbanistBold }]}>
                  Schedule for {bestSlot.suggested_start_time || '09:10'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.secondaryCtaBtn,
                { borderColor: theme.border, backgroundColor: theme.primarySurface },
                (!title.trim() || isSubmitting) && styles.btnDisabled,
              ]}
              onPress={() => handleScheduleTask(false)}
              disabled={!title.trim() || isSubmitting}
              activeOpacity={0.85}
            >
              <Text style={[styles.secondaryCtaText, { color: theme.text, fontFamily: FONTS.urbanistSemiBold }]}>
                Save to Backlog (Unscheduled)
              </Text>
            </TouchableOpacity>
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
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 8 : 0,
  },
  topNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  brandLabel: {
    fontSize: 12,
    letterSpacing: 1.6,
  },
  navTitle: {
    fontSize: 24,
    marginTop: 2,
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 15,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 12,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  durationHighlight: {
    fontSize: 14,
  },
  inputWrapper: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 52,
    justifyContent: 'center',
  },
  inputWrapperMulti: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 88,
  },
  titleInput: {
    fontSize: 16,
  },
  descriptionInput: {
    fontSize: 14,
    lineHeight: 20,
  },
  activitiesRow: {
    gap: 8,
    paddingVertical: 4,
  },
  activityPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  activityPillText: {
    fontSize: 13,
  },
  durationChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 54,
    alignItems: 'center',
  },
  durationChipText: {
    fontSize: 13,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  priorityBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 13,
  },
  aiSlotCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 24,
  },
  aiCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  aiCardLeft: {
    flex: 1,
  },
  aiTagBadge: {
    marginBottom: 4,
  },
  aiTagText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#38E1B0',
    letterSpacing: 1.2,
  },
  aiCardTitle: {
    fontSize: 16,
  },
  aiTimeBadge: {
    fontSize: 24,
  },
  aiReasonText: {
    fontSize: 13,
    lineHeight: 18,
  },
  actionButtonsCol: {
    gap: 12,
  },
  primaryCtaBtn: {
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryCtaText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0A0B0D',
  },
  secondaryCtaBtn: {
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryCtaText: {
    fontSize: 14,
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
