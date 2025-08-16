import axios from '../utils/http-wrapper';
import { LLMProvider } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3457';

export class ProviderService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async getProviders(): Promise<LLMProvider[]> {
    const response = await axios.get(`${this.baseUrl}/api/providers`);
    return response.data;
  }

  async checkProviderStatus(providerId: string): Promise<{
    available: boolean;
    message?: string;
  }> {
    const response = await axios.get(`${this.baseUrl}/api/providers/${providerId}/status`);
    return response.data;
  }

  async getProviderModels(providerId: string): Promise<string[]> {
    const response = await axios.get(`${this.baseUrl}/api/providers/${providerId}/models`);
    return response.data;
  }

  async updateProviderConfig(
    providerId: string,
    config: Record<string, any>
  ): Promise<void> {
    await axios.put(`${this.baseUrl}/api/providers/${providerId}/config`, config);
  }

  async testProvider(providerId: string): Promise<{
    success: boolean;
    message: string;
    latency?: number;
  }> {
    const response = await axios.post(`${this.baseUrl}/api/providers/${providerId}/test`);
    return response.data;
  }
}

export const providerService = new ProviderService();