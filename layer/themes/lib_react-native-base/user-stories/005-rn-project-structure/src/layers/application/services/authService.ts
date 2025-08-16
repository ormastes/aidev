import { apiClient } from '@api/client';
import type { User } from '@models/User';

export interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface RegisterResponse extends LoginResponse {}

export interface RefreshResponse {
  token: string;
  refreshToken: string;
}

class AuthService {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', {
      email,
      password,
    });
    return response.data;
  }

  async register(
    email: string,
    password: string,
    username: string
  ): Promise<RegisterResponse> {
    const response = await apiClient.post<RegisterResponse>('/auth/register', {
      email,
      password,
      username,
    });
    return response.data;
  }

  async logout(token: string): Promise<void> {
    await apiClient.post(
      '/auth/logout',
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  }

  async refreshToken(refreshToken: string): Promise<LoginResponse> {
    const response = await apiClient.post<RefreshResponse>('/auth/refresh', {
      refreshToken,
    });
    
    // Get user data with new token
    const userResponse = await apiClient.get<User>('/auth/me', {
      headers: {
        Authorization: `Bearer ${response.data.token}`,
      },
    });

    return {
      user: userResponse.data,
      token: response.data.token,
      refreshToken: response.data.refreshToken,
    };
  }

  async validateToken(token: string): Promise<User> {
    const response = await apiClient.get<User>('/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }

  forgotPassword(email: string): Promise<void> {
    await apiClient.post('/auth/forgot-password', { email });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/reset-password', {
      token,
      newPassword,
    });
  }
}

export const authService = new AuthService();