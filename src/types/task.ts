/**
 * Task, Project, and Priority Board Types
 * Strictly aligned with ARCHITECTURE.md Section 3.3.C, Section 4.1, and Section 5.1
 */

import { CadenceActivity } from '../theme/colors';

export type { CadenceActivity };

export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';
export type TaskEnergyDemand = 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'cancelled';

export interface Task {
  id: string;
  userId?: string;
  user_id?: string;
  title: string;
  description?: string;
  projectId?: string;
  project_id?: string;
  labelIds: string[];
  label_ids?: string[];
  priority: TaskPriority;
  requiredEnergy: TaskEnergyDemand;
  required_energy?: TaskEnergyDemand;
  estimatedDurationMinutes: number; // default 30
  durationMinutes?: number;
  duration_minutes?: number;
  taskCategory?: CadenceActivity;
  category?: CadenceActivity;
  task_category?: CadenceActivity;
  dueDate?: string; // YYYY-MM-DD
  due_date?: string;
  isCompleted: boolean;
  is_completed?: boolean;
  completedAt?: string;
  completed_at?: string;
  scheduledEventId?: string; // Links to calendar_events table
  scheduled_event_id?: string;
  scheduledStartTime?: string; // ISO string when scheduled to timeline
  scheduledEndTime?: string; // ISO string
  scheduled_start?: string;
  scheduled_end?: string;
  parentTaskId?: string;
  parent_task_id?: string;
  isInPeakWindow?: boolean;
  is_in_peak_window?: boolean;
  createdAt: string;
  updatedAt: string;
  created_at?: string;
  updated_at?: string;
}

export interface TaskProject {
  id: string;
  name: string;
  color: string;
  icon?: string;
  isDefault?: boolean;
  taskCount?: number;
}

export interface TaskLabel {
  id: string;
  name: string;
  color: string;
  priority?: TaskPriority;
}

export interface PendingTaskMutation {
  id: string;
  type: 'create' | 'update' | 'delete' | 'move';
  payload: any;
  timestamp: number;
  retryCount: number;
}

export interface TaskPriorityBuckets {
  overdue: Task[];
  urgent: Task[];
  high: Task[];
  medium: Task[];
  low: Task[];
  completed: Task[];
}
