import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import authReducer, {
  loginUser,
  clearAuth,
  setUser,
  initializeAuth,
  logoutUser,
  updateProfile,
  changePassword,
  type AuthState,
} from './authSlice';
import type { User } from '@typings/index';

const mockUser: User = {
  id: '123',
  name: 'Juan',
  username: 'juanperez',
  email: 'juan@test.com',
  avatar: 'https://example.com/avatar.jpg',
  hasPassword: true,
  role: 'user',
  language: 'es',
};

const mocks = vi.hoisted(() => ({
  mockGetUserId: vi.fn(),
  mockSetTokens: vi.fn(),
  mockClearSession: vi.fn(),
  mockGetAccessToken: vi.fn(),
  mockApiGet: vi.fn(),
  mockApiPost: vi.fn(),
  mockApiPatch: vi.fn(),
  mockChangeLanguage: vi.fn(),
  mockReplaceState: vi.fn(),
}));

vi.mock('@services/i18n', () => ({
  default: { language: 'es', changeLanguage: mocks.mockChangeLanguage },
}));

vi.mock('@api/client', () => ({
  apiClient: {
    get: (...args: any[]) => mocks.mockApiGet(...args),
    post: (...args: any[]) => mocks.mockApiPost(...args),
    patch: (...args: any[]) => mocks.mockApiPatch(...args),
  },
  authStorage: {
    getUserId: (...args: any[]) => mocks.mockGetUserId(...args),
    setTokens: (...args: any[]) => mocks.mockSetTokens(...args),
    clearSession: (...args: any[]) => mocks.mockClearSession(...args),
    getAccessToken: (...args: any[]) => mocks.mockGetAccessToken(...args),
  },
}));

function createStore() {
  return configureStore({ reducer: { auth: authReducer } });
}

describe('authSlice', () => {
  let initialState: AuthState;

  beforeEach(() => {
    initialState = authReducer(undefined, { type: 'unknown' });
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    mocks.mockReplaceState.mockImplementation(() => {});
    window.history.replaceState = mocks.mockReplaceState;
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.search = '';
  });

  it('debería tener isLoading true inicialmente', () => {
    expect(initialState.isLoading).toBe(true);
    expect(initialState.user).toBeNull();
    expect(initialState.isAuthenticated).toBe(false);
  });

  describe('loginUser', () => {
    it('debería setear el usuario y marcar como autenticado', () => {
      const state = authReducer(initialState, loginUser(mockUser));

      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('debería persistir el usuario en localStorage y sessionStorage', () => {
      authReducer(initialState, loginUser(mockUser));

      const saved = localStorage.getItem('etribunal_user');
      expect(saved).toBeDefined();
      expect(JSON.parse(saved!).username).toBe('juanperez');
      expect(sessionStorage.getItem('etribunal_just_logged_in')).toBe('true');
    });

    it('debería cambiar idioma si el usuario tiene language diferente', () => {
      const userEn: User = { ...mockUser, language: 'en' };
      authReducer(initialState, loginUser(userEn));
      expect(mocks.mockChangeLanguage).toHaveBeenCalledWith('en');
    });

    it('NO debería cambiar idioma si es el mismo', () => {
      authReducer(initialState, loginUser(mockUser));
      expect(mocks.mockChangeLanguage).not.toHaveBeenCalled();
    });
  });

  describe('clearAuth', () => {
    it('debería resetear el estado a no autenticado', () => {
      const loggedIn = authReducer(initialState, loginUser(mockUser));
      const cleared = authReducer(loggedIn, clearAuth());

      expect(cleared.user).toBeNull();
      expect(cleared.isAuthenticated).toBe(false);
      expect(cleared.isLoading).toBe(false);
    });
  });

  describe('setUser', () => {
    it('debería setear el usuario y marcar autenticado', () => {
      const state = authReducer(initialState, setUser(mockUser));
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('debería marcar no autenticado si se pasa null', () => {
      const loggedIn = authReducer(initialState, setUser(mockUser));
      const cleared = authReducer(loggedIn, setUser(null));
      expect(cleared.user).toBeNull();
      expect(cleared.isAuthenticated).toBe(false);
    });
  });

  describe('initializeAuth', () => {
    it('pending debería setear isLoading true', () => {
      const state = authReducer(initialState, { type: initializeAuth.pending.type });
      expect(state.isLoading).toBe(true);
    });

    it('fulfilled con null debería dejar no autenticado', () => {
      const state = authReducer(initialState, {
        type: initializeAuth.fulfilled.type,
        payload: { user: null },
      });
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });

    it('fulfilled con usuario debería autenticar', () => {
      const state = authReducer(initialState, {
        type: initializeAuth.fulfilled.type,
        payload: { user: mockUser },
      });
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('rejected debería resetear a no autenticado', () => {
      const state = authReducer(initialState, {
        type: initializeAuth.rejected.type,
      });
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });

    it('debería procesar login social desde URL params', async () => {
      const origLocation = window.location;
      const socialSearch =
        '?token=social-token&user=' +
        encodeURIComponent(
          JSON.stringify({
            id: 'social-1',
            username: 'socialuser',
            email: 'social@test.com',
            avatar_url: 'https://avatar.com/img.jpg',
            language: 'en',
            role: 'user',
            votes: { case1: 'side_a' },
          })
        ) +
        '&refresh_token=refresh-123';
      Object.defineProperty(window, 'location', {
        value: { search: socialSearch, pathname: '/', href: 'http://localhost:3000/' },
        writable: true,
      });

      mocks.mockGetUserId.mockReturnValue(null);

      const store = createStore();
      await store.dispatch(initializeAuth());

      const state = store.getState().auth;
      expect(state.user).not.toBeNull();
      expect(state.user!.username).toBe('socialuser');
      expect(state.user!.language).toBe('en');
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(mocks.mockSetTokens).toHaveBeenCalledWith('social-token', 'refresh-123');
      expect(mocks.mockReplaceState).toHaveBeenCalled();
      expect(mocks.mockChangeLanguage).toHaveBeenCalledWith('en');

      Object.defineProperty(window, 'location', {
        value: origLocation,
        writable: true,
      });
    });

    it('debería procesar login social con mismo idioma (no cambia)', async () => {
      const origLocation = window.location;
      const socialSearch =
        '?token=social-token&user=' +
        encodeURIComponent(
          JSON.stringify({
            id: 'social-1',
            username: 'socialuser',
            email: 'social@test.com',
            avatar_url: 'https://avatar.com/img.jpg',
            language: 'es',
            role: 'user',
            votes: { case1: 'side_a' },
          })
        );
      Object.defineProperty(window, 'location', {
        value: { search: socialSearch, pathname: '/', href: 'http://localhost:3000/' },
        writable: true,
      });
      mocks.mockGetUserId.mockReturnValue(null);

      const store = createStore();
      await store.dispatch(initializeAuth());
      expect(mocks.mockChangeLanguage).not.toHaveBeenCalled();

      Object.defineProperty(window, 'location', {
        value: origLocation,
        writable: true,
      });
    });

    it('debería procesar login social sin username (usa name fallback)', async () => {
      const origLocation = window.location;
      const socialSearch =
        '?token=t2&user=' +
        encodeURIComponent(
          JSON.stringify({
            id: 'social-2', name: 'NombreSinUser', email: 'nouser@test.com',
            language: 'en', role: 'user', votes: {},
          })
        );
      Object.defineProperty(window, 'location', {
        value: { search: socialSearch, pathname: '/', href: 'http://localhost:3000/' },
        writable: true,
      });
      mocks.mockGetUserId.mockReturnValue(null);

      const store = createStore();
      await store.dispatch(initializeAuth());
      const state = store.getState().auth;
      expect(state.user!.name).toBe('NombreSinUser');
      expect(state.user!.username).toBeUndefined();

      Object.defineProperty(window, 'location', {
        value: origLocation,
        writable: true,
      });
    });

    it('debería procesar login social sin avatar (picsum fallback)', async () => {
      const origLocation = window.location;
      const socialSearch =
        '?token=t3&user=' +
        encodeURIComponent(
          JSON.stringify({
            id: 'social-3', username: 'noavatar', email: 'no@test.com',
            language: 'en', role: 'user', votes: {},
          })
        );
      Object.defineProperty(window, 'location', {
        value: { search: socialSearch, pathname: '/', href: 'http://localhost:3000/' },
        writable: true,
      });
      mocks.mockGetUserId.mockReturnValue(null);

      const store = createStore();
      await store.dispatch(initializeAuth());
      const state = store.getState().auth;
      expect(state.user!.avatar).toContain('picsum.photos/seed/social-3');

      Object.defineProperty(window, 'location', {
        value: origLocation,
        writable: true,
      });
    });

    it('debería procesar login social con hasPassword explícito', async () => {
      const origLocation = window.location;
      const socialSearch =
        '?token=t4&user=' +
        encodeURIComponent(
          JSON.stringify({
            id: 'social-4', username: 'hpuser', email: 'hp@test.com',
            avatar_url: 'https://img.com/a.jpg', hasPassword: false,
            language: 'en', role: 'user', votes: {},
          })
        );
      Object.defineProperty(window, 'location', {
        value: { search: socialSearch, pathname: '/', href: 'http://localhost:3000/' },
        writable: true,
      });
      mocks.mockGetUserId.mockReturnValue(null);

      const store = createStore();
      await store.dispatch(initializeAuth());
      const state = store.getState().auth;
      expect(state.user!.hasPassword).toBe(false);

      Object.defineProperty(window, 'location', {
        value: origLocation,
        writable: true,
      });
    });

    it('debería restaurar sesión desde localStorage sin fetch si isJustLoggedIn', async () => {
      localStorage.setItem('etribunal_user', JSON.stringify(mockUser));
      sessionStorage.setItem('etribunal_just_logged_in', 'true');
      mocks.mockGetUserId.mockReturnValue('123');

      const store = createStore();
      await store.dispatch(initializeAuth());

      const state = store.getState().auth;
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(mocks.mockApiGet).not.toHaveBeenCalled();
    });

    it('debería restaurar sesión y fetchear perfil fresco', async () => {
      localStorage.setItem('etribunal_user', JSON.stringify(mockUser));
      mocks.mockGetUserId.mockReturnValue('123');
      mocks.mockApiGet.mockResolvedValue({
        id: '123',
        username: 'juanperez',
        email: 'juan@test.com',
        avatar_url: 'https://new-avatar.jpg',
        votes: { case1: 'side_a' },
        hasPassword: true,
        role: 'user',
        language: 'es',
        is_anonymous: false,
        bio: 'Hola',
      });

      const store = createStore();
      await store.dispatch(initializeAuth());

      const state = store.getState().auth;
      expect(state.user).not.toBeNull();
      expect(state.user!.avatar).toBe('https://new-avatar.jpg');
      expect(state.isAuthenticated).toBe(true);
    });

    it('debería mantener usuario en localStorage si falla el fetch del perfil', async () => {
      localStorage.setItem('etribunal_user', JSON.stringify(mockUser));
      mocks.mockGetUserId.mockReturnValue('123');
      mocks.mockApiGet.mockRejectedValue(new Error('Network error'));

      const store = createStore();
      await store.dispatch(initializeAuth());

      const state = store.getState().auth;
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('debería retornar user null si no hay sesión guardada', async () => {
      mocks.mockGetUserId.mockReturnValue(null);

      const store = createStore();
      await store.dispatch(initializeAuth());

      const state = store.getState().auth;
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('debería cambiar idioma si el perfil fresco tiene language diferente', async () => {
      localStorage.setItem('etribunal_user', JSON.stringify(mockUser));
      mocks.mockGetUserId.mockReturnValue('123');
      mocks.mockApiGet.mockResolvedValue({
        id: '123', username: 'juanperez', email: 'juan@test.com',
        avatar_url: 'https://example.com/avatar.jpg', votes: {},
        hasPassword: true, role: 'user', language: 'en',
      });

      const store = createStore();
      await store.dispatch(initializeAuth());
      expect(mocks.mockChangeLanguage).toHaveBeenCalledWith('en');
    });

    it('debería mantener usuario si el perfil fresco no cambia (hasChanged=false)', async () => {
      const savedUser = { ...mockUser, name: 'juanperez', votes: {} };
      localStorage.setItem('etribunal_user', JSON.stringify(savedUser));
      mocks.mockGetUserId.mockReturnValue('123');
      mocks.mockApiGet.mockResolvedValue({
        id: '123', username: 'juanperez', email: 'juan@test.com',
        avatar_url: 'https://example.com/avatar.jpg', votes: {},
        hasPassword: true, role: 'user', language: 'es',
      });

      const store = createStore();
      await store.dispatch(initializeAuth());
      const state = store.getState().auth;
      expect(state.user).toEqual(savedUser);
    });

    it('debería rechazar con error si JSON del usuario es inválido', async () => {
      localStorage.setItem('etribunal_user', '{invalid}');
      mocks.mockGetUserId.mockReturnValue('123');

      const store = createStore();
      const result = await store.dispatch(initializeAuth());
      expect(result.type).toBe('auth/initialize/rejected');
    });

    it('debería mantener usuario con savedUser si API devuelve null (catch block)', async () => {
      localStorage.setItem('etribunal_user', JSON.stringify(mockUser));
      mocks.mockGetUserId.mockReturnValue('123');
      mocks.mockApiGet.mockResolvedValue(null);

      const store = createStore();
      const result = await store.dispatch(initializeAuth());
      expect(result.type).toBe('auth/initialize/fulfilled');
      expect(store.getState().auth.user).toEqual(mockUser);
    });

    it('debería restaurar con fallbacks desde savedUser si API no devuelve username/name', async () => {
      localStorage.setItem('etribunal_user', JSON.stringify(mockUser));
      mocks.mockGetUserId.mockReturnValue('123');
      mocks.mockApiGet.mockResolvedValue({
        id: '123', avatar_url: 'https://new-avatar.jpg', hasPassword: true, language: 'es',
      });

      const store = createStore();
      await store.dispatch(initializeAuth());
      const state = store.getState().auth;
      expect(state.user!.name).toBe('Juan');
      expect(state.user!.email).toBe('juan@test.com');
      expect(state.user!.username).toBe('juanperez');
      expect(state.user!.role).toBe('user');
    });

    it('debería restaurar con fallbacks cuando API falta avatar/username/votes', async () => {
      const userNoFields: User = { ...mockUser, avatar: 'https://old-avatar.jpg', votes: { c1: 'side_a' } };
      localStorage.setItem('etribunal_user', JSON.stringify(userNoFields));
      mocks.mockGetUserId.mockReturnValue('123');
      mocks.mockApiGet.mockResolvedValue({
        id: '123', username: 'newuser', email: 'new@test.com', language: 'es',
      });

      const store = createStore();
      await store.dispatch(initializeAuth());
      const state = store.getState().auth;
      expect(state.user!.username).toBe('newuser');
      expect(state.user!.avatar).toBe('https://old-avatar.jpg');
      expect(state.user!.votes).toEqual({ c1: 'side_a' });
    });

    it('debería restaurar sesión con username desde apiUser.name si no hay username', async () => {
      localStorage.setItem('etribunal_user', JSON.stringify(mockUser));
      mocks.mockGetUserId.mockReturnValue('123');
      mocks.mockApiGet.mockResolvedValue({
        id: '123', name: 'nombreSinUser', email: 'nuevo@test.com',
        avatar_url: 'https://img.com/a.jpg', hasPassword: true, role: 'user', language: 'es', votes: {},
      });

      const store = createStore();
      await store.dispatch(initializeAuth());
      const state = store.getState().auth;
      expect(state.user!.name).toBe('nombreSinUser');
    });

    it('debería restaurar sin hasPassword si API no lo devuelve', async () => {
      const userNoHP: User = { ...mockUser, hasPassword: true };
      localStorage.setItem('etribunal_user', JSON.stringify(userNoHP));
      mocks.mockGetUserId.mockReturnValue('123');
      mocks.mockApiGet.mockResolvedValue({
        id: '123', username: 'juanperez', email: 'juan@test.com',
        avatar_url: 'https://img.com/a.jpg', language: 'es', votes: {},
      });

      const store = createStore();
      await store.dispatch(initializeAuth());
      const state = store.getState().auth;
      expect(state.user!.hasPassword).toBe(true);
    });
  });

  describe('logoutUser', () => {
    it('fulfilled debería resetear estado', () => {
      const loggedIn = authReducer(initialState, loginUser(mockUser));
      const state = authReducer(loggedIn, { type: logoutUser.fulfilled.type });
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });

    it('debería llamar al API y limpiar sesión', async () => {
      mocks.mockApiPost.mockResolvedValue({});

      const store = createStore();
      await store.dispatch(logoutUser());

      expect(mocks.mockApiPost).toHaveBeenCalledWith('/auth/logout', {});
      expect(mocks.mockClearSession).toHaveBeenCalled();
      expect(localStorage.getItem('etribunal_user')).toBeNull();
      expect(sessionStorage.getItem('etribunal_just_logged_in')).toBeNull();
      expect(mocks.mockReplaceState).toHaveBeenCalled();
    });

    it('debería limpiar sesión incluso si el API falla', async () => {
      mocks.mockApiPost.mockRejectedValue(new Error('API error'));

      const store = createStore();
      await store.dispatch(logoutUser());

      expect(mocks.mockClearSession).toHaveBeenCalled();
      expect(localStorage.getItem('etribunal_user')).toBeNull();
    });
  });

  describe('updateProfile', () => {
    it('fulfilled debería actualizar el usuario en el estado', () => {
      const state = authReducer(
        { ...initialState, user: mockUser },
        { type: updateProfile.fulfilled.type, payload: { ...mockUser, name: 'NuevoNombre' } }
      );
      expect(state.user?.name).toBe('NuevoNombre');
    });

    it('debería actualizar perfil exitosamente', async () => {
      const profileUser: User = { ...mockUser, name: 'NuevoNombre' };
      const store = configureStore({
        reducer: { auth: authReducer },
        preloadedState: { auth: { user: mockUser, isAuthenticated: true, isLoading: false } },
      });

      mocks.mockApiPatch.mockResolvedValue({
        username: 'NuevoNombre',
        email: 'juan@test.com',
        language: 'es',
      });

      const result = await store.dispatch(
        updateProfile({ name: 'NuevoNombre' } as Partial<User>)
      );

      expect(result.type).toBe('auth/updateProfile/fulfilled');
      expect(mocks.mockApiPatch).toHaveBeenCalledWith('/users/profile/me', { username: 'NuevoNombre' });
    });

    it('debería rechazar si no hay usuario logueado', async () => {
      const store = configureStore({
        reducer: { auth: authReducer },
        preloadedState: { auth: { user: null, isAuthenticated: false, isLoading: false } },
      });

      const result = await store.dispatch(updateProfile({ name: 'Test' } as Partial<User>));

      expect(result.type).toBe('auth/updateProfile/rejected');
    });

    it('debería rechazar si el API falla', async () => {
      const store = configureStore({
        reducer: { auth: authReducer },
        preloadedState: { auth: { user: mockUser, isAuthenticated: true, isLoading: false } },
      });

      mocks.mockApiPatch.mockRejectedValue(new Error('API error'));

      const result = await store.dispatch(
        updateProfile({ name: 'NuevoNombre' } as Partial<User>)
      );

      expect(result.type).toBe('auth/updateProfile/rejected');
    });

    it('debería cambiar idioma si el API devuelve language diferente', async () => {
      const store = configureStore({
        reducer: { auth: authReducer },
        preloadedState: { auth: { user: mockUser, isAuthenticated: true, isLoading: false } },
      });

      mocks.mockApiPatch.mockResolvedValue({
        username: 'juanperez',
        email: 'juan@test.com',
        language: 'en',
      });

      await store.dispatch(updateProfile({ language: 'en' } as Partial<User>));

      expect(mocks.mockChangeLanguage).toHaveBeenCalledWith('en');
    });

    it('debería actualizar perfil sin cambiar nombre (solo email)', async () => {
      const store = configureStore({
        reducer: { auth: authReducer },
        preloadedState: { auth: { user: mockUser, isAuthenticated: true, isLoading: false } },
      });

      mocks.mockApiPatch.mockResolvedValue({
        username: 'juanperez', email: 'nuevo@email.com', language: 'es',
      });

      const result = await store.dispatch(updateProfile({ email: 'nuevo@email.com' } as Partial<User>));

      expect(result.type).toBe('auth/updateProfile/fulfilled');
      expect(mocks.mockApiPatch).toHaveBeenCalledWith('/users/profile/me', { email: 'nuevo@email.com' });
    });

    it('debería usar fallbacks si API updateProfile no devuelve username/avatar/bio/is_anonymous', async () => {
      const store = configureStore({
        reducer: { auth: authReducer },
        preloadedState: { auth: { user: { ...mockUser, bio: 'mi bio', is_anonymous: false }, isAuthenticated: true, isLoading: false } },
      });

      mocks.mockApiPatch.mockResolvedValue({
        email: 'nuevo@test.com', language: 'es',
      });

      await store.dispatch(updateProfile({ email: 'nuevo@test.com' } as Partial<User>));
      const state = store.getState().auth;
      expect(state.user!.name).toBe('Juan');
      expect(state.user!.email).toBe('nuevo@test.com');
      expect(state.user!.avatar).toBe('https://example.com/avatar.jpg');
      expect(state.user!.bio).toBe('mi bio');
      expect(state.user!.is_anonymous).toBe(false);
    });
  });

  describe('changePassword', () => {
    it('fulfilled no debería modificar estado', () => {
      const state = authReducer(initialState, { type: changePassword.fulfilled.type });
      expect(state).toEqual(initialState);
    });

    it('debería cambiar contraseña exitosamente', async () => {
      mocks.mockApiPatch.mockResolvedValue({});

      const store = createStore();
      const result = await store.dispatch(
        changePassword({ currentPassword: 'old123', newPassword: 'new456' })
      );

      expect(result.type).toBe('auth/changePassword/fulfilled');
      expect(mocks.mockApiPatch).toHaveBeenCalledWith('/auth/change-password', {
        currentPassword: 'old123',
        newPassword: 'new456',
      });
    });

    it('debería rechazar si el API falla', async () => {
      mocks.mockApiPatch.mockRejectedValue(new Error('API error'));

      const store = createStore();
      const result = await store.dispatch(
        changePassword({ currentPassword: 'old123', newPassword: 'new456' })
      );

      expect(result.type).toBe('auth/changePassword/rejected');
    });
  });
});
