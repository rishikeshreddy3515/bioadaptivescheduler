import React, { forwardRef, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { useTaskStore } from '../../store/useTaskStore';
import { Task, TaskPriority, TaskEnergyDemand } from '../../types/task';

interface TaskPriorityBoardProps {
  onClose?: () => void;
}

export const TaskPriorityBoard = forwardRef<BottomSheetModal, TaskPriorityBoardProps>(
  ({ onClose }, ref) => {
    const snapPoints = useMemo(() => ['70%', '94%'], []);

    // Task Store Subscriptions (Section 5.1 & Section 3.3.C)
    const {
      projects,
      selectedProjectId,
      setSelectedProjectId,
      createTask,
      toggleTaskCompletion,
      deleteTask,
      scheduleTaskToTimeline,
      syncExternalTodos,
      isSyncingTodosAtom,
      taskPrioritySelector,
    } = useTaskStore();

    // Local form state for quick task creation
    const [isCreating, setIsCreating] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newPriority, setNewPriority] = useState<TaskPriority>('high');
    const [newEnergy, setNewEnergy] = useState<TaskEnergyDemand>('high');
    const [schedulingTaskId, setSchedulingTaskId] = useState<string | null>(null);

    // Filtered Priority Buckets from derived selector
    const buckets = taskPrioritySelector(selectedProjectId);

    const handleCreateTask = async () => {
      const trimmed = newTitle.trim();
      if (!trimmed) return;

      await createTask({
        title: trimmed,
        priority: newPriority,
        requiredEnergy: newEnergy,
        projectId: selectedProjectId === 'all' ? 'proj-work' : selectedProjectId,
        estimatedDurationMinutes: newEnergy === 'high' ? 60 : 30,
      });

      setNewTitle('');
      setIsCreating(false);
    };

    const handleScheduleToTimeline = async (task: Task) => {
      setSchedulingTaskId(task.id);
      try {
        await scheduleTaskToTimeline(task.id);
      } finally {
        setTimeout(() => setSchedulingTaskId(null), 1200);
      }
    };

    const renderTaskCard = (task: Task) => {
      const isScheduled = Boolean(task.scheduledStartTime);
      const isScheduling = schedulingTaskId === task.id;

      const priorityColors: Record<TaskPriority, { bg: string; text: string }> = {
        urgent: { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444' },
        high: { bg: 'rgba(139, 92, 246, 0.15)', text: '#A78BFA' },
        medium: { bg: 'rgba(59, 130, 246, 0.15)', text: '#60A5FA' },
        low: { bg: 'rgba(100, 116, 139, 0.15)', text: '#94A3B8' },
      };

      const energyColors: Record<TaskEnergyDemand, { bg: string; text: string; icon: string }> = {
        high: { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B', icon: '⚡ Peak' },
        medium: { bg: 'rgba(56, 189, 248, 0.15)', text: '#38BDF8', icon: '⚡ Steady' },
        low: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981', icon: '🌱 Light' },
      };

      const pColor = priorityColors[task.priority] || priorityColors.medium;
      const eColor = energyColors[task.requiredEnergy] || energyColors.medium;

      return (
        <View key={task.id} style={[styles.taskCard, task.isCompleted && styles.taskCardCompleted]}>
          <View style={styles.cardHeader}>
            {/* Completion Toggle */}
            <TouchableOpacity
              style={[styles.checkbox, task.isCompleted && styles.checkboxChecked]}
              onPress={() => toggleTaskCompletion(task.id)}
              activeOpacity={0.7}
            >
              {task.isCompleted && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>

            <View style={styles.titleContainer}>
              <Text
                style={[styles.taskTitle, task.isCompleted && styles.taskTitleCompleted]}
                numberOfLines={2}
              >
                {task.title}
              </Text>
              {task.description ? (
                <Text style={styles.taskDescription} numberOfLines={2}>
                  {task.description}
                </Text>
              ) : null}
            </View>

            {/* Delete button */}
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteTask(task.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.deleteText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Metadata badges and schedule button */}
          <View style={styles.cardFooter}>
            <View style={styles.tagsContainer}>
              {/* Priority Badge */}
              <View style={[styles.tagBadge, { backgroundColor: pColor.bg }]}>
                <Text style={[styles.tagText, { color: pColor.text }]}>
                  {task.priority.toUpperCase()}
                </Text>
              </View>

              {/* Circadian Energy Demand Badge */}
              <View style={[styles.tagBadge, { backgroundColor: eColor.bg }]}>
                <Text style={[styles.tagText, { color: eColor.text }]}>
                  {eColor.icon}
                </Text>
              </View>

              {/* Overdue indicator */}
              {task.dueDate && task.dueDate < new Date().toISOString().split('T')[0] && !task.isCompleted && (
                <View style={[styles.tagBadge, styles.overdueBadge]}>
                  <Text style={styles.overdueBadgeText}>OVERDUE</Text>
                </View>
              )}
            </View>

            {/* Schedule to Timeline Action */}
            {!task.isCompleted && (
              <TouchableOpacity
                style={[
                  styles.scheduleButton,
                  isScheduled && styles.scheduleButtonActive,
                ]}
                onPress={() => handleScheduleToTimeline(task)}
                disabled={isScheduling}
                activeOpacity={0.7}
              >
                {isScheduling ? (
                  <ActivityIndicator size="small" color="#38BDF8" />
                ) : (
                  <Text
                    style={[
                      styles.scheduleButtonText,
                      isScheduled && styles.scheduleButtonTextActive,
                    ]}
                  >
                    {isScheduled ? '✓ Scheduled' : '+ Schedule'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    };

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        index={0}
        enablePanDownToClose
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
        )}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <View style={styles.container}>
          {/* Top Bar */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Task Priority Board</Text>
              <Text style={styles.headerSubtitle}>
                Synchronized with Circadian Energy Windows
              </Text>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.syncButton}
                onPress={syncExternalTodos}
                disabled={isSyncingTodosAtom}
                activeOpacity={0.7}
              >
                {isSyncingTodosAtom ? (
                  <ActivityIndicator size="small" color="#38BDF8" />
                ) : (
                  <Text style={styles.syncButtonText}>🔄 Sync</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setIsCreating((prev) => !prev)}
                activeOpacity={0.7}
              >
                <Text style={styles.addButtonText}>{isCreating ? 'Cancel' : '+ New'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Create Task Form */}
          {isCreating && (
            <View style={styles.createCard}>
              <TextInput
                style={styles.createInput}
                placeholder="What needs to be done?"
                placeholderTextColor="#64748B"
                value={newTitle}
                onChangeText={setNewTitle}
                autoFocus
              />

              <View style={styles.createSelectorsRow}>
                {/* Priority Selection */}
                <View style={styles.selectorGroup}>
                  <Text style={styles.selectorLabel}>Priority:</Text>
                  <View style={styles.chipRow}>
                    {(['urgent', 'high', 'medium', 'low'] as TaskPriority[]).map((p) => (
                      <TouchableOpacity
                        key={p}
                        style={[
                          styles.selectorChip,
                          newPriority === p && styles.selectorChipActive,
                        ]}
                        onPress={() => setNewPriority(p)}
                      >
                        <Text
                          style={[
                            styles.selectorChipText,
                            newPriority === p && styles.selectorChipTextActive,
                          ]}
                        >
                          {p}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Circadian Energy Demand */}
                <View style={styles.selectorGroup}>
                  <Text style={styles.selectorLabel}>Required Energy:</Text>
                  <View style={styles.chipRow}>
                    {(['high', 'medium', 'low'] as TaskEnergyDemand[]).map((e) => (
                      <TouchableOpacity
                        key={e}
                        style={[
                          styles.selectorChip,
                          newEnergy === e && styles.selectorChipEnergyActive,
                        ]}
                        onPress={() => setNewEnergy(e)}
                      >
                        <Text
                          style={[
                            styles.selectorChipText,
                            newEnergy === e && styles.selectorChipTextEnergyActive,
                          ]}
                        >
                          {e === 'high' ? '⚡ High' : e === 'medium' ? '⚡ Medium' : '🌱 Low'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.submitCreateBtn}
                onPress={handleCreateTask}
                activeOpacity={0.8}
              >
                <Text style={styles.submitCreateText}>Save Task to Board</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Project Tabs Filter */}
          <View style={styles.projectTabsWrapper}>
            <BottomSheetScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.projectTabsContainer}
            >
              <TouchableOpacity
                style={[
                  styles.projectTab,
                  selectedProjectId === 'all' && styles.projectTabActive,
                ]}
                onPress={() => setSelectedProjectId('all')}
              >
                <Text
                  style={[
                    styles.projectTabText,
                    selectedProjectId === 'all' && styles.projectTabTextActive,
                  ]}
                >
                  All Projects
                </Text>
              </TouchableOpacity>

              {projects.map((proj) => (
                <TouchableOpacity
                  key={proj.id}
                  style={[
                    styles.projectTab,
                    selectedProjectId === proj.id && {
                      backgroundColor: `${proj.color}22`,
                      borderColor: proj.color,
                    },
                  ]}
                  onPress={() => setSelectedProjectId(proj.id)}
                >
                  <View style={[styles.projectDot, { backgroundColor: proj.color }]} />
                  <Text
                    style={[
                      styles.projectTabText,
                      selectedProjectId === proj.id && { color: proj.color, fontWeight: '700' },
                    ]}
                  >
                    {proj.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </BottomSheetScrollView>
          </View>

          {/* Priority Columns / Scrollable Feed */}
          <BottomSheetScrollView
            contentContainerStyle={styles.scrollList}
            showsVerticalScrollIndicator={false}
          >
            {/* Overdue Section */}
            {buckets.overdue.length > 0 && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: '#EF4444' }]}>
                    🚨 Overdue ({buckets.overdue.length})
                  </Text>
                </View>
                {buckets.overdue.map(renderTaskCard)}
              </View>
            )}

            {/* Urgent Section */}
            {buckets.urgent.length > 0 && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: '#F87171' }]}>
                    ⚡ Urgent ({buckets.urgent.length})
                  </Text>
                </View>
                {buckets.urgent.map(renderTaskCard)}
              </View>
            )}

            {/* High Priority Section (Morning Peak Alignment) */}
            {buckets.high.length > 0 && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: '#A78BFA' }]}>
                    🔥 High Priority ({buckets.high.length})
                  </Text>
                </View>
                {buckets.high.map(renderTaskCard)}
              </View>
            )}

            {/* Medium Priority Section */}
            {buckets.medium.length > 0 && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: '#60A5FA' }]}>
                    🎯 Medium Priority ({buckets.medium.length})
                  </Text>
                </View>
                {buckets.medium.map(renderTaskCard)}
              </View>
            )}

            {/* Low Priority Section */}
            {buckets.low.length > 0 && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: '#94A3B8' }]}>
                    📝 Low Priority ({buckets.low.length})
                  </Text>
                </View>
                {buckets.low.map(renderTaskCard)}
              </View>
            )}

            {/* Completed Section */}
            {buckets.completed.length > 0 && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: '#10B981' }]}>
                    ✓ Completed ({buckets.completed.length})
                  </Text>
                </View>
                {buckets.completed.map(renderTaskCard)}
              </View>
            )}
          </BottomSheetScrollView>
        </View>
      </BottomSheetModal>
    );
  }
);

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleIndicator: {
    backgroundColor: '#475569',
    width: 44,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncButton: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: '#38BDF8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  syncButtonText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  addButton: {
    backgroundColor: '#38BDF8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '800',
  },
  createCard: {
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  createInput: {
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 10,
  },
  createSelectorsRow: {
    gap: 8,
  },
  selectorGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
  },
  selectorChip: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  selectorChipActive: {
    backgroundColor: 'rgba(167, 139, 250, 0.2)',
    borderColor: '#A78BFA',
  },
  selectorChipEnergyActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    borderColor: '#38BDF8',
  },
  selectorChipText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  selectorChipTextActive: {
    color: '#A78BFA',
    fontWeight: '700',
  },
  selectorChipTextEnergyActive: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  submitCreateBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  submitCreateText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  projectTabsWrapper: {
    marginVertical: 8,
  },
  projectTabsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  projectTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  projectTabActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38BDF8',
  },
  projectTabText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  projectTabTextActive: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  projectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scrollList: {
    paddingBottom: 40,
  },
  sectionBlock: {
    marginTop: 12,
  },
  sectionHeader: {
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  taskCard: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  taskCardCompleted: {
    opacity: 0.5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#64748B',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  titleContainer: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
    lineHeight: 18,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#64748B',
  },
  taskDescription: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
    lineHeight: 15,
  },
  deleteButton: {
    padding: 4,
  },
  deleteText: {
    color: '#64748B',
    fontSize: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tagBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  overdueBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  overdueBadgeText: {
    color: '#EF4444',
    fontSize: 9,
    fontWeight: '800',
  },
  scheduleButton: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: '#38BDF8',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  scheduleButtonActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
  },
  scheduleButtonText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  scheduleButtonTextActive: {
    color: '#10B981',
  },
});

