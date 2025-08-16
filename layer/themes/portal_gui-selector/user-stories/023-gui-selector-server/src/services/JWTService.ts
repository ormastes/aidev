import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

interface TokenPayload {
  userId: number;
  username: string;
  role: string;
}

export class JWTService {
  private accessTokenSecret: string;
  private refreshTokenSecret: string;
  private accessTokenExpiry: string = '15m';
  private refreshTokenExpiry: string = '7d';

  constructor() {
    // Use consistent development secret if not set in environment
    const devAccessSecret = 'dev-gui-selector-access-secret-12345678901234567890123456789012';
    const devRefreshSecret = 'dev-gui-selector-refresh-secret-12345678901234567890123456789012';
    
    this.accessTokenSecret = process.env.JWT_ACCESS_SECRET || devAccessSecret;
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || devRefreshSecret;
    
    if (!process.env.JWT_ACCESS_SECRET) {
      logger.warn('JWT_ACCESS_SECRET not set, using development secret. Set this in production!');
    }
  }

  generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiry,
      issuer: 'gui-selector-server'
    } as jwt.SignOptions);
  }

  generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiry,
      issuer: 'gui-selector-server'
    } as jwt.SignOptions);
  }

  verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.accessTokenSecret) as TokenPayload;
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }

  verifyRefreshToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.refreshTokenSecret) as TokenPayload;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  getRefreshTokenExpiry(): Date {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7); // 7 days
    return expiry;
  }
}