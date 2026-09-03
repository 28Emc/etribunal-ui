import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutomation } from './useAutomation';

vi.mock('@context/AuthContext', () => ({
  useAuth: vi.fn(() => ({ currentUser: { role: 'ADMIN' } })),
}));

const mockFetchSettings = vi.fn();
const mockUpdateSettings = vi.fn();
const mockFetchRuns = vi.fn();
const mockFetchRun = vi.fn();
const mockTriggerRun = vi.fn();
const mockFetchQueue = vi.fn();
const mockFetchEngagement = vi.fn();

vi.mock('@api/automation', async () => {
  const actual = await vi.importActual<typeof import('@api/automation')>('@api/automation');
  return {
    ...actual,
    fetchAutomationSettings: (...args: any[]) => mockFetchSettings(...args),
    updateAutomationSettings: (...args: any[]) => mockUpdateSettings(...args),
    fetchAutomationRuns: (...args: any[]) => mockFetchRuns(...args),
    fetchAutomationRun: (...args: any[]) => mockFetchRun(...args),
    triggerAutomationRun: (...args: any[]) => mockTriggerRun(...args),
    fetchAutomationQueue: (...args: any[]) => mockFetchQueue(...args),
    fetchAutomationEngagement: (...args: any[]) => mockFetchEngagement(...args),
  };
});

const { useAuth } = await import('@context/AuthContext');

function settingsFixture(overrides: Record<string, unknown> = {}) {
  return {
    enabled: true,
    dryRun: false,
    runHour: 9,
    language: 'es',
    dailyCasesMin: 1,
    dailyCasesMax: 5,
    usersPerCaseMin: 5,
    usersPerCaseMax: 10,
    maxInteractionsPerUserPerCaseMin: 1,
    maxInteractionsPerUserPerCaseMax: 3,
    intensityMin: 30,
    intensityMax: 70,
    schedulingIntervalMin: 30,
    schedulingIntervalMax: 180,
    schedulingWindowHours: 24,
    dailyPoolSize: 0,
    activityWeighted: true,
    engagementEnabled: true,
    engagementWeights: {
      votes: 1,
      comments: 1,
      reactions: 1,
      shares: 1,
      saves: 1,
      views: 1,
    },
    engagementTopExamples: 5,
    engagementEvaluationDays: 3,
    rssFeedUrls: ['https://example.com/feed'],
    ...overrides,
  };
}

function runFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'run-1',
    status: 'COMPLETED',
    dryRun: false,
    casesRequested: 3,
    casesCreated: 3,
    casesFailed: 0,
    startedAt: '2026-01-01T09:00:00Z',
    finishedAt: '2026-01-01T10:00:00Z',
    errorMessage: null,
    ...overrides,
  };
}

describe('useAutomation', () => {
  beforeEach(() => {
    (useAuth as any).mockReturnValue({ currentUser: { role: 'ADMIN' } });
    mockFetchSettings.mockReset();
    mockUpdateSettings.mockReset();
    mockFetchRuns.mockReset();
    mockFetchRun.mockReset();
    mockTriggerRun.mockReset();
    mockFetchQueue.mockReset();
    mockFetchEngagement.mockReset();

    mockFetchSettings.mockResolvedValue(settingsFixture());
    mockFetchRuns.mockResolvedValue([runFixture()]);
    mockFetchQueue.mockResolvedValue({ scheduled: 2, processing: 1, completedToday: 5, failedToday: 0 });
    mockFetchEngagement.mockResolvedValue({
      evaluatedCases: 10,
      averageScore: 72,
      topCases: [{ caseId: 'c1', title: 'Caso', engagementScore: 80, votes: 2, comments: 1, reactions: 3, shares: 0, saves: 1, views: 10, evaluationDate: '2026-01-01' }],
    });
  });

  it('canManage es true para rol ADMIN', () => {
    const { result } = renderHook(() => useAutomation());
    expect(result.current.canManage).toBe(true);
  });

  it('canManage es false para rol USER', () => {
    (useAuth as any).mockReturnValue({ currentUser: { role: 'USER' } });
    const { result } = renderHook(() => useAutomation());
    expect(result.current.canManage).toBe(false);
  });

  it('carrega settings, runs, queue y engagement al montar (admin)', async () => {
    const { result } = renderHook(() => useAutomation());
    expect(result.current.canManage).toBe(true);
    expect(mockFetchSettings).toHaveBeenCalled();
    expect(mockFetchRuns).toHaveBeenCalled();
    expect(mockFetchQueue).toHaveBeenCalled();
    expect(mockFetchEngagement).toHaveBeenCalled();
  });

  it('no llama a la API al montar si no es admin', () => {
    (useAuth as any).mockReturnValue({ currentUser: { role: 'USER' } });
    renderHook(() => useAutomation());
    expect(mockFetchSettings).not.toHaveBeenCalled();
  });

  it('loadSettings debería setear settings', async () => {
    const { result } = renderHook(() => useAutomation());
    mockFetchSettings.mockResolvedValue(settingsFixture({ runHour: 11 }));

    await act(async () => {
      await result.current.loadSettings();
    });

    expect(result.current.settings?.runHour).toBe(11);
  });

  it('saveSettings aplica cambios y devuelve true', async () => {
    const { result } = renderHook(() => useAutomation());
    mockUpdateSettings.mockResolvedValue(settingsFixture({ enabled: false }));

    await act(async () => {
      const ok = await result.current.saveSettings({ enabled: false });
      expect(ok).toBe(true);
    });

    expect(mockUpdateSettings).toHaveBeenCalledWith({ enabled: false });
    expect(result.current.settings?.enabled).toBe(false);
  });

  it('saveSettings devuelve false si no es admin', async () => {
    (useAuth as any).mockReturnValue({ currentUser: { role: 'USER' } });
    const { result } = renderHook(() => useAutomation());

    await act(async () => {
      const ok = await result.current.saveSettings({ enabled: false });
      expect(ok).toBe(false);
    });

    expect(mockUpdateSettings).not.toHaveBeenCalled();
  });

  it('saveSettings maneja error de API', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useAutomation());
    mockUpdateSettings.mockRejectedValue(new Error('Network error'));

    await act(async () => {
      const ok = await result.current.saveSettings({ enabled: false });
      expect(ok).toBe(false);
    });

    expect(result.current.error).toBe('automation.errors.settingsSave');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('triggerRun dispara y recarga runs/queue', async () => {
    const { result } = renderHook(() => useAutomation());
    mockTriggerRun.mockResolvedValue({ runId: 'run-2', started: true, status: 'RUNNING' });
    mockFetchRuns.mockClear();

    await act(async () => {
      const res = await result.current.triggerRun(false);
      expect(res?.runId).toBe('run-2');
    });

    expect(mockTriggerRun).toHaveBeenCalledWith(false);
    expect(mockFetchRuns).toHaveBeenCalled();
    expect(mockFetchQueue).toHaveBeenCalled();
  });

  it('triggerRun no llama API si no es admin', async () => {
    (useAuth as any).mockReturnValue({ currentUser: { role: 'USER' } });
    const { result } = renderHook(() => useAutomation());

    await act(async () => {
      const res = await result.current.triggerRun(false);
      expect(res).toBeNull();
    });

    expect(mockTriggerRun).not.toHaveBeenCalled();
  });

  it('loadRun carga el detalle del run', async () => {
    const { result } = renderHook(() => useAutomation());
    mockFetchRun.mockResolvedValue(runFixture({ id: 'run-9', status: 'FAILED' }));

    await act(async () => {
      await result.current.loadRun('run-9');
    });

    expect(mockFetchRun).toHaveBeenCalledWith('run-9');
    expect(result.current.runDetail?.status).toBe('FAILED');
  });

  it('loadRun no llama API si no es admin', async () => {
    (useAuth as any).mockReturnValue({ currentUser: { role: 'USER' } });
    const { result } = renderHook(() => useAutomation());

    await act(async () => {
      await result.current.loadRun('run-9');
    });

    expect(mockFetchRun).not.toHaveBeenCalled();
  });

  it('clearError limpia el error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useAutomation());
    mockFetchEngagement.mockRejectedValue(new Error('x'));

    await act(async () => {
      await result.current.loadEngagement();
    });
    expect(result.current.error).toBe('automation.errors.engagementLoad');

    await act(async () => {
      result.current.clearError();
    });
    expect(result.current.error).toBeNull();
    consoleSpy.mockRestore();
  });
});
