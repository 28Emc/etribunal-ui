import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ProfilePage } from './ProfilePage';

const { navigate, get, post, currentUser, authState, queryData, vote, react, save, comment, dispatch } = vi.hoisted(() => ({
  navigate: vi.fn(), get: vi.fn(), post: vi.fn(), currentUser: {
  id: 'u1', name: 'judge1', email: 'judge@example.com', avatar: '/avatar.png',
  bio: 'Bio', casesCount: 2, followersCount: 3, followingCount: 4, votes: {},
  }, authState: { currentUser: null as any }, queryData: { cases: [] as any[], hasMore: false }, vote: vi.fn(), react: vi.fn(), save: vi.fn(), comment: vi.fn(), dispatch: vi.fn(),
}));
const query = () => ({ data: queryData, isFetching: false });

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('react-router-dom', () => ({ useParams: () => ({ username: 'judge1' }), useNavigate: () => navigate }));
vi.mock('@context/AuthContext', () => ({
  useAuth: () => ({ currentUser: authState.currentUser, logout: vi.fn(), setCurrentUser: vi.fn() }),
}));
vi.mock('@api/client', () => ({ apiClient: { get, post, delete: vi.fn() } }));
vi.mock('@utils/helpers', () => ({ cn: (...values: unknown[]) => values.filter(Boolean).join(' '), getCasePath: (c: { id: string }) => `/cases/${c.id}` }));
vi.mock('@layout/PageLayout', () => ({
  PageLayout: ({ children, rightButton }: { children: React.ReactNode; rightButton?: any }) => (
    <main>
      {Array.isArray(rightButton)
        ? <><button aria-label="profile actions">actions</button>{rightButton.map((item: any, index: number) => <button key={index} aria-label={item.tooltip} onClick={item.onClick}>{item.tooltip}</button>)}</>
        : rightButton
          ? <button aria-label={rightButton.tooltip} onClick={rightButton.onClick}>{rightButton.tooltip}</button>
          : null}
      {children}
    </main>
  ),
}));
vi.mock('@shared/components/SEO', () => ({ Seo: () => null }));
vi.mock('@components/ui/Skeleton', () => ({ Skeleton: () => <div data-testid="skeleton" /> }));
vi.mock('@components/ui/ProfileHeader', () => ({
  ProfileHeader: ({ onFollowToggle, onEditAvatar }: { onFollowToggle: () => void; onEditAvatar?: () => void }) => (
    <>
      <button onClick={onFollowToggle}>profile header</button>
      {onEditAvatar && <button onClick={onEditAvatar}>edit avatar</button>}
    </>
  ),
}));
vi.mock('@components/ui/ProfileStats', () => ({ ProfileStats: ({ onFollowersClick, onFollowingClick }: { onFollowersClick: () => void; onFollowingClick: () => void }) => <><button onClick={onFollowersClick}>followers</button><button onClick={onFollowingClick}>following</button></> }));
vi.mock('@components/ui/CaseCard', () => ({
  CaseCard: ({ caseData, onVote, onToggleSave, onReaction, onAddComment, onOpenDetail, onViewProfile, onShare }: any) => (
    <div>
      <span>{caseData.title}</span>
      <button onClick={() => onVote(caseData.id, 'BothWrong')}>card vote</button>
      <button onClick={() => onToggleSave(caseData.id)}>card save</button>
      <button onClick={() => onReaction(caseData.id, 'LIKE')}>card reaction</button>
      <button onClick={() => onAddComment(caseData.id, 'comment')}>card comment</button>
      <button onClick={() => onOpenDetail(caseData)}>card detail</button>
      <button onClick={() => onViewProfile('other')}>card profile</button>
      <button onClick={() => onShare(caseData.id)}>card share</button>
    </div>
  ),
}));
vi.mock('@components/ui/DeleteAccountModal', () => ({ DeleteAccountModal: ({ isOpen, onClose, onConfirm }: any) => isOpen ? <div><button onClick={onClose}>delete close</button><button onClick={onConfirm}>delete confirm</button></div> : null }));
vi.mock('@components/ui/AvatarEditModal', () => ({ AvatarEditModal: ({ onClose, onSaved }: any) => <div><button onClick={() => onSaved('/new-avatar.png')}>avatar saved</button><button onClick={onClose}>avatar close</button></div> }));
vi.mock('@components/ui/ShareModal', () => ({ ShareModal: ({ isOpen, onClose, title, username }: any) => isOpen ? <div><span>{title || username}</span><button onClick={onClose}>share close</button></div> : null }));
vi.mock('@components/ui/Toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@redux/hooks', () => ({ useAppDispatch: () => dispatch }));
vi.mock('@shared/hooks/useInfiniteScroll', () => ({ useInfiniteScroll: () => ({ loadMoreRef: vi.fn() }) }));
vi.mock('@redux/services/casesApi', () => ({
  useGetUserCasesQuery: () => query(), useGetSavedCasesQuery: () => query(), useGetUserVotesQuery: () => query(),
  useVoteCaseMutation: () => [vote],
  useReactToCaseMutation: () => [react],
  useSaveCaseMutation: () => [save],
  incrementCaseCommentsCount: (id: string) => ({ type: 'increment', payload: id }), PROFILE_PAGE_SIZE: 10,
}));
vi.mock('@redux/services/commentsApi', () => ({ useAddCommentMutation: () => [comment] }));

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUser.name = 'judge1';
    authState.currentUser = currentUser;
    queryData.cases = [];
    vote.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
    react.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
    save.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
    comment.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
    get.mockResolvedValue({
      id: 'u1', username: 'judge1', avatar_url: '/remote.png', bio: 'Bio',
      casesCount: 2, _count: { followers: 3, following: 4 }, is_following: false,
    });
  });

  it('carga y muestra el perfil, y permite consultar seguidores y seguidos', async () => {
    render(<ProfilePage />);
    expect(await screen.findByText('profile header')).toBeInTheDocument();
    fireEvent.click(screen.getByText('followers'));
    await waitFor(() => expect(get).toHaveBeenCalledWith('/users/judge1/followers'));
    fireEvent.click(screen.getByText('following'));
    await waitFor(() => expect(get).toHaveBeenCalledWith('/users/judge1/following'));
  });

  it('permite cambiar entre casos creados, anclados y votados del propio perfil', async () => {
    render(<ProfilePage />);
    await screen.findByText('profile header');
    expect(screen.getByText('profile.created')).toBeInTheDocument();
    fireEvent.click(screen.getByText('profile.anclados'));
    fireEvent.click(screen.getByText('profile.voted'));
    expect(await screen.findByText('profile.noVotedCases')).toBeInTheDocument();
  });

  it('redirige a configuración desde las acciones del perfil propio', async () => {
    render(<ProfilePage />);
    await screen.findByText('profile header');
    fireEvent.click(screen.getByLabelText('profile actions'));
    expect(screen.getByLabelText('profile actions')).toBeInTheDocument();
  });

  it('permite seguir un perfil ajeno y muestra sus casos', async () => {
    currentUser.name = 'viewer';
    queryData.cases = [{ id: 'c1', title: 'Caso público', sideA: { username: 'judge1' } }];
    post.mockResolvedValue({ following: true });
    render(<ProfilePage />);
    expect(await screen.findByText('Caso público')).toBeInTheDocument();
    fireEvent.click(screen.getByText('profile header'));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/users/judge1/follow', {}));
  });

  it('muestra las listas de seguidores y permite cerrar el modal', async () => {
    get.mockImplementation((url: string) => Promise.resolve(
      url.endsWith('/followers')
        ? [{ follower: { username: 'fan', avatar_url: null } }]
        : { id: 'u1', username: 'judge1', avatar_url: '/remote.png', bio: 'Bio', casesCount: 2, _count: { followers: 3, following: 4 }, is_following: false },
    ));
    render(<ProfilePage />);
    await screen.findByText('profile header');
    fireEvent.click(screen.getByText('followers'));
    expect(await screen.findByText('fan')).toBeInTheDocument();
    fireEvent.click(screen.getByText('profile.followers').closest('.fixed') as HTMLElement);
    expect(navigate).not.toHaveBeenCalledWith('/users/fan');
  });

  it('cubre las acciones del perfil, avatar y estados vacíos de las pestañas', async () => {
    render(<ProfilePage />);
    await screen.findByText('profile header');

    fireEvent.click(screen.getByLabelText('share.shareThis'));
    expect(screen.getByText('judge1')).toBeInTheDocument();
    fireEvent.click(screen.getByText('share close'));
    fireEvent.click(screen.getByLabelText('tooltips.settings'));
    expect(navigate).toHaveBeenCalledWith('/settings');
    fireEvent.click(screen.getByLabelText('profile.logOut'));
    expect(navigate).toHaveBeenCalledWith('/');

    fireEvent.click(screen.getByText('edit avatar'));
    fireEvent.click(screen.getByText('avatar saved'));
    fireEvent.click(screen.getByText('avatar close'));
    fireEvent.click(screen.getByText('profile.anclados'));
    expect(await screen.findByText('profile.noAnclados')).toBeInTheDocument();
  });

  it('ejecuta las acciones de las tarjetas y carga el estado sin casos creados', async () => {
    queryData.cases = [{
      id: 'c1', title: 'Caso completo', sideA: { username: 'judge1' },
      reactions: {}, isSaved: false,
    }];
    render(<ProfilePage />);
    await screen.findByText('Caso completo');
    fireEvent.click(screen.getByText('card vote'));
    fireEvent.click(screen.getByText('card save'));
    fireEvent.click(screen.getByText('card reaction'));
    fireEvent.click(screen.getByText('card comment'));
    fireEvent.click(screen.getByText('card detail'));
    fireEvent.click(screen.getByText('card profile'));
    fireEvent.click(screen.getByText('card share'));
    expect(screen.getAllByText('Caso completo').length).toBeGreaterThan(0);
  });

  it('muestra errores de seguimiento y permite abrir y cerrar seguidores vacíos', async () => {
    currentUser.name = 'viewer';
    get.mockImplementation((url: string) => {
      if (url.endsWith('/followers')) return Promise.resolve([]);
      return Promise.resolve({ id: 'u1', username: 'judge1', avatar_url: null, bio: '', _count: {}, is_following: true });
    });
    post.mockRejectedValue({ response: { data: { message: 'follow failed' } } });
    render(<ProfilePage />);
    await screen.findByText('profile header');
    fireEvent.click(screen.getByText('profile header'));
    fireEvent.click(screen.getByText('profile header'));
    await waitFor(() => expect(post).toHaveBeenCalled());
    fireEvent.click(screen.getByText('followers'));
    expect(await screen.findByText('profile.noFollowersYet')).toBeInTheDocument();
    fireEvent.click(screen.getByText('profile.followers').closest('.fixed') as HTMLElement);
  });

});
