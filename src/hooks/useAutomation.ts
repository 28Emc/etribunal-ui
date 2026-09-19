import { useState, useCallback, useEffect, useRef } from 'react';
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
import { Client, type IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

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
  clearRunDetail: () => void;
}

export function useAutomation(): UseAutomationState {
  const { currentUser, token } = useAuth();
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

  const stompClientRef = useRef<Client | null>(null);
  const wsConnectedRef = useRef(false);

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

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!canManage || !token) return;

    const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:8083/ws/automation';
    
    const handleRunTopicMessage = (message: IMessage) => {
      try {
        const data = JSON.parse(message.body);
        if (data.type === 'RUN_UPDATE' || data.type === 'RUN_STARTED' || data.type === 'RUN_CREATED') {
          const runId: string | undefined = data.id || data.runId;
          if (!runId) return;
          const { type, ...runFields } = data;
          setRuns(prev => {
            const idx = prev.findIndex(r => r.id === runId);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = { ...updated[idx], ...runFields };
              return updated;
            }
            return [{ ...runFields, id: runId }, ...prev];
          });
        }
      } catch (e) {
        console.error('[Automation WS] Error parsing run update:', e);
      }
    };

    const client = new Client({
      webSocketFactory: () => new SockJS(wsUrl),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        wsConnectedRef.current = true;
        console.log('[Automation WS] Connected');
        
        // Subscribe to real-time topics
        client.subscribe('/topic/automation/run', handleRunTopicMessage);

        client.subscribe('/topic/automation/queue', (message: IMessage) => {
          try {
            const data = JSON.parse(message.body);
            if (data.type === 'QUEUE_UPDATE') {
              const { type: _type, ...queueFields } = data;
              setQueue(queueFields as AutomationQueueStatus);
            }
          } catch (e) {
            console.error('[Automation WS] Error parsing queue update:', e);
          }
        });

        client.subscribe('/topic/automation/settings', (message: IMessage) => {
          try {
            const data = JSON.parse(message.body);
            if (data.type === 'SETTINGS_UPDATE') {
              const { type: _type, ...settingsFields } = data;
              setSettings(settingsFields as AutomationSettings);
            }
          } catch (e) {
            console.error('[Automation WS] Error parsing settings update:', e);
          }
        });

        client.subscribe('/topic/automation/engagement', (message: IMessage) => {
          try {
            const data = JSON.parse(message.body);
            if (data.type === 'ENGAGEMENT_UPDATE') {
              const { type: _type, ...engagementFields } = data;
              setEngagement(engagementFields as AutomationEngagement);
            }
          } catch (e) {
            console.error('[Automation WS] Error parsing engagement update:', e);
          }
        });

        // Request initial state
        client.publish({ destination: '/app/automation/subscribe', body: JSON.stringify({}) });
      },
      onDisconnect: () => {
        wsConnectedRef.current = false;
        console.log('[Automation WS] Disconnected');
      },
      onStompError: (frame) => {
        console.error('[Automation WS] STOMP error:', frame.headers['message'], frame.body);
      }
    });

    client.activate();
    stompClientRef.current = client;

    return () => {
      if (client.active) {
        client.deactivate();
      }
    };
  }, [canManage, token]);

  const clearError = useCallback(() => setError(null), []);

  const clearRunDetail = useCallback(() => setRunDetail(null), []);

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
    clearRunDetail,
  };
}
