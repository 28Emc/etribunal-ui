import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Login } from './LoginModal';

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn(),
  setTokens: vi.fn(),
  login: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock('@api/client', () => ({
  apiClient: { post: mocks.post, get: mocks.get },
  authStorage: { setTokens: mocks.setTokens },
}));

vi.mock('@context/AuthContext', () => ({
  useAuth: () => ({ login: mocks.login }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'es' },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

vi.mock('@hooks/useTheme', () => ({ useTheme: () => 'dark' }));
vi.mock('@hooks/useDebounce', () => ({ useDebounce: <T,>(value: T) => value }));

vi.mock('motion/react', () => ({
  motion: new Proxy({}, { get: (_target, tag: string) => tag }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('lucide-react', () => {
  const icon = () => <span aria-hidden="true" />;
  return {
    Mail: icon,
    Lock: icon,
    Globe: icon,
    Apple: icon,
    MessageCircle: icon,
    User: icon,
    AlertCircle: icon,
    X: icon,
    Loader2: icon,
    CheckCircle: icon,
    Eye: icon,
    EyeOff: icon,
    Check: icon,
  };
});

const user = {
  id: 'user-1',
  username: 'judge1',
  email: 'judge@example.com',
};

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue({ emailExists: false, usernameExists: false });
  });

  it('shows required-field validation before making a login request', () => {
    render(<Login />);

    fireEvent.click(screen.getByRole('button', { name: 'auth.enterTribunal' }));

    expect(screen.getByText('auth.emailRequired')).toBeInTheDocument();
    expect(screen.getByText('auth.passwordRequired')).toBeInTheDocument();
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it('logs in with valid credentials and reports success to the parent', async () => {
    const onLoginSuccess = vi.fn();
    mocks.post.mockResolvedValue({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      user,
    });

    render(<Login onLoginSuccess={onLoginSuccess} />);
    fireEvent.change(screen.getByLabelText('auth.emailAddress'), {
      target: { value: user.email },
    });
    fireEvent.change(screen.getByLabelText('auth.secretPassword'), {
      target: { value: 'ValidPass1!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'auth.enterTribunal' }));

    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/auth/login', {
      email: user.email,
      password: 'ValidPass1!',
    }));
    expect(mocks.setTokens).toHaveBeenCalledWith('access-token', 'refresh-token', false);
    expect(mocks.login).toHaveBeenCalledWith(expect.objectContaining({ id: user.id }));
    expect(onLoginSuccess).toHaveBeenCalledOnce();
  });

  it('renders a server error when login fails', async () => {
    mocks.post.mockRejectedValue(new Error('Invalid credentials'));

    render(<Login />);
    fireEvent.change(screen.getByLabelText('auth.emailAddress'), {
      target: { value: 'judge@example.com' },
    });
    fireEvent.change(screen.getByLabelText('auth.secretPassword'), {
      target: { value: 'ValidPass1!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'auth.enterTribunal' }));

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
    expect(mocks.login).not.toHaveBeenCalled();
  });

  it('validates registration fields and does not submit incomplete data', () => {
    render(<Login initialIsSignUp />);

    fireEvent.click(screen.getByRole('button', { name: 'auth.applyToTribunal' }));

    expect(screen.getByText('auth.emailRequired')).toBeInTheDocument();
    expect(screen.getByText('auth.passwordRequired')).toBeInTheDocument();
    expect(screen.getByText('auth.usernameRequired')).toBeInTheDocument();
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it('registers a valid account and stores its tokens', async () => {
    mocks.post.mockResolvedValue({
      access_token: 'register-access',
      refresh_token: 'register-refresh',
      user,
    });

    render(<Login initialIsSignUp />);
    fireEvent.change(screen.getByLabelText('auth.anonymousJudgeHandle'), {
      target: { value: user.username },
    });
    fireEvent.change(screen.getByLabelText('auth.emailAddress'), {
      target: { value: user.email },
    });
    fireEvent.change(screen.getByLabelText('auth.secretPassword'), {
      target: { value: 'ValidPass1!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'auth.applyToTribunal' }));

    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/auth/register', {
      username: user.username,
      email: user.email,
      password: 'ValidPass1!',
      language: 'es',
    }));
    expect(mocks.setTokens).toHaveBeenCalledWith('register-access', 'register-refresh');
    expect(mocks.login).toHaveBeenCalledWith(expect.objectContaining({ username: user.username }));
  });
});
