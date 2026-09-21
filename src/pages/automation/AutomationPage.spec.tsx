import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AutomationPage } from './AutomationPage';

const mocks = vi.hoisted(() => ({
  addToast: vi.fn(),
  saveSettings: vi.fn().mockResolvedValue(true),
  triggerRun: vi.fn().mockResolvedValue({ id: 'run-1' }),
  refreshAll: vi.fn(),
  clearError: vi.fn(),
  loadRun: vi.fn(),
  clearRunDetail: vi.fn(),
  state: {
    canManage: true,
    settings: { enabled: true, dryRun: false, runHour: 9 },
    runs: [{ id: 'r1', status: 'COMPLETED', dryRun: false, casesCreated: 2 }],
    queue: { scheduled: 2, processing: 1 },
    engagement: { averageScore: 82, evaluatedCases: 4, topCases: [] },
    isLoadingSettings: false, isLoadingRuns: false, isLoadingQueue: false, isLoadingEngagement: false,
    isSavingSettings: false, isTriggeringRun: false, error: null, runDetail: null,
  } as any,
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@hooks/useAutomation', () => ({ useAutomation: () => ({ ...mocks.state, saveSettings: mocks.saveSettings, triggerRun: mocks.triggerRun, refreshAll: mocks.refreshAll, clearError: mocks.clearError, loadRun: mocks.loadRun, clearRunDetail: mocks.clearRunDetail }) }));
vi.mock('@components/ui/Toast', () => ({ useToast: () => ({ addToast: mocks.addToast }) }));
vi.mock('@components/ui/SectionTitle', () => ({ SectionTitle: ({ children }: React.PropsWithChildren) => <h2>{children}</h2> }));
vi.mock('@layout/PageLayout', () => ({ PageLayout: ({ children, rightButton }: React.PropsWithChildren<{ rightButton?: { onClick: () => void } }>) => <div><button onClick={rightButton?.onClick}>refresh page</button>{children}</div> }));
vi.mock('@components/ui/SEO', () => ({ Seo: () => null }));
vi.mock('@components/ui/LoadingState', () => ({ LoadingState: () => <div>loading automation</div>, EmptyState: () => <div>empty automation</div> }));
vi.mock('@shared/components/Tooltip', () => ({ Tooltip: ({ children }: React.PropsWithChildren) => <>{children}</> }));
vi.mock('@shared/components/ConfirmModal', () => ({
  ConfirmModal: ({ isOpen, onConfirm, onCancel }: { isOpen: boolean; onConfirm: () => void; onCancel: () => void }) =>
    isOpen ? <div role="dialog"><button onClick={onConfirm}>confirm run</button><button onClick={onCancel}>cancel run</button></div> : null,
}));
vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  motion: { section: 'section', div: 'div' },
}));
vi.mock('@utils/helpers', () => ({ cn: (...classes: unknown[]) => classes.filter(Boolean).join(' ') }));

describe('AutomationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(mocks.state, {
      canManage: true, settings: { enabled: true, dryRun: false, runHour: 9 },
      runs: [{ id: 'r1', status: 'COMPLETED', dryRun: false, casesCreated: 2 }],
      queue: { scheduled: 2, processing: 1 }, engagement: { averageScore: 82, evaluatedCases: 4, topCases: [] },
      isLoadingSettings: false, isLoadingRuns: false, isLoadingQueue: false, isLoadingEngagement: false,
      isSavingSettings: false, isTriggeringRun: false, error: null, runDetail: null,
    });
  });

  it('muestra acceso denegado para usuarios sin permisos', () => {
    mocks.state.canManage = false;
    render(<AutomationPage />);
    expect(screen.getByText('automation.accessDenied')).toBeInTheDocument();
  });

  it('renderiza KPIs, refresca, configura y guarda cambios', async () => {
    render(<AutomationPage />);
    expect(screen.getByText('automation.kpis')).toBeInTheDocument();
    expect(screen.getByText('automation.kpi.casesCreated')).toBeInTheDocument();
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText('refresh page'));
    expect(mocks.refreshAll).toHaveBeenCalled();
    fireEvent.click(screen.getByText('automation.configure'));
    expect(screen.getByText('automation.config')).toBeInTheDocument();
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[0]);
    fireEvent.click(screen.getByText('automation.save'));
    await waitFor(() => expect(mocks.saveSettings).toHaveBeenCalledWith(expect.objectContaining({ enabled: false })));
    expect(mocks.addToast).toHaveBeenCalledWith('success', 'automation.toasts.saved');
  });

  it('confirma una ejecución real y dispara el refresco', async () => {
    render(<AutomationPage />);
    fireEvent.click(screen.getByText('automation.runNow'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByText('confirm run'));
    await waitFor(() => expect(mocks.triggerRun).toHaveBeenCalledWith(false));
  });

  it('muestra loading y notifica errores del hook', async () => {
    mocks.state.isLoadingSettings = true;
    mocks.state.runs = [];
    mocks.state.settings = null;
    mocks.state.error = 'automation.errors.settingsLoad';
    render(<AutomationPage />);
    expect(screen.getByText('loading automation')).toBeInTheDocument();
    await waitFor(() => expect(mocks.addToast).toHaveBeenCalledWith('error', 'automation.errors.settingsLoad'));
    expect(mocks.clearError).toHaveBeenCalled();
  });
});
