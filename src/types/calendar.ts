import { CadenceActivity } from '../theme/colors';

export type { CadenceActivity };

export type CalendarSource = 'google' | 'outlook' | 'apple' | 'local';

export interface Calendar {
  id: string;
  userId?: string;
  name: string;
  color: string;
  isPrimary?: boolean;
  source: CalendarSource;
  isVisible?: boolean;
  createdAt?: string;
}

export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'WEEKDAYS' | 'MONTHLY';

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval?: number;
  endDate?: string; // YYYY-MM-DD
  daysOfWeek?: number[]; // 0=Sunday..6=Saturday
}

export interface CalendarEvent {
  id: string;
  calendarId?: string;
  calendar_id?: string;
  userId?: string;
  user_id?: string;
  externalId?: string;
  external_id?: string;
  source?: 'internal' | 'google_calendar' | 'todoist';
  title: string;
  description?: string;
  startTime: string; // ISO 8601 string: 2026-10-31T09:00:00
  endTime: string;   // ISO 8601 string: 2026-10-31T10:30:00
  start_time?: string;
  end_time?: string;
  isAllDay?: boolean;
  is_all_day?: boolean;
  isLocked?: boolean;
  is_locked?: boolean;
  color?: string;
  location?: string;
  category?: CadenceActivity; // 8 CADENCE activities
  recurrenceRule?: RecurrenceRule;
  recurrenceId?: string;
  metadata?: Record<string, any>;
}

export interface FetchEventsParams {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  calendarIds?: string[];
}
