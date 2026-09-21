import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MainLayout } from './MainLayout';

const { navigate, changeLanguage, fetchUnreadCount, fetchNotifications, clearResults, setQuery, auth, searchState } = vi.hoisted(() => ({
  navigate: vi.fn(), changeLanguage: vi.fn(), fetchUnreadCount: vi.fn(), fetchNotifications: vi.fn(),
  clearResults: vi.fn(), setQuery: vi.fn(),
  auth: { currentUser: null as any },
  searchState: { query: '', results: { users: [] as any[], cases: [] as any[] }, isSearching: false },
}));

vi.mock('react-router-dom', () => ({
  Link: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <a {...props}>{children}</a>,
  useNavigate: () => navigate,
  useLocation: () => ({ pathname: '/' }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'es', changeLanguage },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

vi.mock('@context/AuthContext', () => ({
  useAuth: () => auth,
}));

vi.mock('@features/cases/hooks/useNotifications', () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    fetchUnreadCount,
    fetchNotifications,
    isLoading: false,
  }),
}));

vi.mock('@shared/hooks/useSearch', () => ({
  useSearch: () => ({
    query: searchState.query,
    setQuery,
    clearResults,
    isSearching: false,
    results: searchState.results,
  }),
}));

vi.mock('./Sidebar', () => ({ Sidebar: () => <div data-testid="sidebar">sidebar</div> }));
vi.mock('./TrendingSidebar', () => ({ TrendingSidebar: () => <div data-testid="trending">trending</div> }));
vi.mock('@shared/components/Tooltip', () => ({
  Tooltip: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));
vi.mock('@shared/components/Skeleton', () => ({ Skeleton: () => <div data-testid="skeleton" /> }));
vi.mock('@features/users/components/NotificationsMenu', () => ({
  NotificationsMenu: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div>notifications</div> : null),
}));
vi.mock('@features/auth/components/Login', () => ({ Login: () => <div>login modal</div> }));
vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  motion: { button: 'button', div: 'div' },
}));

describe('MainLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.currentUser = null;
    searchState.query = '';
    searchState.results = { users: [], cases: [] };
    localStorage.clear();
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      value: vi.fn().mockResolvedValue({ json: () => Promise.resolve({ data: { users: [], total: 0 } }) }),
    });
  });

  it('renderiza navegación de invitado y el contenido principal', async () => {
    render(<MainLayout><div>contenido</div></MainLayout>);

    expect(screen.getByText('contenido')).toBeInTheDocument();
    expect(screen.getByText('nav.signIn')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('trending')).toBeInTheDocument();
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
  });

  it('permite alternar tema, idioma, búsqueda y acceso de invitado', () => {
    render(<MainLayout><div>contenido</div></MainLayout>);

    fireEvent.click(screen.getAllByRole('button')[2]);
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('etribunal_theme')).toBe('light');

    fireEvent.click(screen.getAllByRole('button')[3]);
    fireEvent.click(screen.getByText('English'));
    expect(changeLanguage).toHaveBeenCalledWith('en');

    fireEvent.click(screen.getByText('nav.signIn'));
    expect(navigate).toHaveBeenCalledWith('/login');

    const search = screen.getByPlaceholderText('nav.searchPlaceholder');
    fireEvent.change(search, { target: { value: 'caso' } });
    expect(setQuery).toHaveBeenCalledWith('caso');
    fireEvent.keyDown(search, { key: 'Escape' });
    expect(setQuery).toHaveBeenCalledWith('caso');
  });

  it('abre y cierra la búsqueda móvil y el menú lateral', async () => {
    render(<MainLayout><div>contenido</div></MainLayout>);

    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(screen.getAllByText('nav.feed').length).toBeGreaterThan(0);
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Cerrar menú' }));
    await waitFor(() => expect(screen.queryByText('sidebar.votingNow')).not.toBeInTheDocument());

    fireEvent.click(screen.getAllByRole('button')[1]);
    expect(screen.getAllByPlaceholderText('nav.searchPlaceholder')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar búsqueda' }));
    expect(screen.getAllByPlaceholderText('nav.searchPlaceholder')).toHaveLength(2);
  });

  it('renderiza el estado autenticado, notificaciones y resultados de búsqueda', async () => {
    auth.currentUser = { id: 'u1', username: 'judge', name: 'judge', avatar: '/avatar.png' };
    searchState.query = 'ca';
    searchState.results = {
      users: [{ id: 'u2', username: 'other', avatar_url: null, is_anonymous: false }],
      cases: [{ id: 'c1', title: 'Caso encontrado', side_a_user: { username: 'judge' } }],
    };
    vi.mocked(fetchNotifications).mockResolvedValue(undefined);
    render(<MainLayout><div>contenido</div></MainLayout>);

    expect(fetchUnreadCount).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Profile/i }));
    expect(navigate).toHaveBeenCalledWith('/users/judge');

    const notificationButton = screen.getAllByRole('button').find((button) => button.querySelector('svg.lucide-bell'));
    if (notificationButton) fireEvent.click(notificationButton);
    await waitFor(() => expect(fetchNotifications).toHaveBeenCalled());

    const search = screen.getByPlaceholderText('nav.searchPlaceholder');
    fireEvent.change(search, { target: { value: 'ca' } });
    fireEvent.focus(search);
    expect(await screen.findByText('@other')).toBeInTheDocument();
    fireEvent.click(screen.getByText('@other'));
    expect(navigate).toHaveBeenCalledWith('/users/other');
  });

  it('selecciona casos desde el dropdown de búsqueda y permite navegar a opciones laterales', () => {
    searchState.query = 'ca';
    searchState.results = {
      users: [],
      cases: [{ id: 'c1', title: 'Caso encontrado', side_a_user: { username: 'judge' } }],
    };
    render(<MainLayout><div>contenido</div></MainLayout>);
    fireEvent.focus(screen.getByPlaceholderText('nav.searchPlaceholder'));
    fireEvent.click(screen.getByText('Caso encontrado'));
    expect(navigate).toHaveBeenCalledWith('/cases/judge/caso-encontrado');
  });

  it('navega con Enter en resultados móviles', () => {
    searchState.query = 'ca';
    render(<MainLayout><div>contenido</div></MainLayout>);
    const search = screen.getByPlaceholderText('nav.searchPlaceholder');
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(navigate).toHaveBeenCalledWith('/search?q=ca');
  });

  it('limpia búsquedas vacías, navega con Enter y cierra el dropdown fuera del campo', () => {
    searchState.query = 'abc';
    render(<MainLayout><div>contenido</div></MainLayout>);
    const search = screen.getByPlaceholderText('nav.searchPlaceholder');
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(navigate).toHaveBeenCalledWith('/search?q=abc');
    fireEvent.change(search, { target: { value: '' } });
    expect(clearResults).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/');
    fireEvent.click(document.body);
  });
});
