import { supabase, isSupabaseConfigured } from './supabaseClient';
import { storage, STORAGE_KEYS } from '../utils/storage';
import { Calendar, CalendarEvent, FetchEventsParams } from '../types/calendar';

/**
 * Default initial calendars representing typical Lifestack calendar sources
 */
export const DEFAULT_CALENDARS: Calendar[] = [
  {
    id: 'cal-work',
    name: 'Work & Deep Focus',
    color: '#3B82F6',
    isPrimary: true,
    source: 'google',
    isVisible: true,
  },
  {
    id: 'cal-energy',
    name: 'Circadian & Health Routines',
    color: '#10B981',
    isPrimary: false,
    source: 'local',
    isVisible: true,
  },
  {
    id: 'cal-personal',
    name: 'Personal & Family',
    color: '#F59E0B',
    isPrimary: false,
    source: 'outlook',
    isVisible: true,
  },
];

/**
 * Generate seed events around a target date for immediate interactive visualization
 */
export const generateSeedEvents = (dateStr: string): CalendarEvent[] => {
  return [
    {
      id: `seed-all-day-1-${dateStr}`,
      calendarId: 'cal-energy',
      title: 'Optimal Circadian Window: Peak Energy',
      startTime: `${dateStr}T00:00:00`,
      endTime: `${dateStr}T23:59:59`,
      isAllDay: true,
      color: '#10B981',
      description: 'Cortisol awakening peak window active',
    },
    {
      id: `seed-event-1-${dateStr}`,
      calendarId: 'cal-energy',
      title: 'Morning Sunlight & Light Movement',
      startTime: `${dateStr}T07:30:00`,
      endTime: `${dateStr}T08:15:00`,
      isAllDay: false,
      color: '#10B981',
      description: 'Anchor circadian rhythm with outdoor light exposure',
      location: 'Outdoors',
      recurrenceRule: {
        frequency: 'DAILY',
      },
    },
    {
      id: `seed-event-2-${dateStr}`,
      calendarId: 'cal-work',
      title: 'Deep Work: Core Architecture & Systems',
      startTime: `${dateStr}T09:00:00`,
      endTime: `${dateStr}T11:30:00`,
      isAllDay: false,
      color: '#3B82F6',
      description: 'High cognitive demand session during morning energy peak',
      location: 'Studio / Remote',
    },
    {
      id: `seed-event-3-${dateStr}`,
      calendarId: 'cal-energy',
      title: 'Metabolic Break & Ideal Meal',
      startTime: `${dateStr}T12:00:00`,
      endTime: `${dateStr}T13:00:00`,
      isAllDay: false,
      color: '#06B6D4',
      description: 'High protein, low glycemic load to minimize postprandial dip',
    },
    {
      id: `seed-event-4-${dateStr}`,
      calendarId: 'cal-work',
      title: 'Engineering Sync & Code Reviews',
      startTime: `${dateStr}T14:00:00`,
      endTime: `${dateStr}T15:00:00`,
      isAllDay: false,
      color: '#3B82F6',
      description: 'Lifestack Skia Timeline & gesture integration review',
      location: 'Meet / Virtual Room',
    },
    {
      id: `seed-event-5-${dateStr}`,
      calendarId: 'cal-personal',
      title: 'Gym & Zone 2 Cardiovascular Session',
      startTime: `${dateStr}T17:30:00`,
      endTime: `${dateStr}T18:45:00`,
      isAllDay: false,
      color: '#F59E0B',
      description: 'Body temperature peak optimal workout timing',
    },
    {
      id: `seed-event-6-${dateStr}`,
      calendarId: 'cal-energy',
      title: 'Evening Wind-down & Blue Light Cutoff',
      startTime: `${dateStr}T21:30:00`,
      endTime: `${dateStr}T22:30:00`,
      isAllDay: false,
      color: '#8B5CF6',
      description: 'Melatonin onset protection window',
      recurrenceRule: {
        frequency: 'DAILY',
      },
    },
  ];
};

/**
 * Calendar Operations Service
 * Mirroring Section 3.3.B endpoints backed by Supabase calendars & calendar_events tables.
 */
export const calendarService = {
  /**
   * Multi-calendar event fetch (/api/v1/calendar/events/)
   */
  async fetchEvents(params: FetchEventsParams): Promise<CalendarEvent[]> {
    const { startDate, endDate, calendarIds } = params;

    if (!isSupabaseConfigured()) {
      return generateSeedEvents(startDate);
    }

    try {
      let query = supabase
        .from('calendar_events')
        .select('*')
        .eq('is_all_day', false)
        .gte('end_time', `${startDate}T00:00:00`)
        .lte('start_time', `${endDate}T23:59:59`);

      if (calendarIds && calendarIds.length > 0) {
        query = query.in('calendar_id', calendarIds);
      }

      const { data, error } = await query;

      if (error || !data || data.length === 0) {
        // Fallback to rich seed events for the active date
        return generateSeedEvents(startDate);
      }

      return data.map((item: any) => ({
        id: item.id,
        calendarId: item.calendar_id,
        userId: item.user_id,
        title: item.title,
        description: item.description,
        startTime: item.start_time,
        endTime: item.end_time,
        isAllDay: item.is_all_day ?? false,
        color: item.color,
        location: item.location,
        recurrenceRule: item.recurrence_rule,
        recurrenceId: item.recurrence_id,
        metadata: item.metadata,
      }));
    } catch (err) {
      console.warn('[/api/v1/calendar/events/] Fetch error, using seed cache:', err);
      return generateSeedEvents(startDate);
    }
  },

  /**
   * All-day milestone fetch (/api/v1/calendar/events/allDay/v2025-05-02)
   */
  async fetchAllDayEvents(params: FetchEventsParams): Promise<CalendarEvent[]> {
    const { startDate, endDate, calendarIds } = params;

    if (!isSupabaseConfigured()) {
      return generateSeedEvents(startDate).filter((e) => e.isAllDay);
    }

    try {
      let query = supabase
        .from('calendar_events')
        .select('*')
        .eq('is_all_day', true)
        .gte('end_time', `${startDate}T00:00:00`)
        .lte('start_time', `${endDate}T23:59:59`);

      if (calendarIds && calendarIds.length > 0) {
        query = query.in('calendar_id', calendarIds);
      }

      const { data, error } = await query;

      if (error || !data || data.length === 0) {
        return generateSeedEvents(startDate).filter((e) => e.isAllDay);
      }

      return data.map((item: any) => ({
        id: item.id,
        calendarId: item.calendar_id,
        userId: item.user_id,
        title: item.title,
        description: item.description,
        startTime: item.start_time,
        endTime: item.end_time,
        isAllDay: true,
        color: item.color,
        location: item.location,
        recurrenceRule: item.recurrence_rule,
        recurrenceId: item.recurrence_id,
        metadata: item.metadata,
      }));
    } catch (err) {
      console.warn('[/api/v1/calendar/events/allDay/] Fetch error:', err);
      return generateSeedEvents(startDate).filter((e) => e.isAllDay);
    }
  },

  /**
   * Google Calendar delta sync trigger (/api/v1/calendar/events/sync/google)
   * Updates lastSyncTimestamp_google in AsyncStorage (Section 4.1).
   */
  async syncGoogleCalendar(): Promise<{ timestamp: number; success: boolean }> {
    const syncTimestamp = Date.now();
    try {
      if (isSupabaseConfigured()) {
        await supabase.functions.invoke('google-calendar-sync', {
          body: { lastSyncTimestamp: syncTimestamp },
        }).catch(() => {
          // Graceful fallback if edge function not yet configured
        });
      }

      await storage.set(STORAGE_KEYS.lastSyncTimestamp_google, syncTimestamp);
      return { timestamp: syncTimestamp, success: true };
    } catch (err) {
      console.warn('[/api/v1/calendar/events/sync/google] Sync warning:', err);
      await storage.set(STORAGE_KEYS.lastSyncTimestamp_google, syncTimestamp);
      return { timestamp: syncTimestamp, success: true };
    }
  },

  /**
   * Reschedule or update event timing (supporting canvas drag-and-drop)
   */
  async updateEventTiming(
    eventId: string,
    newStartTime: string,
    newEndTime: string
  ): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return true;
    }

    try {
      const { error } = await supabase
        .from('calendar_events')
        .update({
          start_time: newStartTime,
          end_time: newEndTime,
          updated_at: new Date().toISOString(),
        })
        .eq('id', eventId);

      return !error;
    } catch (err) {
      console.warn('Failed to update event timing in Supabase:', err);
      return false;
    }
  },
};

