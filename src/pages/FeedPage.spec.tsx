import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FeedPage } from './FeedPage';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  addToast: vi.fn(),
  dispatch: vi.fn(),
  currentUser: { id: 'u1', votes: {} as Record<string, string> },
  setCurrentUser: vi.fn(),
  feed: { data: undefined as any, isLoading: false, isFetching: false, refetch: vi.fn() },
  topJudges: { data: [] as any[], isLoading: false },
  vote: vi.fn(() => ({ unwrap: vi.fn().mockResolvedValue({}) })),
  save: vi.fn(() => ({ unwrap: vi.fn().mockResolvedValue({}) })),
  react: vi.fn(() => ({ unwrap: vi.fn().mockResolvedValue({}) })),
  follow: vi.fn(() => ({ unwrap: vi.fn().mockResolvedValue({}) })),
  comment: vi.fn(() => ({ unwrap: vi.fn().mockResolvedValue({}) })),
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }), initReactI18next: { type: '3rdParty', init: vi.fn() } }));
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }));
vi.mock('motion/react', () => ({
  motion: { div: 'div' },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@context/AuthContext', () => ({
  useAuth: () => ({ currentUser: mocks.currentUser, setCurrentUser: mocks.setCurrentUser }),
}));
vi.mock('@components/ui/Toast', () => ({ useToast: () => ({ addToast: mocks.addToast }) }));
vi.mock('@redux/hooks', () => ({ useAppDispatch: () => mocks.dispatch }));
vi.mock('@hooks/useInfiniteScroll', () => ({ useInfiniteScroll: () => ({ loadMoreRef: vi.fn() }) }));
vi.mock('@components/ui/SEO', () => ({ Seo: () => null }));
vi.mock('@components/ui/Tooltip', () => ({ Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@layout/CategoryFilter', () => ({
  CategoryFilter: ({ onCategoryChange }: { onCategoryChange: (value: string) => void }) => (
    <button onClick={() => onCategoryChange('Legal')}>category</button>
  ),
}));
vi.mock('@components/ui', () => ({
  FeedSkeleton: () => <div>loading feed</div>,
  EmptyState: ({ titleKey }: { titleKey: string }) => <div>{titleKey}</div>,
}));
vi.mock('@layout/TopJudgesList', () => ({
  TopJudgesList: ({ onViewProfile, onFollow }: { onViewProfile: (name: string) => void; onFollow: (id: string, name: string) => void }) => (
    <div><button onClick={() => onViewProfile('judge')}>judge profile</button><button onClick={() => onFollow('u2', 'judge')}>follow judge</button></div>
  ),
}));
vi.mock('@components/ui/CaseList', () => ({
  CaseList: (props: any) => (
    <div>
      <button onClick={() => props.onOpenDetail('c1')}>open case</button>
      <button onClick={() => props.onVote('c1', 'A')}>vote</button>
      <button onClick={() => props.onToggleSave('c1')}>save</button>
      <button onClick={() => props.onReaction('c1', 'LIKE')}>react</button>
      <button onClick={() => props.onAddComment('c1', 'hello')}>comment</button>
      <button onClick={() => props.onShare('c1')}>share</button>
    </div>
  ),
}));
vi.mock('@components/ui/ShareModal', () => ({ ShareModal: ({ onClose }: { onClose: () => void }) => <button onClick={onClose}>close share</button> }));
vi.mock('@redux/services/casesApi', () => ({
  FEED_PAGE_SIZE: 10,
  useGetFeedQuery: () => mocks.feed,
  useGetTopJudgesQuery: () => mocks.topJudges,
  useVoteCaseMutation: () => [mocks.vote, { isLoading: false }],
  useSaveCaseMutation: () => [mocks.save, { isLoading: false }],
  useReactToCaseMutation: () => [mocks.react],
  incrementCaseShareCount: (id: string) => ({ type: 'share', payload: id }),
}));
vi.mock('@redux/services/commentsApi', () => ({ useAddCommentMutation: () => [mocks.comment] }));
vi.mock('@redux/services/usersApi', () => ({
  useGetTopJudgesQuery: () => mocks.topJudges,
  useFollowUserMutation: () => [mocks.follow],
}));

describe('FeedPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.feed.data = undefined;
    mocks.feed.isLoading = false;
    mocks.feed.isFetching = false;
    mocks.currentUser = { id: 'u1', votes: {} };
  });

  it('muestra carga y estado vacío', () => {
    mocks.feed.isLoading = true;
    const { rerender } = render(<FeedPage />);
    expect(screen.getByText('loading feed')).toBeInTheDocument();
    mocks.feed.isLoading = false;
    rerender(<FeedPage />);
    expect(screen.getByText('profile.noCasesFound')).toBeInTheDocument();
  });

  it('renderiza casos y ejecuta acciones principales', async () => {
    mocks.feed.data = { cases: [{ id: 'c1', title: 'Case', isSaved: false }], hasMore: false };
    render(<FeedPage />);
    fireEvent.click(screen.getByText('open case'));
    fireEvent.click(screen.getByText('vote'));
    fireEvent.click(screen.getByText('save'));
    fireEvent.click(screen.getByText('react'));
    fireEvent.click(screen.getByText('comment'));
    fireEvent.click(screen.getByText('share'));
    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/cases/c1');
      expect(mocks.vote).toHaveBeenCalled();
      expect(mocks.save).toHaveBeenCalled();
      expect(mocks.react).toHaveBeenCalled();
      expect(mocks.comment).toHaveBeenCalled();
      expect(screen.getByText('close share')).toBeInTheDocument();
    });
  });

  it('permite cambiar a top judges y navegar al perfil', () => {
    mocks.topJudges.data = [{ id: 'u2', username: 'judge' }];
    render(<FeedPage initialTab="top-judges" />);
    fireEvent.click(screen.getByText('judge profile'));
    expect(mocks.navigate).toHaveBeenCalledWith('/users/judge');
  });
});
