/**
 * Authentication Manager for API Gateway
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { CacheManager } from '../cache/cache-manager';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  plan: 'free' | 'basic' | 'pro' | 'enterprise';
  apiKeys?: string[];
}

export interface TokenPayload {
  userId: string;
  username: string;
  roles: string[];
  type: 'access' | 'refresh';
  sessionId: string;
}

export class AuthManager {
  private cache: CacheManager;
  private jwtSecret: string;
  private jwtExpiresIn: string;
  private refreshExpiresIn: string;

  constructor(cache: CacheManager) {
    this.cache = cache;
    this.jwtSecret = config.jwt.secret;
    this.jwtExpiresIn = config.jwt.expiresIn;
    this.refreshExpiresIn = config.jwt.refreshExpiresIn;
  }

  /**
   * Authenticate request
   */
  public async authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Check for API key authentication
      const apiKey = req.headers['x-api-key'] as string;
      if (apiKey) {
        const user = await this.validateAPIKey(apiKey);
        if (user) {
          (req as any).user = user;
          (req as any).authType = 'apikey';
          return next();
        }
      }

      // Check for JWT token
      const token = this.extractToken(req);
      if (!token) {
        // Allow some endpoints without authentication
        if (this.isPublicEndpoint(req.path)) {
          return next();
        }
        
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      // Verify JWT token
      const payload = await this.verifyToken(token);
      
      // Check if token is blacklisted
      const isBlacklisted = await this.cache.get(`blacklist:${token}`);
      if (isBlacklisted) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Token has been revoked',
        });
      }

      // Get user from cache or database
      const user = await this.getUser(payload.userId);
      if (!user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User not found',
        });
      }

      // Attach user to request
      (req as any).user = user;
      (req as any).authType = 'jwt';
      (req as any).sessionId = payload.sessionId;

      next();
    } catch (error) {
      logger.error('Authentication error:', error);
      
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid token',
        });
      }
      
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Token expired',
        });
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Authentication failed',
      });
    }
  }

  /**
   * Login endpoint
   */
  public async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Username and password required',
        });
        return;
      }

      // Get user from database (mock implementation)
      const user = await this.getUserByUsername(username);
      if (!user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid credentials',
        });
        return;
      }

      // Verify password
      const isValidPassword = await this.verifyPassword(password, user.password);
      if (!isValidPassword) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid credentials',
        });
        return;
      }

      // Generate tokens
      const sessionId = uuidv4();
      const accessToken = this.generateToken(user, 'access', sessionId);
      const refreshToken = this.generateToken(user, 'refresh', sessionId);

      // Store session in cache
      await this.cache.set(`session:${sessionId}`, {
        userId: user.id,
        username: user.username,
        loginTime: Date.now(),
        lastActivity: Date.now(),
      }, 86400); // 24 hours

      // Store refresh token
      await this.cache.set(`refresh:${user.id}:${sessionId}`, refreshToken, 604800); // 7 days

      logger.info(`User logged in: ${username}`);

      res.json({
        accessToken,
        refreshToken,
        expiresIn: this.jwtExpiresIn,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          roles: user.roles,
          plan: user.plan,
        },
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Login failed',
      });
    }
  }

  /**
   * Refresh token endpoint
   */
  public async refresh(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Refresh token required',
        });
        return;
      }

      // Verify refresh token
      const payload = await this.verifyToken(refreshToken);
      
      if (payload.type !== 'refresh') {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid refresh token',
        });
        return;
      }

      // Check if refresh token exists in cache
      const storedToken = await this.cache.get(`refresh:${payload.userId}:${payload.sessionId}`);
      if (storedToken !== refreshToken) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid refresh token',
        });
        return;
      }

      // Get user
      const user = await this.getUser(payload.userId);
      if (!user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User not found',
        });
        return;
      }

      // Generate new access token
      const newAccessToken = this.generateToken(user, 'access', payload.sessionId);

      // Update session activity
      const session = await this.cache.get(`session:${payload.sessionId}`);
      if (session) {
        session.lastActivity = Date.now();
        await this.cache.set(`session:${payload.sessionId}`, session, 86400);
      }

      res.json({
        accessToken: newAccessToken,
        expiresIn: this.jwtExpiresIn,
      });
    } catch (error) {
      logger.error('Token refresh error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Token refresh failed',
      });
    }
  }

  /**
   * Logout endpoint
   */
  public async logout(req: Request, res: Response): Promise<void> {
    try {
      const token = this.extractToken(req);
      const user = (req as any).user;
      const sessionId = (req as any).sessionId;

      if (token) {
        // Add token to blacklist
        const decoded = jwt.decode(token) as any;
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await this.cache.set(`blacklist:${token}`, true, ttl);
        }
      }

      // Remove session and refresh token
      if (sessionId) {
        await this.cache.delete(`session:${sessionId}`);
        if (user) {
          await this.cache.delete(`refresh:${user.id}:${sessionId}`);
        }
      }

      logger.info(`User logged out: ${user?.username}`);

      res.json({
        message: 'Logged out successfully',
      });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Logout failed',
      });
    }
  }

  /**
   * Validate token endpoint
   */
  public async validate(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Token required',
        });
        return;
      }

      const payload = await this.verifyToken(token);
      
      // Check if blacklisted
      const isBlacklisted = await this.cache.get(`blacklist:${token}`);
      if (isBlacklisted) {
        res.status(401).json({
          valid: false,
          reason: 'Token revoked',
        });
        return;
      }

      // Check session
      const session = await this.cache.get(`session:${payload.sessionId}`);
      if (!session) {
        res.status(401).json({
          valid: false,
          reason: 'Session expired',
        });
        return;
      }

      res.json({
        valid: true,
        payload: {
          userId: payload.userId,
          username: payload.username,
          roles: payload.roles,
          type: payload.type,
        },
      });
    } catch (error) {
      res.status(401).json({
        valid: false,
        reason: error instanceof jwt.TokenExpiredError ? 'Token expired' : 'Invalid token',
      });
    }
  }

  /**
   * Extract token from request
   */
  private extractToken(req: Request): string | null {
    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check query parameter
    if (req.query.token) {
      return req.query.token as string;
    }

    // Check cookie
    if (req.cookies && req.cookies.token) {
      return req.cookies.token;
    }

    return null;
  }

  /**
   * Generate JWT token
   */
  private generateToken(user: any, type: 'access' | 'refresh', sessionId: string): string {
    const payload: TokenPayload = {
      userId: user.id,
      username: user.username,
      roles: user.roles,
      type,
      sessionId,
    };

    const expiresIn = type === 'access' ? this.jwtExpiresIn : this.refreshExpiresIn;

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn,
      algorithm: config.jwt.algorithm,
    });
  }

  /**
   * Verify JWT token
   */
  private async verifyToken(token: string): Promise<TokenPayload> {
    return new Promise((resolve, reject) => {
      jwt.verify(token, this.jwtSecret, (err, decoded) => {
        if (err) {
          reject(err);
        } else {
          resolve(decoded as TokenPayload);
        }
      });
    });
  }

  /**
   * Validate API key
   */
  private async validateAPIKey(apiKey: string): Promise<User | null> {
    // Check cache first
    const cached = await this.cache.get(`apikey:${apiKey}`);
    if (cached) {
      return cached;
    }

    // Mock implementation - in production, check database
    const mockApiKeys: { [key: string]: User } = {
      'test-api-key-123': {
        id: 'api-user-1',
        username: 'api-user',
        email: 'api@example.com',
        roles: ['api'],
        permissions: ['read', 'write'],
        plan: 'pro',
      },
    };

    const user = mockApiKeys[apiKey];
    if (user) {
      // Cache for 1 hour
      await this.cache.set(`apikey:${apiKey}`, user, 3600);
      return user;
    }

    return null;
  }

  /**
   * Check if endpoint is public
   */
  private isPublicEndpoint(path: string): boolean {
    const publicEndpoints = [
      '/health',
      '/metrics',
      '/api-docs',
      '/auth/login',
      '/auth/refresh',
    ];

    return publicEndpoints.some(endpoint => path.startsWith(endpoint));
  }

  /**
   * Get user by ID (mock implementation)
   */
  private async getUser(userId: string): Promise<User | null> {
    // Check cache
    const cached = await this.cache.get(`user:${userId}`);
    if (cached) {
      return cached;
    }

    // Mock implementation
    const user: User = {
      id: userId,
      username: 'testuser',
      email: 'test@example.com',
      roles: ['user'],
      permissions: ['read'],
      plan: 'free',
    };

    // Cache for 5 minutes
    await this.cache.set(`user:${userId}`, user, 300);
    return user;
  }

  /**
   * Get user by username (mock implementation)
   */
  private async getUserByUsername(username: string): Promise<any> {
    // Mock user with hashed password
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    return {
      id: 'user-123',
      username,
      email: `${username}@example.com`,
      password: hashedPassword,
      roles: ['user'],
      permissions: ['read'],
      plan: 'free',
    };
  }

  /**
   * Verify password
   */
  private async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}