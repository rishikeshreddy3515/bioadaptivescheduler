import { storage } from '../utils/storage';
import { healthConnectService } from './healthConnect';
import { googleCalendarService } from './googleCalendar';
import { taskService } from '../api/taskService';
import { useAuthStore } from '../store/useAuthStore';
import { useTaskStore } from '../store/useTaskStore';
import { DailyBiometrics } from '../types/energy';

export const CONNECTED_SOURCES_KEY = 'cadence_connected_sources';

export interface ConnectedSourcesConfig {
  health: boolean;
  gcal: boolean;
  todoist: boolean;
  glucose: boolean;
}

export const DEFAULT_CONNECTED_SOURCES: ConnectedSourcesConfig = {
  health: true,
  gcal: true,
  todoist: false,
  glucose: false,
};

export const syncService = {
  /**
   * Read enabled connection toggles from persistent storage
   */
  async getConnectedSources(): Promise<ConnectedSourcesConfig> {
    try {
      const saved = await storage.get<ConnectedSourcesConfig>(CONNECTED_SOURCES_KEY);
      if (saved) return saved;
    } catch (e) {
      console.warn('[SyncService] Failed reading connected sources:', e);
    }
    return DEFAULT_CONNECTED_SOURCES;
  },

  /**
   * Save connection toggles to persistent storage
   */
  async setConnectedSources(config: ConnectedSourcesConfig): Promise<void> {
    try {
      await storage.set(CONNECTED_SOURCES_KEY, config);
    } catch (e) {
      console.warn('[SyncService] Failed saving connected sources:', e);
    }
  },

  /**
   * Execute complete synchronization pipeline based on active connections
   */
  async syncAll(): Promise<{
    biometrics?: DailyBiometrics;
    eventsCount: number;
    syncedTodosCount: number;
  }> {
    const config = await this.getConnectedSources();
    const authState = useAuthStore.getState();
    const userId = authState.user?.id;
    const providerToken = (authState.session as any)?.provider_token;

    let biometrics: DailyBiometrics | undefined;
    let eventsCount = 0;
    let syncedTodosCount = 0;

    // 1. Health Connect Biometrics Sync
    if (config.health) {
      try {
        biometrics = await healthConnectService.syncBiometrics(userId);
      } catch (err) {
        console.warn('[SyncService] Health Connect sync failed:', err);
      }
    }

    // 2. Google Calendar Sync
    if (config.gcal) {
      try {
        const events = await googleCalendarService.syncCalendarEvents(providerToken, userId);
        eventsCount = events.length;
      } catch (err) {
        console.warn('[SyncService] Google Calendar sync failed:', err);
      }
    }

    // 3. Todoist Tasks Sync
    if (config.todoist) {
      try {
        const todoRes = await taskService.syncTodoist();
        syncedTodosCount = todoRes.syncedCount;
        await useTaskStore.getState().fetchTasks();
      } catch (err) {
        console.warn('[SyncService] Todoist sync failed:', err);
      }
    }

    // 4. Glucose Sensor
    if (config.glucose) {
      console.log('[SyncService] Glucose NFC sensor enabled - waiting for scan.');
    }

    return {
      biometrics,
      eventsCount,
      syncedTodosCount,
    };
  },
};

