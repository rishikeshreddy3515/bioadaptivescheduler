import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { useCalendarStore } from '../../store/useCalendarStore';

export const AllDayEventsBar: React.FC = () => {
  const getAllDayEventsForDay = useCalendarStore((s) => s.getAllDayEventsForDay);
  const allDayEvents = getAllDayEventsForDay();

  if (allDayEvents.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={styles.labelText}>ALL DAY</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollList}
      >
        {allDayEvents.map((event) => (
          <View
            key={event.id}
            style={[
              styles.eventCard,
              { borderColor: event.color || '#10B981', backgroundColor: `${event.color || '#10B981'}22` },
            ]}
          >
            <View style={[styles.dot, { backgroundColor: event.color || '#10B981' }]} />
            <Text style={styles.eventTitle} numberOfLines={1}>
              {event.title}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    gap: 8,
  },
  labelContainer: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#1E293B',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  labelText: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  scrollList: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  eventTitle: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '600',
  },
});

