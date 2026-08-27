import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { CaseCard } from './CaseCard';
import type { Case } from '@typings/index';

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
  useToast: () => ({ addToast: vi.fn() }),
}));

vi.mock('@shared/components/ReactionBar', () => ({
  ReactionBar: () => <div>ReactionBar</div>,
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

describe('CaseCard', () => {
  const mockOnOpenDetail = vi.fn();
  const mockOnViewProfile = vi.fn();
  const mockOnAddComment = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => { vi.clearAllMocks(); });

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
});
