import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { authService } from '../authService';

// Mock the API client
jest.mock('@api/client', () => ({
  apiClient: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

// Import mocked apiClient
import { apiClient } from '@api/client';

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    test('should successfully login with valid credentials', async () => {
      const mockResponse = {
        data: {
          user: { id: '1', email: 'test@example.com', username: 'testuser' },
          token: 'access-token',
          refreshToken: 'refresh-token',
        },
      };

      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await authService.login('test@example.com', 'password123');

      expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toEqual(mockResponse.data);
    });

    test('should throw error on login failure', async () => {
      const error = new Error('Invalid credentials');
      (apiClient.post as jest.Mock).mockRejectedValue(error);

      await expect(authService.login('test@example.com', 'wrong')).rejects.toThrow('Invalid credentials');
    });
  });

  describe('register', () => {
    test('should successfully register a new user', async () => {
      const mockResponse = {
        data: {
          user: { id: '2', email: 'new@example.com', username: 'newuser' },
          token: 'access-token',
          refreshToken: 'refresh-token',
        },
      };

      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await authService.register('new@example.com', 'password123', 'newuser');

      expect(apiClient.post).toHaveBeenCalledWith('/auth/register', {
        email: 'new@example.com',
        password: 'password123',
        username: 'newuser',
      });

      expect(result).toEqual(mockResponse.data);
    });

    test('should handle registration errors', async () => {
      const error = new Error('Email already exists');
      (apiClient.post as jest.Mock).mockRejectedValue(error);

      await expect(
        authService.register('existing@example.com', 'password123', 'user')
      ).rejects.toThrow('Email already exists');
    });
  });

  describe('logout', () => {
    test('should successfully logout', async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({});

      await authService.logout('valid-token');

      expect(apiClient.post).toHaveBeenCalledWith(
        '/auth/logout',
        {},
        {
          headers: {
            Authorization: 'Bearer valid-token',
          },
        }
      );
    });

    test('should handle logout errors', async () => {
      const error = new Error('Network error');
      (apiClient.post as jest.Mock).mockRejectedValue(error);

      await expect(authService.logout('token')).rejects.toThrow('Network error');
    });
  });

  describe('refreshToken', () => {
    test('should successfully refresh token and get user data', async () => {
      const refreshResponse = {
        data: {
          token: 'new-access-token',
          refreshToken: 'new-refresh-token',
        },
      };

      const userResponse = {
        data: {
          id: '1',
          email: 'test@example.com',
          username: 'testuser',
        },
      };

      (apiClient.post as jest.Mock).mockResolvedValue(refreshResponse);
      (apiClient.get as jest.Mock).mockResolvedValue(userResponse);

      const result = await authService.refreshToken('old-refresh-token');

      expect(apiClient.post).toHaveBeenCalledWith('/auth/refresh', {
        refreshToken: 'old-refresh-token',
      });

      expect(apiClient.get).toHaveBeenCalledWith('/auth/me', {
        headers: {
          Authorization: 'Bearer new-access-token',
        },
      });

      expect(result).toEqual({
        user: userResponse.data,
        token: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
    });

    test('should handle refresh token errors', async () => {
      const error = new Error('Invalid refresh token');
      (apiClient.post as jest.Mock).mockRejectedValue(error);

      await expect(authService.refreshToken('invalid-token')).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('validateToken', () => {
    test('should successfully validate token', async () => {
      const mockUser = {
        data: {
          id: '1',
          email: 'test@example.com',
          username: 'testuser',
        },
      };

      (apiClient.get as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.validateToken('valid-token');

      expect(apiClient.get).toHaveBeenCalledWith('/auth/me', {
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      expect(result).toEqual(mockUser.data);
    });

    test('should throw error for invalid token', async () => {
      const error = new Error('Unauthorized');
      (apiClient.get as jest.Mock).mockRejectedValue(error);

      await expect(authService.validateToken('invalid-token')).rejects.toThrow('Unauthorized');
    });
  });

  describe('forgotPassword', () => {
    test('should successfully send forgot password request', async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({});

      await authService.forgotPassword('test@example.com');

      expect(apiClient.post).toHaveBeenCalledWith('/auth/forgot-password', {
        email: 'test@example.com',
      });
    });

    test('should handle forgot password errors', async () => {
      const error = new Error('Email not found');
      (apiClient.post as jest.Mock).mockRejectedValue(error);

      await expect(authService.forgotPassword('notfound@example.com')).rejects.toThrow('Email not found');
    });
  });

  describe('resetPassword', () => {
    test('should successfully reset password', async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({});

      await authService.resetPassword('reset-token', 'newPassword123');

      expect(apiClient.post).toHaveBeenCalledWith('/auth/reset-password', {
        token: 'reset-token',
        newPassword: 'newPassword123',
      });
    });

    test('should handle reset password errors', async () => {
      const error = new Error('Invalid or expired token');
      (apiClient.post as jest.Mock).mockRejectedValue(error);

      await expect(
        authService.resetPassword('invalid-token', 'newPassword123')
      ).rejects.toThrow('Invalid or expired token');
    });
  });
});