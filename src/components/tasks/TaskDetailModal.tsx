import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Platform,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { FONTS } from '../../theme/typography';
import { CadenceActivity, ACTIVITY_COLORS } from '../../theme/colors';
import { TiltCard3D } from '../common/TiltCard3D';
import { Task } from '../../types/task';
import { useTaskStore } from '../../store/useTaskStore';

interface TaskDetailModalProps {
  task: Task | null;
  visible: boolean;
  onClose: () => void;
  onReschedule?: (task: Task) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  visible,
  onClose,
  onReschedule,
}) => {
  const { theme, isDark } = useTheme();
  const { toggleTaskCompletion, deleteTask } = useTaskStore();

  if (!task) return null;

  const category = (task.taskCategory || task.category || 'deep_work') as CadenceActivity;
  const spec = ACTIVITY_COLORS[category] || ACTIVITY_COLORS.deep_work;
  const catColor = isDark ? spec.dark : spec.light;
  const duration = task.durationMinutes || task.duration_minutes || task.estimatedDurationMinutes || 45;
  const scheduledTime = task.scheduled_start || task.scheduledStartTime;
  const displayTime = scheduledTime
    ? scheduledTime.includes('T')
      ? scheduledTime.split('T')[1].slice(0, 5)
      : scheduledTime.slice(0, 5)
    : 'Unscheduled';

  const handleToggle = () => {
    toggleTaskCompletion(task.id);
  };

  const handleDelete = () => {
    deleteTask(task.id);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <StatusBar barStyle="light-content" />
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          activeOpacity={1}
        />

        <View style={styles.modalContent}>
          {/* Top Header */}
          <View style={styles.headerRow}>
            <View style={styles.viewBadge}>
              <Text style={[styles.viewBadgeText, { color: theme.primaryOlive }]}>
                ✨ 3D TASK VIEW
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.closeBtn,
                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)' },
              ]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.closeIcon, { color: theme.text }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Interactive 3D Tilt Card for Viewing Task */}
          <TiltCard3D maxTiltDeg={16} style={styles.tiltWrapper}>
            <View
              style={[
                styles.card3D,
                {
                  backgroundColor: isDark ? '#182017' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
                  shadowColor: catColor,
                },
              ]}
            >
              {/* Glassmorphic Specular Rim */}
              <View
                style={[
                  styles.specularRim,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.8)' },
                ]}
              />

              {/* Card Category & Priority */}
              <View style={styles.cardTopRow}>
                <View style={[styles.categoryTag, { backgroundColor: `${catColor}25`, borderColor: catColor }]}>
                  <View style={[styles.categoryDot, { backgroundColor: catColor }]} />
                  <Text style={[styles.categoryLabel, { color: catColor, fontFamily: FONTS.urbanistSemiBold }]}>
                    {spec.label}
                  </Text>
                </View>

                {task.priority && (
                  <View
                    style={[
                      styles.priorityBadge,
                      {
                        backgroundColor:
                          task.priority.toLowerCase() === 'high' || task.priority.toLowerCase() === 'urgent'
                            ? 'rgba(248, 113, 113, 0.2)'
                            : 'rgba(242, 204, 104, 0.2)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.priorityText,
                        {
                          color:
                            task.priority.toLowerCase() === 'high' || task.priority.toLowerCase() === 'urgent'
                              ? '#F87171'
                              : '#F2CC68',
                          fontFamily: FONTS.urbanistSemiBold,
                        },
                      ]}
                    >
                      {task.priority.toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              {/* Task Title */}
              <Text
                style={[
                  styles.taskTitle,
                  {
                    color: theme.text,
                    fontFamily: FONTS.urbanistBold,
                    textDecorationLine: task.isCompleted ? 'line-through' : 'none',
                    opacity: task.isCompleted ? 0.6 : 1,
                  },
                ]}
                numberOfLines={3}
              >
                {task.title}
              </Text>

              {/* Large Doto Dot-Matrix Duration */}
              <View style={styles.durationBlock}>
                <Text style={[styles.durationNumber, { color: theme.text, fontFamily: FONTS.dotoBold }]}>
                  {duration}
                </Text>
                <Text style={[styles.durationUnit, { color: theme.secondaryText, fontFamily: FONTS.urbanistMedium }]}>
                  minutes
                </Text>
              </View>

              {/* Chronobiology Slot Capsule */}
              <View
                style={[
                  styles.slotCapsule,
                  {
                    backgroundColor: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.04)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                  },
                ]}
              >
                <Text style={styles.slotClockIcon}>🕒</Text>
                <Text style={[styles.slotTimeText, { color: theme.text, fontFamily: FONTS.dotoBold }]}>
                  {displayTime}
                </Text>
                <Text style={[styles.slotWindowText, { color: theme.secondaryText, fontFamily: FONTS.urbanistMedium }]}>
                  · {task.isInPeakWindow ? 'In Peak Focus' : 'Scheduled Flow'}
                </Text>
              </View>

              {/* Notes / Description */}
              {task.description ? (
                <View style={styles.notesContainer}>
                  <Text style={[styles.notesLabel, { color: theme.secondaryText, fontFamily: FONTS.urbanistSemiBold }]}>
                    NOTES
                  </Text>
                  <Text style={[styles.notesText, { color: theme.text, fontFamily: FONTS.urbanistRegular }]}>
                    {task.description}
                  </Text>
                </View>
              ) : null}

              {/* Subtle 3D tilt instruction */}
              <Text style={[styles.tiltHint, { color: theme.secondaryText }]}>
                Touch & drag to inspect 3D perspective
              </Text>
            </View>
          </TiltCard3D>

          {/* Action Buttons Row */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.completeBtn,
                { backgroundColor: task.isCompleted ? theme.secondarySurface : theme.primaryOlive },
              ]}
              onPress={handleToggle}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.actionBtnText,
                  {
                    color: task.isCompleted ? theme.text : '#0A0B0D',
                    fontFamily: FONTS.urbanistBold,
                  },
                ]}
              >
                {task.isCompleted ? '↩ Mark Incomplete' : '✓ Mark Complete'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.deleteBtn,
                { borderColor: 'rgba(239, 68, 68, 0.4)', backgroundColor: 'rgba(239, 68, 68, 0.1)' },
              ]}
              onPress={handleDelete}
              activeOpacity={0.8}
            >
              <Text style={[styles.actionBtnText, { color: '#EF4444', fontFamily: FONTS.urbanistSemiBold }]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  viewBadge: {
    backgroundColor: 'rgba(56, 225, 176, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 225, 176, 0.3)',
  },
  viewBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 14,
    fontWeight: '700',
  },
  tiltWrapper: {
    width: '100%',
  },
  card3D: {
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 22,
    position: 'relative',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 16,
  },
  specularRim: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1.5,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  categoryLabel: {
    fontSize: 12,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  taskTitle: {
    fontSize: 22,
    lineHeight: 28,
    marginBottom: 16,
  },
  durationBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 16,
  },
  durationNumber: {
    fontSize: 44,
  },
  durationUnit: {
    fontSize: 14,
  },
  slotCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    marginBottom: 14,
  },
  slotClockIcon: {
    fontSize: 13,
  },
  slotTimeText: {
    fontSize: 13,
  },
  slotWindowText: {
    fontSize: 12,
  },
  notesContainer: {
    marginTop: 6,
    marginBottom: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  notesLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    lineHeight: 18,
  },
  tiltHint: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
    opacity: 0.7,
  },
  actionsRow: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 18,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeBtn: {
    flex: 2,
  },
  deleteBtn: {
    flex: 1,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 14,
  },
});
