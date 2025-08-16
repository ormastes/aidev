import { logger } from './ExternalLogger';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

class ApiService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    // Load tokens from localStorage
    this.loadTokens();
  }

  private loadTokens() {
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  private saveTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  private clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE}${endpoint}`;
    const startTime = performance.now();

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers
      };

      if (this.accessToken) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
      }

      const response = await fetch(url, {
        ...options,
        headers
      });

      const duration = performance.now() - startTime;
      logger.logApiRequest(
        options.method || 'GET',
        endpoint,
        response.status,
        duration
      );

      const data = await response.json();

      if (!response.ok) {
        // Handle token expiration
        if (response.status === 401 && this.refreshToken) {
          const refreshResult = await this.refreshAccessToken();
          if (refreshResult.data) {
            // Retry the original request
            return this.request(endpoint, options);
          }
        }

        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return { data };
    } catch (error) {
      const duration = performance.now() - startTime;
      logger.logApiRequest(
        options.method || 'GET',
        endpoint,
        0,
        duration,
        error as Error
      );

      return { error: (error as Error).message };
    }
  }

  private async refreshAccessToken(): Promise<ApiResponse<{ accessToken: string; refreshToken: string }>> {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken })
      });

      const data = await response.json();

      if (response.ok && data.accessToken) {
        this.saveTokens(data.accessToken, data.refreshToken);
        return { data };
      }

      this.clearTokens();
      return { error: 'Failed to refresh token' };
    } catch (error) {
      this.clearTokens();
      return { error: (error as Error).message };
    }
  }

  // Auth endpoints
  async login(email: string, password: string, role: 'customer' | 'dealer') {
    const result = await this.request<{
      user: { id: number; email: string; role: string };
      accessToken: string;
      refreshToken: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, role })
    });

    if (result.data) {
      this.saveTokens(result.data.accessToken, result.data.refreshToken);
      logger.setUserId(result.data.user.id.toString());
    }

    return result;
  }

  async register(email: string, password: string, role: 'customer' | 'dealer', businessName?: string) {
    const result = await this.request<{
      user: { id: number; email: string; role: string };
      accessToken: string;
      refreshToken: string;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, role, businessName })
    });

    if (result.data) {
      this.saveTokens(result.data.accessToken, result.data.refreshToken);
      logger.setUserId(result.data.user.id.toString());
    }

    return result;
  }

  logout() {
    this.clearTokens();
    logger.setUserId(null);
  }

  // Dealer endpoints
  async getDealers(params?: { lat?: number; lng?: number; radius?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.lat) queryParams.append('lat', params.lat.toString());
    if (params?.lng) queryParams.append('lng', params.lng.toString());
    if (params?.radius) queryParams.append('radius', params.radius.toString());

    const query = queryParams.toString();
    return this.request(`/dealers${query ? `?${query}` : ''}`);
  }

  async getDealerProducts(dealerId: number) {
    return this.request(`/dealers/${dealerId}/products`);
  }

  // Order endpoints
  async createOrder(dealerId: number, items: Array<{ productId: number; quantity: number }>) {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify({ dealerId, items })
    });
  }

  // Dealer dashboard
  async getDealerDashboard() {
    return this.request('/dealer/dashboard');
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }
}

export const api = new ApiService();