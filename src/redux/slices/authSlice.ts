/**
 * ============================================
 * redux/slices/authSlice.ts — Autenticación
 * ============================================
 *
 * ¿Qué hace?
 *   Maneja todo el estado de autenticación del usuario:
 *   login, logout, refresco de perfil, cambio de contraseña.
 *
 * Thunks asíncronos (createAsyncThunk):
 *   - initializeAuth:   Lee localStorage, verifica sesión, fetchea perfil
 *   - socialLogin:      Procesa redirect de login social (Google, Apple, Facebook)
 *   - logoutUser:       Llama /auth/logout, limpia sesión
 *   - updateProfile:    PATCH /users/profile/me
 *   - changePassword:   PATCH /auth/change-password
 *
 * Acciones síncronas:
 *   - loginUser:        Setea usuario manualmente (login tradicional)
 *   - clearAuth:        Reset del estado a initial
 *
 * ¿Por qué createAsyncThunk?
 *   Porque necesitamos manejar 3 estados: pending / fulfilled / rejected.
 *   createAsyncThunk genera automáticamente las actions para cada estado.
 */

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { apiClient, authStorage } from '@api/client';
import type { User } from '@typings/index';
import i18n from '@services/i18n';

// ============================================================
// State
// ============================================================

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true, // empieza en true mientras verificamos sesión
};

// ============================================================
// Helpers
// ============================================================

/** Activa el idioma en i18n solo si difiere del actual. */
function applyLanguage(language?: string | null) {
  if (language && i18n.language !== language) {
    i18n.changeLanguage(language);
  }
}

/** Persiste el usuario en localStorage. */
function persistUser(user: User) {
  localStorage.setItem('etribunal_user', JSON.stringify(user));
}

/** Limpia los parámetros de login social de la URL. */
function cleanSocialParams() {
  window.history.replaceState({}, document.title, window.location.pathname);
}

/** Convierte el payload de login social en el modelo User del frontend. */
function mapSocialUser(apiUser: any): User {
  const language = apiUser.language || 'es';
  applyLanguage(language);
  return {
    id: apiUser.id,
    name: apiUser.username || apiUser.name,
    username: apiUser.username,
    email: apiUser.email || '',
    avatar:
      apiUser.avatar_url ||
      apiUser.avatarUrl ||
      apiUser.avatar ||
      `https://picsum.photos/seed/${apiUser.id}/200`,
    hasPassword:
      apiUser.hasPassword !== undefined
        ? apiUser.hasPassword
        : !!apiUser.password_hash,
    casesCreated: [],
    votes: apiUser.votes || {},
    role: apiUser.role,
    language,
  };
}

/** Procesa el login social pendiente en la URL. null si no hay uno. */
function parseSocialLogin(params: URLSearchParams): { user: User } | null {
  const urlToken = params.get('token');
  const userStr = params.get('user');
  if (!urlToken || !userStr) return null;

  const apiUser = JSON.parse(userStr);
  const refreshToken = params.get('refresh_token');
  const mappedUser = mapSocialUser(apiUser);

  authStorage.setTokens(urlToken, refreshToken || undefined);
  persistUser(mappedUser);
  cleanSocialParams();

  return { user: mappedUser };
}

/** Construye el usuario fresco desde el perfil del backend. */
function mapFreshUser(apiUser: any, savedUser: User): User {
  const userLanguage = apiUser.language || savedUser.language || 'es';
  applyLanguage(userLanguage);
  return {
    ...savedUser,
    id: apiUser.id,
    name: apiUser.username || apiUser.name || savedUser.name,
    username: apiUser.username || savedUser.username,
    email: apiUser.email || savedUser.email,
    avatar:
      apiUser.avatar_url || apiUser.avatarUrl || apiUser.avatar || savedUser.avatar,
    votes: apiUser.votes || savedUser.votes || {},
    hasPassword:
      apiUser.hasPassword !== undefined
        ? apiUser.hasPassword
        : savedUser.hasPassword,
    is_anonymous:
      apiUser.is_anonymous !== undefined
        ? apiUser.is_anonymous
        : savedUser.is_anonymous,
    bio: apiUser.bio !== undefined ? apiUser.bio : savedUser.bio,
    role: apiUser.role || savedUser.role,
    language: userLanguage,
  };
}

/** Refetchea el perfil desde el backend y sincroniza la sesión. */
async function restoreSession(
  savedUser: User,
  savedUserStr: string
): Promise<{ user: User }> {
  try {
    const apiUser: any = await apiClient.get('/users/profile/me');
    if (!apiUser) throw new Error('No user data returned');

    const freshUser = mapFreshUser(apiUser, savedUser);
    const hasChanged = JSON.stringify(freshUser) !== savedUserStr;
    if (hasChanged) {
      persistUser(freshUser);
      return { user: freshUser };
    }

    return { user: savedUser };
  } catch {
    // Si falla el fetch, mantener el usuario en localStorage
    return { user: savedUser };
  }
}

// ============================================================
// Thunks
// ============================================================

/**
 * initializeAuth — Verifica si hay una sesión activa al cargar la app.
 *
 * Flujo:
 *   1. Lee el usuario guardado en localStorage
 *   2. Si existe → restaura sesión inmediatamente (optimista)
 *   3. Si no viene de login reciente → fetchea /users/profile/me
 *      para obtener datos frescos del backend
 *   4. Procesa parámetros de URL (login social)
 */
export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { rejectWithValue }) => {
    try {
      const savedUser = localStorage.getItem('etribunal_user');
      const userId = authStorage.getUserId();
      // El flag de "login reciente" solo se respeta durante 60s: si volvemos a
      // la app después (pestaña rejuvenecida / page refresh), el perfil se
      // refetchea y el interceptor renueva el access token si expiró. Evita
      // quedarse con datos stale indefinidamente tras un refresh de página.
      const justLoggedInTs = Number(
        sessionStorage.getItem('etribunal_just_logged_in')
      );
      const isJustLoggedIn =
        Number.isFinite(justLoggedInTs) && Date.now() - justLoggedInTs < 60_000;

      // Verificar si hay un login social pendiente en la URL
      const params = new URLSearchParams(window.location.search);
      const social = parseSocialLogin(params);
      if (social) return social;

      // Restaurar sesión desde localStorage
      if (savedUser && userId) {
        const user = JSON.parse(savedUser);

        if (!isJustLoggedIn) {
          return await restoreSession(user, savedUser);
        }

        return { user };
      }

      return { user: null };
    } catch {
      return rejectWithValue('Failed to initialize auth');
    }
  }
);

/**
 * logoutUser — Cierra la sesión del usuario.
 *
 * Llama al backend para invalidar el token, luego
 * limpia todo el estado y almacenamiento local.
 */
export const logoutUser = createAsyncThunk(
  'auth/logout',
  async () => {
    try {
      await apiClient.post('/auth/logout', {});
    } catch (error) {
      console.error('[auth] Logout API call failed:', error);
    }

    authStorage.clearSession();
    localStorage.removeItem('etribunal_user');
    sessionStorage.removeItem('etribunal_just_logged_in');
    sessionStorage.removeItem('etribunal_deep_link');
    window.history.replaceState(
      {},
      document.title,
      window.location.pathname
    );
  }
);

/**
 * updateProfile — Actualiza los datos del perfil del usuario.
 */
export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (data: Partial<User>, { getState, rejectWithValue }) => {
    const state = getState() as { auth: AuthState };
    const currentUser = state.auth.user;
    if (!currentUser) return rejectWithValue('User data not found');

    const updateData: any = { ...data };
    if (data.name) {
      updateData.username = data.name;
      delete updateData.name;
    }
    if ((data as any).avatar) {
      updateData.avatar_url = (data as any).avatar;
      delete updateData.avatar;
    }

    try {
      const updatedApiUser: any = await apiClient.patch(
        '/users/profile/me',
        updateData
      );

      const updatedLanguage =
        updatedApiUser.language || data.language || currentUser.language;
      if (updatedLanguage && i18n.language !== updatedLanguage) {
        i18n.changeLanguage(updatedLanguage);
      }

      const updatedMappedUser: User = {
        ...currentUser,
        name: updatedApiUser.username || currentUser.name,
        email: updatedApiUser.email || currentUser.email,
        avatar:
          updatedApiUser.avatar_url ||
          updatedApiUser.avatarUrl ||
          updatedApiUser.avatar ||
          currentUser.avatar,
        bio:
          updatedApiUser.bio !== undefined
            ? updatedApiUser.bio
            : currentUser.bio,
        is_anonymous:
          updatedApiUser.is_anonymous !== undefined
            ? updatedApiUser.is_anonymous
            : currentUser.is_anonymous,
        hasPassword:
          updatedApiUser.hasPassword !== undefined
            ? updatedApiUser.hasPassword
            : currentUser.hasPassword,
        language: updatedLanguage,
      };

      localStorage.setItem(
        'etribunal_user',
        JSON.stringify(updatedMappedUser)
      );
      return updatedMappedUser;
    } catch {
      return rejectWithValue('Error updating profile');
    }
  }
);

/**
 * changePassword — Cambia la contraseña del usuario.
 */
export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async (
    {
      currentPassword,
      newPassword,
    }: { currentPassword: string; newPassword: string },
    { rejectWithValue }
  ) => {
    try {
      await apiClient.patch('/auth/change-password', {
        currentPassword,
        newPassword,
      });
    } catch (error) {
      return rejectWithValue('Error changing password');
    }
  }
);

// ============================================================
// Slice
// ============================================================

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * loginUser — Setea el usuario manualmente (login tradicional).
     * Se usa después de que el componente Login llama al endpoint
     * correspondiente.
     */
    loginUser(state, action: PayloadAction<User>) {
      const user = action.payload;
      state.user = user;
      state.isAuthenticated = true;
      state.isLoading = false;

      if (user.language && i18n.language !== user.language) {
        i18n.changeLanguage(user.language);
      }

      localStorage.setItem('etribunal_user', JSON.stringify(user));
      sessionStorage.setItem('etribunal_just_logged_in', String(Date.now()));
    },

    /** clearAuth — Reset completo del estado */
    clearAuth(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.isLoading = false;
    },

    /** setUser — Actualiza el usuario sin persistencia (usado internamente) */
    setUser(state, action: PayloadAction<User | null>) {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
  },

  // Manejo de los thunks asíncronos
  extraReducers: (builder) => {
    // --- initializeAuth ---
    builder.addCase(initializeAuth.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(initializeAuth.fulfilled, (state, action) => {
      state.user = action.payload.user;
      state.isAuthenticated = !!action.payload.user;
      state.isLoading = false;
    });
    builder.addCase(initializeAuth.rejected, (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isLoading = false;
    });

    // --- logoutUser ---
    builder.addCase(logoutUser.fulfilled, (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isLoading = false;
    });

    // --- updateProfile ---
    builder.addCase(updateProfile.fulfilled, (state, action) => {
      state.user = action.payload;
    });

    // --- changePassword ---
    builder.addCase(changePassword.fulfilled, () => {
      // No hay cambio de estado, solo confirmación
    });
  },
});

export const { loginUser, clearAuth, setUser } = authSlice.actions;
export default authSlice.reducer;
