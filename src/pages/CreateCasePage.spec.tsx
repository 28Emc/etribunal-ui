import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CreateCasePage } from './CreateCasePage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

vi.mock('motion/react', () => ({
  motion: { div: 'div' },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: {
      id: 'u1',
      name: 'Test User',
      avatar: 'https://example.com/avatar.jpg',
      is_anonymous: false,
    },
  }),
}));

vi.mock('@api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn().mockResolvedValue({ id: 'c1', created_at: '2024-01-01T00:00:00Z' }),
    postForm: vi.fn().mockResolvedValue({ url: 'https://example.com/img.jpg', public_id: 'p1' }),
  },
  authStorage: {
    isAuthenticated: vi.fn().mockReturnValue(true),
    getAccessToken: vi.fn(),
  },
}));

vi.mock('@hooks/useCases', () => ({
  useCases: () => ({ setCases: vi.fn() }),
}));

vi.mock('@services/anonymity', () => ({
  getAnonymousAvatar: vi.fn(() => 'https://api.dicebear.com/avatar.svg'),
}));

vi.mock('@utils/helpers', () => ({
  cn: (...args: (string | false | undefined)[]) => args.filter(Boolean).join(' '),
}));

vi.mock('@components/ui/SEO', () => ({
  SEO: () => null,
}));

vi.mock('@layout/PageLayout', () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@components/ui/Tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { getAnonymousAvatar } from '@services/anonymity';

describe('CreateCasePage', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('debería renderizar el toggle de anonimato con publishAs', () => {
    render(<CreateCasePage />);
    expect(screen.getByText('cases.publishAs')).toBeInTheDocument();
  });

  it('debería mostrar userPublic y anonymous labels', () => {
    render(<CreateCasePage />);
    expect(screen.getByText('cases.userPublic')).toBeInTheDocument();
    expect(screen.getByText('cases.anonymous')).toBeInTheDocument();
  });

  it('debería cambiar estado al hacer click en el toggle', () => {
    render(<CreateCasePage />);

    const toggles = screen.getAllByRole('button').filter(
      (btn) => btn.className.includes('rounded-full') && btn.className.includes('cursor-pointer')
    );

    expect(toggles.length).toBeGreaterThan(0);
    const toggle = toggles[0];
    expect(toggle.className).toContain('bg-text-muted/20');

    fireEvent.click(toggle);
    expect(toggle.className).toContain('bg-secondary');
  });

  it('debería invocar getAnonymousAvatar cuando se activa el modo anónimo', () => {
    render(<CreateCasePage />);

    const toggles = screen.getAllByRole('button').filter(
      (btn) => btn.className.includes('rounded-full') && btn.className.includes('cursor-pointer')
    );

    expect(toggles.length).toBeGreaterThan(0);
    expect(getAnonymousAvatar).not.toHaveBeenCalled();

    fireEvent.click(toggles[0]);
    expect(getAnonymousAvatar).toHaveBeenCalled();
  });
});
