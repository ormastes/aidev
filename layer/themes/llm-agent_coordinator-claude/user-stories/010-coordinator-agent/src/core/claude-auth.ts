import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';
import { os } from '../../../../../infra_external-log-lib/src';

export interface ClaudeCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  subscriptionType?: string;
}

export interface AuthOptions {
  apiKey?: string;
  useLocalCredentials?: boolean;
  credentialsPath?: string;
}

export class ClaudeAuthManager {
  private credentials?: ClaudeCredentials;
  private apiKey?: string;
  private credentialsPath: string;

  constructor(options: AuthOptions = {}) {
    this.apiKey = options.apiKey;
    this.credentialsPath = options.credentialsPath ?? 
      path.join(os.homedir(), '.claude', '.credentials.json');
  }

  async getAuthHeader(): Promise<string> {
    // If API key is explicitly provided, use it
    if (this.apiKey) {
      return `x-api-key ${this.apiKey}`;
    }

    // Otherwise, try to load local credentials
    if (!this.credentials) {
      await this.loadLocalCredentials();
    }

    if (this.credentials) {
      // Check if token is expired
      if (this.credentials.expiresAt && Date.now() > this.credentials.expiresAt) {
        throw new Error('Claude access token expired. Please re-authenticate using Claude CLI.');
      }
      return `Bearer ${this.credentials.accessToken}`;
    }

    throw new Error(
      'No authentication found. Please provide an API key or ensure Claude CLI is authenticated.'
    );
  }

  async loadLocalCredentials(): Promise<void> {
    try {
      const credentialsFile = await fs.readFile(this.credentialsPath, 'utf-8');
      const data = JSON.parse(credentialsFile);
      
      if (data.claudeAiOauth) {
        this.credentials = {
          accessToken: data.claudeAiOauth.accessToken,
          refreshToken: data.claudeAiOauth.refreshToken,
          expiresAt: data.claudeAiOauth.expiresAt,
          subscriptionType: data.claudeAiOauth.subscriptionType
        };
      }
    } catch (error) {
      // Credentials file doesn't exist or is invalid
      // This is OK, we'll fall back to API key
    }
  }

  isAuthenticated(): boolean {
    return !!(this.apiKey || this.credentials);
  }

  getAuthType(): 'api-key' | 'oauth' | 'none' {
    if (this.apiKey) return 'api-key';
    if (this.credentials) return 'oauth';
    return 'none';
  }

  async getAuthTypeAsync(): Promise<'api-key' | 'oauth' | 'none'> {
    if (this.apiKey) return 'api-key';
    
    // Try to load credentials if not already loaded
    if (!this.credentials) {
      await this.loadLocalCredentials();
    }
    
    if (this.credentials) return 'oauth';
    return 'none';
  }

  async validateAuth(): Promise<boolean> {
    try {
      await this.getAuthHeader();
      return true;
    } catch {
      return false;
    }
  }

  // Clear cached credentials to force reload
  clearCache(): void {
    this.credentials = undefined;
  }
}