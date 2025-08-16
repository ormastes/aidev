/**
 * Authentication Manager - Handles authentication and authorization
 */

import * as jwt from "jsonwebtoken";
import { EventEmitter } from 'node:events';
import { UserManager } from './user-manager';
import { TokenStore } from './token-store';

export interface AuthConfig {
  jwtSecret: string;
  tokenExpiry: string;
  refreshTokenExpiry?: string;
  userManager?: UserManager;
  tokenStore?: TokenStore;
}

export interface TokenPayload {
  userId: string;
  username?: string;
  role: string;
  permissions: string[];
}

export interface AuthResult {
  success: boolean;
  token?: string;
  error?: string;
}

export interface LoginResult {
  success: boolean;
  token?: string;
  refreshToken?: string;
  user?: {
    id: string;
    username: string;
    role: string;
    permissions: string[];
  };
  error?: string;
}

export interface RefreshResult {
  success: boolean;
  token?: string;
  error?: string;
}

export interface LogoutResult {
  success: boolean;
  error?: string;
}

export class AuthenticationManager extends EventEmitter {
  private jwtSecret: string;
  private tokenExpiry: string;
  private refreshTokenExpiry: string;
  private userManager?: UserManager;
  private tokenStore?: TokenStore;
  private refreshTokens: Map<string, { userId: string; expiresAt: Date }> = new Map();

  constructor(config: AuthConfig) {
    super();
    this.jwtSecret = config.jwtSecret;
    this.tokenExpiry = config.tokenExpiry;
    this.refreshTokenExpiry = config.refreshTokenExpiry || '7d';
    this.userManager = config.userManager;
    this.tokenStore = config.tokenStore;
  }

  setUserManager(userManager: UserManager): void {
    this.userManager = userManager;
  }

  setTokenStore(tokenStore: TokenStore): void {
    this.tokenStore = tokenStore;
  }

  async generateToken(payload: TokenPayload): Promise<string> {
    const tokenData = {
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
      permissions: payload.permissions,
      // Add unique timestamp to ensure different tokens
      iat: Math.floor(Date.now() / 1000),
      nonce: Math.random()
    };
    
    return jwt.sign(tokenData, this.jwtSecret, {
      expiresIn: this.tokenExpiry
    } as jwt.SignOptions);
  }

  private generateRefreshToken(userId: string): string {
    const refreshToken = jwt.sign({ userId, type: 'refresh' }, this.jwtSecret, {
      expiresIn: this.refreshTokenExpiry
    } as jwt.SignOptions);
    
    // Store refresh token with expiry
    const expiryTime = this.parseExpiry(this.refreshTokenExpiry);
    this.refreshTokens.set(refreshToken, {
      userId,
      expiresAt: new Date(Date.now() + expiryTime)
    });
    
    return refreshToken;
  }

  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 3600000; // 1 hour default
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    const multipliers = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000
    };
    
    return value * (multipliers[unit as keyof typeof multipliers] || 3600000);
  }

  async login(username: string, password: string): Promise<LoginResult> {
    try {
      if (!this.userManager) {
        return {
          success: false,
          error: 'user manager not configured'
        };
      }

      if (!this.tokenStore) {
        return {
          success: false,
          error: 'token store unavailable'
        };
      }

      // Validate credentials
      const user = await this.userManager.validateCredentials(username, password);
      
      if (!user) {
        return {
          success: false,
          error: 'invalid credentials'
        };
      }

      // Generate tokens
      const payload: TokenPayload = {
        userId: user.id,
        username: user.username,
        role: user.role,
        permissions: user.permissions
      };

      const token = await this.generateToken(payload);
      const refreshToken = this.generateRefreshToken(user.id);

      // Store token in token store
      const expiryTime = this.parseExpiry(this.tokenExpiry);
      await this.tokenStore.storeToken(token, {
        userId: user.id,
        username: user.username,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + expiryTime)
      });

      return {
        success: true,
        token,
        refreshToken,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          permissions: user.permissions
        }
      };
    } catch (error: any) {
      if (error.message === 'rate limit exceeded') {
        return {
          success: false,
          error: 'rate limit exceeded'
        };
      }
      
      return {
        success: false,
        error: error.message || 'login failed'
      };
    }
  }

  async logout(token: string): Promise<LogoutResult> {
    try {
      if (!this.tokenStore) {
        return {
          success: false,
          error: 'token store not available'
        };
      }

      // Get token info to find user
      const storedToken = await this.tokenStore.getToken(token);
      
      // Remove only the specific token, not all user tokens (for concurrent sessions)
      await this.tokenStore.removeToken(token);
      
      if (storedToken) {
        // Check if user has any other active tokens
        const remainingTokens = await this.tokenStore.getUserTokens(storedToken.userId);
        
        // If no other tokens, remove the session
        if (remainingTokens.length === 0) {
          await this.tokenStore.removeSession(storedToken.userId);
        }
        
        // Remove related refresh tokens for this specific token only
        // Find and remove refresh tokens associated with this specific login session
        // In a real implementation, you'd track token-refresh token relationships
        // For simplicity, we'll remove one refresh token per logout
        let refreshTokenRemoved = false;
        for (const [refreshToken, data] of this.refreshTokens.entries()) {
          if (data.userId === storedToken.userId && !refreshTokenRemoved) {
            this.refreshTokens.delete(refreshToken);
            refreshTokenRemoved = true;
            break;
          }
        }
      }

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'logout failed'
      };
    }
  }

  async refreshToken(refreshToken: string): Promise<RefreshResult> {
    try {
      const refreshData = this.refreshTokens.get(refreshToken);
      
      if (!refreshData) {
        return {
          success: false,
          error: 'refresh token invalid'
        };
      }

      if (refreshData.expiresAt < new Date()) {
        this.refreshTokens.delete(refreshToken);
        return {
          success: false,
          error: 'refresh token expired'
        };
      }

      if (!this.userManager) {
        return {
          success: false,
          error: 'user manager not configured'
        };
      }

      // Get user data
      const user = await this.userManager.getUser(refreshData.userId);
      
      if (!user) {
        return {
          success: false,
          error: 'user not found'
        };
      }

      // Generate new token
      const payload: TokenPayload = {
        userId: user.id,
        username: user.username,
        role: user.role,
        permissions: user.permissions
      };

      const newToken = await this.generateToken(payload);

      // Store new token without removing old ones (refresh scenario)
      if (this.tokenStore) {
        const expiryTime = this.parseExpiry(this.tokenExpiry);
        await this.tokenStore.storeToken(newToken, {
          userId: user.id,
          username: user.username,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + expiryTime)
        });
      }

      return {
        success: true,
        token: newToken
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'token refresh failed'
      };
    }
  }

  async setTokenExpiry(expiry: string): Promise<void> {
    this.tokenExpiry = expiry;
  }

  async blacklistToken(token: string): Promise<void> {
    if (this.tokenStore) {
      await this.tokenStore.blacklistToken(token);
    }
  }

  async verifyToken(token: string): Promise<TokenPayload | null> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as TokenPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  async validatePermissions(token: string, requiredPermissions: string[]): Promise<boolean> {
    const payload = await this.verifyToken(token);
    
    if (!payload) {
      return false;
    }

    // Check if user has all required permissions
    return requiredPermissions.every(permission => 
      payload.permissions.includes(permission)
    );
  }

  extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    return authHeader.substring(7);
  }

  async authenticateRequest(authHeader?: string, requiredPermissions?: string[]): Promise<AuthResult> {
    const token = this.extractTokenFromHeader(authHeader);

    if (!token) {
      return {
        success: false,
        error: 'No authentication token provided'
      };
    }

    const payload = await this.verifyToken(token);

    if (!payload) {
      return {
        success: false,
        error: 'Invalid or expired token'
      };
    }

    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasPermissions = await this.validatePermissions(token, requiredPermissions);
      
      if (!hasPermissions) {
        return {
          success: false,
          error: 'Insufficient permissions'
        };
      }
    }

    return {
      success: true,
      token
    };
  }
}