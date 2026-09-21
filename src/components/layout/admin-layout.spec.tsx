import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminHeader } from './AdminHeader';
import { AdminLayout } from './AdminLayout';
import { AdminLayoutContent } from './AdminLayoutContent';
import { AdminSidebar } from './AdminSidebar';
import { Sidebar } from './Sidebar';
import { TrendingSidebar } from './TrendingSidebar';
import { TopJudgesList } from './TopJudgesList';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  logout: vi.fn(),
  changeLanguage: vi.fn(),
  onCollapseChange: vi.fn(),
  currentUser: { id: 'u1', username: 'admin', email: 'admin@test.local', role: 'ADMIN', avatar: '/avatar.png' } as any,
  isLoading: false,
  location: { pathname: '/admin/motor-ia' },
  theme: 'dark',
  trending: { data: [] as any[], isLoading: false, isFetching: false, refetch: vi.fn() },
  judges: { data: [] as any[], isLoading: false, isFetching: false, refetch: vi.fn() },
  active: { data: { users: [], total: 0 }, isLoading: false },
  follow: vi.fn(() => ({ unwrap: vi.fn().mockResolvedValue({}) })),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'es', changeLanguage: mocks.changeLanguage },
  }),
}));
vi.mock('react-router-dom', () => ({
  Link: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <a {...props}>{children}</a>,
  Outlet: () => <div data-testid="outlet">outlet</div>,
  useNavigate: () => mocks.navigate,
  useLocation: () => mocks.location,
}));
vi.mock('@context/AuthContext', () => ({ useAuth: () => ({ currentUser: mocks.currentUser, isLoading: mocks.isLoading, logout: mocks.logout }) }));
vi.mock('@hooks/useTheme', () => ({ useTheme: () => mocks.theme }));
vi.mock('@utils/helpers', () => ({ cn: (...classes: unknown[]) => classes.filter(Boolean).join(' '), formatNumber: (n: number) => String(n) }));
vi.mock('@shared/components/Tooltip', () => ({ Tooltip: ({ children }: React.PropsWithChildren) => <>{children}</> }));
vi.mock('@shared/components/ConfirmModal', () => ({
  ConfirmModal: ({ isOpen, onConfirm, onCancel }: { isOpen: boolean; onConfirm: () => void; onCancel: () => void }) =>
    isOpen ? <div><button onClick={onConfirm}>confirm unfollow</button><button onClick={onCancel}>cancel unfollow</button></div> : null,
}));
vi.mock('@shared/components/Skeleton', () => ({
  Skeleton: () => <div data-testid="skeleton" />,
  TrendingCaseSkeleton: () => <div data-testid="trending-skeleton" />,
  UserCardSkeleton: () => <div data-testid="user-skeleton" />,
}));
vi.mock('@shared/components/UserCard', () => ({
  UserCard: ({ username, onFollow, onClick }: { username: string; onFollow: (id: string, name: string) => void; onClick?: (name: string) => void }) => (
    <div><button onClick={() => onClick?.(username)}>profile {username}</button><button onClick={() => onFollow('u2', username)}>follow {username}</button></div>
  ),
}));
vi.mock('@shared/components/ReactionIcon', () => ({ ReactionIcon: () => <span data-testid="reaction" /> }));
vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  motion: { div: 'div', aside: 'aside' },
}));
vi.mock('@redux/services/casesApi', () => ({
  useGetTrendingCasesQuery: () => mocks.trending,
  useGetActiveUsersQuery: () => mocks.active,
}));
vi.mock('@redux/services/usersApi', () => ({
  useGetTopJudgesQuery: () => mocks.judges,
  useFollowUserMutation: () => [mocks.follow],
}));
vi.mock('@api/client', () => ({ getCircuitState: () => 'CLOSED' }));
vi.mock('@services/anonymity', () => ({ getAnonymousAvatar: (id: string) => `/anon/${id}`, getDisplayName: (name: string) => name }));
vi.mock('@components/ui/LoadingState', () => ({ LoadingState: () => <div data-testid="loading">loading</div> }));
vi.mock('@components/ui/SEO', () => ({ Seo: () => null }));

describe('componentes de layout admin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.location.pathname = '/admin/motor-ia';
    mocks.currentUser = { id: 'u1', username: 'admin', email: 'admin@test.local', role: 'ADMIN', avatar: '/avatar.png' };
    mocks.isLoading = false;
    mocks.theme = 'dark';
    mocks.trending.data = [];
    mocks.judges.data = [];
    mocks.active.data = { users: [], total: 0 };
    mocks.trending.isLoading = mocks.judges.isLoading = mocks.active.isLoading = false;
  });

  it('AdminHeader alterna tema, idioma, menú de usuario y menú móvil', () => {
    const toggleMobile = vi.fn();
    render(<AdminHeader titleKey="automation.title" showMobileMenuButton onMobileMenuToggle={toggleMobile} />);
    expect(screen.getByText('automation.title')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'admin.sidebar.open' }));
    expect(toggleMobile).toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole('button')[1]);
    expect(document.documentElement.dataset.theme).toBe('light');
    fireEvent.click(screen.getAllByRole('button')[2]);
    fireEvent.click(screen.getByText('English'));
    expect(mocks.changeLanguage).toHaveBeenCalledWith('en');
    fireEvent.click(screen.getAllByRole('button').find((button) => button.querySelector('img'))!);
    expect(screen.getByText('@admin')).toBeInTheDocument();
    fireEvent.click(screen.getByText('admin.userMenu.profile'));
    expect(mocks.navigate).toHaveBeenCalledWith('/users/admin');
  });

  it('AdminSidebar navega, marca activo y permite contraer', () => {
    render(<AdminSidebar collapsed={false} onCollapseChange={mocks.onCollapseChange} />);
    expect(screen.getByText('admin.sidebar.title')).toBeInTheDocument();
    fireEvent.click(screen.getByText('admin.users'));
    expect(mocks.navigate).toHaveBeenCalledWith('/admin/users');
    fireEvent.click(screen.getByRole('button', { name: 'admin.sidebar.collapse' }));
    expect(mocks.onCollapseChange).toHaveBeenCalledWith(true);
  });

  it('AdminLayoutContent renderiza outlet, navegación desktop y drawer móvil', () => {
    render(<AdminLayoutContent collapsed={false} onCollapseChange={mocks.onCollapseChange} location={mocks.location as never} />);
    expect(screen.getAllByTestId('outlet')).toHaveLength(2);
    fireEvent.click(screen.getByText('admin.sidebar.backToFeed'));
    expect(mocks.navigate).toHaveBeenCalledWith('/');
    fireEvent.click(document.querySelector('a[aria-label="admin.sidebar.title"]')!);
  });

  it('AdminLayout muestra carga, redirige no-admin y renderiza admin', async () => {
    mocks.isLoading = true;
    const { rerender } = render(<AdminLayout />);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
    mocks.isLoading = false;
    mocks.currentUser = null as any;
    rerender(<AdminLayout />);
    expect(mocks.navigate).toHaveBeenCalledWith('/', expect.objectContaining({ replace: true }));
    mocks.currentUser = { id: 'u1', username: 'admin', email: 'admin@test.local', role: 'ADMIN', avatar: '/avatar.png' } as any;
    rerender(<AdminLayout />);
    await waitFor(() => expect(screen.getAllByTestId('outlet').length).toBeGreaterThan(0));
  });

  it('Sidebar ejecuta callbacks, cambia ruta y muestra navegación admin', () => {
    const callbacks = { tab: vi.fn(), profile: vi.fn(), create: vi.fn(), settings: vi.fn() };
    render(<Sidebar activeTab="for_you" onTabChange={callbacks.tab} onProfileClick={callbacks.profile} onCreateClick={callbacks.create} onSettingsClick={callbacks.settings} />);
    fireEvent.click(screen.getByText('profile.following'));
    expect(callbacks.tab).toHaveBeenCalledWith('following');
    expect(mocks.navigate).toHaveBeenCalledWith('/cases/following');
    fireEvent.click(screen.getByText('layout.newCase'));
    fireEvent.click(screen.getByText('automation.title'));
    fireEvent.click(screen.getByText('layout.settings'));
    expect(callbacks.create).toHaveBeenCalled();
    expect(callbacks.settings).toHaveBeenCalled();
    expect(mocks.navigate).toHaveBeenCalledWith('/admin/motor-ia');
  });

  it('TrendingSidebar cubre carga, datos y handlers', () => {
    mocks.trending.isLoading = true;
    const { rerender } = render(<TrendingSidebar onSelectCase={mocks.navigate} />);
    expect(screen.getAllByTestId('trending-skeleton')).toHaveLength(2);
    mocks.trending.isLoading = false;
    mocks.trending.data = [{ id: 'c1', title: 'Caso', category: 'Legal', total_comments: 2 }] as any[];
    mocks.judges.data = [{ id: 'u2', username: 'judge', followers_count: 3, is_following: false }] as any[];
    rerender(<TrendingSidebar onSelectCase={mocks.navigate} onSelectProfile={mocks.navigate} onOpenTerms={mocks.navigate} />);
    fireEvent.click(screen.getByText('Caso'));
    fireEvent.click(screen.getByText('profile judge'));
    fireEvent.click(screen.getByText('follow judge'));
    fireEvent.click(screen.getByText('layout.terms'));
    expect(mocks.navigate).toHaveBeenCalled();
    expect(mocks.follow).toHaveBeenCalledWith({ username: 'judge' });
  });

  it('TopJudgesList cubre loading, vacío, perfil, follow y auth', () => {
    const onFollow = vi.fn();
    const onViewProfile = vi.fn();
    const { rerender } = render(<TopJudgesList judges={[]} isLoading onFollow={onFollow} onViewProfile={onViewProfile} />);
    expect(screen.getAllByTestId('user-skeleton')).toHaveLength(3);
    rerender(<TopJudgesList judges={[]} isLoading={false} onFollow={onFollow} onViewProfile={onViewProfile} />);
    expect(screen.getByText('profile.noUsersFound')).toBeInTheDocument();
    rerender(<TopJudgesList judges={[{ id: 'u2', username: 'judge', followers_count: 4, is_following: false, is_anonymous: false, avatar_url: null }]} isLoading={false} onFollow={onFollow} onViewProfile={onViewProfile} isLoggedIn />);
    fireEvent.click(screen.getByText('judge'));
    fireEvent.click(screen.getByText('profile.follow'));
    expect(onViewProfile).toHaveBeenCalledWith('judge');
    expect(onFollow).toHaveBeenCalledWith('u2', 'judge');
  });
});
