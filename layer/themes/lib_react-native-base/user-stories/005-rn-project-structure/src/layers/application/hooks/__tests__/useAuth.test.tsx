/**
 * Tests for useAuth hook
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useAuth, AuthProvider } from '../useAuth';
import { authService } from '@services/authService';
import authReducer from '@state/slices/authSlice';

// Mock dependencies
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}));

jest.mock('@services/authService', () => ({
  authService: {
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    refreshToken: jest.fn(),
    validateToken: jest.fn(),
  },
}));

// Create mock store
const createMockStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
  });
};

// Wrapper component
const createWrapper = (store: any) => ({ children }: { children: React.ReactNode }) => (
  <Provider store={store}>
    <AuthProvider>{children}</AuthProvider>
  </Provider>
);

describe('useAuth', () => {
  let store: any;
  let wrapper: any;

  beforeEach(() => {
    store = createMockStore();
    wrapper = createWrapper(store);
    jest.clearAllMocks();
  });

  it('should throw error when used outside AuthProvider', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.error).toEqual(Error('useAuth must be used within an AuthProvider'));
  });

  it('should provide initial auth state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBe(null);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  describe('login', () => {
    it('should successfully login user', async () => {
      const mockUser = { id: '1', email: 'test@example.com', username: "testuser" };
      const mockResponse = {
        user: mockUser,
        token: process.env.TOKEN || "PLACEHOLDER",
        refreshtoken: process.env.TOKEN || "PLACEHOLDER",
      };

      (authService.login as jest.Mock).mockResolvedValue(mockResponse);

      const { result, waitForNextUpdate } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login('test@example.com', "password123");
      });

      expect(authService.login).toHaveBeenCalledWith('test@example.com', "password123");
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
    });

    it('should handle login error', async () => {
      const error = new Error('Invalid credentials');
      (authService.login as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.login('test@example.com', 'wrong');
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBe('Invalid credentials');
    });
  });

  describe('logout', () => {
    it('should successfully logout user', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBe(null);
    });

    it('should handle logout error gracefully', async () => {
      (authService.logout as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.logout();
      });

      // Should still logout locally even if API call fails
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe("register", () => {
    it('should successfully register user', async () => {
      const mockUser = { id: '2', email: 'new@example.com', username: 'newuser' };
      const mockResponse = {
        user: mockUser,
        token: process.env.TOKEN || "PLACEHOLDER",
        refreshtoken: process.env.TOKEN || "PLACEHOLDER",
      };

      (authService.register as jest.Mock).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.register('new@example.com', "password123", 'newuser');
      });

      expect(authService.register).toHaveBeenCalledWith('new@example.com', "password123", 'newuser');
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
    });

    it('should handle registration error', async () => {
      const error = new Error('Email already exists');
      (authService.register as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.register('existing@example.com', "password123", 'user');
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBe('Email already exists');
    });
  });

  describe("refreshToken", () => {
    it('should successfully refresh token', async () => {
      const mockUser = { id: '1', email: 'test@example.com', username: "testuser" };
      const mockResponse = {
        user: mockUser,
        token: process.env.TOKEN || "PLACEHOLDER",
        refreshtoken: process.env.TOKEN || "PLACEHOLDER",
      };

      (authService.refreshToken as jest.Mock).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        // Mock storage to return refresh token
        const mockStorage = require('react-native-mmkv').MMKV.mock.instances[0];
        mockStorage.getString.mockReturnValue('old-refresh-token');

        await result.current.refreshToken();
      });

      expect(authService.refreshToken).toHaveBeenCalledWith('old-refresh-token');
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
    });

    it('should logout if refresh fails', async () => {
      (authService.refreshToken as jest.Mock).mockRejectedValue(new Error('Invalid token'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        const mockStorage = require('react-native-mmkv').MMKV.mock.instances[0];
        mockStorage.getString.mockReturnValue('old-refresh-token');

        try {
          await result.current.refreshToken();
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should throw error if no refresh token available', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        const mockStorage = require('react-native-mmkv').MMKV.mock.instances[0];
        mockStorage.getString.mockReturnValue(undefined);

        try {
          await result.current.refreshToken();
        } catch (e) {
          expect(e).toEqual(new Error('No refresh token available'));
        }
      });
    });
  });
});