import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ForgotPassword } from './ForgotPasswordForm';
import { ResetPassword } from './ResetPasswordForm';

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  navigate: vi.fn(),
  token: 'reset-token' as string | null,
}));

vi.mock('@api/client', () => ({ apiClient: { post: mocks.post } }));
vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
  useSearchParams: () => [new URLSearchParams(mocks.token ? `token=${mocks.token}` : '')],
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'es' },
  }),
}));
vi.mock('motion/react', () => ({
  motion: { div: 'div' },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@utils/helpers', () => ({
  cn: (...values: unknown[]) => values.filter(Boolean).join(' '),
}));

describe('ForgotPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.post.mockResolvedValue({});
  });

  it('renders the form and validates a missing or malformed email', () => {
    render(<ForgotPassword />);
    fireEvent.click(screen.getByRole('button', { name: 'auth.sendResetLink' }));
    expect(screen.getByRole('alert')).toHaveTextContent('auth.emailRequired');

    fireEvent.change(screen.getByPlaceholderText('auth.emailAddress'), {
      target: { value: 'not-an-email' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'auth.sendResetLink' }));
    expect(screen.getByRole('alert')).toHaveTextContent('auth.validEmail');
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it('submits a valid email and shows the success state', async () => {
    render(<ForgotPassword onBackToLogin={mocks.navigate} />);
    fireEvent.change(screen.getByPlaceholderText('auth.emailAddress'), {
      target: { value: 'person@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'auth.sendResetLink' }));

    await waitFor(() => {
      expect(mocks.post).toHaveBeenCalledWith('/auth/forgot-password', {
        email: 'person@example.com',
        language: 'es',
      });
    });
    expect(await screen.findByText('auth.checkYourInbox')).toBeInTheDocument();
  });

  it('shows an API error and supports returning to login', async () => {
    mocks.post.mockRejectedValue(new Error('mail service unavailable'));
    render(<ForgotPassword onBackToLogin={mocks.navigate} />);
    fireEvent.change(screen.getByPlaceholderText('auth.emailAddress'), {
      target: { value: 'person@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'auth.sendResetLink' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('mail service unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'auth.backToLogin' }));
    expect(mocks.navigate).toHaveBeenCalled();
  });
});

describe('ResetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.token = 'reset-token';
    mocks.post.mockResolvedValue({});
  });

  it('renders the invalid-token state and links to a new reset request', () => {
    mocks.token = null;
    render(<ResetPassword />);
    expect(screen.getByText('auth.invalidOrExpired')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'auth.requestNewLink' }));
    expect(mocks.navigate).toHaveBeenCalledWith('/forgot-password');
  });

  it('validates password requirements and matching confirmation before submitting', () => {
    render(<ResetPassword />);
    fireEvent.click(screen.getByRole('button', { name: 'auth.resetPassword' }));
    expect(screen.getAllByRole('alert')).toHaveLength(2);

    fireEvent.change(screen.getByPlaceholderText('auth.newPassword'), {
      target: { value: 'weakpass' },
    });
    fireEvent.change(screen.getByPlaceholderText('auth.confirmPassword'), {
      target: { value: 'different' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'auth.resetPassword' }));
    expect(screen.getByText('auth.passwordRequirements')).toBeInTheDocument();
    expect(screen.getByText('auth.passwordsDoNotMatch')).toBeInTheDocument();
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it('submits valid passwords and shows the success state', async () => {
    render(<ResetPassword onPasswordReset={mocks.navigate} />);
    fireEvent.change(screen.getByPlaceholderText('auth.newPassword'), {
      target: { value: 'StrongPass1!' },
    });
    fireEvent.change(screen.getByPlaceholderText('auth.confirmPassword'), {
      target: { value: 'StrongPass1!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'auth.resetPassword' }));

    await waitFor(() => {
      expect(mocks.post).toHaveBeenCalledWith('/auth/reset-password', {
        token: 'reset-token',
        newPassword: 'StrongPass1!',
      });
    });
    expect(await screen.findByText('auth.passwordResetSuccess')).toBeInTheDocument();
  });

  it('shows an API error without navigating away', async () => {
    mocks.post.mockRejectedValue(new Error('reset failed'));
    render(<ResetPassword />);
    fireEvent.change(screen.getByPlaceholderText('auth.newPassword'), {
      target: { value: 'StrongPass1!' },
    });
    fireEvent.change(screen.getByPlaceholderText('auth.confirmPassword'), {
      target: { value: 'StrongPass1!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'auth.resetPassword' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('reset failed');
    expect(mocks.navigate).not.toHaveBeenCalledWith('/login');
  });
});
