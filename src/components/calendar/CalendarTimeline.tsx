import React, { useRef, useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  useWindowDimensions,
} from 'react-native';
import {
  Canvas,
  Line,
  Rect,
  vec,
  Path,
  Skia,
  LinearGradient,
  Circle,
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDecay,
  runOnJS,
} from 'react-native-reanimated';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useCalendarStore } from '../../store/useCalendarStore';
import { useEnergyStore } from '../../store/useEnergyStore';
import { CalendarEvent } from '../../types/calendar';
import { TimelineEventCard } from './TimelineEventCard';
import { EventDetailModal } from './EventDetailModal';

const BASE_HOUR_HEIGHT = 68;
const RULER_WIDTH = 54;
const HOURS = Array.from({ length: 25 }, (_, i) => i);

const timeToMinutes = (timeStr: string): number => {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export const CalendarTimeline: React.FC = () => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const modalRef = useRef<BottomSheetModal>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Calendar Store Subscriptions (Section 5.1 & Section 3.3.B)
  const selectedDateAtom = useCalendarStore((s) => s.selectedDateAtom);
  const todayAtom = useCalendarStore((s) => s.todayAtom);
  const zoomScale = useCalendarStore((s) => s.zoomScale);
  const setZoomScale = useCalendarStore((s) => s.setZoomScale);
  const rescheduleEvent = useCalendarStore((s) => s.rescheduleEvent);
  const getDayViewEvents = useCalendarStore((s) => s.getDayViewEvents);

  // Energy & Circadian Store Subscriptions (Section 5.1 & Section 3.3.D)
  const energyTimelineSelector = useEnergyStore((s) => s.energyTimelineSelector);
  const circadianPhaseSelector = useEnergyStore((s) => s.circadianPhaseSelector);

  const dayEvents = getDayViewEvents();
  const isToday = selectedDateAtom === todayAtom;
  const energyCurve = energyTimelineSelector();
  const phases = circadianPhaseSelector();

  const hourHeight = BASE_HOUR_HEIGHT * zoomScale;
  const totalTimelineHeight = 24 * hourHeight;
  const viewportHeight = windowHeight - 240;
  const maxScroll = -(totalTimelineHeight - viewportHeight);

  // Shared Values for 60fps/120fps Gesture Worklets
  const translateY = useSharedValue(-hourHeight * 7); // Initial scroll to ~7:00 AM
  const startScrollY = useSharedValue(-hourHeight * 7);
  const scaleRatio = useSharedValue(zoomScale);

  const handleOpenEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    modalRef.current?.present();
  };

  const handleCloseEvent = () => {
    setSelectedEvent(null);
  };

  // Build the Dynamic Circadian Energy Curve Skia Path (ARCHITECTURE.md Section 2 & 5)
  // Driven directly by energyTimelineSelector and active boost options
  const circadianPath = useMemo(() => {
    const curveStartX = windowWidth - 8;
    const maxAmplitude = 70; // Width of energy curve ribbon

    let svgPath = `M ${curveStartX} 0`;

    for (let i = 0; i < energyCurve.length - 1; i++) {
      const p1 = energyCurve[i];
      const p2 = energyCurve[i + 1];

      const y1 = p1.hour * hourHeight;
      const y2 = p2.hour * hourHeight;
      const x1 = curveStartX - (p1.boostedScore / 100) * maxAmplitude;
      const x2 = curveStartX - (p2.boostedScore / 100) * maxAmplitude;

      const midY = (y1 + y2) / 2;
      svgPath += ` C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
    }

    svgPath += ` L ${curveStartX} ${totalTimelineHeight} Z`;
    return Skia.Path.MakeFromSVGString(svgPath) ?? Skia.Path.Make();
  }, [energyCurve, hourHeight, totalTimelineHeight, windowWidth]);

  // Circadian Phase Overlay Boundaries
  const peakFocusStartMin = timeToMinutes(phases.morningPeakFocus.start);
  const peakFocusEndMin = timeToMinutes(phases.morningPeakFocus.end);
  const peakFocusY = (peakFocusStartMin / 60) * hourHeight;
  const peakFocusHeight = ((peakFocusEndMin - peakFocusStartMin) / 60) * hourHeight;

  const dipStartMin = timeToMinutes(phases.postprandialDip.start);
  const dipEndMin = timeToMinutes(phases.postprandialDip.end);
  const dipY = (dipStartMin / 60) * hourHeight;
  const dipHeight = ((dipEndMin - dipStartMin) / 60) * hourHeight;

  const afternoonStartMin = timeToMinutes(phases.afternoonPeak.start);
  const afternoonEndMin = timeToMinutes(phases.afternoonPeak.end);
  const afternoonY = (afternoonStartMin / 60) * hourHeight;
  const afternoonHeight = ((afternoonEndMin - afternoonStartMin) / 60) * hourHeight;

  const melatoninStartMin = timeToMinutes(phases.melatoninOnset.start);
  const melatoninEndMin = timeToMinutes(phases.melatoninOnset.end);
  const melatoninY = (melatoninStartMin / 60) * hourHeight;
  const melatoninHeight = ((melatoninEndMin - melatoninStartMin) / 60) * hourHeight;

  // Current time position
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentTimeY = (currentMinutes / 60) * hourHeight;

  // Pan Gesture for smooth momentum scrolling
  const panGesture = Gesture.Pan()
    .onStart(() => {
      startScrollY.value = translateY.value;
    })
    .onUpdate((e) => {
      const nextY = startScrollY.value + e.translationY;
      translateY.value = Math.max(maxScroll, Math.min(0, nextY));
    })
    .onEnd((e) => {
      translateY.value = withDecay({
        velocity: e.velocityY,
        clamp: [maxScroll, 0],
      });
    });

  // Pinch Gesture for Multi-Day Zoom Scaling
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      const newZoom = Math.max(0.7, Math.min(2.5, zoomScale * e.scale));
      scaleRatio.value = newZoom;
    })
    .onEnd(() => {
      runOnJS(setZoomScale)(scaleRatio.value);
    });

  const scrollGestures = Gesture.Simultaneous(panGesture, pinchGesture);

  const animatedTimelineStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  // Collision detection for overlapping events in the day view
  const positionedEvents = useMemo(() => {
    const parseTimeToMin = (t: string) => {
      const parts = (t.split('T')[1] || '00:00:00').split(':').map(Number);
      return (parts[0] || 0) * 60 + (parts[1] || 0);
    };

    const slots = dayEvents.map((ev) => ({
      event: ev,
      start: parseTimeToMin(ev.startTime),
      end: parseTimeToMin(ev.endTime),
    }));

    const result: { event: CalendarEvent; left: number; width: number }[] = [];
    const availableWidth = windowWidth - RULER_WIDTH - 28;

    for (let i = 0; i < slots.length; i++) {
      const current = slots[i];
      let overlaps = 0;
      let positionIndex = 0;

      for (let j = 0; j < slots.length; j++) {
        if (i === j) continue;
        const other = slots[j];
        if (current.start < other.end && current.end > other.start) {
          overlaps++;
          if (j < i) positionIndex++;
        }
      }

      const totalColumns = Math.max(1, overlaps + 1);
      const colWidth = availableWidth / totalColumns;
      const left = RULER_WIDTH + 8 + positionIndex * colWidth;

      result.push({
        event: current.event,
        left,
        width: colWidth - 6,
      });
    }

    return result;
  }, [dayEvents, windowWidth]);

  return (
    <View style={styles.viewportContainer}>
      <GestureDetector gesture={scrollGestures}>
        <Animated.View style={[styles.canvasWrapper, animatedTimelineStyle]}>
          {/* Hardware-Accelerated Skia Canvas */}
          <Canvas style={{ width: windowWidth, height: totalTimelineHeight }}>
            {/* Peak Cognitive Bandwidth Zone Overlay */}
            <Rect
              x={RULER_WIDTH}
              y={peakFocusY}
              width={windowWidth - RULER_WIDTH}
              height={peakFocusHeight}
              color="rgba(56, 189, 248, 0.05)"
            />

            {/* Postprandial Dip Recovery Trough Overlay */}
            <Rect
              x={RULER_WIDTH}
              y={dipY}
              width={windowWidth - RULER_WIDTH}
              height={dipHeight}
              color="rgba(245, 158, 11, 0.04)"
            />

            {/* Afternoon Rebound Zone Overlay */}
            <Rect
              x={RULER_WIDTH}
              y={afternoonY}
              width={windowWidth - RULER_WIDTH}
              height={afternoonHeight}
              color="rgba(6, 182, 212, 0.04)"
            />

            {/* Melatonin Wind-Down Recovery Trough Overlay */}
            <Rect
              x={RULER_WIDTH}
              y={melatoninY}
              width={windowWidth - RULER_WIDTH}
              height={melatoninHeight}
              color="rgba(129, 140, 248, 0.06)"
            />

            {/* Hour Grid Lines */}
            {HOURS.map((hour) => {
              const y = hour * hourHeight;
              const halfY = y + hourHeight / 2;
              return (
                <React.Fragment key={`grid-${hour}`}>
                  {/* Major Hour Line */}
                  <Line
                    p1={vec(RULER_WIDTH, y)}
                    p2={vec(windowWidth, y)}
                    color="#1E293B"
                    strokeWidth={1}
                  />
                  {/* Half-Hour Subtle Tick */}
                  {hour < 24 && (
                    <Line
                      p1={vec(RULER_WIDTH + 8, halfY)}
                      p2={vec(windowWidth - 12, halfY)}
                      color="#162032"
                      strokeWidth={1}
                    />
                  )}
                </React.Fragment>
              );
            })}

            {/* Dynamic Diurnal Circadian Energy Rhythm Curve (Section 2 & 5) */}
            <Path path={circadianPath} color="rgba(56, 189, 248, 0.12)">
              <LinearGradient
                start={vec(windowWidth - 40, 0)}
                end={vec(windowWidth - 40, totalTimelineHeight)}
                colors={[
                  'rgba(99, 102, 241, 0.18)', // Early dawn
                  'rgba(16, 185, 129, 0.25)', // Morning cortisol rise
                  'rgba(56, 189, 248, 0.30)', // Morning peak focus
                  'rgba(245, 158, 11, 0.18)', // Postprandial dip
                  'rgba(6, 182, 212, 0.25)',  // Afternoon rebound
                  'rgba(139, 92, 246, 0.22)', // Evening melatonin onset
                ]}
              />
            </Path>

            {/* Current Time Indicator Line & Pulse Circle */}
            {isToday && currentTimeY >= 0 && currentTimeY <= totalTimelineHeight && (
              <>
                <Line
                  p1={vec(RULER_WIDTH, currentTimeY)}
                  p2={vec(windowWidth, currentTimeY)}
                  color="#EF4444"
                  strokeWidth={2}
                />
                <Circle cx={RULER_WIDTH} cy={currentTimeY} r={4.5} color="#EF4444" />
              </>
            )}
          </Canvas>

          {/* Time Ruler Labels (Left Gutter) */}
          <View style={styles.rulerContainer} pointerEvents="none">
            {HOURS.map((hour) => {
              const y = hour * hourHeight;
              const formattedHour =
                hour === 0
                  ? '12 AM'
                  : hour < 12
                  ? `${hour} AM`
                  : hour === 12
                  ? '12 PM'
                  : `${hour - 12} PM`;

              return (
                <View
                  key={`label-${hour}`}
                  style={[styles.rulerLabelBox, { top: y - 8 }]}
                >
                  <Text style={styles.rulerText}>{formattedHour}</Text>
                </View>
              );
            })}
          </View>

          {/* Interactive Event Cards with Drag-and-Drop Rescheduling */}
          {positionedEvents.map(({ event, left, width }) => (
            <TimelineEventCard
              key={event.id}
              event={event}
              hourHeight={hourHeight}
              leftOffset={left}
              width={width}
              onPress={handleOpenEvent}
              onReschedule={rescheduleEvent}
            />
          ))}
        </Animated.View>
      </GestureDetector>

      {/* Event Details Bottom Sheet Modal */}
      <EventDetailModal
        ref={modalRef}
        event={selectedEvent}
        onClose={handleCloseEvent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  viewportContainer: {
    flex: 1,
    backgroundColor: '#0B1120',
    overflow: 'hidden',
  },
  canvasWrapper: {
    width: '100%',
    position: 'relative',
  },
  rulerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: RULER_WIDTH,
    height: '100%',
  },
  rulerLabelBox: {
    position: 'absolute',
    left: 8,
    width: RULER_WIDTH - 12,
    alignItems: 'flex-start',
  },
  rulerText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
