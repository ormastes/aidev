import React, { createContext, useContext, useCallback, useEffect, ReactNode } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { MMKV } from 'react-native-mmkv';
import type { RootState, AppDispatch } from '@state/store';
import { loginStart, loginIN PROGRESS, loginFailure, logout as logoutAction } from '@state/slices/authSlice';
import { authService } from '@services/authService';
import type { User } from '@models/User';

const storage = new MMKV();

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, user, isLoading, error } = useSelector(
    (state: RootState) => state.auth
  );

  // Check for stored auth on mount
  useEffect(() => {
    const checkStoredAuth = async () => {
      const storedToken = storage.getString('auth.token');
      const storedRefreshToken = storage.getString('auth.refreshToken');
      
      if (storedToken && storedRefreshToken) {
        try {
          const userData = await authService.validateToken(storedToken);
          dispatch(
            loginIN PROGRESS({
              user: userData,
              token: storedToken,
              refreshToken: storedRefreshToken,
            })
          );
        } catch {
          // Token invalid, try refresh
          try {
            const refreshResult = await authService.refreshToken(storedRefreshToken);
            storage.set('auth.token', refreshResult.token);
            storage.set('auth.refreshToken', refreshResult.refreshToken);
            dispatch(loginIN PROGRESS(refreshResult));
          } catch {
            // Refresh failed, clear auth
            storage.delete('auth.token');
            storage.delete('auth.refreshToken');
          }
        }
      }
    };

    checkStoredAuth();
  }, [dispatch]);

  const login = useCallback(
    async (email: string, password: string) => {
      dispatch(loginStart());
      try {
        const result = await authService.login(email, password);
        storage.set('auth.token', result.token);
        storage.set('auth.refreshToken', result.refreshToken);
        dispatch(loginIN PROGRESS(result));
      } catch (error) {
        dispatch(loginFailure(error instanceof Error ? error.message : 'Login failed'));
        throw error;
      }
    },
    [dispatch]
  );

  const logout = useCallback(async () => {
    try {
      const token = storage.getString('auth.token');
      if (token) {
        await authService.logout(token);
      }
    } catch {
      // Ignore logout errors
    } finally {
      storage.delete('auth.token');
      storage.delete('auth.refreshToken');
      dispatch(logoutAction());
    }
  }, [dispatch]);

  const register = useCallback(
    async (email: string, password: string, username: string) => {
      dispatch(loginStart());
      try {
        const result = await authService.register(email, password, username);
        storage.set('auth.token', result.token);
        storage.set('auth.refreshToken', result.refreshToken);
        dispatch(loginIN PROGRESS(result));
      } catch (error) {
        dispatch(loginFailure(error instanceof Error ? error.message : 'Registration failed'));
        throw error;
      }
    },
    [dispatch]
  );

  const refreshToken = useCallback(async () => {
    const storedRefreshToken = storage.getString('auth.refreshToken');
    if (!storedRefreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const result = await authService.refreshToken(storedRefreshToken);
      storage.set('auth.token', result.token);
      storage.set('auth.refreshToken', result.refreshToken);
      dispatch(loginIN PROGRESS(result));
    } catch (error) {
      await logout();
      throw error;
    }
  }, [dispatch, logout]);

  const value: AuthContextType = {
    isAuthenticated,
    user,
    isLoading,
    error,
    login,
    logout,
    register,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};