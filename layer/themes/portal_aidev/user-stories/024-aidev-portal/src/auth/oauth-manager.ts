/**
 * OAuth2 Manager - Handles OAuth2/OpenID Connect authentication
 */

import { crypto } from '../../../../../infra_external-log-lib/src';
import fetch from 'node-fetch';
import { EventEmitter } from 'node:events';

export interface OAuthConfig {
  providers: {
    [key: string]: OAuthProvider;
  };
  redirectUri: string;
}

export interface OAuthProvider {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
  pkce?: boolean;
}

export interface OAuthState {
  state: string;
  codeVerifier?: string;
  userId?: string;
  redirectUrl?: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
  id_token?: string;
}

export interface OAuthUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
  verified_email?: boolean;
}

export interface OAuthAuthResult {
  success: boolean;
  userInfo?: OAuthUserInfo;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
}

export class OAuthManager extends EventEmitter {
  private config: OAuthConfig;
  private pendingStates: Map<string, OAuthState> = new Map();
  private userTokens: Map<string, { [provider: string]: { accessToken: string; refreshToken?: string; expiresAt: Date } }> = new Map();

  constructor(config: OAuthConfig) {
    super();
    this.config = config;
    
    // Cleanup expired states every 10 minutes
    setInterval(() => this.cleanupExpiredStates(), 10 * 60 * 1000);
  }

  /**
   * Generate authorization URL for OAuth flow
   */
  async generateAuthUrl(provider: string, userId?: string, redirectUrl?: string): Promise<{ url: string; state: string }> {
    const providerConfig = this.config.providers[provider];
    if (!providerConfig) {
      throw new Error(`OAuth provider '${provider}' not configured`);
    }

    const state = crypto.randomBytes(16).toString('hex');
    const params = new URLSearchParams({
      client_id: providerConfig.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: providerConfig.scopes.join(' '),
      state
    });

    let codeVerifier: string | undefined;
    
    // Add PKCE parameters if enabled
    if (providerConfig.pkce) {
      codeVerifier = crypto.randomBytes(32).toString("base64url");
      const codeChallenge = crypto
        .createHash('sha256')
        .update(codeVerifier)
        .digest("base64url");
      
      params.append('code_challenge', codeChallenge);
      params.append('code_challenge_method', 'S256');
    }

    const authUrl = `${providerConfig.authorizationUrl}?${params.toString()}`;

    // Store state for verification
    const stateData: OAuthState = {
      state,
      codeVerifier,
      userId,
      redirectUrl,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    };

    this.pendingStates.set(state, stateData);
    
    this.emit("authUrlGenerated", { provider, state, userId });

    return { url: authUrl, state };
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  async handleCallback(provider: string, code: string, state: string): Promise<OAuthAuthResult> {
    const providerConfig = this.config.providers[provider];
    if (!providerConfig) {
      return {
        success: false,
        error: `OAuth provider '${provider}' not configured`
      };
    }

    const stateData = this.pendingStates.get(state);
    if (!stateData) {
      return {
        success: false,
        error: 'Invalid or expired OAuth state'
      };
    }

    if (stateData.expiresAt < new Date()) {
      this.pendingStates.delete(state);
      return {
        success: false,
        error: 'OAuth state expired'
      };
    }

    try {
      // Exchange authorization code for tokens
      const tokenResponse = await this.exchangeCodeForTokens(provider, code, stateData);
      if (!tokenResponse) {
        return {
          success: false,
          error: 'Failed to exchange code for tokens'
        };
      }

      // Get user info using access token
      const userInfo = await this.getUserInfo(provider, tokenResponse.access_token);
      if (!userInfo) {
        return {
          success: false,
          error: 'Failed to retrieve user information'
        };
      }

      // Store tokens for future use
      if (stateData.userId) {
        this.storeUserTokens(stateData.userId, provider, tokenResponse);
      }

      // Clean up state
      this.pendingStates.delete(state);

      this.emit("authSuccess", { provider, userInfo, userId: stateData.userId });

      return {
        success: true,
        userInfo,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token
      };

    } catch (error: any) {
      this.pendingStates.delete(state);
      this.emit("authError", { provider, error: error.message, userId: stateData.userId });
      
      return {
        success: false,
        error: error.message || 'OAuth authentication failed'
      };
    }
  }

  /**
   * Refresh OAuth access token
   */
  async refreshAccessToken(userId: string, provider: string): Promise<{ accessToken?: string; error?: string }> {
    const providerConfig = this.config.providers[provider];
    if (!providerConfig) {
      return { error: `OAuth provider '${provider}' not configured` };
    }

    const userTokens = this.userTokens.get(userId);
    const providerTokens = userTokens?.[provider];
    
    if (!providerTokens?.refreshToken) {
      return { error: 'No refresh token available' };
    }

    try {
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: providerTokens.refreshToken,
        client_id: providerConfig.clientId,
        client_secret: providerConfig.clientSecret
      });

      const response = await fetch(providerConfig.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: params.toString()
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
      }

      const tokenData: OAuthTokenResponse = await response.json() as OAuthTokenResponse;
      
      // Update stored tokens
      this.storeUserTokens(userId, provider, tokenData);

      this.emit("tokenRefreshed", { provider, userId });

      return {
        accessToken: tokenData.access_token
      };

    } catch (error: any) {
      this.emit("tokenRefreshError", { provider, userId, error: error.message });
      return { error: error.message || 'Token refresh failed' };
    }
  }

  /**
   * Revoke OAuth tokens for a user and provider
   */
  async revokeTokens(userId: string, provider: string): Promise<boolean> {
    const userTokens = this.userTokens.get(userId);
    if (userTokens && userTokens[provider]) {
      delete userTokens[provider];
      
      if (Object.keys(userTokens).length === 0) {
        this.userTokens.delete(userId);
      } else {
        this.userTokens.set(userId, userTokens);
      }

      this.emit("tokensRevoked", { provider, userId });
      return true;
    }

    return false;
  }

  /**
   * Get stored access token for a user and provider
   */
  async getAccessToken(userId: string, provider: string): Promise<string | null> {
    const userTokens = this.userTokens.get(userId);
    const providerTokens = userTokens?.[provider];

    if (!providerTokens) {
      return null;
    }

    // Check if token is expired
    if (providerTokens.expiresAt < new Date()) {
      // Try to refresh token
      const refreshResult = await this.refreshAccessToken(userId, provider);
      return refreshResult.accessToken || null;
    }

    return providerTokens.accessToken;
  }

  /**
   * Get user's connected OAuth providers
   */
  getConnectedProviders(userId: string): string[] {
    const userTokens = this.userTokens.get(userId);
    return userTokens ? Object.keys(userTokens) : [];
  }

  /**
   * Exchange authorization code for tokens
   */
  private async exchangeCodeForTokens(provider: string, code: string, stateData: OAuthState): Promise<OAuthTokenResponse | null> {
    const providerConfig = this.config.providers[provider];
    
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.config.redirectUri,
      client_id: providerConfig.clientId,
      client_secret: providerConfig.clientSecret
    });

    // Add PKCE code verifier if used
    if (stateData.codeVerifier) {
      params.append('code_verifier', stateData.codeVerifier);
    }

    const response = await fetch(providerConfig.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: params.toString()
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
    }

    return await response.json() as OAuthTokenResponse;
  }

  /**
   * Get user information using access token
   */
  private async getUserInfo(provider: string, accessToken: string): Promise<OAuthUserInfo | null> {
    const providerConfig = this.config.providers[provider];
    
    const response = await fetch(providerConfig.userInfoUrl, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`User info request failed: ${response.status} ${response.statusText}`);
    }

    const userData = await response.json() as any;
    
    // Normalize user data based on provider
    return this.normalizeUserData(provider, userData);
  }

  /**
   * Normalize user data from different providers
   */
  private normalizeUserData(provider: string, userData: any): OAuthUserInfo {
    switch (provider) {
      case 'google':
        return {
          id: userData.sub || userData.id,
          email: userData.email,
          name: userData.name,
          picture: userData.picture,
          verified_email: userData.email_verified
        };
      
      case 'github':
        return {
          id: userData.id.toString(),
          email: userData.email,
          name: userData.name || userData.login,
          picture: userData.avatar_url,
          verified_email: true // GitHub emails are generally verified
        };
      
      case "microsoft":
        return {
          id: userData.id,
          email: userData.mail || userData.userPrincipalName,
          name: userData.displayName,
          picture: undefined, // Microsoft Graph API requires separate call for photo
          verified_email: true
        };
      
      default:
        // Generic mapping
        return {
          id: userData.id || userData.sub,
          email: userData.email,
          name: userData.name || userData.displayName,
          picture: userData.picture || userData.avatar_url,
          verified_email: userData.email_verified
        };
    }
  }

  /**
   * Store tokens for a user and provider
   */
  private storeUserTokens(userId: string, provider: string, tokenResponse: OAuthTokenResponse): void {
    let userTokens = this.userTokens.get(userId) || {};
    
    userTokens[provider] = {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: new Date(Date.now() + (tokenResponse.expires_in * 1000))
    };

    this.userTokens.set(userId, userTokens);
  }

  /**
   * Clean up expired OAuth states
   */
  private cleanupExpiredStates(): void {
    const now = new Date();
    const expiredStates: string[] = [];

    for (const [state, stateData] of this.pendingStates.entries()) {
      if (stateData.expiresAt < now) {
        expiredStates.push(state);
      }
    }

    expiredStates.forEach(state => this.pendingStates.delete(state));
    
    if (expiredStates.length > 0) {
      this.emit("statesCleanedUp", { count: expiredStates.length });
    }
  }
}

// Predefined OAuth provider configurations
export const OAUTH_PROVIDERS = {
  google: {
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scopes: ['openid', 'email', 'profile'],
    pkce: true
  },
  
  github: {
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    scopes: ['user:email'],
    pkce: false
  },
  
  microsoft: {
    authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
    scopes: ['openid', 'email', 'profile'],
    pkce: true
  }
};