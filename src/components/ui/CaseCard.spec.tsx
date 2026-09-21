import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { CaseCard } from './CaseCard';
import type { Case } from '@typings/index';

const { mockAddToast } = vi.hoisted(() => ({ mockAddToast: vi.fn() }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

vi.mock('motion/react', () => ({
  motion: { div: 'div' },
}));

vi.mock('@context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { id: 'u1', name: 'Test User', is_anonymous: false },
  }),
}));

vi.mock('@shared/components/Toast', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

vi.mock('@shared/components/ReactionBar', () => ({
  ReactionBar: ({ onReaction }: { onReaction: (emoji: 'LIKE') => void }) => (
    <button type="button" onClick={() => onReaction('LIKE')}>ReactionBar</button>
  ),
}));

vi.mock('@shared/components/Tooltip', () => ({
  Tooltip: ({ children, content }: { children: React.ReactNode; content: string }) => (
    <span title={content}>{children}</span>
  ),
}));

const baseCase: Case = {
  id: 'c1',
  title: 'Test Case',
  category: 'Other',
  type: 'vote',
  status: 'PUBLIC',
  sideA: {
    name: 'UserA',
    avatar: 'https://example.com/a.jpg',
    story: 'Story A',
    evidence: [],
    isAnonymous: false,
  },
  sideB: {
    name: 'UserB',
    avatar: 'https://example.com/b.jpg',
    story: 'Story B',
    evidence: [],
    isAnonymous: false,
  },
  sideAUserId: 'u1',
  sideBUserId: 'u2',
  votesA: 10,
  votesB: 5,
  votesBothWrong: 2,
  comments: [],
  tags: ['Other'],
  createdAt: '2024-01-01T00:00:00Z',
  sideASubtitle: 'Side A',
  sideBSubtitle: 'Side B',
  bothWrongSubtitle: 'Both Wrong',
};

function getCommentButton() {
  const tooltip = screen.getByTitle('comments.addComment');
  return tooltip.querySelector('button')!;
}

function getAnchorButton() {
  return screen.getByTitle(/tooltips\.(anchorCase|removeAnchor)/).querySelector('button')!;
}

describe('CaseCard', () => {
  const mockOnOpenDetail = vi.fn();
  const mockOnViewProfile = vi.fn();
  const mockOnAddComment = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => { vi.clearAllMocks(); });

  const renderCard = (props: Partial<ComponentProps<typeof CaseCard>> = {}, caseData = baseCase) => render(
    <CaseCard
      caseData={caseData}
      currentUserId="u3"
      onOpenDetail={mockOnOpenDetail}
      onViewProfile={mockOnViewProfile}
      onAddComment={mockOnAddComment}
      {...props}
    />
  );

  it('debería renderizar el toggle de anonimato al abrir comentarios', () => {
    render(
      <CaseCard
        caseData={baseCase}
        currentUserId="u1"
        onOpenDetail={mockOnOpenDetail}
        onViewProfile={mockOnViewProfile}
        onAddComment={mockOnAddComment}
      />
    );

    fireEvent.click(getCommentButton());

    expect(screen.getByText('cases.publishAs')).toBeInTheDocument();
  });

  it('debería cambiar estado del toggle de anonimato al hacer click', () => {
    render(
      <CaseCard
        caseData={baseCase}
        currentUserId="u1"
        onOpenDetail={mockOnOpenDetail}
        onViewProfile={mockOnViewProfile}
        onAddComment={mockOnAddComment}
      />
    );

    fireEvent.click(getCommentButton());

    const toggleBtn = screen.getByText('cases.publishAs')
      .closest('div')!
      .parentElement!
      .querySelector('button[type="button"]')!;

    expect(toggleBtn.className).toContain('bg-text-muted/20');

    fireEvent.click(toggleBtn);
    expect(toggleBtn.className).toContain('bg-secondary');
  });

  it('debería pasar isAnonymous=true a onAddComment cuando el toggle está activo', async () => {
    render(
      <CaseCard
        caseData={baseCase}
        currentUserId="u1"
        onOpenDetail={mockOnOpenDetail}
        onViewProfile={mockOnViewProfile}
        onAddComment={mockOnAddComment}
      />
    );

    fireEvent.click(getCommentButton());

    const toggleBtn = screen.getByText('cases.publishAs')
      .closest('div')!
      .parentElement!
      .querySelector('button[type="button"]')!;
    fireEvent.click(toggleBtn);

    const input = screen.getByPlaceholderText('comments.writeComment');
    fireEvent.change(input, { target: { value: 'Anónimo opina' } });

    const inputRow = input.closest('div')!;
    const buttons = inputRow.querySelectorAll('button');
    const sendBtn = buttons[buttons.length - 1];
    fireEvent.click(sendBtn);

    expect(mockOnAddComment).toHaveBeenCalledWith('c1', 'Anónimo opina', true);
  });

  it('debería llamar onViewProfile cuando sideA no es anónimo', () => {
    render(
      <CaseCard
        caseData={baseCase}
        currentUserId="u3"
        onOpenDetail={mockOnOpenDetail}
        onViewProfile={mockOnViewProfile}
        onAddComment={mockOnAddComment}
      />
    );

    fireEvent.click(screen.getByText('UserA'));
    expect(mockOnViewProfile).toHaveBeenCalledWith('UserA');
  });

  it('NO debería llamar onViewProfile cuando sideA es anónimo', () => {
    const anonymousCase: Case = {
      ...baseCase,
      sideA: { ...baseCase.sideA, isAnonymous: true },
    };

    render(
      <CaseCard
        caseData={anonymousCase}
        currentUserId="u3"
        onOpenDetail={mockOnOpenDetail}
        onViewProfile={mockOnViewProfile}
        onAddComment={mockOnAddComment}
      />
    );

    fireEvent.click(screen.getByText('UserA'));
    expect(mockOnViewProfile).not.toHaveBeenCalled();
  });

  it('NO debería llamar onViewProfile cuando sideB es anónimo', () => {
    const anonymousCase: Case = {
      ...baseCase,
      sideB: { ...baseCase.sideB, isAnonymous: true },
    };

    render(
      <CaseCard
        caseData={anonymousCase}
        currentUserId="u3"
        onOpenDetail={mockOnOpenDetail}
        onViewProfile={mockOnViewProfile}
        onAddComment={mockOnAddComment}
      />
    );

    const container = screen.getByText('UserB').closest('div')!;
    fireEvent.click(container);
    expect(mockOnViewProfile).not.toHaveBeenCalled();
  });

  it('debería votar por cada opción y mostrar confirmación', async () => {
    const onVote = vi.fn().mockResolvedValue(undefined);
    renderCard({ onVote });

    fireEvent.click(screen.getByRole('button', { name: 'Votar por UserA' }));
    fireEvent.click(screen.getByRole('button', { name: 'Votar porque ambos están equivocados' }));
    fireEvent.click(screen.getByRole('button', { name: 'Votar por UserB' }));

    await vi.waitFor(() => {
      expect(onVote).toHaveBeenNthCalledWith(1, 'c1', 'A');
      expect(onVote).toHaveBeenNthCalledWith(2, 'c1', 'BothWrong');
      expect(onVote).toHaveBeenNthCalledWith(3, 'c1', 'B');
      expect(mockAddToast).toHaveBeenCalledWith('success', expect.stringContaining('cases.votedStatus'));
    });
  });

  it('debería informar error si falla un voto o guardar un caso', async () => {
    const onVote = vi.fn().mockRejectedValue(new Error('vote failed'));
    const onToggleSave = vi.fn().mockRejectedValue(new Error('save failed'));
    renderCard({ onVote, onToggleSave });

    fireEvent.click(screen.getByRole('button', { name: 'Votar por UserA' }));
    fireEvent.click(getAnchorButton());

    await vi.waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith('error', 'errors.voteError');
      expect(mockAddToast).toHaveBeenCalledWith('error', 'errors.saveError');
    });
  });

  it('debería pedir autenticación al votar, guardar o comentar sin usuario', () => {
    const onOpenAuth = vi.fn();
    renderCard({ currentUserId: undefined, onOpenAuth });

    fireEvent.click(screen.getByRole('button', { name: 'Votar por UserA' }));
    fireEvent.click(getAnchorButton());
    fireEvent.click(getCommentButton());

    expect(onOpenAuth).toHaveBeenCalledTimes(3);
  });

  it('debería guardar y compartir un caso', async () => {
    const onToggleSave = vi.fn().mockResolvedValue(undefined);
    const onShare = vi.fn();
    renderCard({ onToggleSave, onShare, isSaved: true, anchorsCount: 4, sharesCount: 2 });

    fireEvent.click(getAnchorButton());
    fireEvent.click(screen.getByTitle('share.shareThis').querySelector('button')!);

    await vi.waitFor(() => expect(onToggleSave).toHaveBeenCalledWith('c1'));
    expect(onShare).toHaveBeenCalledWith('c1');
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('debería informar el error de compartir reacción y aceptar una reacción', async () => {
    const onReaction = vi.fn().mockRejectedValue(new Error('reaction failed'));
    renderCard({ onReaction });

    fireEvent.click(screen.getByText('ReactionBar'));
    expect(onReaction).toHaveBeenCalledWith('c1', 'LIKE');
    await vi.waitFor(() => expect(mockAddToast).toHaveBeenCalledWith('error', 'errors.reactionError'));
  });

  it('debería renderizar rutas de imágenes con evidencia, sin evidencia y debate clásico', () => {
    const { rerender } = renderCard({}, {
      ...baseCase,
      sideA: { ...baseCase.sideA, evidence: [{ id: 'a1', url: 'https://example.com/evidence-a.jpg' }] },
    });
    expect(document.querySelector('img[src="https://example.com/evidence-a.jpg"]')).toBeInTheDocument();

    rerender(
      <CaseCard
        caseData={{ ...baseCase, type: 'classic', sideA: { ...baseCase.sideA, evidence: [] }, sideB: { ...baseCase.sideB, evidence: [] } }}
        currentUserId="u3"
        onOpenDetail={mockOnOpenDetail}
        onViewProfile={mockOnViewProfile}
        onAddComment={mockOnAddComment}
      />
    );
    expect(screen.getByRole('img', { name: 'VS' })).toBeInTheDocument();
  });

  it('debería mostrar resultados de voto para un usuario que ya votó', () => {
    renderCard({ userVote: 'A' });

    expect(screen.getByText(/cases.voted/)).toBeInTheDocument();
    expect(screen.getByText(/cases.youVotedFor/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Votar por UserA' })).not.toBeInTheDocument();
  });
});
