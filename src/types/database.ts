import { CadenceActivity } from '../theme/colors';

export type CADENCEActivityCategory = CadenceActivity;

export type TaskPriorityLevel = 'Urgent' | 'High' | 'Medium' | 'Low';

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  theme_mode: 'moonlight' | 'daylight';
  has_completed_onboarding: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Routine {
  id: string;
  user_id: string;
  wake_time: string;
  wind_down_time: string;
  peak_start: string;
  peak_end: string;
  slump_start: string;
  slump_end: string;
  caffeine_cutoff: string;
  second_wind_start: string;
  second_wind_end: string;
  selected_boosters: string[];
  created_at?: string;
  updated_at?: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  duration_minutes: number;
  priority: TaskPriorityLevel;
  task_category: CADENCEActivityCategory;
  is_in_peak_window: boolean;
  is_completed: boolean;
  scheduled_start?: string;
  scheduled_end?: string;
  parent_task_id?: string;
  description?: string;
  project_id?: string;
  label_ids?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  external_id?: string;
  source: 'internal' | 'google_calendar' | 'todoist';
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  category: CADENCEActivityCategory;
  is_locked: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BiometricsDaily {
  id: string;
  user_id: string;
  date: string;
  sleep_hours: number;
  hrv_ms: number;
  resting_hr_bpm: number;
  readiness_score: number;
  created_at?: string;
  updated_at?: string;
}

export interface UserIntegration {
  id: string;
  user_id: string;
  provider: 'health_connect' | 'google_calendar' | 'todoist' | 'glucose_sensor';
  is_connected: boolean;
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface AIReplanLog {
  id: string;
  user_id: string;
  trigger_reason: string;
  original_schedule_snapshot: Record<string, any>;
  suggested_changes: Record<string, any>[];
  applied_at?: string;
  created_at?: string;
}

