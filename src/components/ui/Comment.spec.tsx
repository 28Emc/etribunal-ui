import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Comment } from './Comment';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'es' },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

vi.mock('motion/react', () => ({
  motion: {
    div: 'div',
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@shared/components/RelativeTime', () => ({
  RelativeTime: ({ value }: { value: string }) => <span data-testid="relative-time">{value}</span>,
}));

vi.mock('@shared/components/ReactionBar', () => ({
  ReactionBar: ({ targetId, reactions, onReaction }: any) =>
    <button data-testid="reaction-bar" data-target={targetId} onClick={() => onReaction('LIKE')}>Reactions</button>,
}));

type ContentTranslationMock = {
  translateComment: ReturnType<typeof vi.fn>;
  showOriginal: ReturnType<typeof vi.fn>;
  showTranslated: ReturnType<typeof vi.fn>;
  isTranslating: boolean;
  translatedComment: { commentId: string; content: string; sourceLanguage?: string } | null;
  showTranslation: boolean;
  setTranslatedComment: ReturnType<typeof vi.fn>;
};

const { mockUseContentTranslation } = vi.hoisted(() => ({
  mockUseContentTranslation: vi.fn<() => ContentTranslationMock>(() => ({
    translateComment: vi.fn().mockResolvedValue(undefined),
    showOriginal: vi.fn(),
    showTranslated: vi.fn(),
    isTranslating: false,
    translatedComment: null,
    showTranslation: false,
    setTranslatedComment: vi.fn(),
  })),
}));

vi.mock('@features/translation/hooks/useContentTranslation', () => ({
  useContentTranslation: mockUseContentTranslation,
}));

vi.mock('@services/featureFlags', () => ({
  ENABLE_TRANSLATIONS: true,
}));

const baseComment = {
  id: 'c1',
  user: 'testuser',
  userId: 'u1',
  avatar: 'https://example.com/avatar.jpg',
  text: 'Este es un comentario de prueba',
  timestamp: '2024-01-15T10:00:00.000Z',
};

const defaultProps = {
  comment: baseComment,
  onReply: vi.fn(),
  onLike: vi.fn(),
};

const defaultTranslationReturn: ContentTranslationMock = {
  translateComment: vi.fn().mockResolvedValue(undefined),
  showOriginal: vi.fn(),
  showTranslated: vi.fn(),
  isTranslating: false,
  translatedComment: null,
  showTranslation: false,
  setTranslatedComment: vi.fn(),
};

describe('Comment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseContentTranslation.mockReturnValue({ ...defaultTranslationReturn });
  });

  it('debería renderizar el texto del comentario', () => {
    render(<Comment {...defaultProps} />);
    expect(screen.getByText('Este es un comentario de prueba')).toBeInTheDocument();
  });

  it('debería renderizar el username', () => {
    render(<Comment {...defaultProps} />);
    expect(screen.getByText('testuser')).toBeInTheDocument();
  });

  it('debería renderizar el badge isOwner', () => {
    render(<Comment {...defaultProps} comment={{ ...baseComment, isOwner: true }} />);
    expect(screen.getByText('cases.you')).toBeInTheDocument();
  });

  it('NO debería renderizar badge isOwner si no es owner', () => {
    render(<Comment {...defaultProps} />);
    expect(screen.queryByText('cases.you')).not.toBeInTheDocument();
  });

  it('debería mostrar avatar como imagen si existe', () => {
    render(<Comment {...defaultProps} />);
    const img = screen.getByAltText('');
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toBe('https://example.com/avatar.jpg');
  });

  it('debería mostrar iniciales si no hay avatar', () => {
    render(<Comment {...defaultProps} comment={{ ...baseComment, avatar: '' }} />);
    expect(screen.getByText('T')).toBeInTheDocument();
  });

  it('debería llamar onUserClick al clickear username', () => {
    const onUserClick = vi.fn();
    render(<Comment {...defaultProps} onUserClick={onUserClick} />);
    fireEvent.click(screen.getByText('testuser'));
    expect(onUserClick).toHaveBeenCalledWith('testuser');
  });

  it('debería mostrar ReactionBar cuando onReaction está presente', () => {
    const onReaction = vi.fn();
    render(<Comment {...defaultProps} onReaction={onReaction} />);
    expect(screen.getByTestId('reaction-bar')).toBeInTheDocument();
  });

  it('NO debería mostrar ReactionBar cuando onReaction no está presente', () => {
    render(<Comment {...defaultProps} />);
    expect(screen.queryByTestId('reaction-bar')).not.toBeInTheDocument();
  });

  it('debería mostrar botón de reply cuando canReply es true', () => {
    render(<Comment {...defaultProps} />);
    expect(screen.getByText('comments.reply')).toBeInTheDocument();
  });

  it('debería llamar onReply al clickear reply', () => {
    const onReply = vi.fn();
    render(<Comment {...defaultProps} onReply={onReply} />);
    fireEvent.click(screen.getByText('comments.reply'));
    expect(onReply).toHaveBeenCalledWith('c1');
  });

  it('debería mostrar botón de delete cuando isOwner y onDelete presente', () => {
    const onDelete = vi.fn();
    render(<Comment {...defaultProps} comment={{ ...baseComment, isOwner: true }} onDelete={onDelete} />);
    expect(screen.getByText('comments.delete')).toBeInTheDocument();
  });

  it('NO debería mostrar botón de delete si no es owner', () => {
    render(<Comment {...defaultProps} onDelete={vi.fn()} />);
    expect(screen.queryByText('comments.delete')).not.toBeInTheDocument();
  });

  it('NO debería mostrar botón de delete si falta onDelete aunque sea owner', () => {
    render(<Comment {...defaultProps} comment={{ ...baseComment, isOwner: true }} />);
    expect(screen.queryByText('comments.delete')).not.toBeInTheDocument();
  });

  it('debería llamar onDelete al clickear delete', () => {
    const onDelete = vi.fn();
    render(<Comment {...defaultProps} comment={{ ...baseComment, isOwner: true }} onDelete={onDelete} />);
    fireEvent.click(screen.getByText('comments.delete'));
    expect(onDelete).toHaveBeenCalledWith('c1');
  });

  it('debería mostrar botón de traducción cuando contentLanguage es diferente', () => {
    render(<Comment {...defaultProps} comment={{ ...baseComment, contentLanguage: 'en' }} />);
    expect(screen.getByText('cases.translate')).toBeInTheDocument();
  });

  it('NO debería mostrar botón de traducción cuando contentLanguage es igual al locale', () => {
    render(<Comment {...defaultProps} comment={{ ...baseComment, contentLanguage: 'es' }} />);
    expect(screen.queryByText('cases.translate')).not.toBeInTheDocument();
  });

  it('debería renderizar expandido por defecto sin botón collapse', () => {
    render(<Comment {...defaultProps} />);
    expect(screen.getByText('Este es un comentario de prueba')).toBeInTheDocument();
    expect(screen.queryByText('[+]')).not.toBeInTheDocument();
  });

  it('debería mostrar botón de toggle replies si tiene replies', () => {
    render(<Comment {...defaultProps} comment={{
      ...baseComment,
      replies: [{ id: 'r1', user: 'replyuser', text: 'Reply text' }],
    }} />);
    expect(screen.getByText('comments.showReplies (1)')).toBeInTheDocument();
  });

  it('debería renderizar replies cuando showReplies es true', () => {
    render(<Comment {...defaultProps} comment={{
      ...baseComment,
      replies: [{ id: 'r1', user: 'replyuser', text: 'Reply text' }],
    }} />);
    fireEvent.click(screen.getByText('comments.showReplies (1)'));
    expect(screen.getByText('Reply text')).toBeInTheDocument();
  });

  it('debería auto expandir replies cuando highlightId coincide', () => {
    render(<Comment {...defaultProps}
      comment={{
        ...baseComment,
        replies: [{ id: 'r1', user: 'replyuser', text: 'Reply text' }],
      }}
      highlightId="c1"
    />);
    expect(screen.getByText('Reply text')).toBeInTheDocument();
  });

  it('debería mostrar RelativeTime', () => {
    render(<Comment {...defaultProps} />);
    expect(screen.getByTestId('relative-time')).toBeInTheDocument();
    expect(screen.getByTestId('relative-time').textContent).toBe('2024-01-15T10:00:00.000Z');
  });

  it('debería aplicar depth correcto al avatar', () => {
    const { container } = render(<Comment {...defaultProps} depth={1} />);
    const img = container.querySelector('.rounded-full');
    expect(img).toBeInTheDocument();
  });

  it('debería llamar onUserClick al clickear el avatar', () => {
    const onUserClick = vi.fn();
    const { container } = render(<Comment {...defaultProps} onUserClick={onUserClick} />);
    const avatarImg = container.querySelector('img');
    const avatarButton = avatarImg?.closest('button');
    fireEvent.click(avatarButton!);
    expect(onUserClick).toHaveBeenCalledWith('testuser');
  });

  it('debería mostrar contenido traducido cuando showTranslation es true', () => {
    mockUseContentTranslation.mockReturnValue({
      ...defaultTranslationReturn,
      translatedComment: { commentId: 'c1', content: 'Translated content' },
      showTranslation: true,
    });
    render(<Comment {...defaultProps} comment={{ ...baseComment, contentLanguage: 'en' }} />);
    expect(screen.getByText('Translated content')).toBeInTheDocument();
    expect(screen.queryByText('Este es un comentario de prueba')).not.toBeInTheDocument();
  });

  it('debería mostrar botón "see original" cuando hay traducción activa', () => {
    mockUseContentTranslation.mockReturnValue({
      ...defaultTranslationReturn,
      translatedComment: { commentId: 'c1', content: 'Translated content', sourceLanguage: 'en' },
      showTranslation: true,
    });
    render(<Comment {...defaultProps} comment={{ ...baseComment, contentLanguage: 'en' }} />);
    expect(screen.getByText('cases.seeOriginal')).toBeInTheDocument();
    expect(screen.queryByText('cases.translate')).not.toBeInTheDocument();
  });

  it('debería mostrar spinner mientras traduce', () => {
    mockUseContentTranslation.mockReturnValue({
      ...defaultTranslationReturn,
      isTranslating: true,
    });
    const { container } = render(<Comment {...defaultProps} comment={{ ...baseComment, contentLanguage: 'en' }} />);
    const translateBtn = screen.getByText('cases.translate').closest('button');
    expect(translateBtn).toBeDisabled();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('debería mostrar toggle replies con replies_count cuando no hay replies array', () => {
    render(<Comment {...defaultProps} comment={{
      ...baseComment,
      replies: [],
      replies_count: 3,
    }} />);
    expect(screen.getByText('comments.showReplies (3)')).toBeInTheDocument();
  });

  it('debería llamar onReaction al reaccionar', () => {
    const onReaction = vi.fn();
    render(<Comment {...defaultProps} onReaction={onReaction} comment={{ ...baseComment, contentLanguage: 'en' }} />);
    fireEvent.click(screen.getByTestId('reaction-bar'));
    expect(onReaction).toHaveBeenCalledWith('c1', 'LIKE');
  });

  it('debería llamar translate al clickear botón de traducción', () => {
    const translateMock = vi.fn().mockResolvedValue(undefined);
    mockUseContentTranslation.mockReturnValue({
      ...defaultTranslationReturn,
      translateComment: translateMock,
    });
    render(<Comment {...defaultProps} comment={{ ...baseComment, contentLanguage: 'en' }} />);
    fireEvent.click(screen.getByText('cases.translate'));
    expect(translateMock).toHaveBeenCalledWith('c1', 'es');
  });

  it('debería mostrar original al clickear "see original"', () => {
    const setTranslatedMock = vi.fn();
    const showOriginalMock = vi.fn();
    mockUseContentTranslation.mockReturnValue({
      ...defaultTranslationReturn,
      translatedComment: { commentId: 'c1', content: 'Translated', sourceLanguage: 'en' },
      showTranslation: true,
      setTranslatedComment: setTranslatedMock,
      showOriginal: showOriginalMock,
    });
    render(<Comment {...defaultProps} comment={{ ...baseComment, contentLanguage: 'en' }} />);
    fireEvent.click(screen.getByText('cases.seeOriginal'));
    expect(setTranslatedMock).toHaveBeenCalledWith(null);
    expect(showOriginalMock).toHaveBeenCalled();
  });
});
