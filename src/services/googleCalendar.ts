import { CalendarEvent } from '../types/calendar';
import { CadenceActivity, ACTIVITY_COLORS } from '../theme/colors';
import { supabase, isSupabaseConfigured } from '../api/supabaseClient';
import { useCalendarStore } from '../store/useCalendarStore';

export function classifyEventCategory(title: string, description: string = ''): CadenceActivity {
  const text = `${title} ${description}`.toLowerCase();

  if (/gym|workout|run|stretch|yoga|lift|training|cardio|fitness/.test(text)) {
    return 'exercise';
  }
  if (/lunch|dinner|breakfast|meal|food|eat|restaurant/.test(text)) {
    return 'meals';
  }
  if (/rest|meditat|breathe|break|recharge|nap|sauna|walk/.test(text)) {
    return 'recovery';
  }
  if (/design|brainstorm|creative|figma|wireframe|art|concept|deck/.test(text)) {
    return 'creative_work';
  }
  if (/learn|study|lecture|course|tutorial|podcast|reading|book/.test(text)) {
    return 'learning';
  }
  if (/sync|standup|meeting|call|1:1|one-on-one|status|planning|admin|retro|weekly/.test(text)) {
    return 'administration';
  }
  if (/doctor|dentist|errand|flight|family|haircut|personal|appointment/.test(text)) {
    return 'personal';
  }
  return 'deep_work';
}

export const googleCalendarService = {
  /**
   * Fetch events from Google Calendar REST API v3 using user's provider token
   */
  async fetchRemoteEvents(providerToken: string, targetDate?: string): Promise<CalendarEvent[]> {
    const dateStr = targetDate || new Date().toISOString().split('T')[0];
    const timeMin = `${dateStr}T00:00:00.000Z`;
    const timeMax = `${dateStr}T23:59:59.999Z`;

    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
      timeMin
    )}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${providerToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Google Calendar API error ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    const items = data.items || [];

    return items.map((item: any) => {
      const summary = item.summary || 'Calendar Event';
      const description = item.description || '';
      const category = classifyEventCategory(summary, description);
      const isAllDay = !!item.start?.date;
      const startTime = isAllDay ? `${item.start.date}T00:00:00` : item.start?.dateTime || `${dateStr}T09:00:00`;
      const endTime = isAllDay ? `${item.end.date}T23:59:59` : item.end?.dateTime || `${dateStr}T10:00:00`;

      return {
        id: `gcal-${item.id}`,
        calendarId: 'cal-google-primary',
        title: summary,
        description,
        startTime,
        endTime,
        isAllDay,
        color: ACTIVITY_COLORS[category]?.dark || '#367E87',
        location: item.location,
      };
    });
  },

  /**
   * Sync Google Calendar events to local store and Supabase
   */
  async syncCalendarEvents(providerToken?: string, userId?: string): Promise<CalendarEvent[]> {
    const today = new Date().toISOString().split('T')[0];
    let events: CalendarEvent[] = [];

    if (providerToken && providerToken.trim().length > 0) {
      try {
        events = await this.fetchRemoteEvents(providerToken, today);
      } catch (err) {
        console.warn('[GoogleCalendar] Remote fetch failed, using fallback:', err);
      }
    }

    // If no events fetched from Google (or no token), inject standard seed events for today
    if (events.length === 0) {
      events = [
        {
          id: `gcal-seed-1`,
          calendarId: 'cal-work',
          title: 'Draft Q4 strategy',
          description: 'Deep focus on product roadmap and growth metrics',
          startTime: `${today}T09:00:00`,
          endTime: `${today}T10:40:00`,
          isAllDay: false,
          color: ACTIVITY_COLORS.deep_work.dark,
        },
        {
          id: `gcal-seed-2`,
          calendarId: 'cal-work',
          title: 'Design review',
          description: 'Figma review with design team',
          startTime: `${today}T11:30:00`,
          endTime: `${today}T12:30:00`,
          isAllDay: false,
          color: ACTIVITY_COLORS.creative_work.dark,
        },
        {
          id: `gcal-seed-3`,
          calendarId: 'cal-work',
          title: 'Sprint Sync & Admin',
          description: 'Team updates and email catchup',
          startTime: `${today}T13:30:00`,
          endTime: `${today}T14:15:00`,
          isAllDay: false,
          color: ACTIVITY_COLORS.administration.dark,
        },
      ];
    }

    // Hydrate local calendar store
    const calendarStore = useCalendarStore.getState();
    for (const ev of events) {
      calendarStore.addEvent(ev);
    }

    // Upsert into Supabase calendar_events table
    if (isSupabaseConfigured() && userId && userId !== 'guest-user-12345') {
      try {
        const rows = events.map((ev) => ({
          id: ev.id,
          user_id: userId,
          calendar_id: ev.calendarId,
          title: ev.title,
          description: ev.description || '',
          start_time: ev.startTime,
          end_time: ev.endTime,
          is_all_day: ev.isAllDay,
          category: classifyEventCategory(ev.title, ev.description),
          color: ev.color,
          location: ev.location || null,
          updated_at: new Date().toISOString(),
        }));

        await supabase.from('calendar_events').upsert(rows, { onConflict: 'id' });
      } catch (err) {
        console.warn('[GoogleCalendar] Supabase upsert error (continuing locally):', err);
      }
    }

    return events;
  },
};

