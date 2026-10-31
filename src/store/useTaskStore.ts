import { create } from 'zustand';
import { Task, TaskProject, TaskLabel, TaskPriorityBuckets } from '../types/task';
import {
  taskService,
  DEFAULT_PROJECTS,
  DEFAULT_LABELS,
  generateSeedTasks,
} from '../api/taskService';
import { STORAGE_KEYS, persistAtomEffect } from '../utils/storage';
import { useCalendarStore } from './useCalendarStore';
import { useEnergyStore } from './useEnergyStore';
import { CalendarEvent } from '../types/calendar';

export interface TaskState {
  // Atoms from ARCHITECTURE.md Section 5.1
  isSyncingTodosAtom: boolean;
  hasFirstTodoSyncFinishedAtom: boolean;
  processedIdsAtom: string[];

  // Entities
  tasks: Task[];
  projects: TaskProject[];
  labels: TaskLabel[];
  selectedProjectId: string; // 'all' or specific project ID
  isLoading: boolean;
  isHydrated: boolean;

  // Actions
  hydrate: () => Promise<void>;
  fetchTasks: () => Promise<Task[]>;
  setSelectedProjectId: (projectId: string) => void;
  createTask: (task: Partial<Task>) => Promise<Task>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<Task>;
  deleteTask: (taskId: string) => Promise<void>;
  toggleTaskCompletion: (taskId: string) => Promise<void>;
  moveTaskBetweenProjects: (taskId: string, targetProjectId: string) => Promise<void>;
  scheduleTaskToTimeline: (taskId: string, targetDateStr?: string) => Promise<void>;
  syncExternalTodos: () => Promise<void>;

  // Derived Selectors (ARCHITECTURE.md Section 5)
  taskPrioritySelector: (projectIdFilter?: string) => TaskPriorityBuckets;
  overdueTasksCountSelector: () => number;
}

// Atom Persistence Helpers (ARCHITECTURE.md Section 4.1 & 5.2)
const hasFirstTodoSyncPersistence = persistAtomEffect<boolean>(
  STORAGE_KEYS.hasFirstTodoSyncFinishedAtom,
  { defaultValue: false }
);

const processedIdsPersistence = persistAtomEffect<string[]>(
  STORAGE_KEYS.processedIdsAtom,
  { defaultValue: [] }
);

const tasksPersistence = persistAtomEffect<Task[]>(
  STORAGE_KEYS.tasksAtom,
  { defaultValue: [] }
);

const projectsPersistence = persistAtomEffect<TaskProject[]>(
  STORAGE_KEYS.taskProjectsAtom,
  { defaultValue: DEFAULT_PROJECTS }
);

const labelsPersistence = persistAtomEffect<TaskLabel[]>(
  STORAGE_KEYS.taskLabelsAtom,
  { defaultValue: DEFAULT_LABELS }
);

export const useTaskStore = create<TaskState>((set, get) => ({
  // Section 5.1 Atoms
  isSyncingTodosAtom: false,
  hasFirstTodoSyncFinishedAtom: false,
  processedIdsAtom: [],

  tasks: [],
  projects: DEFAULT_PROJECTS,
  labels: DEFAULT_LABELS,
  selectedProjectId: 'all',
  isLoading: false,
  isHydrated: false,

  hydrate: async () => {
    try {
      const [
        savedHasFirstSync,
        savedProcessedIds,
        savedTasks,
        savedProjects,
        savedLabels,
      ] = await Promise.all([
        hasFirstTodoSyncPersistence.load(),
        processedIdsPersistence.load(),
        tasksPersistence.load(),
        projectsPersistence.load(),
        labelsPersistence.load(),
      ]);

      const initialTasks =
        savedTasks && savedTasks.length > 0 ? savedTasks : generateSeedTasks();
      const initialProjects =
        savedProjects && savedProjects.length > 0 ? savedProjects : DEFAULT_PROJECTS;
      const initialLabels =
        savedLabels && savedLabels.length > 0 ? savedLabels : DEFAULT_LABELS;

      set({
        hasFirstTodoSyncFinishedAtom: savedHasFirstSync ?? false,
        processedIdsAtom: savedProcessedIds || [],
        tasks: initialTasks,
        projects: initialProjects,
        labels: initialLabels,
        isHydrated: true,
      });

      // Flush any queued offline mutations
      await taskService.flushPendingMutations();

      // Background fetch latest from remote backend
      const remoteTasks = await taskService.getTasks();
      if (remoteTasks && remoteTasks.length > 0) {
        set({ tasks: remoteTasks });
        await tasksPersistence.save(remoteTasks);
      }
    } catch (err) {
      console.warn('[useTaskStore] Hydration error:', err);
      set({ isHydrated: true });
    }
  },

  fetchTasks: async (): Promise<Task[]> => {
    set({ isLoading: true });
    try {
      const remoteTasks = await taskService.getTasks();
      if (remoteTasks && remoteTasks.length > 0) {
        set({ tasks: remoteTasks, isLoading: false });
        await tasksPersistence.save(remoteTasks);
        return remoteTasks;
      }
    } catch (err) {
      console.warn('[useTaskStore] fetchTasks error:', err);
    }
    set({ isLoading: false });
    return get().tasks;
  },

  setSelectedProjectId: (projectId: string) => {
    set({ selectedProjectId: projectId });
  },

  createTask: async (taskInput: Partial<Task>): Promise<Task> => {
    const newTask = await taskService.createTask(taskInput);
    const updated = [newTask, ...get().tasks];
    set({ tasks: updated });
    await tasksPersistence.save(updated);
    return newTask;
  },

  updateTask: async (taskId: string, updates: Partial<Task>): Promise<Task> => {
    const currentTasks = get().tasks;
    const updatedTasks = currentTasks.map((t) =>
      t.id === taskId ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
    );
    set({ tasks: updatedTasks });
    await tasksPersistence.save(updatedTasks);

    await taskService.updateTask(taskId, updates);
    return updatedTasks.find((t) => t.id === taskId)!;
  },

  deleteTask: async (taskId: string) => {
    const updated = get().tasks.filter((t) => t.id !== taskId);
    set({ tasks: updated });
    await tasksPersistence.save(updated);
    await taskService.deleteTask(taskId);
  },

  toggleTaskCompletion: async (taskId: string) => {
    const task = get().tasks.find((t) => t.id === taskId);
    if (!task) return;

    const nextCompleted = !task.isCompleted;
    await get().updateTask(taskId, {
      isCompleted: nextCompleted,
      completedAt: nextCompleted ? new Date().toISOString() : undefined,
    });
  },

  moveTaskBetweenProjects: async (taskId: string, targetProjectId: string) => {
    await get().updateTask(taskId, { projectId: targetProjectId });
    await taskService.moveBetweenProjects(taskId, targetProjectId);
  },

  /**
   * Schedule to Timeline:
   * Converts a task into a calendar_event inside the user's matching circadian energy window.
   */
  scheduleTaskToTimeline: async (taskId: string, targetDateStr?: string) => {
    const task = get().tasks.find((t) => t.id === taskId);
    if (!task) return;

    const dateStr =
      targetDateStr ||
      useCalendarStore.getState().selectedDateAtom ||
      new Date().toISOString().split('T')[0];

    const energyStore = useEnergyStore.getState();
    const phases = energyStore.circadianPhaseSelector();

    // Determine optimal time slot based on circadian energy demand
    let startTimeStr = '09:30';
    const durationMin = task.estimatedDurationMinutes || 45;

    if (task.requiredEnergy === 'high') {
      // High cognitive load -> align with peak energy interval
      startTimeStr = phases.morningPeakFocus?.start || '09:30';
    } else if (task.requiredEnergy === 'medium') {
      // Medium cognitive load -> align with secondary peak window
      startTimeStr = phases.afternoonPeak?.start || '16:00';
    } else {
      // Low cognitive load / administrative -> align with postprandial dip window
      startTimeStr = phases.postprandialDip?.start || '14:00';
    }

    const [h, m] = startTimeStr.split(':').map(Number);
    const endMinutesTotal = (h || 9) * 60 + (m || 0) + durationMin;
    const endH = Math.min(23, Math.floor(endMinutesTotal / 60));
    const endM = endMinutesTotal % 60;
    const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    const newCalendarEvent: CalendarEvent = {
      id: `event-task-${task.id}`,
      calendarId: task.projectId === 'proj-personal' ? 'cal-personal' : 'cal-work',
      title: task.title,
      description: task.description
        ? `${task.description}\n[Task Priority: ${task.priority.toUpperCase()} | Energy: ${task.requiredEnergy.toUpperCase()}]`
        : `[Task Priority: ${task.priority.toUpperCase()} | Energy: ${task.requiredEnergy.toUpperCase()}]`,
      startTime: `${dateStr}T${startTimeStr}:00`,
      endTime: `${dateStr}T${endTimeStr}:00`,
      isAllDay: false,
      color:
        task.priority === 'urgent'
          ? '#EF4444'
          : task.requiredEnergy === 'high'
          ? '#8B5CF6'
          : '#3B82F6',
    };

    // Inject into Calendar Storework worklets
    useCalendarStore.getState().addEvent(newCalendarEvent);

    // Update task with scheduled calendar reference
    await get().updateTask(taskId, {
      scheduledEventId: newCalendarEvent.id,
      scheduledStartTime: newCalendarEvent.startTime,
      scheduledEndTime: newCalendarEvent.endTime,
    });
  },

  /**
   * Delta synchronizer for Todoist and ClickUp
   */
  syncExternalTodos: async () => {
    set({ isSyncingTodosAtom: true });

    try {
      const [todoistRes, clickupRes] = await Promise.all([
        taskService.syncTodoist(),
        taskService.syncClickUp(),
      ]);

      const syncedTotal = (todoistRes.syncedCount || 0) + (clickupRes.syncedCount || 0);
      const currentProcessed = get().processedIdsAtom;
      const newProcessed = Array.from(
        new Set([...currentProcessed, ...get().tasks.map((t) => t.id)])
      );

      set({
        isSyncingTodosAtom: false,
        hasFirstTodoSyncFinishedAtom: true,
        processedIdsAtom: newProcessed,
      });

      await Promise.all([
        hasFirstTodoSyncPersistence.save(true),
        processedIdsPersistence.save(newProcessed),
      ]);
    } catch (err) {
      console.warn('[syncExternalTodos] Sync error:', err);
      set({ isSyncingTodosAtom: false });
    }
  },

  /**
   * Derived Selector: taskPrioritySelector (ARCHITECTURE.md Section 5)
   * Sorts unscheduled and scheduled tasks by priority, overdue status, and circadian energy window.
   */
  taskPrioritySelector: (projectIdFilter?: string): TaskPriorityBuckets => {
    const { tasks, selectedProjectId } = get();
    const filter = projectIdFilter !== undefined ? projectIdFilter : selectedProjectId;
    const today = new Date().toISOString().split('T')[0];

    const targetTasks =
      filter && filter !== 'all' ? tasks.filter((t) => t.projectId === filter) : tasks;

    const buckets: TaskPriorityBuckets = {
      overdue: [],
      urgent: [],
      high: [],
      medium: [],
      low: [],
      completed: [],
    };

    for (const task of targetTasks) {
      if (task.isCompleted) {
        buckets.completed.push(task);
        continue;
      }

      if (task.dueDate && task.dueDate < today) {
        buckets.overdue.push(task);
      }

      if (task.priority === 'urgent') {
        buckets.urgent.push(task);
      } else if (task.priority === 'high') {
        buckets.high.push(task);
      } else if (task.priority === 'medium') {
        buckets.medium.push(task);
      } else {
        buckets.low.push(task);
      }
    }

    // Sort function: Due date first, then high circadian energy demand first
    const sortFn = (a: Task, b: Task) => {
      if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) {
        return a.dueDate.localeCompare(b.dueDate);
      }
      const energyWeight = { high: 3, medium: 2, low: 1 };
      return (energyWeight[b.requiredEnergy] || 0) - (energyWeight[a.requiredEnergy] || 0);
    };

    buckets.overdue.sort(sortFn);
    buckets.urgent.sort(sortFn);
    buckets.high.sort(sortFn);
    buckets.medium.sort(sortFn);
    buckets.low.sort(sortFn);

    return buckets;
  },

  overdueTasksCountSelector: () => {
    const today = new Date().toISOString().split('T')[0];
    return get().tasks.filter((t) => !t.isCompleted && t.dueDate && t.dueDate < today).length;
  },
}));
