import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CaseDetailPage } from './CaseDetailPage';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(), addToast: vi.fn(), setCurrentUser: vi.fn(),
  query: { data: undefined as any, isLoading: false, isError: false, refetch: vi.fn() },
  vote: vi.fn(() => ({ unwrap: vi.fn().mockResolvedValue({}) })),
  react: vi.fn(() => ({ unwrap: vi.fn().mockResolvedValue({}) })),
  reactComment: vi.fn(() => ({ unwrap: vi.fn().mockResolvedValue({}) })),
  save: vi.fn(() => ({ unwrap: vi.fn().mockResolvedValue({}) })),
  post: vi.fn().mockResolvedValue({ invite_token: 'new' }),
}));
const caseData = { id: 'c1', title: 'Caso', sideAUserId: 'u1', sideBUserId: 'u2', sideA: { story: 'A', evidence: [] }, sideB: { story: 'B', evidence: [] }, reactions: {} };
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('react-router-dom', () => ({ useParams: () => ({ id: 'c1' }), useNavigate: () => mocks.navigate }));
vi.mock('motion/react', () => ({ motion: { div: 'div' }, AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@context/AuthContext', () => ({ useAuth: () => ({ currentUser: { id: 'u1', role: 'USER', votes: {} }, token: 'token', setCurrentUser: mocks.setCurrentUser }) }));
vi.mock('@components/ui/Toast', () => ({ useToast: () => ({ addToast: mocks.addToast }) }));
vi.mock('@components/ui/SEO', () => ({ Seo: () => null }));
vi.mock('@layout/PageLayout', () => ({ PageLayout: ({ children, rightButton, rightButtonMenu }: any) => <main>{rightButton && <button onClick={rightButton.onClick}>menu</button>}{rightButtonMenu}{children}</main> }));
vi.mock('@components/ui/Skeleton', () => ({ CaseDetailSkeleton: () => <div>loading detail</div> }));
vi.mock('@components/ui/CaseDetail', () => ({
  CaseDetail: (props: any) => <div><button onClick={() => props.onVote('c1', 'A')}>vote</button><button onClick={() => props.onToggleSave('c1')}>save</button><button onClick={() => props.onReaction('c1', 'LIKE', 'CASE', 'c1')}>react</button><button onClick={() => props.onAddComment('c1', 'text')}>comment</button><button onClick={() => props.onClose()}>close</button></div>,
}));
vi.mock('@components/ui/ReportModal', () => ({ ReportModal: ({ onSubmit }: any) => <button onClick={() => onSubmit('spam')}>report modal</button> }));
vi.mock('@components/ui/DeleteCaseModal', () => ({ DeleteCaseModal: () => <div>delete modal</div> }));
vi.mock('@components/ui/EditImagesModal', () => ({ EditImagesModal: () => <div>images modal</div> }));
vi.mock('@components/ui/EditCaseModal', () => ({ EditCaseModal: () => <div>edit modal</div> }));
vi.mock('@hooks/useCommentsData', () => ({ useCommentsData: () => ({ visibleComments: [], pendingCount: 0, hasMore: false, nextCursor: null, isFetching: false, fetchOlderComments: vi.fn(), showNewComments: false, addComment: vi.fn().mockResolvedValue({}), deleteComment: vi.fn().mockResolvedValue({}) }) }));
vi.mock('@api/client', () => ({ apiClient: { post: mocks.post } }));
vi.mock('@redux/services/casesApi', () => ({ useGetCaseQuery: () => mocks.query, useVoteCaseMutation: () => [mocks.vote], useReactToCaseMutation: () => [mocks.react], useSaveCaseMutation: () => [mocks.save] }));
vi.mock('@redux/services/commentsApi', () => ({ useReactToCommentMutation: () => [mocks.reactComment] }));

describe('CaseDetailPage', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.query.data = undefined; mocks.query.isLoading = false; mocks.query.isError = false; });
  it('muestra skeleton mientras carga', () => { mocks.query.isLoading = true; render(<CaseDetailPage />); expect(screen.getByText('loading detail')).toBeInTheDocument(); });
  it('redirige y avisa cuando falla la carga', async () => {
    mocks.query.isError = true; render(<CaseDetailPage />);
    await waitFor(() => { expect(mocks.navigate).toHaveBeenCalledWith('/', { replace: true }); expect(mocks.addToast).toHaveBeenCalled(); });
  });
  it('muestra detalle y permite votar, guardar, reaccionar y cerrar', async () => {
    mocks.query.data = caseData; render(<CaseDetailPage />);
    fireEvent.click(screen.getByText('vote')); fireEvent.click(screen.getByText('save')); fireEvent.click(screen.getByText('react')); fireEvent.click(screen.getByText('comment')); fireEvent.click(screen.getByText('close'));
    await waitFor(() => { expect(mocks.vote).toHaveBeenCalled(); expect(mocks.save).toHaveBeenCalled(); expect(mocks.react).toHaveBeenCalled(); expect(mocks.navigate).toHaveBeenCalledWith(-1); });
  });
});
