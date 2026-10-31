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
  title: string;
  description?: string;
  projectId?: string;
  labelIds: string[];
  priority: TaskPriority;
  requiredEnergy: TaskEnergyDemand;
  estimatedDurationMinutes: number; // default 30
  durationMinutes?: number;
  taskCategory?: CadenceActivity;
  category?: CadenceActivity;
  dueDate?: string; // YYYY-MM-DD
  isCompleted: boolean;
  completedAt?: string;
  scheduledEventId?: string; // Links to calendar_events table
  scheduledStartTime?: string; // ISO string when scheduled to timeline
  scheduledEndTime?: string; // ISO string
  isInPeakWindow?: boolean;
  createdAt: string;
  updatedAt: string;
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
