import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

const mockDispatch = vi.fn();
const mockSelector = vi.fn();
const mockInitializeAuth = vi.fn();
const mockLoginUser = vi.fn();
const mockLogoutUser = vi.fn();
const mockUpdateProfileThunk = vi.fn();
const mockChangePasswordThunk = vi.fn();
const mockSetUser = vi.fn();
const mockGetAccessToken = vi.fn();

vi.mock('@redux/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: any) => mockSelector(selector),
}));

vi.mock('@redux/slices/authSlice', () => ({
  initializeAuth: (...args: any[]) => mockInitializeAuth(...args),
  loginUser: (...args: any[]) => mockLoginUser(...args),
  logoutUser: (...args: any[]) => mockLogoutUser(...args),
  updateProfile: (...args: any[]) => mockUpdateProfileThunk(...args),
  changePassword: (...args: any[]) => mockChangePasswordThunk(...args),
  setUser: (...args: any[]) => mockSetUser(...args),
}));

vi.mock('@api/client', () => ({
  authStorage: {
    getAccessToken: (...args: any[]) => mockGetAccessToken(...args),
  },
}));

function TestConsumer() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="user">{auth.currentUser ? auth.currentUser.username : 'null'}</span>
      <span data-testid="token">{auth.token ?? 'null'}</span>
      <span data-testid="loading">{String(auth.isLoading)}</span>
      <button data-testid="btn-login" onClick={() => auth.login({ username: 'test' })}>Login</button>
      <button data-testid="btn-logout" onClick={() => auth.logout()}>Logout</button>
      <button data-testid="btn-setuser" onClick={() => auth.setCurrentUser({ id: 'u1', username: 'manual' })}>SetUser</button>
      <button data-testid="btn-update" onClick={async () => { await auth.updateProfile({ bio: 'new' }); }}>Update</button>
      <button data-testid="btn-changepw" onClick={async () => { await auth.changePassword('old', 'new'); }}>ChangePw</button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    mockDispatch.mockReset();
    mockSelector.mockReset();
    mockGetAccessToken.mockReset();
    mockInitializeAuth.mockReset();
    mockLoginUser.mockReset();
    mockLogoutUser.mockReset();
    mockSetUser.mockReset();
    mockUpdateProfileThunk.mockReset();
    mockChangePasswordThunk.mockReset();

    mockGetAccessToken.mockReturnValue('token-123');

    mockSelector.mockImplementation((selector: any) => {
      const state = { auth: { user: null, isLoading: true } };
      return selector(state);
    });
  });

  it('debería renderizar children', () => {
    renderWithProvider();
    expect(screen.getByTestId('user')).toBeInTheDocument();
    expect(screen.getByTestId('user').textContent).toBe('null');
  });

  it('debería inicializar auth al montar', () => {
    renderWithProvider();
    expect(mockDispatch).toHaveBeenCalled();
    expect(mockInitializeAuth).toHaveBeenCalled();
  });

  it('debería leer el token de authStorage', () => {
    renderWithProvider();
    expect(screen.getByTestId('token').textContent).toBe('token-123');
  });

  it('debería exponer isLoading desde el store', () => {
    renderWithProvider();
    expect(screen.getByTestId('loading').textContent).toBe('true');
  });

  it('debería exponer currentUser cuando hay usuario', () => {
    mockSelector.mockImplementation((selector: any) => {
      const state = {
        auth: { user: { id: 'u1', username: 'testuser' }, isLoading: false },
      };
      return selector(state);
    });

    renderWithProvider();
    expect(screen.getByTestId('user').textContent).toBe('testuser');
    expect(screen.getByTestId('loading').textContent).toBe('false');
  });

  it('login debería despachar loginUser', async () => {
    renderWithProvider();
    screen.getByTestId('btn-login').click();
    expect(mockLoginUser).toHaveBeenCalledWith({ username: 'test' });
    expect(mockDispatch).toHaveBeenCalled();
  });

  it('logout debería despachar logoutUser', () => {
    renderWithProvider();
    screen.getByTestId('btn-logout').click();
    expect(mockLogoutUser).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalled();
  });

  it('setCurrentUser debería despachar setUser', () => {
    renderWithProvider();
    screen.getByTestId('btn-setuser').click();
    expect(mockSetUser).toHaveBeenCalledWith({ id: 'u1', username: 'manual' });
    expect(mockDispatch).toHaveBeenCalled();
  });

  it('updateProfile debería despachar updateProfileThunk', async () => {
    mockDispatch.mockResolvedValue({ payload: { id: 'u1' } });
    renderWithProvider();
    await screen.getByTestId('btn-update').click();
    expect(mockUpdateProfileThunk).toHaveBeenCalledWith({ bio: 'new' });
  });

  it('changePassword debería despachar changePasswordThunk', async () => {
    mockDispatch.mockResolvedValue({ payload: { success: true } });
    renderWithProvider();
    await screen.getByTestId('btn-changepw').click();
    expect(mockChangePasswordThunk).toHaveBeenCalledWith({
      currentPassword: 'old',
      newPassword: 'new',
    });
  });

  it('useAuth debería retornar valores default fuera del provider', () => {
    const { getByTestId } = render(<TestConsumer />);
    expect(getByTestId('user').textContent).toBe('null');
  });

  it('debería ejecutar default functions fuera del provider sin error', async () => {
    render(<TestConsumer />);
    screen.getByTestId('btn-login').click();
    screen.getByTestId('btn-logout').click();
    screen.getByTestId('btn-setuser').click();
    await screen.getByTestId('btn-update').click();
    await screen.getByTestId('btn-changepw').click();
  });
});
