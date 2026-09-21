import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from '@redux/store';
import { CreateCasePage } from './CreateCasePage';

const renderWithStore = () => render(
  <Provider store={store}>
    <CreateCasePage />
  </Provider>
);

const { mockCreateCase } = vi.hoisted(() => ({ mockCreateCase: vi.fn() }));

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

vi.mock('@redux/services/casesApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@redux/services/casesApi')>()),
  prependCaseToFeed: vi.fn((caseData) => ({ type: 'cases/prepend', payload: caseData })),
  useCreateCaseMutation: () => [mockCreateCase],
}));

vi.mock('@redux/services/usersApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@redux/services/usersApi')>()),
  useGetMyFollowingQuery: vi.fn(() => ({ data: [] })),
  useSearchUsersQuery: vi.fn(() => ({ data: [], isFetching: false })),
}));

vi.mock('@services/anonymity', () => ({
  getAnonymousAvatar: vi.fn(() => 'https://api.dicebear.com/avatar.svg'),
}));

vi.mock('@utils/helpers', () => ({
  cn: (...args: (string | false | undefined)[]) => args.filter(Boolean).join(' '),
}));

vi.mock('@components/ui/SEO', () => ({
  Seo: () => null,
}));

vi.mock('@layout/PageLayout', () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@components/ui/Tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { getAnonymousAvatar } from '@services/anonymity';

describe('CreateCasePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateCase.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        id: 'c1',
        title: 'A valid title',
        createdAt: '2024-01-01T00:00:00Z',
        sideA: { story: 'A valid story' },
        inviteToken: 'invite-1',
        inviteUrl: 'https://example.com/invite-1',
      }),
    });
  });

  it('debería renderizar el toggle de anonimato con publishAs', () => {
    renderWithStore();
    expect(screen.getByText('cases.publishAs')).toBeInTheDocument();
  });

  it('debería mostrar userPublic y anonymous labels', () => {
    renderWithStore();
    expect(screen.getByText('cases.userPublic')).toBeInTheDocument();
    expect(screen.getByText('cases.anonymous')).toBeInTheDocument();
  });

  it('debería cambiar estado al hacer click en el toggle', () => {
    renderWithStore();

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
    renderWithStore();

    const toggles = screen.getAllByRole('button').filter(
      (btn) => btn.className.includes('rounded-full') && btn.className.includes('cursor-pointer')
    );

    expect(toggles.length).toBeGreaterThan(0);
    expect(getAnonymousAvatar).not.toHaveBeenCalled();

    fireEvent.click(toggles[0]);
    expect(getAnonymousAvatar).toHaveBeenCalled();
  });

  it('debería mostrar validación para título e historia antes de enviar', () => {
    renderWithStore();

    fireEvent.click(screen.getByRole('button', { name: 'cases.openForDebate' }));

    expect(screen.getByText('cases.titleRequired')).toBeInTheDocument();
    expect(screen.getByText('cases.storyRequired')).toBeInTheDocument();
    expect(mockCreateCase).not.toHaveBeenCalled();
  });

  it('debería validar longitudes mínimas al perder el foco', () => {
    renderWithStore();

    const title = screen.getByPlaceholderText('cases.whatsTheDrama');
    const story = screen.getByPlaceholderText('cases.tellYourStory');
    fireEvent.change(title, { target: { value: 'corto' } });
    fireEvent.blur(title);
    fireEvent.change(story, { target: { value: 'breve' } });
    fireEvent.blur(story);

    expect(screen.getByText('cases.titleMinLength')).toBeInTheDocument();
    expect(screen.getByText('cases.storyMinLength')).toBeInTheDocument();
  });

  it('debería crear un caso clásico y mostrar la confirmación', async () => {
    renderWithStore();
    fireEvent.change(screen.getByPlaceholderText('cases.whatsTheDrama'), {
      target: { value: 'Un título suficientemente largo' },
    });
    fireEvent.change(screen.getByPlaceholderText('cases.tellYourStory'), {
      target: { value: 'Una historia suficientemente larga' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'cases.openForDebate' }));

    await waitFor(() => expect(mockCreateCase).toHaveBeenCalledWith(expect.objectContaining({
      type: 'classic',
      isAnonymous: false,
      title: 'Un título suficientemente largo',
      sideAContent: 'Una historia suficientemente larga',
    })));
    expect(await screen.findByText('cases.debateIsLive')).toBeInTheDocument();
  });

  it('debería mostrar el error del backend y permitir reintentar', async () => {
    mockCreateCase.mockReturnValueOnce({
      unwrap: vi.fn().mockRejectedValue({ data: 'No se pudo crear el caso' }),
    });
    renderWithStore();
    fireEvent.change(screen.getByPlaceholderText('cases.whatsTheDrama'), {
      target: { value: 'Un título suficientemente largo' },
    });
    fireEvent.change(screen.getByPlaceholderText('cases.tellYourStory'), {
      target: { value: 'Una historia suficientemente larga' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'cases.openForDebate' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo crear el caso');
    expect(screen.getByRole('button', { name: 'cases.openForDebate' })).not.toBeDisabled();
  });

  it('debería mostrar las opciones de voto y enviar el tipo vote', async () => {
    renderWithStore();
    fireEvent.click(screen.getByRole('button', { name: /cases.vote/ }));
    expect(screen.getByText('cases.inviteSideBTitle')).toBeInTheDocument();
    expect(screen.getByText('cases.voteOptions')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('cases.whatsTheDrama'), {
      target: { value: 'Un título suficientemente largo' },
    });
    fireEvent.change(screen.getByPlaceholderText('cases.tellYourStory'), {
      target: { value: 'Una historia suficientemente larga' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'cases.letJuryDecide' }));

    expect(await screen.findByText('cases.caseFiled')).toBeInTheDocument();
    expect(mockCreateCase).toHaveBeenCalledWith(expect.objectContaining({ type: 'vote' }));
  });

  it('debería previsualizar, eliminar y subir imágenes en el límite permitido', async () => {
    const objectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    renderWithStore();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['image'], 'evidence.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByText('1/5 cases.images')).toBeInTheDocument();
    const evidenceImage = screen.getAllByAltText('').find((image) => image.getAttribute('src') === 'blob:test')!;
    expect(evidenceImage).toHaveAttribute('src', 'blob:test');
    fireEvent.click(evidenceImage.closest('div')!.querySelector('button')!);
    expect(screen.getByText('0/5 cases.images')).toBeInTheDocument();
    objectUrl.mockRestore();
  });

  it('debería incluir isAnonymous y subir evidencia en el submit', async () => {
    renderWithStore();
    fireEvent.click(screen.getAllByRole('button').find((button) => button.className.includes('rounded-full') && button.className.includes('cursor-pointer'))!);
    fireEvent.change(screen.getByPlaceholderText('cases.whatsTheDrama'), {
      target: { value: 'Un título suficientemente largo' },
    });
    fireEvent.change(screen.getByPlaceholderText('cases.tellYourStory'), {
      target: { value: 'Una historia suficientemente larga' },
    });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'proof.jpg', { type: 'image/jpeg' })] } });
    fireEvent.click(screen.getByRole('button', { name: 'cases.openForDebate' }));

    await waitFor(() => expect(mockCreateCase).toHaveBeenCalledWith(expect.objectContaining({ isAnonymous: true })));
    expect((await import('@api/client')).apiClient.postForm).toHaveBeenCalledWith('/upload/image', expect.any(FormData));
  });
});
