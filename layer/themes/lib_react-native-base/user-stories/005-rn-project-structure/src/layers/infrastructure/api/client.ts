import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { MMKV } from 'react-native-mmkv';
import Config from 'react-native-config';
import NetInfo from '@react-native-community/netinfo';
import { navigate } from '@navigation/navigationRef';

const storage = new MMKV();

interface ApiError {
  message: string;
  code: string;
  status: number;
  details?: any;
}

class ApiClient {
  private instance: AxiosInstance;
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  constructor() {
    this.instance = axios.create({
      baseURL: Config.API_URL || 'https://api.aidev.app',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.instance.interceptors.request.use(
      async (config) => {
        // Check network connectivity
        const netInfo = await NetInfo.fetch();
        if (!netInfo.isConnected) {
          throw new Error('No internet connection');
        }

        // Add auth token
        const token = storage.getString('auth.token');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.instance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & {
          _retry?: boolean;
        };

        // Handle 401 errors
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // Wait for token refresh
            return new Promise((resolve) => {
              this.refreshSubscribers.push((token: string) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                resolve(this.instance(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = storage.getString('auth.refreshToken');
            if (!refreshToken) {
              throw new Error('No refresh token');
            }

            const response = await this.post<{
              token: string;
              refreshToken: string;
            }>('/auth/refresh', { refreshToken });

            const { token } = response.data;
            storage.set('auth.token', token);
            storage.set('auth.refreshToken', response.data.refreshToken);

            // Notify all waiting requests
            this.refreshSubscribers.forEach((callback) => callback(token));
            this.refreshSubscribers = [];

            // Retry original request
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return this.instance(originalRequest);
          } catch (refreshError) {
            // Refresh failed, logout user
            storage.delete('auth.token');
            storage.delete('auth.refreshToken');
            navigate('Auth', { screen: 'Login' });
            throw refreshError;
          } finally {
            this.isRefreshing = false;
          }
        }

        // Transform error
        const apiError: ApiError = {
          message: error.response?.data?.message || error.message || 'Unknown error',
          code: error.response?.data?.code || 'UNKNOWN',
          status: error.response?.status || 0,
          details: error.response?.data?.details,
        };

        return Promise.reject(apiError);
      }
    );
  }

  // HTTP methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<{ data: T }> {
    return this.instance.get<T>(url, config);
  }

  async post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<{ data: T }> {
    return this.instance.post<T>(url, data, config);
  }

  async put<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<{ data: T }> {
    return this.instance.put<T>(url, data, config);
  }

  async patch<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<{ data: T }> {
    return this.instance.patch<T>(url, data, config);
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<{ data: T }> {
    return this.instance.delete<T>(url, config);
  }

  // File upload
  async upload<T>(
    url: string,
    formData: FormData,
    onProgress?: (progress: number) => void
  ): Promise<{ data: T }> {
    return this.instance.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round(
            (progressEvent.loaded / progressEvent.total) * 100
          );
          onProgress(progress);
        }
      },
    });
  }
}

export const apiClient = new ApiClient();