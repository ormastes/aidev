/**
 * Token Service - JWT token generation and validation
 * 
 * Handles access tokens and refresh tokens for stateless authentication
 */

import * as jwt from "jsonwebtoken";
import { SecurityConstants } from './security';

export interface TokenPayload {
  userId: string;
  username: string;
  roles: string[];
  [key: string]: any;
}

export interface TokenOptions {
  expiresIn?: string;
  audience?: string;
  issuer?: string;
}

export interface TokenConfig {
  secret?: string;
  accessTokenExpiry?: string;
  refreshTokenExpiry?: string;
  algorithm?: jwt.Algorithm;
  issuer?: string;
  audience?: string;
}

export class TokenService {
  private secret: string;
  private accessTokenExpiry: string;
  private refreshTokenExpiry: string;
  private algorithm: jwt.Algorithm;
  private issuer: string;
  private audience?: string;

  constructor(config?: TokenConfig) {
    this.secret = config?.secret || SecurityConstants.JWT.SECRET;
    this.accessTokenExpiry = config?.accessTokenExpiry || SecurityConstants.JWT.EXPIRES_IN;
    this.refreshTokenExpiry = config?.refreshTokenExpiry || SecurityConstants.JWT.REFRESH_EXPIRES_IN;
    this.algorithm = config?.algorithm || SecurityConstants.JWT.ALGORITHM;
    this.issuer = config?.issuer || 'aidev-platform';
    this.audience = config?.audience;
  }

  /**
   * Generate an access token
   */
  async generateToken(payload: TokenPayload, options?: TokenOptions): Promise<string> {
    const tokenOptions: jwt.SignOptions = {
      expiresIn: options?.expiresIn || this.accessTokenExpiry,
      algorithm: this.algorithm,
      issuer: options?.issuer || this.issuer
    };

    if (options?.audience || this.audience) {
      tokenOptions.audience = options?.audience || this.audience;
    }

    // Add standard claims
    const tokenPayload = {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      type: 'access'
    };

    return jwt.sign(tokenPayload, this.secret, tokenOptions);
  }

  /**
   * Generate a refresh token
   */
  async generateRefreshToken(payload: TokenPayload, options?: TokenOptions): Promise<string> {
    const tokenOptions: jwt.SignOptions = {
      expiresIn: options?.expiresIn || this.refreshTokenExpiry,
      algorithm: this.algorithm,
      issuer: options?.issuer || this.issuer
    };

    if (options?.audience || this.audience) {
      tokenOptions.audience = options?.audience || this.audience;
    }

    // Add standard claims
    const tokenPayload = {
      userId: payload.userId,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(tokenPayload, this.secret, tokenOptions);
  }

  /**
   * Verify and decode a token
   */
  async verifyToken(token: string, options?: jwt.VerifyOptions): Promise<TokenPayload | null> {
    try {
      const verifyOptions: jwt.VerifyOptions = {
        algorithms: [this.algorithm],
        issuer: options?.issuer || this.issuer,
        ...options
      };

      if (this.audience) {
        verifyOptions.audience = this.audience;
      }

      const decoded = jwt.verify(token, this.secret, verifyOptions) as any;
      
      // Check token type
      if (decoded.type !== 'access' && decoded.type !== 'refresh') {
        return null;
      }

      return {
        userId: decoded.userId,
        username: decoded.username,
        roles: decoded.roles || [],
        ...decoded
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        console.log('Token expired:', error.message);
      } else if (error instanceof jwt.JsonWebTokenError) {
        console.log('Invalid token: process.env.TOKEN || "PLACEHOLDER"refresh') {
        return null;
      }

      // Generate new tokens
      const payload: TokenPayload = {
        userId: decoded.userId,
        username: decoded.username || '',
        roles: decoded.roles || []
      };

      const newAccessToken = await this.generateToken(payload);
      const newRefreshToken = await this.generateRefreshToken(payload);

      return {
        token: newAccessToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token: string): any {
    return jwt.decode(token);
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  /**
   * Generate a short-lived token for specific operations
   */
  async generateOperationToken(
    userId: string, 
    operation: string, 
    data?: any, 
    expiresIn: string = '5m'
  ): Promise<string> {
    const payload = {
      userId,
      operation,
      data,
      type: "operation",
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(payload, this.secret, {
      expiresIn,
      algorithm: this.algorithm,
      issuer: this.issuer
    });
  }

  /**
   * Verify an operation token
   */
  async verifyOperationToken(token: string, expectedOperation: string): Promise<any | null> {
    try {
      const decoded = jwt.verify(token, this.secret, {
        algorithms: [this.algorithm],
        issuer: this.issuer
      }) as any;

      if ((decoded as any).type !== "operation" || (decoded as any).operation !== expectedOperation) {
        return null;
      }

      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate a secure random secret
   */
  async generateSecret(length: number = 32): Promise<string> {
    const crypto = require('node:crypto');
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate an API key
   */
  async generateApiKey(prefix: string = 'ak'): Promise<string> {
    const crypto = require('node:crypto');
    const randomPart = crypto.randomBytes(24).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    return `${prefix}_${randomPart}`;
  }
}