import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { CalendarEvent } from '../../types/calendar';

interface TimelineEventCardProps {
  event: CalendarEvent;
  hourHeight: number;
  leftOffset: number;
  width: number;
  onPress: (event: CalendarEvent) => void;
  onReschedule: (eventId: string, newStartTime: string, newEndTime: string) => void;
}

const parseTimeToMinutes = (isoString: string): number => {
  try {
    const timePart = isoString.split('T')[1] || '00:00:00';
    const [h, m] = timePart.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  } catch {
    return 0;
  }
};

const formatMinutesToIso = (totalMinutes: number, dateStr: string): string => {
  const clamped = Math.max(0, Math.min(24 * 60 - 15, totalMinutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${dateStr}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
};

const formatTimeLabel = (totalMinutes: number): string => {
  const clamped = Math.max(0, Math.min(24 * 60, totalMinutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  const ampm = h >= 12 && h < 24 ? 'PM' : 'AM';
  const hour12 = h % 12 || (h === 24 ? 12 : 12);
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
};

export const TimelineEventCard: React.FC<TimelineEventCardProps> = ({
  event,
  hourHeight,
  leftOffset,
  width,
  onPress,
  onReschedule,
}) => {
  const [isDraggingState, setIsDraggingState] = useState(false);
  const [previewTimes, setPreviewTimes] = useState<{ start: string; end: string } | null>(null);

  const startMinutes = parseTimeToMinutes(event.startTime);
  const endMinutes = parseTimeToMinutes(event.endTime);
  const durationMinutes = Math.max(15, endMinutes - startMinutes);

  const topPos = (startMinutes / 60) * hourHeight;
  const cardHeight = Math.max(32, (durationMinutes / 60) * hourHeight);

  // Animated shared values
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const cardScale = useSharedValue(1);

  const dateStr = event.startTime.split('T')[0];

  const updatePreview = (deltaMin: number) => {
    const newStartMin = startMinutes + deltaMin;
    const newEndMin = newStartMin + durationMinutes;
    setPreviewTimes({
      start: formatTimeLabel(newStartMin),
      end: formatTimeLabel(newEndMin),
    });
  };

  const handleDragStart = () => {
    setIsDraggingState(true);
    updatePreview(0);
  };

  const handleDragEnd = (finalDeltaY: number) => {
    setIsDraggingState(false);
    setPreviewTimes(null);

    // Snap to 15-minute grid
    const deltaMin = Math.round((finalDeltaY / hourHeight) * 4) * 15;
    if (deltaMin !== 0) {
      const newStartMin = Math.max(0, Math.min(24 * 60 - durationMinutes, startMinutes + deltaMin));
      const newEndMin = newStartMin + durationMinutes;
      const newStartIso = formatMinutesToIso(newStartMin, dateStr);
      const newEndIso = formatMinutesToIso(newEndMin, dateStr);
      onReschedule(event.id, newStartIso, newEndIso);
    }
  };

  const triggerPress = () => {
    onPress(event);
  };

  // Drag Gesture with Long Press
  const dragGesture = Gesture.Pan()
    .activateAfterLongPress(250)
    .onStart(() => {
      isDragging.value = true;
      cardScale.value = withSpring(1.04);
      runOnJS(handleDragStart)();
    })
    .onUpdate((e) => {
      translateY.value = e.translationY;
      // Compute 15-minute snapped delta
      const deltaMin = Math.round((e.translationY / hourHeight) * 4) * 15;
      runOnJS(updatePreview)(deltaMin);
    })
    .onEnd((e) => {
      const finalY = e.translationY;
      translateY.value = withSpring(0);
      cardScale.value = withSpring(1);
      isDragging.value = false;
      runOnJS(handleDragEnd)(finalY);
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(triggerPress)();
  });

  const composedGesture = Gesture.Race(dragGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: translateY.value },
        { scale: cardScale.value },
      ],
      zIndex: isDragging.value ? 100 : 1,
      shadowOpacity: isDragging.value ? 0.4 : 0.1,
    };
  });

  const eventColor = event.color || '#3B82F6';

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          styles.cardContainer,
          {
            top: topPos,
            left: leftOffset,
            width: width,
            height: cardHeight,
            backgroundColor: `${eventColor}24`,
            borderColor: eventColor,
          },
          animatedStyle,
          isDraggingState && styles.cardDragging,
        ]}
      >
        {/* Accent Bar */}
        <View style={[styles.accentBar, { backgroundColor: eventColor }]} />

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.titleText} numberOfLines={cardHeight < 45 ? 1 : 2}>
            {event.title}
          </Text>

          <Text style={styles.timeText} numberOfLines={1}>
            {previewTimes
              ? `${previewTimes.start} – ${previewTimes.end} (Snapped)`
              : `${formatTimeLabel(startMinutes)} – ${formatTimeLabel(endMinutes)}`}
          </Text>

          {cardHeight >= 60 && event.location ? (
            <Text style={styles.locationText} numberOfLines={1}>
              📍 {event.location}
            </Text>
          ) : null}
        </View>

        {/* Drag Indicator badge when dragging */}
        {isDraggingState && (
          <View style={[styles.dragBadge, { backgroundColor: eventColor }]}>
            <Text style={styles.dragBadgeText}>⤢ Rescheduling (15m Snap)</Text>
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    position: 'absolute',
    borderRadius: 8,
    borderWidth: 1.5,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 3,
  },
  cardDragging: {
    borderColor: '#38BDF8',
    borderWidth: 2,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,
    elevation: 10,
  },
  accentBar: {
    width: 4,
    height: '100%',
  },
  content: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    justifyContent: 'flex-start',
  },
  titleText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  timeText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  locationText: {
    color: '#CBD5E1',
    fontSize: 10,
    marginTop: 2,
  },
  dragBadge: {
    position: 'absolute',
    bottom: 2,
    right: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dragBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
});

