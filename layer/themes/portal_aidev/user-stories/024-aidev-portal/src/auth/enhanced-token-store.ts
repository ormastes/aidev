/**
 * Enhanced Token Store - Advanced token storage and session management
 */

import { EventEmitter } from '../../../../../infra_external-log-lib/src';
import * as NodeCache from 'node-cache';

export interface TokenStoreConfig {
  redisUrl?: string;
  keyPrefix: string;
  defaultExpiry: number;
  maxConcurrentSessions: number;
  enableRememberMe: boolean;
  rememberMeDuration: number; // in seconds
  sessionIdleTimeout: number; // in seconds
  deviceTracking: boolean;
}

export interface StoredToken {
  userId: string;
  username?: string;
  token: string;
  refreshToken?: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivity: Date;
  deviceId?: string;
  deviceInfo?: DeviceInfo;
  rememberMe?: boolean;
  sessionData?: Record<string, any>;
}

export interface DeviceInfo {
  fingerprint: string;
  name: string;
  type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  os: string;
  browser: string;
  userAgent: string;
  trusted: boolean;
  firstSeen: Date;
  lastSeen: Date;
}

export interface UserSession {
  userId: string;
  sessionId: string;
  deviceId: string;
  loginTime: Date;
  lastActivity: Date;
  active: boolean;
  rememberMe: boolean;
  location?: {
    ip: string;
    country?: string;
    region?: string;
    city?: string;
  };
  metadata?: Record<string, any>;
}

export interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  expiredSessions: number;
  deviceBreakdown: Record<string, number>;
  locationBreakdown: Record<string, number>;
}

export class EnhancedTokenStore extends EventEmitter {
  private config: TokenStoreConfig;
  private tokens: Map<string, StoredToken> = new Map();
  private sessions: Map<string, UserSession> = new Map();
  private userSessions: Map<string, Set<string>> = new Map(); // userId -> sessionIds
  private deviceSessions: Map<string, Set<string>> = new Map(); // deviceId -> sessionIds
  private blacklistedTokens: Set<string> = new Set();
  private refreshTokens: Map<string, string> = new Map(); // refreshToken -> accessToken
  private cache: NodeCache;
  private connected: boolean = false;

  // Redis client placeholder - in production, replace with actual Redis client
  private redis: any = null;

  constructor(config: TokenStoreConfig) {
    super();
    this.config = config;
    
    // Initialize in-memory cache as fallback
    this.cache = new NodeCache({
      stdTTL: config.defaultExpiry,
      checkperiod: 120, // Check for expired keys every 2 minutes
      useClones: false
    });

    // Setup cleanup intervals
    setInterval(() => this.cleanupExpiredTokens(), 5 * 60 * 1000); // Every 5 minutes
    setInterval(() => this.cleanupIdleSessions(), 10 * 60 * 1000); // Every 10 minutes
  }

  /**
   * Connect to Redis (if configured) or use in-memory storage
   */
  async connect(): Promise<void> {
    try {
      if (this.config.redisUrl) {
        // In production, initialize Redis client here
        // this.redis = new Redis(this.config.redisUrl);
        // await this.redis.ping();
        console.log('Redis would be connected here in production');
      }
      
      this.connected = true;
      this.emit('connected');
    } catch (error) {
      console.warn('Failed to connect to Redis, using in-memory storage:', error);
      this.connected = true;
      this.emit('connected');
    }
  }

  /**
   * Disconnect from storage
   */
  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
    
    this.connected = false;
    this.tokens.clear();
    this.sessions.clear();
    this.userSessions.clear();
    this.deviceSessions.clear();
    this.blacklistedTokens.clear();
    this.refreshTokens.clear();
    this.cache.flushAll();
    
    this.emit('disconnected');
  }

  /**
   * Store token with enhanced session management
   */
  async storeToken(token: string, data: Omit<StoredToken, 'token' | 'lastActivity'>): Promise<void> {
    if (!this.connected) {
      throw new Error('Token store not connected');
    }

    const storedToken: StoredToken = {
      ...data,
      token,
      lastActivity: new Date()
    };

    // Check concurrent session limits
    await this.enforceSessionLimits(data.userId, storedToken.deviceId);

    // Store token
    if (this.redis) {
      const key = `${this.config.keyPrefix}:token:${token}`;
      await this.redis.setex(key, this.getTokenTTL(storedToken), JSON.stringify(storedToken));
    } else {
      this.tokens.set(token, storedToken);
      this.cache.set(token, storedToken, this.getTokenTTL(storedToken));
    }

    // Create or update session
    const sessionId = this.generateSessionId(data.userId, storedToken.deviceId);
    const session: UserSession = {
      userId: data.userId,
      sessionId,
      deviceId: storedToken.deviceId || 'unknown',
      loginTime: data.createdAt,
      lastActivity: new Date(),
      active: true,
      rememberMe: storedToken.rememberMe || false
    };

    await this.storeSession(session);

    // Link refresh token if provided
    if (storedToken.refreshToken) {
      this.refreshTokens.set(storedToken.refreshToken, token);
    }

    // Set automatic expiry
    const ttl = this.getTokenTTL(storedToken);
    if (ttl > 0) {
      setTimeout(() => {
        this.removeToken(token);
      }, ttl * 1000);
    }

    this.emit('tokenStored', { token: token.substring(0, 8) + '...', userId: data.userId });
  }

  /**
   * Get stored token
   */
  async getToken(token: string): Promise<StoredToken | null> {
    if (!this.connected) {
      return null;
    }

    // Check if token is blacklisted
    if (this.blacklistedTokens.has(token)) {
      return null;
    }

    let storedToken: StoredToken | null = null;

    if (this.redis) {
      const key = `${this.config.keyPrefix}:token:${token}`;
      const data = await this.redis.get(key);
      if (data) {
        storedToken = JSON.parse(data);
        // Convert date strings back to Date objects
        storedToken!.createdAt = new Date(storedToken!.createdAt);
        storedToken!.expiresAt = new Date(storedToken!.expiresAt);
        storedToken!.lastActivity = new Date(storedToken!.lastActivity);
      }
    } else {
      storedToken = this.tokens.get(token) || null;
    }

    if (!storedToken) {
      return null;
    }

    // Check if token has expired
    if (storedToken.expiresAt < new Date()) {
      await this.removeToken(token);
      return null;
    }

    // Update last activity
    await this.updateTokenActivity(token);

    return storedToken;
  }

  /**
   * Remove token
   */
  async removeToken(token: string): Promise<void> {
    if (this.redis) {
      const key = `${this.config.keyPrefix}:token:${token}`;
      await this.redis.del(key);
    } else {
      this.tokens.delete(token);
      this.cache.del(token);
    }

    // Remove refresh token mapping
    for (const [refreshToken, accessToken] of this.refreshTokens.entries()) {
      if (accessToken === token) {
        this.refreshTokens.delete(refreshToken);
        break;
      }
    }

    this.emit('tokenRemoved', { token: token.substring(0, 8) + '...' });
  }

  /**
   * Update token activity timestamp
   */
  async updateTokenActivity(token: string): Promise<void> {
    const storedToken = await this.getTokenWithoutActivity(token);
    if (storedToken) {
      storedToken.lastActivity = new Date();
      
      if (this.redis) {
        const key = `${this.config.keyPrefix}:token:${token}`;
        await this.redis.setex(key, this.getTokenTTL(storedToken), JSON.stringify(storedToken));
      } else {
        this.tokens.set(token, storedToken);
        this.cache.set(token, storedToken, this.getTokenTTL(storedToken));
      }

      // Update session activity
      const sessionId = this.generateSessionId(storedToken.userId, storedToken.deviceId);
      await this.updateSessionActivity(sessionId);
    }
  }

  /**
   * Store user session
   */
  async storeSession(session: UserSession): Promise<void> {
    if (this.redis) {
      const key = `${this.config.keyPrefix}:session:${session.sessionId}`;
      await this.redis.setex(key, this.config.sessionIdleTimeout, JSON.stringify(session));
    } else {
      this.sessions.set(session.sessionId, session);
    }

    // Update user session mapping
    let userSessionIds = this.userSessions.get(session.userId);
    if (!userSessionIds) {
      userSessionIds = new Set();
      this.userSessions.set(session.userId, userSessionIds);
    }
    userSessionIds.add(session.sessionId);

    // Update device session mapping
    let deviceSessionIds = this.deviceSessions.get(session.deviceId);
    if (!deviceSessionIds) {
      deviceSessionIds = new Set();
      this.deviceSessions.set(session.deviceId, deviceSessionIds);
    }
    deviceSessionIds.add(session.sessionId);

    this.emit('sessionCreated', { sessionId: session.sessionId, userId: session.userId });
  }

  /**
   * Get user session
   */
  async getSession(sessionId: string): Promise<UserSession | null> {
    if (!this.connected) {
      return null;
    }

    let session: UserSession | null = null;

    if (this.redis) {
      const key = `${this.config.keyPrefix}:session:${sessionId}`;
      const data = await this.redis.get(key);
      if (data) {
        session = JSON.parse(data);
        // Convert date strings back to Date objects
        session!.loginTime = new Date(session!.loginTime);
        session!.lastActivity = new Date(session!.lastActivity);
      }
    } else {
      session = this.sessions.get(sessionId) || null;
    }

    if (!session || !session.active) {
      return null;
    }

    // Check session idle timeout
    const idleTime = Date.now() - session.lastActivity.getTime();
    if (idleTime > this.config.sessionIdleTimeout * 1000) {
      await this.removeSession(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      session.lastActivity = new Date();
      await this.storeSession(session);
    }
  }

  /**
   * Remove session
   */
  async removeSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    
    if (this.redis) {
      const key = `${this.config.keyPrefix}:session:${sessionId}`;
      await this.redis.del(key);
    } else {
      this.sessions.delete(sessionId);
    }

    if (session) {
      // Update mappings
      const userSessionIds = this.userSessions.get(session.userId);
      if (userSessionIds) {
        userSessionIds.delete(sessionId);
        if (userSessionIds.size === 0) {
          this.userSessions.delete(session.userId);
        }
      }

      const deviceSessionIds = this.deviceSessions.get(session.deviceId);
      if (deviceSessionIds) {
        deviceSessionIds.delete(sessionId);
        if (deviceSessionIds.size === 0) {
          this.deviceSessions.delete(session.deviceId);
        }
      }

      this.emit('sessionRemoved', { sessionId, userId: session.userId });
    }
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string): Promise<UserSession[]> {
    const sessionIds = this.userSessions.get(userId) || new Set();
    const sessions: UserSession[] = [];

    for (const sessionId of sessionIds) {
      const session = await this.getSession(sessionId);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
  }

  /**
   * Get all user tokens
   */
  async getUserTokens(userId: string): Promise<string[]> {
    const userTokens: string[] = [];
    
    if (this.redis) {
      const pattern = `${this.config.keyPrefix}:token:*`;
      const keys = await this.redis.keys(pattern);
      
      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const token = JSON.parse(data);
          if (token.userId === userId && new Date(token.expiresAt) > new Date()) {
            userTokens.push(token.token);
          }
        }
      }
    } else {
      for (const [token, storedToken] of this.tokens.entries()) {
        if (storedToken.userId === userId && storedToken.expiresAt > new Date()) {
          userTokens.push(token);
        }
      }
    }
    
    return userTokens;
  }

  /**
   * Blacklist token
   */
  async blacklistToken(token: string): Promise<void> {
    this.blacklistedTokens.add(token);
    await this.removeToken(token);

    // Set expiry for blacklisted token (clean up after 24 hours)
    setTimeout(() => {
      this.blacklistedTokens.delete(token);
    }, 24 * 60 * 60 * 1000);

    this.emit('tokenBlacklisted', { token: token.substring(0, 8) + '...' });
  }

  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    return this.blacklistedTokens.has(token);
  }

  /**
   * Enforce concurrent session limits
   */
  private async enforceSessionLimits(userId: string, deviceId?: string): Promise<void> {
    const sessions = await this.getUserSessions(userId);
    
    if (sessions.length >= this.config.maxConcurrentSessions) {
      // Remove oldest sessions that are not remember me sessions
      const disposableSessions = sessions
        .filter(s => !s.rememberMe)
        .sort((a, b) => a.lastActivity.getTime() - b.lastActivity.getTime());

      const sessionsToRemove = sessions.length - this.config.maxConcurrentSessions + 1;
      
      for (let i = 0; i < Math.min(sessionsToRemove, disposableSessions.length); i++) {
        await this.removeSession(disposableSessions[i].sessionId);
        // Also remove associated tokens
        const tokens = await this.getUserTokens(userId);
        for (const token of tokens) {
          const storedToken = await this.getTokenWithoutActivity(token);
          if (storedToken && this.generateSessionId(userId, storedToken.deviceId) === disposableSessions[i].sessionId) {
            await this.removeToken(token);
          }
        }
      }

      this.emit('sessionLimitEnforced', { userId, removedSessions: sessionsToRemove });
    }
  }

  /**
   * Generate session ID
   */
  private generateSessionId(userId: string, deviceId?: string): string {
    return `${userId}:${deviceId || 'unknown'}:${Date.now()}`;
  }

  /**
   * Get token TTL in seconds
   */
  private getTokenTTL(token: StoredToken): number {
    if (token.rememberMe) {
      return this.config.rememberMeDuration;
    }
    
    const expiryTime = token.expiresAt.getTime() - Date.now();
    return Math.max(0, Math.floor(expiryTime / 1000));
  }

  /**
   * Get token without updating activity (internal use)
   */
  private async getTokenWithoutActivity(token: string): Promise<StoredToken | null> {
    if (this.redis) {
      const key = `${this.config.keyPrefix}:token:${token}`;
      const data = await this.redis.get(key);
      if (data) {
        const storedToken = JSON.parse(data);
        storedToken.createdAt = new Date(storedToken.createdAt);
        storedToken.expiresAt = new Date(storedToken.expiresAt);
        storedToken.lastActivity = new Date(storedToken.lastActivity);
        return storedToken;
      }
    } else {
      return this.tokens.get(token) || null;
    }
    
    return null;
  }

  /**
   * Clean up expired tokens
   */
  private async cleanupExpiredTokens(): Promise<void> {
    const now = new Date();
    const expiredTokens: string[] = [];
    
    if (this.redis) {
      // Redis handles TTL automatically
      return;
    }

    for (const [token, storedToken] of this.tokens.entries()) {
      if (storedToken.expiresAt < now) {
        expiredTokens.push(token);
      }
    }

    for (const token of expiredTokens) {
      await this.removeToken(token);
    }

    if (expiredTokens.length > 0) {
      this.emit('tokensCleanedUp', { count: expiredTokens.length });
    }
  }

  /**
   * Clean up idle sessions
   */
  private async cleanupIdleSessions(): Promise<void> {
    const now = Date.now();
    const idleThreshold = this.config.sessionIdleTimeout * 1000;
    const idleSessions: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      const idleTime = now - session.lastActivity.getTime();
      if (idleTime > idleThreshold) {
        idleSessions.push(sessionId);
      }
    }

    for (const sessionId of idleSessions) {
      await this.removeSession(sessionId);
    }

    if (idleSessions.length > 0) {
      this.emit('sessionsCleanedUp', { count: idleSessions.length });
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(): Promise<SessionStats> {
    const allSessions = Array.from(this.sessions.values());
    const activeSessions = allSessions.filter(s => s.active);
    
    const deviceBreakdown: Record<string, number> = {};
    const locationBreakdown: Record<string, number> = {};

    for (const session of activeSessions) {
      // Device breakdown
      const deviceType = session.deviceId.split(':')[0] || 'unknown';
      deviceBreakdown[deviceType] = (deviceBreakdown[deviceType] || 0) + 1;

      // Location breakdown
      if (session.location?.country) {
        locationBreakdown[session.location.country] = (locationBreakdown[session.location.country] || 0) + 1;
      }
    }

    return {
      totalSessions: allSessions.length,
      activeSessions: activeSessions.length,
      expiredSessions: allSessions.length - activeSessions.length,
      deviceBreakdown,
      locationBreakdown
    };
  }

  /**
   * Revoke all sessions for a user
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    const sessions = await this.getUserSessions(userId);
    const tokens = await this.getUserTokens(userId);

    // Remove all sessions
    for (const session of sessions) {
      await this.removeSession(session.sessionId);
    }

    // Remove all tokens
    for (const token of tokens) {
      await this.removeToken(token);
    }

    this.emit('allUserSessionsRevoked', { userId, sessionCount: sessions.length, tokenCount: tokens.length });
  }

  /**
   * Get active session count
   */
  async getActiveSessionCount(): Promise<number> {
    if (this.redis) {
      const pattern = `${this.config.keyPrefix}:session:*`;
      const keys = await this.redis.keys(pattern);
      return keys.length;
    }
    
    return this.sessions.size;
  }
}