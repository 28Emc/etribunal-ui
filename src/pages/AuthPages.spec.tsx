import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ForgotPasswordPage } from './ForgotPasswordPage';
import { ResetPasswordPage } from './ResetPasswordPage';
import { VerifyEmailPage } from './VerifyEmailPage';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  post: vi.fn(),
  currentUser: null as unknown,
  token: 'verify-token' as string | null,
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
  useSearchParams: () => [new URLSearchParams(mocks.token ? `token=${mocks.token}` : '')],
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@context/AuthContext', () => ({ useAuth: () => ({ currentUser: mocks.currentUser }) }));
vi.mock('@api/client', () => ({ apiClient: { post: mocks.post } }));
vi.mock('@layout/PageLayout', () => ({
  PageLayout: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <main data-title={title}>{children}</main>
  ),
}));
vi.mock('@shared/components/SEO', () => ({ Seo: () => null }));
vi.mock('@components/ui/ForgotPasswordForm', () => ({
  ForgotPassword: ({ onBackToLogin }: { onBackToLogin: () => void }) => (
    <button onClick={onBackToLogin}>forgot form</button>
  ),
}));
vi.mock('@components/ui/ResetPasswordForm', () => ({
  ResetPassword: ({ onPasswordReset }: { onPasswordReset: () => void }) => (
    <button onClick={onPasswordReset}>reset form</button>
  ),
}));
vi.mock('motion/react', () => ({
  motion: { div: 'div' },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('password recovery pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser = null;
  });

  it('renders forgot password and delegates its back action to login', () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByRole('main')).toHaveAttribute('data-title', 'auth.forgotPassword');
    fireEvent.click(screen.getByText('forgot form'));
    expect(mocks.navigate).toHaveBeenCalledWith('/login');
  });

  it('renders reset password and delegates successful reset to login', () => {
    render(<ResetPasswordPage />);
    fireEvent.click(screen.getByText('reset form'));
    expect(mocks.navigate).toHaveBeenCalledWith('/login');
  });

  it.each([ForgotPasswordPage, ResetPasswordPage])(
    'redirects an authenticated user from %s',
    async (Page) => {
      mocks.currentUser = { id: 'user-1' };
      render(<Page />);
      await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/', { replace: true }));
    },
  );
});

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.token = 'verify-token';
    mocks.post.mockResolvedValue({ success: true });
  });

  it('shows loading while verification is pending', () => {
    mocks.post.mockReturnValue(new Promise(() => undefined));
    render(<VerifyEmailPage />);
    expect(screen.getByText('common.loading')).toBeInTheDocument();
  });

  it('shows an error for a missing token and allows returning home', async () => {
    mocks.token = null;
    render(<VerifyEmailPage />);
    expect(await screen.findByText('auth.invalidOrExpired')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.back' }));
    expect(mocks.navigate).toHaveBeenCalledWith('/');
  });

  it('verifies a token and schedules navigation to login', async () => {
    render(<VerifyEmailPage />);
    await waitFor(() => {
      expect(mocks.post).toHaveBeenCalledWith('/auth/verify-email', { token: 'verify-token' });
    });
    expect(await screen.findByText('auth.emailVerified')).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 3100));
    expect(mocks.navigate).toHaveBeenCalledWith('/login');
  });

  it('renders the API error response', async () => {
    mocks.post.mockRejectedValue(new Error('verification failed'));
    render(<VerifyEmailPage />);
    expect(await screen.findByText('verification failed')).toBeInTheDocument();
  });
});
