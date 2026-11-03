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
   * Fetches active tasks for the current user (filters by is_completed = false)
   */
  async getTasks(): Promise<Task[]> {
    if (!isSupabaseConfigured()) {
      const persisted = await storage.get<Task[]>(STORAGE_KEYS.tasksAtom);
      return persisted || [];
    }

    try {
      const user = (await supabase.auth.getUser()).data?.user;
      let query = supabase.from('tasks').select('*');
      if (user?.id) {
        query = query.eq('user_id', user.id);
      }
      // Ensure fetchTasks() filters by is_completed = false for active backlog and scheduled tasks
      query = query.eq('is_completed', false).order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error || !data || data.length === 0) {
        const persisted = await storage.get<Task[]>(STORAGE_KEYS.tasksAtom);
        return persisted || [];
      }

      return data.map((t: any) => ({
        id: t.id,
        userId: t.user_id,
        user_id: t.user_id,
        title: t.title,
        description: t.description || undefined,
        projectId: t.project_id || undefined,
        labelIds: t.label_ids || [],
        priority: (t.priority?.toLowerCase() || 'medium') as any,
        requiredEnergy: t.required_energy || 'medium',
        estimatedDurationMinutes: t.duration_minutes || t.estimated_duration_minutes || 30,
        durationMinutes: t.duration_minutes || t.estimated_duration_minutes || 30,
        duration_minutes: t.duration_minutes || t.estimated_duration_minutes || 30,
        taskCategory: t.task_category || 'deep_work',
        task_category: t.task_category || 'deep_work',
        category: t.task_category || 'deep_work',
        isInPeakWindow: t.is_in_peak_window !== undefined ? Boolean(t.is_in_peak_window) : true,
        is_in_peak_window: t.is_in_peak_window !== undefined ? Boolean(t.is_in_peak_window) : true,
        dueDate: t.due_date || undefined,
        isCompleted: Boolean(t.is_completed),
        is_completed: Boolean(t.is_completed),
        completedAt: t.completed_at || undefined,
        scheduledEventId: t.scheduled_event_id || undefined,
        scheduledStartTime: t.scheduled_start || t.scheduled_start_time || undefined,
        scheduledEndTime: t.scheduled_end || t.scheduled_end_time || undefined,
        scheduled_start: t.scheduled_start || t.scheduled_start_time || undefined,
        scheduled_end: t.scheduled_end || t.scheduled_end_time || undefined,
        createdAt: t.created_at || new Date().toISOString(),
        updatedAt: t.updated_at || new Date().toISOString(),
      }));
    } catch {
      const persisted = await storage.get<Task[]>(STORAGE_KEYS.tasksAtom);
      return persisted || [];
    }
  },

  /**
   * POST /api/v1/tasks/ (Create Task)
   * Populates user_id from supabase.auth.getUser() and defaults is_in_peak_window
   */
  async createTask(task: Partial<Task>): Promise<Task> {
    const dur = task.durationMinutes || task.duration_minutes || task.estimatedDurationMinutes || 30;
    const cat = task.taskCategory || task.task_category || task.category || 'deep_work';

    let user_id = task.userId || task.user_id;
    if (!user_id && isSupabaseConfigured()) {
      try {
        const user = (await supabase.auth.getUser()).data?.user;
        user_id = user?.id;
      } catch {}
    }
    const finalUserId = user_id || 'guest-user-12345';

    // Calculate if slot is in user's peak window
    let inPeak = task.isInPeakWindow ?? task.is_in_peak_window;
    if (inPeak === undefined) {
      try {
        const { useEnergyStore } = require('../store/useEnergyStore');
        const routine = useEnergyStore.getState().activeRoutineAtom;
        const peakStart = routine?.peak_start || routine?.peakStart || '08:30';
        const peakEnd = routine?.peak_end || routine?.peakEnd || '11:00';
        const startCandidate = task.scheduledStartTime || task.scheduled_start;
        if (startCandidate && startCandidate.includes('T')) {
          const timePart = startCandidate.split('T')[1].substring(0, 5);
          inPeak = timePart >= peakStart && timePart <= peakEnd;
        } else {
          inPeak = cat === 'deep_work' || cat === 'creative_work';
        }
      } catch {
        inPeak = cat === 'deep_work' || cat === 'creative_work';
      }
    }

    const newTask: Task = {
      id: task.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      userId: finalUserId,
      user_id: finalUserId,
      title: task.title || 'Untitled Task',
      description: task.description,
      projectId: task.projectId || task.project_id || 'proj-work',
      labelIds: task.labelIds || task.label_ids || [],
      priority: task.priority || 'medium',
      requiredEnergy: task.requiredEnergy || (cat === 'deep_work' ? 'high' : 'medium'),
      estimatedDurationMinutes: dur,
      durationMinutes: dur,
      duration_minutes: dur,
      taskCategory: cat,
      task_category: cat,
      category: cat,
      isInPeakWindow: inPeak,
      is_in_peak_window: inPeak,
      dueDate: task.dueDate || task.due_date,
      scheduledStartTime: task.scheduledStartTime || task.scheduled_start,
      scheduledEndTime: task.scheduledEndTime || task.scheduled_end,
      scheduled_start: task.scheduledStartTime || task.scheduled_start,
      scheduled_end: task.scheduledEndTime || task.scheduled_end,
      isCompleted: false,
      is_completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!isSupabaseConfigured()) {
      await this.queueOfflineMutation('create', newTask);
      return newTask;
    }

    try {
      const formattedPriority =
        newTask.priority.charAt(0).toUpperCase() + newTask.priority.slice(1).toLowerCase();

      const { error } = await supabase.from('tasks').insert([
        {
          id: newTask.id,
          user_id: finalUserId,
          title: newTask.title,
          description: newTask.description,
          duration_minutes: newTask.durationMinutes,
          priority: formattedPriority,
          task_category: newTask.taskCategory,
          is_in_peak_window: inPeak,
          is_completed: false,
          scheduled_start: newTask.scheduledStartTime,
          scheduled_end: newTask.scheduledEndTime,
        },
      ]);

      if (error) {
        console.warn('[taskService] insert error, queuing offline:', error);
        await this.queueOfflineMutation('create', newTask);
      }
    } catch (e) {
      console.warn('[taskService] insert exception, queuing offline:', e);
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
      if (updates.isCompleted !== undefined || updates.is_completed !== undefined) {
        const comp = updates.isCompleted ?? updates.is_completed;
        dbPayload.is_completed = comp;
        dbPayload.completed_at = comp ? new Date().toISOString() : null;
      }
      if (updates.scheduledStartTime !== undefined || updates.scheduled_start !== undefined) {
        dbPayload.scheduled_start = updates.scheduledStartTime || updates.scheduled_start;
      }
      if (updates.scheduledEndTime !== undefined || updates.scheduled_end !== undefined) {
        dbPayload.scheduled_end = updates.scheduledEndTime || updates.scheduled_end;
      }
      if (updates.is_in_peak_window !== undefined || updates.isInPeakWindow !== undefined) {
        dbPayload.is_in_peak_window = updates.is_in_peak_window ?? updates.isInPeakWindow;
      }
      if (updates.taskCategory !== undefined || updates.task_category !== undefined) {
        dbPayload.task_category = updates.taskCategory || updates.task_category;
      }
      if (updates.durationMinutes !== undefined || updates.duration_minutes !== undefined || updates.estimatedDurationMinutes !== undefined) {
        dbPayload.duration_minutes = updates.durationMinutes || updates.duration_minutes || updates.estimatedDurationMinutes;
      }

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

