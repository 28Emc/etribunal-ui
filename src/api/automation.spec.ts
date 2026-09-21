import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchAutomationEngagement,
  fetchAutomationQueue,
  fetchAutomationRun,
  fetchAutomationRuns,
  fetchAutomationSettings,
  triggerAutomationRun,
  updateAutomationSettings,
} from './automation';

const { get, put, post } = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  post: vi.fn(),
}));
vi.mock('@api/client', () => ({ apiClient: { get, put, post } }));

describe('automation API client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({});
    put.mockResolvedValue({});
    post.mockResolvedValue({});
  });

  it('expone las consultas de configuración, runs, cola y engagement', async () => {
    await fetchAutomationSettings();
    await fetchAutomationRuns();
    await fetchAutomationRuns(5);
    await fetchAutomationRun('run-1');
    await fetchAutomationQueue();
    await fetchAutomationEngagement();
    expect(get).toHaveBeenCalledWith('/automation/settings');
    expect(get).toHaveBeenCalledWith('/automation/runs?limit=20');
    expect(get).toHaveBeenCalledWith('/automation/runs?limit=5');
    expect(get).toHaveBeenCalledWith('/automation/runs/run-1');
    expect(get).toHaveBeenCalledWith('/automation/queue');
    expect(get).toHaveBeenCalledWith('/automation/engagement');
  });

  it('actualiza configuración y dispara runs con ambos modos dry-run', async () => {
    await updateAutomationSettings({ enabled: true });
    await triggerAutomationRun();
    await triggerAutomationRun(true);
    expect(put).toHaveBeenCalledWith('/automation/settings', { enabled: true });
    expect(post).toHaveBeenCalledWith('/automation/run?dryRun=false');
    expect(post).toHaveBeenCalledWith('/automation/run?dryRun=true');
  });
});
