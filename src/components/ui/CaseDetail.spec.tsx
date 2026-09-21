import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CaseDetail } from './CaseDetail';
import type { Case, User } from '@typings/index';

const translateCase = vi.fn();
const showOriginal = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es' } }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));
vi.mock('@features/translation/hooks/useContentTranslation', () => ({
  useContentTranslation: () => ({
    translateCase,
    showOriginal,
    isTranslating: false,
    translatedCase: null,
    showTranslation: false,
  }),
}));
vi.mock('@shared/components/Tooltip', () => ({
  Tooltip: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));
vi.mock('@shared/components/ConfirmModal', () => ({
  ConfirmModal: ({ isOpen, onConfirm, onCancel }: { isOpen: boolean; onConfirm: () => void; onCancel: () => void }) =>
    isOpen ? <div><button onClick={onConfirm}>confirmar</button><button onClick={onCancel}>cancelar</button></div> : null,
}));
vi.mock('./EvidenceGallery', () => ({
  EvidenceGallery: ({ evidence, onOpen }: { evidence: { url: string }[]; onOpen: (url: string) => void }) => (
    <div>{evidence.map((item) => <button key={item.url} onClick={() => onOpen(item.url)}>evidencia</button>)}</div>
  ),
}));
vi.mock('./CommentThread', () => ({
  CommentThread: ({ comments, onReply, onLike, onDelete, onReaction }: { comments: { id: string; user: string }[]; onReply: (id: string) => void; onLike: (id: string) => void; onDelete?: (id: string) => void; onReaction?: (id: string, emoji: 'LIKE') => void }) => (
    <div>{comments.map((comment) => <div key={comment.id}><span>{comment.user}</span><button onClick={() => onReply(comment.id)}>responder</button><button onClick={() => onLike(comment.id)}>like</button>{onReaction && <button onClick={() => onReaction(comment.id, 'LIKE')}>reaccionar comentario</button>}{onDelete && <button onClick={() => onDelete(comment.id)}>eliminar</button>}</div>)}</div>
  ),
}));
vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  motion: { div: 'div', button: 'button', img: 'img' },
}));

const baseCase: Case = {
  id: 'case-1',
  title: 'Caso de prueba',
  category: 'general',
  type: 'vote',
  status: 'PUBLIC',
  sideA: { name: 'Alicia', avatar: '/a.png', story: 'argumento A', evidence: [] },
  sideB: { name: 'Bruno', avatar: '/b.png', story: 'argumento B', evidence: [] },
  sideAUserId: 'author',
  sideBUserId: 'defender',
  votesA: 1,
  votesB: 2,
  votesBothWrong: 0,
  comments: [],
  tags: ['general'],
  createdAt: '2026-01-01',
};
const user = { id: 'voter', name: 'Voter', email: 'voter@example.com', avatar: '', casesCreated: [], votes: {} } as User;
const props = () => ({
  caseData: baseCase,
  currentUser: user,
  onVote: vi.fn(),
  onAddComment: vi.fn(),
  onRespondSideB: vi.fn(),
  onRegenerateInviteLink: vi.fn().mockResolvedValue('https://example.test/invite'),
  onLikeComment: vi.fn(),
  onReaction: vi.fn().mockResolvedValue(undefined),
  onDeleteComment: vi.fn(),
  onToggleSave: vi.fn(),
  visibleComments: [{ id: 'comment-1', user: 'Ana', avatar: '', text: 'hola', timestamp: 'ahora' }],
  pendingCount: 2,
  hasMore: false,
  isFetching: false,
  fetchOlderComments: vi.fn(),
  showNewComments: vi.fn(),
});

describe('CaseDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(globalThis, 'IntersectionObserver', {
      configurable: true,
      value: class {
        observe() {}
        unobserve() {}
      },
    });
  });

  it('muestra el estado de carga cuando aún no hay caso', () => {
    render(<CaseDetail {...props()} caseData={null} />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renderiza un caso y permite votar, comentar, reaccionar y mostrar comentarios nuevos', async () => {
    const p = props();
    render(<CaseDetail {...p} />);

    expect(screen.getByText('Caso de prueba')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Votar por Alicia' }));
    expect(p.onVote).toHaveBeenCalledWith('case-1', 'A');

    fireEvent.change(screen.getByPlaceholderText('comments.dropVerdict'), { target: { value: 'mi opinión' } });
    const commentInput = screen.getByPlaceholderText('comments.dropVerdict');
    fireEvent.click(commentInput.parentElement?.querySelector('button') as HTMLElement);
    expect(p.onAddComment).toHaveBeenCalledWith('case-1', 'mi opinión', undefined);

    fireEvent.click(screen.getByText('+2 comments.new'));
    expect(p.showNewComments).toHaveBeenCalled();

    fireEvent.click(screen.getByText('responder'));
    fireEvent.click(screen.getByText('like'));
    expect(p.onLikeComment).toHaveBeenCalledWith('case-1', 'comment-1');
    await waitFor(() => expect(screen.getByPlaceholderText('comments.writeReply')).toBeInTheDocument());
  });

  it('pide autenticación para votar y comentar cuando no hay usuario', () => {
    const onOpenAuth = vi.fn();
    render(<CaseDetail {...props()} currentUser={null} onOpenAuth={onOpenAuth} />);

    fireEvent.click(screen.getByRole('button', { name: 'Votar por Alicia' }));
    fireEvent.click(screen.getByPlaceholderText('comments.dropVerdict'));
    fireEvent.keyDown(screen.getByPlaceholderText('comments.dropVerdict'), { key: 'Enter' });
    expect(onOpenAuth).toHaveBeenCalled();
  });

  it('permite regenerar y copiar el enlace de invitación del creador', async () => {
    const p = props();
    const waiting = { ...baseCase, status: 'WAITING' as const, sideB: { ...baseCase.sideB, name: 'Waiting...' }, sideBUserId: null };
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    render(<CaseDetail {...p} caseData={waiting} currentUser={{ ...user, id: 'author' }} />);

    fireEvent.click(screen.getByText('cases.viewInviteLink'));
    await waitFor(() => expect(screen.getByText('https://example.test/invite')).toBeInTheDocument());
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('https://example.test/invite'));
  });

  it('permite gestionar comentarios, reacciones y carga incremental', async () => {
    const p = props();
    render(<CaseDetail {...p} onReaction={p.onReaction} />);

    fireEvent.click(screen.getByText('reaccionar comentario'));
    await waitFor(() => expect(p.onReaction).toHaveBeenCalledWith('case-1', 'LIKE', 'COMMENT', 'comment-1'));
    fireEvent.click(screen.getByText('eliminar'));
    fireEvent.click(screen.getByText('confirmar'));
    expect(p.onDeleteComment).toHaveBeenCalledWith('case-1', 'comment-1');
    fireEvent.click(screen.getByText('responder'));
    const replyInput = screen.getByPlaceholderText('comments.writeReply');
    fireEvent.change(replyInput, { target: { value: 'respuesta' } });
    fireEvent.keyDown(replyInput, { key: 'Enter' });
    expect(p.onAddComment).toHaveBeenCalledWith('case-1', 'respuesta', 'comment-1');
  });

  it('muestra la vista clásica y el estado sin votos', () => {
    const classic = { ...baseCase, type: 'classic' as const, votesA: 0, votesB: 0, votesBothWrong: 0, comments: [] };
    render(<CaseDetail {...props()} caseData={classic} visibleComments={[]} pendingCount={0} />);
    expect(screen.getByText('cases.debateSection')).toBeInTheDocument();
    expect(screen.getByText('comments.noComments')).toBeInTheDocument();
  });

  it('abre y cierra la evidencia en pantalla completa', () => {
    const withEvidence = {
      ...baseCase,
      sideA: { ...baseCase.sideA, evidence: [{ id: 'evidence-1', url: 'https://example.test/evidence.png' }] },
    };
    render(<CaseDetail {...props()} caseData={withEvidence} />);
    fireEvent.click(screen.getByText('evidencia'));
    expect(screen.getByAltText('cases.evidence')).toBeInTheDocument();
    fireEvent.click(screen.getByAltText('cases.evidence').closest('.fixed') as HTMLElement);
    expect(screen.queryByAltText('cases.evidence')).not.toBeInTheDocument();
  });

  it('muestra el estado de espera para visitantes y regenera el enlace como creador', async () => {
    const waiting = {
      ...baseCase,
      status: 'WAITING' as const,
      sideB: { ...baseCase.sideB, name: 'Waiting...' },
      sideBUserId: null,
    };
    const visitor = props();
    const view = render(<CaseDetail {...visitor} caseData={waiting} currentUser={{ ...user, id: 'visitor' }} />);
    expect(screen.getByText('cases.awaitingSideBDefense')).toBeInTheDocument();

    const owner = props();
    view.rerender(<CaseDetail {...owner} caseData={waiting} currentUser={{ ...user, id: 'author' }} />);
    fireEvent.click(screen.getByText('cases.viewInviteLink'));
    await waitFor(() => expect(screen.getByText('https://example.test/invite')).toBeInTheDocument());
    expect(owner.onRegenerateInviteLink).toHaveBeenCalledWith('case-1');
  });

  it('muestra resultados para un caso ya votado y permite cancelar el borrado', () => {
    const voted = {
      ...baseCase,
      userVote: 'BOTH_WRONG' as const,
      votesA: 4,
      votesB: 1,
      votesBothWrong: 1,
      comments: [{ id: 'comment-1', user: 'Ana', avatar: '', timestamp: '', text: 'hola' }],
    };
    const p = props();
    render(<CaseDetail {...p} caseData={voted} />);
    expect(screen.getByText('cases.verdictReached')).toBeInTheDocument();
    expect(screen.getByText('cases.youVotedFor')).toBeInTheDocument();
    fireEvent.click(screen.getByText('eliminar'));
    fireEvent.click(screen.getByText('cancelar'));
    expect(p.onDeleteComment).not.toHaveBeenCalled();
  });

  it('carga más comentarios cuando el estado está disponible y maneja reacción fallida', async () => {
    const p = props();
    p.onReaction.mockRejectedValue(new Error('network'));
    render(<CaseDetail {...p} hasMore isFetching={true} />);
    fireEvent.click(screen.getByText('reaccionar comentario'));
    await waitFor(() => expect(p.onReaction).toHaveBeenCalled());
    expect(screen.getByText('comments.loading')).toBeInTheDocument();
  });
});
