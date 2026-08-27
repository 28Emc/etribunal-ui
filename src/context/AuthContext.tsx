import { createContext, useContext, useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@redux/hooks';
import {
  loginUser as loginUserAction,
  logoutUser,
  updateProfile as updateProfileThunk,
  changePassword as changePasswordThunk,
  setUser,
  initializeAuth,
} from '@redux/slices/authSlice';
import { authStorage } from '@api/client';
import type { User } from '@typings/index';

export interface AuthContextType {
  currentUser: User | null;
  login: (user: any) => Promise<any>;
  updateProfile: (data: any) => Promise<any>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<any>;
  setCurrentUser: (user: any) => void;
  logout: () => void;
  token: string | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  login: async () => {},
  updateProfile: async () => {},
  changePassword: async () => {},
  setCurrentUser: () => {},
  logout: () => {},
  token: null,
  isLoading: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const dispatch = useAppDispatch();
  const { user, isLoading } = useAppSelector((state) => state.auth);
  const token = authStorage.getAccessToken();

  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  const login = useCallback(async (userData: any) => {
    dispatch(loginUserAction(userData));
    return userData;
  }, [dispatch]);

  const logout = useCallback(() => {
    dispatch(logoutUser());
  }, [dispatch]);

  const updateProfile = useCallback(async (data: any) => {
    const result = await dispatch(updateProfileThunk(data));
    return result.payload;
  }, [dispatch]);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      const result = await dispatch(
        changePasswordThunk({ currentPassword, newPassword })
      );
      return result.payload;
    },
    [dispatch]
  );

  const setCurrentUser = useCallback(
    (userData: any) => {
      dispatch(setUser(userData));
    },
    [dispatch]
  );

  return (
    <AuthContext.Provider
      value={{
        currentUser: user,
        login,
        updateProfile,
        changePassword,
        setCurrentUser,
        logout,
        token,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
