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
      const isJustLoggedIn =
        sessionStorage.getItem('etribunal_just_logged_in') === 'true';

      // Verificar si hay un login social pendiente en la URL
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('token');
      const userStr = params.get('user');

      if (urlToken && userStr) {
        // Procesar login social
        const apiUser = JSON.parse(userStr);
        const refreshToken = params.get('refresh_token');

        const socialLanguage = apiUser.language || 'es';
        if (socialLanguage && i18n.language !== socialLanguage) {
          i18n.changeLanguage(socialLanguage);
        }

        const mappedUser: User = {
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
          language: socialLanguage,
        };

        if (urlToken) {
          authStorage.setTokens(urlToken, refreshToken || undefined);
        }

        // Persistir y limpiar URL
        localStorage.setItem(
          'etribunal_user',
          JSON.stringify(mappedUser)
        );
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );

        return { user: mappedUser };
      }

      // Restaurar sesión desde localStorage
      if (savedUser && userId) {
        const user = JSON.parse(savedUser);

        if (!isJustLoggedIn) {
          // Fetch perfil fresco desde el backend
          try {
            const apiUser: any = await apiClient.get('/users/profile/me');

            if (!apiUser) throw new Error('No user data returned');

            const userLanguage = apiUser.language || user.language || 'es';
            if (userLanguage && i18n.language !== userLanguage) {
              i18n.changeLanguage(userLanguage);
            }

            const freshUser: User = {
              ...user,
              id: apiUser.id,
              name: apiUser.username || apiUser.name || user.name,
              username: apiUser.username || user.username,
              email: apiUser.email || user.email,
              avatar:
                apiUser.avatar_url || apiUser.avatarUrl || apiUser.avatar || user.avatar,
              votes: apiUser.votes || user.votes || {},
              hasPassword:
                apiUser.hasPassword !== undefined
                  ? apiUser.hasPassword
                  : user.hasPassword,
              is_anonymous:
                apiUser.is_anonymous !== undefined
                  ? apiUser.is_anonymous
                  : user.is_anonymous,
              bio: apiUser.bio !== undefined ? apiUser.bio : user.bio,
              role: apiUser.role || user.role,
              language: userLanguage,
            };

            const hasChanged =
              JSON.stringify(freshUser) !== savedUser;
            if (hasChanged) {
              localStorage.setItem(
                'etribunal_user',
                JSON.stringify(freshUser)
              );
              return { user: freshUser };
            }

            return { user };
          } catch {
            // Si falla el fetch, mantener el usuario en localStorage
            return { user };
          }
        }

        return { user };
      }

      return { user: null };
    } catch (error) {
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
    } catch (error) {
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
      sessionStorage.setItem('etribunal_just_logged_in', 'true');
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
