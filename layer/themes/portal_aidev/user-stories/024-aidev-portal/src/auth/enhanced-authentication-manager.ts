/**
 * Enhanced Authentication Manager - Advanced JWT handling with RS256 and refresh token rotation
 */

import * as jwt from 'jsonwebtoken';
import { crypto } from '../../../../../infra_external-log-lib/src';
import { EventEmitter } from '../../../../../infra_external-log-lib/src';
import { EnhancedUserManager } from './enhanced-user-manager';
import { EnhancedTokenStore } from './enhanced-token-store';

export interface EnhancedAuthConfig {
  algorithm: 'HS256' | 'RS256';
  jwtSecret?: string; // For HS256
  privateKey?: string; // For RS256
  publicKey?: string; // For RS256
  tokenExpiry: string;
  refreshTokenExpiry: string;
  refreshTokenRotation: boolean;
  audience?: string;
  issuer: string;
  userManager?: EnhancedUserManager;
  tokenStore?: EnhancedTokenStore;
  scopeDelimiter?: string;
}

export interface TokenPayload {
  sub: string; // subject (userId)
  iss: string; // issuer
  aud?: string; // audience
  exp: number; // expiration time
  iat: number; // issued at
  nbf?: number; // not before
  jti: string; // JWT ID
  username?: string;
  email?: string;
  role: string;
  permissions: string[];
  scopes?: string[];
  deviceId?: string;
  sessionId?: string;
  tokenType: 'access' | 'refresh';
}

export interface EnhancedAuthResult {
  success: boolean;
  token?: string;
  error?: string;
  errorCode?: string;
  remainingAttempts?: number;
}

export interface EnhancedLoginResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
  scope?: string;
  user?: {
    id: string;
    username: string;
    email?: string;
    role: string;
    permissions: string[];
    mfaRequired?: boolean;
    mustChangePassword?: boolean;
  };
  error?: string;
  errorCode?: string;
}

export interface RefreshResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: string;
  errorCode?: string;
}

export interface TokenValidationResult {
  valid: boolean;
  payload?: TokenPayload;
  error?: string;
  errorCode?: 'EXPIRED' | 'INVALID' | 'BLACKLISTED' | 'WRONG_TYPE';
}

export class EnhancedAuthenticationManager extends EventEmitter {
  private config: EnhancedAuthConfig;
  private userManager?: EnhancedUserManager;
  private tokenStore?: EnhancedTokenStore;
  private activeRefreshTokens: Map<string, { 
    userId: string; 
    deviceId: string; 
    parentTokenId: string;
    expiresAt: Date;
    rotationCount: number;
  }> = new Map();

  constructor(config: EnhancedAuthConfig) {
    super();
    this.config = config;
    this.userManager = config.userManager;
    this.tokenStore = config.tokenStore;

    // Validate configuration
    if (config.algorithm === 'RS256' && (!config.privateKey || !config.publicKey)) {
      throw new Error('RS256 algorithm requires both private and public keys');
    }
    if (config.algorithm === 'HS256' && !config.jwtSecret) {
      throw new Error('HS256 algorithm requires JWT secret');
    }

    // Cleanup expired refresh tokens periodically
    setInterval(() => this.cleanupExpiredRefreshTokens(), 60 * 60 * 1000); // Every hour
  }

  setUserManager(userManager: EnhancedUserManager): void {
    this.userManager = userManager;
  }

  setTokenStore(tokenStore: EnhancedTokenStore): void {
    this.tokenStore = tokenStore;
  }

  /**
   * Generate access token with enhanced payload
   */
  async generateAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp' | 'jti' | 'tokenType'>): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const tokenId = crypto.randomUUID();
    
    const tokenPayload: TokenPayload = {
      ...payload,
      iat: now,
      exp: now + this.parseExpiry(this.config.tokenExpiry),
      jti: tokenId,
      tokenType: 'access'
    };

    const signOptions: jwt.SignOptions = {
      algorithm: this.config.algorithm
    };

    const secret = this.config.algorithm === 'RS256' ? this.config.privateKey! : this.config.jwtSecret!;
    
    return jwt.sign(tokenPayload, secret, signOptions);
  }

  /**
   * Generate refresh token
   */
  private async generateRefreshToken(userId: string, deviceId: string, parentTokenId?: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const tokenId = crypto.randomUUID();
    
    const payload: TokenPayload = {
      sub: userId,
      iss: this.config.issuer,
      aud: this.config.audience,
      iat: now,
      exp: now + this.parseExpiry(this.config.refreshTokenExpiry),
      jti: tokenId,
      deviceId,
      tokenType: 'refresh'
    };

    const signOptions: jwt.SignOptions = {
      algorithm: this.config.algorithm
    };

    const secret = this.config.algorithm === 'RS256' ? this.config.privateKey! : this.config.jwtSecret!;
    const refreshToken = jwt.sign(payload, secret, signOptions);

    // Store refresh token metadata
    this.activeRefreshTokens.set(refreshToken, {
      userId,
      deviceId,
      parentTokenId: parentTokenId || tokenId,
      expiresAt: new Date(now * 1000 + this.parseExpiry(this.config.refreshTokenExpiry) * 1000),
      rotationCount: parentTokenId ? (this.getRotationCount(parentTokenId) + 1) : 0
    });

    return refreshToken;
  }

  /**
   * Enhanced login with comprehensive security checks
   */
  async login(
    username: string, 
    password: string, 
    options: {
      ip?: string;
      userAgent?: string;
      deviceId?: string;
      rememberMe?: boolean;
      requiredScopes?: string[];
    } = {}
  ): Promise<EnhancedLoginResult> {
    try {
      if (!this.userManager) {
        return {
          success: false,
          error: 'User manager not configured',
          errorCode: 'CONFIGURATION_ERROR'
        };
      }

      if (!this.tokenStore) {
        return {
          success: false,
          error: 'Token store unavailable',
          errorCode: 'SERVICE_UNAVAILABLE'
        };
      }

      // Validate credentials with security context
      const user = await this.userManager.validateCredentials(
        username, 
        password, 
        options.ip, 
        options.userAgent
      );
      
      if (!user) {
        return {
          success: false,
          error: 'Invalid credentials',
          errorCode: 'INVALID_CREDENTIALS'
        };
      }

      // Check if MFA is required
      if (user.mfaEnabled) {
        return {
          success: false,
          error: 'MFA required',
          errorCode: 'MFA_REQUIRED',
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            permissions: user.permissions,
            mfaRequired: true
          }
        };
      }

      // Check if password change is required
      if (user.mustChangePassword) {
        return {
          success: false,
          error: 'Password change required',
          errorCode: 'PASSWORD_CHANGE_REQUIRED',
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            permissions: user.permissions,
            mustChangePassword: true
          }
        };
      }

      // Get user permissions including groups
      const permissions = await this.userManager.getUserPermissions(user.id);

      // Generate device ID if not provided
      const deviceId = options.deviceId || this.generateDeviceId(options.userAgent, options.ip);

      // Generate tokens
      const accessTokenPayload: Omit<TokenPayload, 'iat' | 'exp' | 'jti' | 'tokenType'> = {
        sub: user.id,
        iss: this.config.issuer,
        aud: this.config.audience,
        username: user.username,
        email: user.email,
        role: user.role,
        permissions,
        scopes: options.requiredScopes,
        deviceId,
        sessionId: `${user.id}:${deviceId}:${Date.now()}`
      };

      const accessToken = await this.generateAccessToken(accessTokenPayload);
      const refreshToken = await this.generateRefreshToken(user.id, deviceId);

      // Store token in token store with enhanced metadata
      const expiryTime = this.parseExpiry(this.config.tokenExpiry) * 1000;
      await this.tokenStore.storeToken(accessToken, {
        userId: user.id,
        username: user.username,
        refreshToken,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + expiryTime),
        deviceId,
        rememberMe: options.rememberMe,
        deviceInfo: this.parseDeviceInfo(options.userAgent)
      });

      this.emit('loginSuccess', { 
        userId: user.id, 
        username: user.username, 
        ip: options.ip,
        deviceId
      });

      return {
        success: true,
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: this.parseExpiry(this.config.tokenExpiry),
        scope: permissions.join(this.config.scopeDelimiter || ' '),
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          permissions
        }
      };
    } catch (error: any) {
      this.emit('loginFailed', { 
        username, 
        error: error.message,
        ip: options.ip 
      });

      if (error.message.includes('rate limit')) {
        return {
          success: false,
          error: 'Too many login attempts',
          errorCode: 'RATE_LIMITED'
        };
      }
      
      if (error.message.includes('account locked')) {
        return {
          success: false,
          error: 'Account locked',
          errorCode: 'ACCOUNT_LOCKED'
        };
      }
      
      return {
        success: false,
        error: error.message || 'Login failed',
        errorCode: 'LOGIN_FAILED'
      };
    }
  }

  /**
   * Logout with token cleanup
   */
  async logout(token: string, options: { revokeAllSessions?: boolean } = {}): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.tokenStore) {
        return {
          success: false,
          error: 'Token store not available'
        };
      }

      // Get token info
      const storedToken = await this.tokenStore.getToken(token);
      
      if (options.revokeAllSessions && storedToken) {
        // Revoke all user sessions
        await this.tokenStore.revokeAllUserSessions(storedToken.userId);
        
        // Remove all refresh tokens for user
        for (const [refreshToken, metadata] of this.activeRefreshTokens.entries()) {
          if (metadata.userId === storedToken.userId) {
            this.activeRefreshTokens.delete(refreshToken);
          }
        }

        this.emit('allSessionsRevoked', { userId: storedToken.userId });
      } else {
        // Remove specific token
        await this.tokenStore.removeToken(token);
        
        // Remove associated refresh token
        if (storedToken?.refreshToken) {
          this.activeRefreshTokens.delete(storedToken.refreshToken);
        }
      }

      this.emit('logout', { token: token.substring(0, 8) + '...' });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Logout failed'
      };
    }
  }

  /**
   * Refresh access token with rotation
   */
  async refreshToken(refreshToken: string): Promise<RefreshResult> {
    try {
      // Validate refresh token
      const validation = await this.verifyToken(refreshToken, 'refresh');
      
      if (!validation.valid || !validation.payload) {
        return {
          success: false,
          error: 'Invalid refresh token',
          errorCode: 'INVALID_REFRESH_TOKEN'
        };
      }

      const payload = validation.payload;
      const refreshMetadata = this.activeRefreshTokens.get(refreshToken);
      
      if (!refreshMetadata) {
        return {
          success: false,
          error: 'Refresh token not found',
          errorCode: 'REFRESH_TOKEN_NOT_FOUND'
        };
      }

      if (!this.userManager) {
        return {
          success: false,
          error: 'User manager not configured',
          errorCode: 'CONFIGURATION_ERROR'
        };
      }

      // Get fresh user data
      const user = await this.userManager.getUser(payload.sub);
      
      if (!user || !user.active) {
        return {
          success: false,
          error: 'User not found or inactive',
          errorCode: 'USER_INACTIVE'
        };
      }

      // Check rotation limit (prevent excessive rotation)
      if (refreshMetadata.rotationCount > 10) {
        await this.revokeRefreshTokenFamily(refreshMetadata.parentTokenId);
        return {
          success: false,
          error: 'Refresh token rotation limit exceeded',
          errorCode: 'ROTATION_LIMIT_EXCEEDED'
        };
      }

      // Get updated permissions
      const permissions = await this.userManager.getUserPermissions(user.id);

      // Generate new access token
      const accessTokenPayload: Omit<TokenPayload, 'iat' | 'exp' | 'jti' | 'tokenType'> = {
        sub: user.id,
        iss: this.config.issuer,
        aud: this.config.audience,
        username: user.username,
        email: user.email,
        role: user.role,
        permissions,
        deviceId: payload.deviceId,
        sessionId: payload.sessionId
      };

      const newAccessToken = await this.generateAccessToken(accessTokenPayload);
      let newRefreshToken = refreshToken;

      // Generate new refresh token if rotation is enabled
      if (this.config.refreshTokenRotation) {
        newRefreshToken = await this.generateRefreshToken(
          user.id, 
          payload.deviceId!, 
          refreshMetadata.parentTokenId
        );
        
        // Remove old refresh token
        this.activeRefreshTokens.delete(refreshToken);
      }

      // Store new access token
      if (this.tokenStore) {
        const expiryTime = this.parseExpiry(this.config.tokenExpiry) * 1000;
        await this.tokenStore.storeToken(newAccessToken, {
          userId: user.id,
          username: user.username,
          refreshToken: newRefreshToken,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + expiryTime),
          deviceId: payload.deviceId
        });
      }

      this.emit('tokenRefreshed', { 
        userId: user.id, 
        deviceId: payload.deviceId,
        rotationCount: refreshMetadata.rotationCount 
      });

      return {
        success: true,
        accessToken: newAccessToken,
        refreshToken: this.config.refreshTokenRotation ? newRefreshToken : undefined,
        expiresIn: this.parseExpiry(this.config.tokenExpiry)
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Token refresh failed',
        errorCode: 'REFRESH_FAILED'
      };
    }
  }

  /**
   * Verify token with comprehensive validation
   */
  async verifyToken(token: string, expectedType: 'access' | 'refresh' = 'access'): Promise<TokenValidationResult> {
    try {
      // Check if token is blacklisted
      if (this.tokenStore && await this.tokenStore.isTokenBlacklisted(token)) {
        return {
          valid: false,
          error: 'Token is blacklisted',
          errorCode: 'BLACKLISTED'
        };
      }

      const secret = this.config.algorithm === 'RS256' ? this.config.publicKey! : this.config.jwtSecret!;
      
      const decoded = jwt.verify(token, secret, {
        algorithms: [this.config.algorithm],
        issuer: this.config.issuer,
        audience: this.config.audience
      }) as TokenPayload;

      // Verify token type
      if (decoded.tokenType !== expectedType) {
        return {
          valid: false,
          error: `Expected ${expectedType} token, got ${decoded.tokenType}`,
          errorCode: 'WRONG_TYPE'
        };
      }

      // Additional validation for refresh tokens
      if (expectedType === 'refresh') {
        const refreshMetadata = this.activeRefreshTokens.get(token);
        if (!refreshMetadata) {
          return {
            valid: false,
            error: 'Refresh token metadata not found',
            errorCode: 'INVALID'
          };
        }
      }

      return {
        valid: true,
        payload: decoded
      };
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        return {
          valid: false,
          error: 'Token expired',
          errorCode: 'EXPIRED'
        };
      }
      
      return {
        valid: false,
        error: 'Invalid token',
        errorCode: 'INVALID'
      };
    }
  }

  /**
   * Validate permissions with scope support
   */
  async validatePermissions(
    token: string, 
    requiredPermissions: string[], 
    requiredScopes?: string[]
  ): Promise<boolean> {
    const validation = await this.verifyToken(token);
    
    if (!validation.valid || !validation.payload) {
      return false;
    }

    const payload = validation.payload;

    // Check permissions
    const hasPermissions = requiredPermissions.every(permission => 
      payload.permissions.includes(permission) || payload.permissions.includes('*')
    );

    // Check scopes if required
    if (requiredScopes && payload.scopes) {
      const hasScopes = requiredScopes.every(scope => 
        payload.scopes!.includes(scope) || payload.scopes!.includes('*')
      );
      
      return hasPermissions && hasScopes;
    }

    return hasPermissions;
  }

  /**
   * Blacklist token
   */
  async blacklistToken(token: string): Promise<void> {
    if (this.tokenStore) {
      await this.tokenStore.blacklistToken(token);
    }
    this.emit('tokenBlacklisted', { token: token.substring(0, 8) + '...' });
  }

  /**
   * Revoke refresh token family (for security breaches)
   */
  private async revokeRefreshTokenFamily(parentTokenId: string): Promise<void> {
    const tokensToRevoke: string[] = [];
    
    for (const [refreshToken, metadata] of this.activeRefreshTokens.entries()) {
      if (metadata.parentTokenId === parentTokenId) {
        tokensToRevoke.push(refreshToken);
      }
    }

    for (const token of tokensToRevoke) {
      this.activeRefreshTokens.delete(token);
      if (this.tokenStore) {
        await this.tokenStore.blacklistToken(token);
      }
    }

    this.emit('refreshTokenFamilyRevoked', { parentTokenId, revokedCount: tokensToRevoke.length });
  }

  /**
   * Get rotation count for a token family
   */
  private getRotationCount(parentTokenId: string): number {
    for (const metadata of this.activeRefreshTokens.values()) {
      if (metadata.parentTokenId === parentTokenId) {
        return metadata.rotationCount;
      }
    }
    return 0;
  }

  /**
   * Parse expiry string to seconds
   */
  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 3600; // 1 hour default
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    const multipliers = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400
    };
    
    return value * (multipliers[unit as keyof typeof multipliers] || 3600);
  }

  /**
   * Generate device ID from user agent and IP
   */
  private generateDeviceId(userAgent?: string, ip?: string): string {
    if (!userAgent && !ip) {
      return 'unknown';
    }
    
    return crypto
      .createHash('sha256')
      .update(`${userAgent || 'unknown'}:${ip || 'unknown'}`)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Parse device info from user agent
   */
  private parseDeviceInfo(userAgent?: string): any {
    if (!userAgent) {
      return {
        name: 'Unknown Device',
        type: 'unknown',
        os: 'Unknown',
        browser: 'Unknown'
      };
    }

    // Simple parsing - in production use a library like ua-parser-js
    return {
      name: userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop',
      type: userAgent.includes('Mobile') ? 'mobile' : 'desktop',
      os: userAgent.includes('Windows') ? 'Windows' : 
          userAgent.includes('Mac') ? 'macOS' : 
          userAgent.includes('Linux') ? 'Linux' : 'Unknown',
      browser: userAgent.includes('Chrome') ? 'Chrome' : 
               userAgent.includes('Firefox') ? 'Firefox' : 
               userAgent.includes('Safari') ? 'Safari' : 'Unknown'
    };
  }

  /**
   * Clean up expired refresh tokens
   */
  private cleanupExpiredRefreshTokens(): void {
    const now = new Date();
    const expiredTokens: string[] = [];

    for (const [token, metadata] of this.activeRefreshTokens.entries()) {
      if (metadata.expiresAt < now) {
        expiredTokens.push(token);
      }
    }

    expiredTokens.forEach(token => this.activeRefreshTokens.delete(token));
    
    if (expiredTokens.length > 0) {
      this.emit('refreshTokensCleanedUp', { count: expiredTokens.length });
    }
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    return authHeader.substring(7);
  }

  /**
   * Authenticate request with enhanced validation
   */
  async authenticateRequest(
    authHeader?: string, 
    requiredPermissions?: string[],
    requiredScopes?: string[]
  ): Promise<{
    success: boolean;
    payload?: TokenPayload;
    error?: string;
    errorCode?: string;
  }> {
    const token = this.extractTokenFromHeader(authHeader);

    if (!token) {
      return {
        success: false,
        error: 'No authentication token provided',
        errorCode: 'NO_TOKEN'
      };
    }

    const validation = await this.verifyToken(token);

    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        errorCode: validation.errorCode
      };
    }

    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasPermissions = await this.validatePermissions(token, requiredPermissions, requiredScopes);
      
      if (!hasPermissions) {
        return {
          success: false,
          error: 'Insufficient permissions',
          errorCode: 'INSUFFICIENT_PERMISSIONS'
        };
      }
    }

    // Update token activity
    if (this.tokenStore) {
      await this.tokenStore.updateTokenActivity(token);
    }

    return {
      success: true,
      payload: validation.payload
    };
  }
}