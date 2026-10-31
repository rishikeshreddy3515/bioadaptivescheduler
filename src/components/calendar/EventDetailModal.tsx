import React, { forwardRef, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { CalendarEvent } from '../../types/calendar';
import { useCalendarStore } from '../../store/useCalendarStore';

interface EventDetailModalProps {
  event: CalendarEvent | null;
  onClose: () => void;
}

export const EventDetailModal = forwardRef<BottomSheetModal, EventDetailModalProps>(
  ({ event, onClose }, ref) => {
    const snapPoints = useMemo(() => ['42%'], []);
    const rescheduleEvent = useCalendarStore((s) => s.rescheduleEvent);
    const calendars = useCalendarStore((s) => s.calendars);

    if (!event) return null;

    const calendar = calendars.find((c) => c.id === event.calendarId);

    const formatTimeDisplay = (isoString: string) => {
      try {
        const timePart = isoString.split('T')[1];
        if (timePart) {
          const [h, m] = timePart.split(':');
          const hour = parseInt(h, 10);
          const ampm = hour >= 12 ? 'PM' : 'AM';
          const hour12 = hour % 12 || 12;
          return `${hour12}:${m} ${ampm}`;
        }
      } catch {
        // fallback
      }
      return isoString;
    };

    const handleShift = (minutes: number) => {
      if (!event) return;
      const parseTimeToMinutes = (t: string) => {
        const timePart = t.split('T')[1] || '09:00:00';
        const [h, m] = timePart.split(':').map(Number);
        return h * 60 + m;
      };

      const formatMinutesToTime = (totalMinutes: number, dateStr: string) => {
        const clamped = Math.max(0, Math.min(24 * 60 - 1, totalMinutes));
        const h = Math.floor(clamped / 60);
        const m = clamped % 60;
        return `${dateStr}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
      };

      const dateStr = event.startTime.split('T')[0];
      const startMin = parseTimeToMinutes(event.startTime);
      const endMin = parseTimeToMinutes(event.endTime);
      const duration = endMin - startMin;

      const newStartMin = startMin + minutes;
      const newEndMin = newStartMin + duration;

      const newStart = formatMinutesToTime(newStartMin, dateStr);
      const newEnd = formatMinutesToTime(newEndMin, dateStr);

      rescheduleEvent(event.id, newStart, newEnd);
      onClose();
    };

    return (
      <BottomSheetModal
        ref={ref}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose
        onDismiss={onClose}
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            disappearsOnIndex={-1}
            appearsOnIndex={0}
            opacity={0.6}
          />
        )}
        backgroundStyle={styles.modalBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <BottomSheetView style={styles.contentContainer}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View
              style={[
                styles.calendarTag,
                {
                  borderColor: event.color || '#3B82F6',
                  backgroundColor: `${event.color || '#3B82F6'}22`,
                },
              ]}
            >
              <View
                style={[
                  styles.calendarDot,
                  { backgroundColor: event.color || '#3B82F6' },
                ]}
              />
              <Text style={styles.calendarName}>
                {calendar?.name || 'Calendar Event'}
              </Text>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Event Title */}
          <Text style={styles.eventTitle}>{event.title}</Text>

          {/* Time & Location Details */}
          <View style={styles.metaContainer}>
            <View style={styles.metaRow}>
              <Text style={styles.metaIcon}>🕒</Text>
              <Text style={styles.metaText}>
                {formatTimeDisplay(event.startTime)} – {formatTimeDisplay(event.endTime)}
              </Text>
            </View>

            {event.location ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaIcon}>📍</Text>
                <Text style={styles.metaText}>{event.location}</Text>
              </View>
            ) : null}

            {event.description ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaIcon}>📝</Text>
                <Text style={styles.metaDescription}>{event.description}</Text>
              </View>
            ) : null}
          </View>

          {/* Quick Rescheduling Actions */}
          <View style={styles.actionsContainer}>
            <Text style={styles.actionsLabel}>Quick Reschedule</Text>
            <View style={styles.buttonsRow}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleShift(-30)}
              >
                <Text style={styles.actionButtonText}>− 30 min</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleShift(-15)}
              >
                <Text style={styles.actionButtonText}>− 15 min</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleShift(15)}
              >
                <Text style={styles.actionButtonText}>+ 15 min</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleShift(30)}
              >
                <Text style={styles.actionButtonText}>+ 30 min</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

const styles = StyleSheet.create({
  modalBackground: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: {
    backgroundColor: '#475569',
    width: 40,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calendarTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  calendarDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  calendarName: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '600',
  },
  closeButton: {
    padding: 6,
  },
  closeText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '700',
  },
  eventTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '700',
  },
  metaContainer: {
    gap: 8,
    marginVertical: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaIcon: {
    fontSize: 14,
  },
  metaText: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '500',
  },
  metaDescription: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  actionsContainer: {
    marginTop: 8,
    gap: 8,
  },
  actionsLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
});

