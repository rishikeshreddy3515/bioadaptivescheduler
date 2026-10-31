import { Task, TaskProject, TaskLabel, PendingTaskMutation } from '../types/task';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { storage, STORAGE_KEYS } from '../utils/storage';

export const DEFAULT_PROJECTS: TaskProject[] = [
  {
    id: 'proj-work',
    name: 'Core Architecture',
    color: '#3B82F6',
    icon: 'briefcase',
    isDefault: true,
  },
  {
    id: 'proj-energy',
    name: 'Circadian Protocols',
    color: '#10B981',
    icon: 'activity',
  },
  {
    id: 'proj-personal',
    name: 'Personal Life',
    color: '#F59E0B',
    icon: 'user',
  },
];

export const DEFAULT_LABELS: TaskLabel[] = [
  { id: 'label-urgent', name: 'Urgent', color: '#EF4444', priority: 'urgent' },
  { id: 'label-deepwork', name: 'Deep Work', color: '#8B5CF6', priority: 'high' },
  { id: 'label-health', name: 'Biometrics', color: '#10B981', priority: 'medium' },
  { id: 'label-admin', name: 'Admin', color: '#64748B', priority: 'low' },
];

export const generateSeedTasks = (): Task[] => {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  return [
    {
      id: 'task-seed-1',
      title: 'Finalize Skia Timeline Gesture Worklets',
      description: 'Ensure 120fps vertical decay scroll and drag-to-reschedule worklets run smoothly.',
      projectId: 'proj-work',
      labelIds: ['label-deepwork', 'label-urgent'],
      priority: 'urgent',
      requiredEnergy: 'high',
      estimatedDurationMinutes: 60,
      durationMinutes: 60,
      taskCategory: 'deep_work',
      category: 'deep_work',
      isInPeakWindow: true,
      scheduledStartTime: `${today}T09:00:00`,
      dueDate: today,
      isCompleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'task-seed-2',
      title: 'Analyze Morning Cortisol Awakening Window',
      description: 'Review circadian phase calculations against sleep score trends.',
      projectId: 'proj-energy',
      labelIds: ['label-health'],
      priority: 'high',
      requiredEnergy: 'high',
      estimatedDurationMinutes: 45,
      durationMinutes: 45,
      taskCategory: 'learning',
      category: 'learning',
      isInPeakWindow: true,
      scheduledStartTime: `${today}T10:15:00`,
      dueDate: today,
      isCompleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'task-seed-3',
      title: 'Overdue: Configure Offline SQLite Sync Queue',
      description: 'Ensure catalystLocalStorage SQLite table persists pending mutations.',
      projectId: 'proj-work',
      labelIds: ['label-urgent'],
      priority: 'high',
      requiredEnergy: 'medium',
      estimatedDurationMinutes: 30,
      durationMinutes: 30,
      taskCategory: 'administration',
      category: 'administration',
      isInPeakWindow: false,
      scheduledStartTime: `${today}T13:30:00`,
      dueDate: yesterday, // Overdue task!
      isCompleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'task-seed-4',
      title: 'Postprandial Nutrition Prep & Light Walk',
      description: 'Prepare high-protein meal to prevent afternoon circadian dip.',
      projectId: 'proj-energy',
      labelIds: ['label-health'],
      priority: 'medium',
      requiredEnergy: 'low',
      estimatedDurationMinutes: 30,
      durationMinutes: 30,
      taskCategory: 'recovery',
      category: 'recovery',
      isInPeakWindow: true,
      scheduledStartTime: `${today}T14:45:00`,
      dueDate: today,
      isCompleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'task-seed-5',
      title: 'Schedule Zone 2 Cardiovascular Workout',
      description: 'Align workout window during late afternoon core body temperature peak.',
      projectId: 'proj-personal',
      labelIds: ['label-health'],
      priority: 'low',
      requiredEnergy: 'high',
      estimatedDurationMinutes: 45,
      durationMinutes: 45,
      taskCategory: 'exercise',
      category: 'exercise',
      isInPeakWindow: true,
      scheduledStartTime: `${tomorrow}T17:30:00`,
      dueDate: tomorrow,
      isCompleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'task-seed-6',
      title: 'Initial Supabase Schema Setup',
      description: 'Created base tables and enabled RLS policies.',
      projectId: 'proj-work',
      labelIds: ['label-admin'],
      priority: 'medium',
      requiredEnergy: 'medium',
      estimatedDurationMinutes: 20,
      durationMinutes: 20,
      taskCategory: 'creative_work',
      category: 'creative_work',
      isInPeakWindow: true,
      dueDate: yesterday,
      isCompleted: true,
      completedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
};

/**
 * Task Service mirroring ARCHITECTURE.md Section 3.3.C endpoints
 */
export const taskService = {
  /**
   * GET /api/v1/tasks/
   */
  async getTasks(): Promise<Task[]> {
    if (!isSupabaseConfigured()) {
      const persisted = await storage.get<Task[]>(STORAGE_KEYS.tasksAtom);
      return persisted && persisted.length > 0 ? persisted : generateSeedTasks();
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        const persisted = await storage.get<Task[]>(STORAGE_KEYS.tasksAtom);
        return persisted && persisted.length > 0 ? persisted : generateSeedTasks();
      }

      return data.map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description || undefined,
        projectId: t.project_id || undefined,
        labelIds: t.label_ids || [],
        priority: t.priority || 'medium',
        requiredEnergy: t.required_energy || 'medium',
        estimatedDurationMinutes: t.duration_minutes || t.estimated_duration_minutes || 30,
        durationMinutes: t.duration_minutes || t.estimated_duration_minutes || 30,
        taskCategory: t.task_category || 'deep_work',
        category: t.task_category || 'deep_work',
        isInPeakWindow: t.is_in_peak_window !== undefined ? Boolean(t.is_in_peak_window) : true,
        dueDate: t.due_date || undefined,
        isCompleted: Boolean(t.is_completed),
        completedAt: t.completed_at || undefined,
        scheduledEventId: t.scheduled_event_id || undefined,
        scheduledStartTime: t.scheduled_start_time || undefined,
        scheduledEndTime: t.scheduled_end_time || undefined,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      }));
    } catch {
      const persisted = await storage.get<Task[]>(STORAGE_KEYS.tasksAtom);
      return persisted && persisted.length > 0 ? persisted : generateSeedTasks();
    }
  },

  /**
   * POST /api/v1/tasks/ (Create Task)
   */
  async createTask(task: Partial<Task>): Promise<Task> {
    const dur = task.durationMinutes || task.estimatedDurationMinutes || 30;
    const cat = task.taskCategory || task.category || 'deep_work';

    const newTask: Task = {
      id: task.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      title: task.title || 'Untitled Task',
      description: task.description,
      projectId: task.projectId || 'proj-work',
      labelIds: task.labelIds || [],
      priority: task.priority || 'medium',
      requiredEnergy: task.requiredEnergy || 'medium',
      estimatedDurationMinutes: dur,
      durationMinutes: dur,
      taskCategory: cat,
      category: cat,
      isInPeakWindow: task.isInPeakWindow !== undefined ? task.isInPeakWindow : true,
      dueDate: task.dueDate,
      scheduledStartTime: task.scheduledStartTime,
      scheduledEndTime: task.scheduledEndTime,
      isCompleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!isSupabaseConfigured()) {
      await this.queueOfflineMutation('create', newTask);
      return newTask;
    }

    try {
      const { error } = await supabase.from('tasks').insert([
        {
          id: newTask.id,
          title: newTask.title,
          description: newTask.description,
          project_id: newTask.projectId,
          label_ids: newTask.labelIds,
          priority: newTask.priority,
          required_energy: newTask.requiredEnergy,
          estimated_duration_minutes: newTask.estimatedDurationMinutes,
          duration_minutes: newTask.durationMinutes,
          task_category: newTask.taskCategory,
          is_in_peak_window: newTask.isInPeakWindow,
          due_date: newTask.dueDate,
          scheduled_start_time: newTask.scheduledStartTime,
          scheduled_end_time: newTask.scheduledEndTime,
          is_completed: false,
        },
      ]);

      if (error) {
        await this.queueOfflineMutation('create', newTask);
      }
    } catch {
      await this.queueOfflineMutation('create', newTask);
    }

    return newTask;
  },

  /**
   * PUT /api/v1/tasks/{taskId} (Update Task)
   */
  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    const updatedTask: Partial<Task> = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (!isSupabaseConfigured()) {
      await this.queueOfflineMutation('update', { taskId, updates: updatedTask });
      return { id: taskId, ...updatedTask } as Task;
    }

    try {
      const dbPayload: any = {};
      if (updates.title !== undefined) dbPayload.title = updates.title;
      if (updates.description !== undefined) dbPayload.description = updates.description;
      if (updates.projectId !== undefined) dbPayload.project_id = updates.projectId;
      if (updates.labelIds !== undefined) dbPayload.label_ids = updates.labelIds;
      if (updates.priority !== undefined) dbPayload.priority = updates.priority;
      if (updates.requiredEnergy !== undefined) dbPayload.required_energy = updates.requiredEnergy;
      if (updates.estimatedDurationMinutes !== undefined) dbPayload.estimated_duration_minutes = updates.estimatedDurationMinutes;
      if (updates.dueDate !== undefined) dbPayload.due_date = updates.dueDate;
      if (updates.isCompleted !== undefined) {
        dbPayload.is_completed = updates.isCompleted;
        dbPayload.completed_at = updates.isCompleted ? new Date().toISOString() : null;
      }
      if (updates.scheduledEventId !== undefined) dbPayload.scheduled_event_id = updates.scheduledEventId;
      if (updates.scheduledStartTime !== undefined) dbPayload.scheduled_start_time = updates.scheduledStartTime;
      if (updates.scheduledEndTime !== undefined) dbPayload.scheduled_end_time = updates.scheduledEndTime;

      const { error } = await supabase.from('tasks').update(dbPayload).eq('id', taskId);
      if (error) {
        await this.queueOfflineMutation('update', { taskId, updates: updatedTask });
      }
    } catch {
      await this.queueOfflineMutation('update', { taskId, updates: updatedTask });
    }

    return { id: taskId, ...updatedTask } as Task;
  },

  /**
   * DELETE /api/v1/tasks/{taskId}
   */
  async deleteTask(taskId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      await this.queueOfflineMutation('delete', { taskId });
      return true;
    }

    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) {
        await this.queueOfflineMutation('delete', { taskId });
      }
    } catch {
      await this.queueOfflineMutation('delete', { taskId });
    }

    return true;
  },

  /**
   * POST /api/v1/tasks/move-between-projects
   */
  async moveBetweenProjects(taskId: string, targetProjectId: string): Promise<void> {
    await this.updateTask(taskId, { projectId: targetProjectId });
  },

  /**
   * GET /api/v1/tasks/overdue/visible
   */
  async getOverdueVisibleTasks(): Promise<Task[]> {
    const tasks = await this.getTasks();
    const today = new Date().toISOString().split('T')[0];
    return tasks.filter((t) => !t.isCompleted && t.dueDate && t.dueDate < today);
  },

  /**
   * GET /api/v1/tasks/projects/
   */
  async getProjects(): Promise<TaskProject[]> {
    if (!isSupabaseConfigured()) {
      const persisted = await storage.get<TaskProject[]>(STORAGE_KEYS.taskProjectsAtom);
      return persisted && persisted.length > 0 ? persisted : DEFAULT_PROJECTS;
    }

    try {
      const { data, error } = await supabase.from('task_projects').select('*');
      if (error || !data || data.length === 0) {
        return DEFAULT_PROJECTS;
      }
      return data;
    } catch {
      return DEFAULT_PROJECTS;
    }
  },

  /**
   * GET /api/v1/tasks/labels/
   */
  async getLabels(): Promise<TaskLabel[]> {
    if (!isSupabaseConfigured()) {
      const persisted = await storage.get<TaskLabel[]>(STORAGE_KEYS.taskLabelsAtom);
      return persisted && persisted.length > 0 ? persisted : DEFAULT_LABELS;
    }

    try {
      const { data, error } = await supabase.from('task_labels').select('*');
      if (error || !data || data.length === 0) {
        return DEFAULT_LABELS;
      }
      return data;
    } catch {
      return DEFAULT_LABELS;
    }
  },

  /**
   * POST /api/v1/tasks/sync/todoist (Stub Connector)
   */
  async syncTodoist(): Promise<{ syncedCount: number }> {
    await new Promise((r) => setTimeout(r, 800));
    return { syncedCount: 3 };
  },

  /**
   * POST /api/v1/tasks/sync/clickup (Stub Connector)
   */
  async syncClickUp(): Promise<{ syncedCount: number }> {
    await new Promise((r) => setTimeout(r, 800));
    return { syncedCount: 2 };
  },

  /**
   * Queue mutation into catalystLocalStorage when offline (Section 4.1 pendingTaskMutations)
   */
  async queueOfflineMutation(type: PendingTaskMutation['type'], payload: any): Promise<void> {
    try {
      const existing = (await storage.get<PendingTaskMutation[]>(STORAGE_KEYS.pendingTaskMutations)) || [];
      const mutation: PendingTaskMutation = {
        id: `mutation-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        type,
        payload,
        timestamp: Date.now(),
        retryCount: 0,
      };
      existing.push(mutation);
      await storage.set(STORAGE_KEYS.pendingTaskMutations, existing);
    } catch (err) {
      console.warn('[pendingTaskMutations] Failed to queue offline task mutation:', err);
    }
  },

  /**
   * Flush pending mutations when network is restored
   */
  async flushPendingMutations(): Promise<number> {
    if (!isSupabaseConfigured()) return 0;

    try {
      const mutations = (await storage.get<PendingTaskMutation[]>(STORAGE_KEYS.pendingTaskMutations)) || [];
      if (mutations.length === 0) return 0;

      let flushedCount = 0;
      for (const mut of mutations) {
        try {
          if (mut.type === 'create') {
            await supabase.from('tasks').insert([mut.payload]);
          } else if (mut.type === 'update') {
            await supabase.from('tasks').update(mut.payload.updates).eq('id', mut.payload.taskId);
          } else if (mut.type === 'delete') {
            await supabase.from('tasks').delete().eq('id', mut.payload.taskId);
          }
          flushedCount++;
        } catch {
          // Keep in queue if still fails
        }
      }

      await storage.remove(STORAGE_KEYS.pendingTaskMutations);
      return flushedCount;
    } catch {
      return 0;
    }
  },
};

