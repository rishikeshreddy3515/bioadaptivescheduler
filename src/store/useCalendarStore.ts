import { create } from 'zustand';
import { STORAGE_KEYS, persistAtomEffect } from '../utils/storage';
import { Calendar, CalendarEvent } from '../types/calendar';
import { calendarService, DEFAULT_CALENDARS } from '../api/calendarService';

/**
 * Helper to obtain YYYY-MM-DD format
 */
export const getTodayDateString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export interface CalendarState {
  // Atoms from ARCHITECTURE.md Section 5.1
  visibleCalendarIdsAtom: string[];
  selectedDateAtom: string; // YYYY-MM-DD
  todayAtom: string;        // YYYY-MM-DD (in-memory derived)

  // Calendar Metadata & Events
  calendars: Calendar[];
  events: CalendarEvent[];
  allDayEvents: CalendarEvent[];
  lastSyncTimestamp: number | null;
  isLoading: boolean;
  isHydrated: boolean;

  // Zoom & View Configuration
  zoomScale: number; // 0.8x to 2.0x

  // Actions
  hydrate: () => Promise<void>;
  setSelectedDate: (date: string) => void;
  setZoomScale: (scale: number) => void;
  toggleCalendarVisibility: (calendarId: string) => Promise<void>;
  fetchCalendarData: (date?: string) => Promise<void>;
  addEvent: (event: CalendarEvent) => void;
  rescheduleEvent: (eventId: string, newStartTime: string, newEndTime: string) => Promise<void>;
  syncGoogleCalendar: () => Promise<void>;

  // Selectors (Available on state and as independent functions)
  getDayViewEvents: () => CalendarEvent[];
  getAllDayEventsForDay: () => CalendarEvent[];
}

const visibleCalendarsPersistence = persistAtomEffect<string[]>(
  STORAGE_KEYS.visibleCalendarIdsAtom,
  { defaultValue: ['cal-work', 'cal-energy', 'cal-personal'] }
);

const selectedDatePersistence = persistAtomEffect<string>(
  STORAGE_KEYS.selectedDateAtom,
  { defaultValue: getTodayDateString() }
);

/**
 * recurrenceSelector: Derived computation expanding recurring and all-day events
 * for the target date range (ARCHITECTURE.md Section 5).
 */
export const recurrenceSelector = (
  events: CalendarEvent[],
  targetDate: string
): CalendarEvent[] => {
  const result: CalendarEvent[] = [];
  const targetDayDate = new Date(`${targetDate}T00:00:00`);
  const targetDayOfWeek = targetDayDate.getDay(); // 0 = Sun..6 = Sat

  for (const event of events) {
    const eventStartDate = event.startTime.split('T')[0];
    const eventStartTimeOnly = event.startTime.split('T')[1] || '09:00:00';
    const eventEndTimeOnly = event.endTime.split('T')[1] || '10:00:00';

    // 1. Direct match on event date
    if (eventStartDate === targetDate) {
      result.push(event);
      continue;
    }

    // 2. Recurrence expansion
    if (event.recurrenceRule) {
      const { frequency, endDate, daysOfWeek } = event.recurrenceRule;

      // If recurrence has ended before target date, skip
      if (endDate && targetDate > endDate) {
        continue;
      }

      // If target date is before initial event date, skip
      if (targetDate < eventStartDate) {
        continue;
      }

      let matches = false;

      if (frequency === 'DAILY') {
        matches = true;
      } else if (frequency === 'WEEKDAYS') {
        // Monday (1) to Friday (5)
        matches = targetDayOfWeek >= 1 && targetDayOfWeek <= 5;
      } else if (frequency === 'WEEKLY') {
        if (daysOfWeek && daysOfWeek.length > 0) {
          matches = daysOfWeek.includes(targetDayOfWeek);
        } else {
          const originDayOfWeek = new Date(`${eventStartDate}T00:00:00`).getDay();
          matches = originDayOfWeek === targetDayOfWeek;
        }
      } else if (frequency === 'MONTHLY') {
        const originDayOfMonth = parseInt(eventStartDate.split('-')[2], 10);
        const targetDayOfMonth = parseInt(targetDate.split('-')[2], 10);
        matches = originDayOfMonth === targetDayOfMonth;
      }

      if (matches) {
        result.push({
          ...event,
          id: `${event.id}-rec-${targetDate}`,
          recurrenceId: event.id,
          startTime: `${targetDate}T${eventStartTimeOnly}`,
          endTime: `${targetDate}T${eventEndTimeOnly}`,
        });
      }
    }
  }

  return result;
};

/**
 * dayViewSelector: Derived selector filtering events by selectedDateAtom and visibleCalendarIdsAtom
 * (ARCHITECTURE.md Section 5).
 */
export const dayViewSelector = (
  events: CalendarEvent[],
  selectedDate: string,
  visibleCalendarIds: string[]
): CalendarEvent[] => {
  // First expand recurrence for the selected date
  const expanded = recurrenceSelector(events, selectedDate);

  // Filter by visible calendars and non-all-day
  const filtered = expanded.filter(
    (ev) => !ev.isAllDay && Boolean(ev.calendarId && visibleCalendarIds.includes(ev.calendarId))
  );

  // Sort chronologically
  return filtered.sort((a, b) => a.startTime.localeCompare(b.startTime));
};

export const useCalendarStore = create<CalendarState>((set, get) => ({
  visibleCalendarIdsAtom: ['cal-work', 'cal-energy', 'cal-personal'],
  selectedDateAtom: getTodayDateString(),
  todayAtom: getTodayDateString(),

  calendars: DEFAULT_CALENDARS,
  events: [],
  allDayEvents: [],
  lastSyncTimestamp: null,
  isLoading: false,
  isHydrated: false,
  zoomScale: 1.0,

  hydrate: async () => {
    try {
      const [savedCalendarIds, savedSelectedDate] = await Promise.all([
        visibleCalendarsPersistence.load(),
        selectedDatePersistence.load(),
      ]);

      const initialCalendarIds =
        savedCalendarIds && savedCalendarIds.length > 0
          ? savedCalendarIds
          : ['cal-work', 'cal-energy', 'cal-personal'];

      const initialSelectedDate = savedSelectedDate || getTodayDateString();

      set({
        visibleCalendarIdsAtom: initialCalendarIds,
        selectedDateAtom: initialSelectedDate,
        todayAtom: getTodayDateString(),
        isHydrated: true,
      });

      // Fetch initial events for the active date
      await get().fetchCalendarData(initialSelectedDate);
    } catch (err) {
      console.warn('[useCalendarStore] Hydration warning:', err);
      set({ isHydrated: true });
    }
  },

  setSelectedDate: (date: string) => {
    set({ selectedDateAtom: date });
    selectedDatePersistence.save(date);
    get().fetchCalendarData(date);
  },

  setZoomScale: (scale: number) => {
    const clamped = Math.max(0.7, Math.min(2.5, scale));
    set({ zoomScale: clamped });
  },

  toggleCalendarVisibility: async (calendarId: string) => {
    const current = get().visibleCalendarIdsAtom;
    let updated: string[];

    if (current.includes(calendarId)) {
      // Don't allow deselecting all calendars
      if (current.length === 1) return;
      updated = current.filter((id) => id !== calendarId);
    } else {
      updated = [...current, calendarId];
    }

    set({ visibleCalendarIdsAtom: updated });
    await visibleCalendarsPersistence.save(updated);
  },

  fetchCalendarData: async (dateStr?: string) => {
    const date = dateStr || get().selectedDateAtom;
    set({ isLoading: true });

    try {
      const [events, allDay] = await Promise.all([
        calendarService.fetchEvents({
          startDate: date,
          endDate: date,
          calendarIds: get().visibleCalendarIdsAtom,
        }),
        calendarService.fetchAllDayEvents({
          startDate: date,
          endDate: date,
          calendarIds: get().visibleCalendarIdsAtom,
        }),
      ]);

      set({
        events,
        allDayEvents: allDay,
        isLoading: false,
      });
    } catch (err) {
      console.warn('Failed to load calendar data:', err);
      set({ isLoading: false });
    }
  },

  addEvent: (event: CalendarEvent) => {
    const existing = get().events;
    const updated = [...existing.filter((e) => e.id !== event.id), event];
    set({ events: updated });
  },

  rescheduleEvent: async (
    eventId: string,
    newStartTime: string,
    newEndTime: string
  ) => {
    // Optimistically update local events
    const currentEvents = get().events;
    const updatedEvents = currentEvents.map((ev) => {
      if (ev.id === eventId || ev.recurrenceId === eventId) {
        return {
          ...ev,
          startTime: newStartTime,
          endTime: newEndTime,
        };
      }
      return ev;
    });

    set({ events: updatedEvents });

    // Persist change to Supabase backend
    await calendarService.updateEventTiming(eventId, newStartTime, newEndTime);
  },

  syncGoogleCalendar: async () => {
    set({ isLoading: true });
    try {
      const { timestamp } = await calendarService.syncGoogleCalendar();
      set({ lastSyncTimestamp: timestamp, isLoading: false });
      await get().fetchCalendarData();
    } catch (err) {
      set({ isLoading: false });
    }
  },

  getDayViewEvents: () => {
    const { events, selectedDateAtom, visibleCalendarIdsAtom } = get();
    return dayViewSelector(events, selectedDateAtom, visibleCalendarIdsAtom);
  },

  getAllDayEventsForDay: () => {
    const { allDayEvents, selectedDateAtom, visibleCalendarIdsAtom } = get();
    return allDayEvents.filter(
      (ev) =>
        ev.startTime.startsWith(selectedDateAtom) &&
        Boolean(ev.calendarId && visibleCalendarIdsAtom.includes(ev.calendarId))
    );
  },
}));

