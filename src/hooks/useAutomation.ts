import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@context/AuthContext';
import type { User } from '@typings/index';
import {
  fetchAutomationSettings,
  updateAutomationSettings,
  fetchAutomationRuns,
  fetchAutomationRun,
  triggerAutomationRun,
  fetchAutomationQueue,
  fetchAutomationEngagement,
  type AutomationSettings,
  type AutomationRun,
  type AutomationRunTrigger,
  type AutomationQueueStatus,
  type AutomationEngagement,
} from '@api/automation';

export const AUTOMATION_ADMIN_ROLES: User['role'][] = ['ADMIN', 'SYSADMIN'];

function isAdminRole(role: User['role'] | undefined): boolean {
  return !!role && AUTOMATION_ADMIN_ROLES.includes(role);
}

interface UseAutomationState {
  canManage: boolean;
  settings: AutomationSettings | null;
  runs: AutomationRun[];
  queue: AutomationQueueStatus | null;
  engagement: AutomationEngagement | null;
  runDetail: AutomationRun | null;
  isLoadingSettings: boolean;
  isLoadingRuns: boolean;
  isLoadingQueue: boolean;
  isLoadingEngagement: boolean;
  isSavingSettings: boolean;
  isTriggeringRun: boolean;
  error: string | null;
  loadSettings: () => Promise<void>;
  loadRuns: () => Promise<void>;
  loadQueue: () => Promise<void>;
  loadEngagement: () => Promise<void>;
  loadRun: (id: string) => Promise<void>;
  saveSettings: (changes: Record<string, unknown>) => Promise<boolean>;
  triggerRun: (dryRun?: boolean) => Promise<AutomationRunTrigger | null>;
  refreshAll: () => Promise<void>;
  clearError: () => void;
}

export function useAutomation(): UseAutomationState {
  const { currentUser } = useAuth();
  const canManage = isAdminRole(currentUser?.role);

  const [settings, setSettings] = useState<AutomationSettings | null>(null);
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [queue, setQueue] = useState<AutomationQueueStatus | null>(null);
  const [engagement, setEngagement] = useState<AutomationEngagement | null>(null);
  const [runDetail, setRunDetail] = useState<AutomationRun | null>(null);

  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isLoadingRuns, setIsLoadingRuns] = useState(false);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [isLoadingEngagement, setIsLoadingEngagement] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isTriggeringRun, setIsTriggeringRun] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    if (!canManage) return;
    setIsLoadingSettings(true);
    setError(null);
    try {
      const data = await fetchAutomationSettings();
      setSettings(data);
    } catch (err) {
      setError('automation.errors.settingsLoad');
      console.error('Error loading automation settings:', err);
    } finally {
      setIsLoadingSettings(false);
    }
  }, [canManage]);

  const loadRuns = useCallback(async () => {
    if (!canManage) return;
    setIsLoadingRuns(true);
    setError(null);
    try {
      const data = await fetchAutomationRuns(50);
      setRuns(data);
    } catch (err) {
      setError('automation.errors.runsLoad');
      console.error('Error loading automation runs:', err);
    } finally {
      setIsLoadingRuns(false);
    }
  }, [canManage]);

  const loadQueue = useCallback(async () => {
    if (!canManage) return;
    setIsLoadingQueue(true);
    setError(null);
    try {
      const data = await fetchAutomationQueue();
      setQueue(data);
    } catch (err) {
      setError('automation.errors.queueLoad');
      console.error('Error loading automation queue:', err);
    } finally {
      setIsLoadingQueue(false);
    }
  }, [canManage]);

  const loadEngagement = useCallback(async () => {
    if (!canManage) return;
    setIsLoadingEngagement(true);
    setError(null);
    try {
      const data = await fetchAutomationEngagement();
      setEngagement(data);
    } catch (err) {
      setError('automation.errors.engagementLoad');
      console.error('Error loading automation engagement:', err);
    } finally {
      setIsLoadingEngagement(false);
    }
  }, [canManage]);

  const loadRun = useCallback(
    async (id: string) => {
      if (!canManage) return;
      setError(null);
      try {
        const data = await fetchAutomationRun(id);
        setRunDetail(data);
      } catch (err) {
        setError('automation.errors.runDetailLoad');
        console.error('Error loading automation run:', err);
      }
    },
    [canManage]
  );

  const saveSettings = useCallback(
    async (changes: Record<string, unknown>) => {
      if (!canManage) return false;
      setIsSavingSettings(true);
      setError(null);
      try {
        const data = await updateAutomationSettings(changes);
        setSettings(data);
        return true;
      } catch (err) {
        setError('automation.errors.settingsSave');
        console.error('Error saving automation settings:', err);
        return false;
      } finally {
        setIsSavingSettings(false);
      }
    },
    [canManage]
  );

  const triggerRun = useCallback(
    async (dryRun = false) => {
      if (!canManage) return null;
      setIsTriggeringRun(true);
      setError(null);
      try {
        const result = await triggerAutomationRun(dryRun);
        await Promise.all([loadRuns(), loadQueue()]);
        return result;
      } catch (err) {
        setError('automation.errors.runTrigger');
        console.error('Error triggering automation run:', err);
        return null;
      } finally {
        setIsTriggeringRun(false);
      }
    },
    [canManage, loadRuns, loadQueue]
  );

  const refreshAll = useCallback(async () => {
    await Promise.all([
      loadSettings(),
      loadRuns(),
      loadQueue(),
      loadEngagement(),
    ]);
  }, [loadSettings, loadRuns, loadQueue, loadEngagement]);

  useEffect(() => {
    if (canManage) {
      refreshAll();
    }
  }, [canManage, refreshAll]);

  const clearError = useCallback(() => setError(null), []);

  return {
    canManage,
    settings,
    runs,
    queue,
    engagement,
    runDetail,
    isLoadingSettings,
    isLoadingRuns,
    isLoadingQueue,
    isLoadingEngagement,
    isSavingSettings,
    isTriggeringRun,
    error,
    loadSettings,
    loadRuns,
    loadQueue,
    loadEngagement,
    loadRun,
    saveSettings,
    triggerRun,
    refreshAll,
    clearError,
  };
}
