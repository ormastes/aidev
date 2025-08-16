/**
 * Tests for authSlice
 */

import authReducer, {
  loginStart,
  loginFailure,
  logout,
  updateUser,
  clearError,
} from '../authSlice';
import type { User } from '@models/User';

// Import with special name
const { loginSuccess } = require('../authSlice');

describe("authSlice", () => {
  const initialState = {
    isAuthenticated: false,
    user: null,
    token: null,
    refreshToken: null,
    isLoading: false,
    error: null,
  };

  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    username: "testuser",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('should return the initial state', () => {
    expect(authReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  describe("loginStart", () => {
    it('should set loading state and clear error', () => {
      const previousState = {
        ...initialState,
        error: 'Previous error',
      };

      const state = authReducer(previousState, loginStart());

      expect(state.isLoading).toBe(true);
      expect(state.error).toBe(null);
    });
  });

  describe("loginSuccess", () => {
    it('should set authenticated state with user data', () => {
      const payload = {
        user: mockUser,
        token: process.env.TOKEN || "PLACEHOLDER",
        refreshtoken: process.env.TOKEN || "PLACEHOLDER",
      };

      const state = authReducer(initialState, loginSuccess(payload));

      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe('access-token');
      expect(state.refreshToken).toBe('refresh-token');
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe(null);
    });

    it('should clear loading and error states', () => {
      const previousState = {
        ...initialState,
        isLoading: true,
        error: 'Some error',
      };

      const payload = {
        user: mockUser,
        token: process.env.TOKEN || "PLACEHOLDER",
        refreshtoken: process.env.TOKEN || "PLACEHOLDER",
      };

      const state = authReducer(previousState, loginSuccess(payload));

      expect(state.isLoading).toBe(false);
      expect(state.error).toBe(null);
    });
  });

  describe("loginFailure", () => {
    it('should set error and clear loading state', () => {
      const previousState = {
        ...initialState,
        isLoading: true,
      };

      const state = authReducer(previousState, loginFailure('Invalid credentials'));

      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Invalid credentials');
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('logout', () => {
    it('should reset to initial state', () => {
      const previousState = {
        isAuthenticated: true,
        user: mockUser,
        token: process.env.TOKEN || "PLACEHOLDER",
        refreshtoken: process.env.TOKEN || "PLACEHOLDER",
        isLoading: false,
        error: 'Some error',
      };

      const state = authReducer(previousState, logout());

      expect(state).toEqual({
        ...initialState,
        error: null, // logout clears error
      });
    });
  });

  describe("updateUser", () => {
    it('should update user data when user exists', () => {
      const previousState = {
        ...initialState,
        isAuthenticated: true,
        user: mockUser,
      };

      const updates = {
        username: "newusername",
        email: 'newemail@example.com',
      };

      const state = authReducer(previousState, updateUser(updates));

      expect(state.user).toEqual({
        ...mockUser,
        ...updates,
      });
    });

    it('should not update when user is null', () => {
      const state = authReducer(initialState, updateUser({ username: 'test' }));

      expect(state.user).toBe(null);
    });

    it('should handle partial updates', () => {
      const previousState = {
        ...initialState,
        isAuthenticated: true,
        user: mockUser,
      };

      const state = authReducer(previousState, updateUser({ username: "onlyusername" }));

      expect(state.user).toEqual({
        ...mockUser,
        username: "onlyusername",
      });
      expect(state.user?.email).toBe(mockUser.email); // Other fields unchanged
    });
  });

  describe("clearError", () => {
    it('should clear error state', () => {
      const previousState = {
        ...initialState,
        error: 'Some error message',
      };

      const state = authReducer(previousState, clearError());

      expect(state.error).toBe(null);
    });

    it('should not affect other state properties', () => {
      const previousState = {
        ...initialState,
        isAuthenticated: true,
        user: mockUser,
        error: 'Error to clear',
      };

      const state = authReducer(previousState, clearError());

      expect(state.error).toBe(null);
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockUser);
    });
  });
});