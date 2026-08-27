import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShareModal } from './ShareModal';
import { useToast } from '@components/ui/Toast';

const mocks = vi.hoisted(() => ({
  mockShare: vi.fn(),
  mockCopyToClipboard: vi.fn(),
  mockIsWebShareSupported: vi.fn(),
  mockGenerateShareUrl: vi.fn(),
  mockGetWhatsAppLink: vi.fn(),
  mockGetTwitterLink: vi.fn(),
  mockGetTelegramLink: vi.fn(),
  mockGetEmailLink: vi.fn(),
}));

const { mockShare, mockCopyToClipboard, mockIsWebShareSupported, mockGenerateShareUrl, mockGetWhatsAppLink, mockGetTwitterLink, mockGetTelegramLink, mockGetEmailLink } = mocks;

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

vi.mock('motion/react', () => ({
  motion: {
    div: 'div',
    button: 'button',
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@shared/hooks/useShare', () => ({
  useShare: () => ({
    share: (...args: any[]) => mocks.mockShare(...args),
    copyToClipboard: (...args: any[]) => mocks.mockCopyToClipboard(...args),
    isWebShareSupported: (...args: any[]) => mocks.mockIsWebShareSupported(...args),
  }),
  generateShareUrl: (...args: any[]) => mocks.mockGenerateShareUrl(...args),
  getWhatsAppLink: (...args: any[]) => mocks.mockGetWhatsAppLink(...args),
  getTwitterLink: (...args: any[]) => mocks.mockGetTwitterLink(...args),
  getTelegramLink: (...args: any[]) => mocks.mockGetTelegramLink(...args),
  getEmailLink: (...args: any[]) => mocks.mockGetEmailLink(...args),
}));

vi.mock('@components/ui/Toast', () => ({
  useToast: vi.fn().mockReturnValue({ addToast: vi.fn() }),
}));

vi.mock('../../components/ui/Tooltip', () => ({
  Tooltip: ({ children, content }: { children: React.ReactNode; content: string }) =>
    <div data-testid="tooltip" data-content={content}>{children}</div>,
}));

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  id: 'case-123',
  type: 'case' as const,
  title: 'Test Case',
};

describe('ShareModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateShareUrl.mockReturnValue('http://localhost:3000/cases/case-123/test-case');
    mockGetWhatsAppLink.mockReturnValue('https://wa.me/?text=test');
    mockGetTwitterLink.mockReturnValue('https://twitter.com/intent/tweet?text=test');
    mockGetTelegramLink.mockReturnValue('https://t.me/share/url?url=test');
    mockGetEmailLink.mockReturnValue('mailto:?subject=test&body=test');
    mockIsWebShareSupported.mockReturnValue(false);
  });

  it('debería renderizar cuando isOpen es true', () => {
    render(<ShareModal {...defaultProps} />);
    expect(screen.getByText('share.shareThisCase')).toBeInTheDocument();
  });

  it('NO debería renderizar cuando isOpen es false', () => {
    render(<ShareModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('share.shareThisCase')).not.toBeInTheDocument();
  });

  it('debería mostrar el perfil title cuando type=profile', () => {
    render(<ShareModal {...defaultProps} type="profile" username="testuser" />);
    expect(screen.getByText('share.shareThisProfile')).toBeInTheDocument();
  });

  it('debería llamar onClose al hacer click en backdrop', () => {
    const onClose = vi.fn();
    const { container } = render(<ShareModal {...defaultProps} onClose={onClose} />);
    const backdrop = container.firstChild as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it('debería generar URL de compartir con generateShareUrl', () => {
    render(<ShareModal {...defaultProps} />);
    expect(mockGenerateShareUrl).toHaveBeenCalledWith({
      type: 'case',
      id: 'case-123',
      title: 'Test Case',
      username: undefined,
    });
  });

  it('debería mostrar botón de native share cuando es soportado', () => {
    mockIsWebShareSupported.mockReturnValue(true);
    render(<ShareModal {...defaultProps} />);
    expect(screen.getByText('share.shareNative')).toBeInTheDocument();
  });

  it('NO debería mostrar botón native share cuando no es soportado', () => {
    mockIsWebShareSupported.mockReturnValue(false);
    render(<ShareModal {...defaultProps} />);
    expect(screen.queryByText('share.shareNative')).not.toBeInTheDocument();
  });

  it('debería llamar share() al clickear native share', async () => {
    mockIsWebShareSupported.mockReturnValue(true);
    mockShare.mockResolvedValue(true);
    render(<ShareModal {...defaultProps} />);
    fireEvent.click(screen.getByText('share.shareNative'));
    expect(mockShare).toHaveBeenCalledWith({
      type: 'case',
      id: 'case-123',
      title: 'Test Case',
      username: undefined,
    });
  });

  it('debería cerrar modal si native share fue exitoso', async () => {
    const onClose = vi.fn();
    mockIsWebShareSupported.mockReturnValue(true);
    mockShare.mockResolvedValue(true);
    render(<ShareModal {...defaultProps} onClose={onClose} />);
    await fireEvent.click(screen.getByText('share.shareNative'));
    expect(onClose).toHaveBeenCalled();
  });

  it('debería copiar link al portapapeles', async () => {
    mockCopyToClipboard.mockResolvedValue(true);
    render(<ShareModal {...defaultProps} />);
    fireEvent.click(screen.getByText('share.copy'));
    expect(mockCopyToClipboard).toHaveBeenCalledWith({
      type: 'case',
      id: 'case-123',
      title: 'Test Case',
      username: undefined,
    });
    await waitFor(() => {
      expect(vi.mocked(useToast)().addToast).toHaveBeenCalledWith('success', 'share.copied');
    });
  });

  it('debería mostrar error si copiar al portapapeles falla', async () => {
    mockCopyToClipboard.mockResolvedValue(false);
    render(<ShareModal {...defaultProps} />);
    fireEvent.click(screen.getByText('share.copy'));
    await waitFor(() => {
      expect(vi.mocked(useToast)().addToast).toHaveBeenCalledWith('error', 'errors.copyFailed');
    });
  });

  it('debería abrir WhatsApp al clickear botón social', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<ShareModal {...defaultProps} />);
    fireEvent.click(screen.getByText('WhatsApp'));
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('https://wa.me/'),
      '_blank',
      'noopener,noreferrer'
    );
    openSpy.mockRestore();
  });

  it('debería abrir X/Twitter al clickear botón social', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<ShareModal {...defaultProps} />);
    fireEvent.click(screen.getByText('X'));
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('https://twitter.com/'),
      '_blank',
      'noopener,noreferrer'
    );
    openSpy.mockRestore();
  });

  it('debería abrir Telegram al clickear botón social', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<ShareModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Telegram'));
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('https://t.me/'),
      '_blank',
      'noopener,noreferrer'
    );
    openSpy.mockRestore();
  });

  it('debería abrir Email al clickear botón Email', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<ShareModal {...defaultProps} />);
    fireEvent.click(screen.getByText('share.email'));
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('mailto:'),
      '_blank',
      'noopener,noreferrer'
    );
    openSpy.mockRestore();
  });
});
