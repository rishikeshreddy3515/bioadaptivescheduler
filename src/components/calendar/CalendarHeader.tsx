import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useCalendarStore } from '../../store/useCalendarStore';

export const CalendarHeader: React.FC = () => {
  const {
    selectedDateAtom,
    todayAtom,
    calendars,
    visibleCalendarIdsAtom,
    isLoading,
    lastSyncTimestamp,
    zoomScale,
    setSelectedDate,
    setZoomScale,
    toggleCalendarVisibility,
    syncGoogleCalendar,
  } = useCalendarStore();

  const isToday = selectedDateAtom === todayAtom;

  // Format date display (e.g., "Saturday, Oct 31, 2026")
  const formatDateDisplay = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const date = new Date(year, month, day);
        return date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
    } catch {
      // fallback
    }
    return dateStr;
  };

  const handlePrevDay = () => {
    const parts = selectedDateAtom.split('-');
    const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    date.setDate(date.getDate() - 1);
    const prev = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    setSelectedDate(prev);
  };

  const handleNextDay = () => {
    const parts = selectedDateAtom.split('-');
    const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    date.setDate(date.getDate() + 1);
    const next = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    setSelectedDate(next);
  };

  const handleGoToday = () => {
    setSelectedDate(todayAtom);
  };

  return (
    <View style={styles.headerContainer}>
      {/* Top Bar: Date Navigator & Sync */}
      <View style={styles.topRow}>
        <View style={styles.dateNavigator}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={handlePrevDay}
            activeOpacity={0.7}
          >
            <Text style={styles.navArrowText}>‹</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleGoToday}
            activeOpacity={0.8}
            style={styles.dateTextContainer}
          >
            <Text style={styles.dateTitle}>{formatDateDisplay(selectedDateAtom)}</Text>
            {isToday ? (
              <View style={styles.todayPill}>
                <Text style={styles.todayPillText}>TODAY</Text>
              </View>
            ) : null}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navButton}
            onPress={handleNextDay}
            activeOpacity={0.7}
          >
            <Text style={styles.navArrowText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Zoom & Sync Controls */}
        <View style={styles.controlsRow}>
          {/* Zoom controls */}
          <View style={styles.zoomPill}>
            <TouchableOpacity
              onPress={() => setZoomScale(zoomScale - 0.2)}
              style={styles.zoomButton}
              activeOpacity={0.7}
            >
              <Text style={styles.zoomText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.zoomValueText}>{Math.round(zoomScale * 100)}%</Text>
            <TouchableOpacity
              onPress={() => setZoomScale(zoomScale + 0.2)}
              style={styles.zoomButton}
              activeOpacity={0.7}
            >
              <Text style={styles.zoomText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Sync Button */}
          <TouchableOpacity
            style={styles.syncButton}
            onPress={syncGoogleCalendar}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#38BDF8" />
            ) : (
              <Text style={styles.syncButtonText}>↻ Sync</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Calendar Filter Pills */}
      <View style={styles.calendarFiltersRow}>
        {calendars.map((cal) => {
          const isVisible = visibleCalendarIdsAtom.includes(cal.id);
          return (
            <TouchableOpacity
              key={cal.id}
              style={[
                styles.calPill,
                isVisible && { borderColor: cal.color, backgroundColor: `${cal.color}1F` },
              ]}
              onPress={() => toggleCalendarVisibility(cal.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.calDot, { backgroundColor: cal.color }]} />
              <Text
                style={[
                  styles.calPillText,
                  isVisible ? { color: '#F8FAFC' } : { color: '#64748B' },
                ]}
              >
                {cal.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  navArrowText: {
    color: '#94A3B8',
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '600',
  },
  dateTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  todayPill: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  todayPillText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  zoomPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 4,
  },
  zoomButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  zoomText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '700',
  },
  zoomValueText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 4,
  },
  syncButton: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncButtonText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  calendarFiltersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  calPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1E293B',
  },
  calDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  calPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

