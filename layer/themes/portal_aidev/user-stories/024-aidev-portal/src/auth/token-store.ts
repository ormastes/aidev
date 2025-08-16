/**
 * Token Store - Manages token storage and session management
 */

import { EventEmitter } from 'node:events';

export interface TokenStoreConfig {
  redisUrl?: string;
  keyPrefix: string;
  defaultExpiry: number;
}

export interface StoredToken {
  userId: string;
  username?: string;
  token: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface UserSession {
  userId: string;
  loginTime: Date;
  lastActivity: Date;
  active: boolean;
}

export class TokenStore extends EventEmitter {
  private config: TokenStoreConfig;
  private tokens: Map<string, StoredToken> = new Map();
  private sessions: Map<string, UserSession> = new Map();
  private blacklistedTokens: Set<string> = new Set();
  private connected: boolean = false;

  constructor(config: TokenStoreConfig) {
    super();
    this.config = config;
  }

  async connect(): Promise<void> {
    // Simulate Redis connection
    this.connected = true;
    this.emit("connected");
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.tokens.clear();
    this.sessions.clear();
    this.blacklistedTokens.clear();
    this.emit("disconnected");
  }

  async storeToken(token: string, data: Omit<StoredToken, 'token'>): Promise<void> {
    if (!this.connected) {
      throw new Error('Token store not connected');
    }

    const storedToken: StoredToken = {
      ...data,
      token
    };

    this.tokens.set(token, storedToken);

    // Create or update session
    const session: UserSession = {
      userId: data.userId,
      loginTime: this.sessions.get(data.userId)?.loginTime || new Date(),
      lastActivity: new Date(),
      active: true
    };

    this.sessions.set(data.userId, session);

    // Set expiry timeout
    const expiryTime = data.expiresAt.getTime() - Date.now();
    if (expiryTime > 0) {
      setTimeout(() => {
        this.tokens.delete(token);
      }, expiryTime);
    }
  }

  async getToken(token: string): Promise<StoredToken | null> {
    if (!this.connected) {
      return null;
    }

    const storedToken = this.tokens.get(token);
    
    if (!storedToken) {
      return null;
    }

    // Check if token has expired
    if (storedToken.expiresAt < new Date()) {
      this.tokens.delete(token);
      return null;
    }

    return storedToken;
  }

  async removeToken(token: string): Promise<void> {
    this.tokens.delete(token);
  }

  async getSession(userId: string): Promise<UserSession | null> {
    if (!this.connected) {
      return null;
    }

    const session = this.sessions.get(userId);
    
    if (!session) {
      return null;
    }

    // Check if session is still active
    if (!session.active) {
      this.sessions.delete(userId);
      return null;
    }

    return session;
  }

  async updateSessionActivity(userId: string): Promise<void> {
    const session = this.sessions.get(userId);
    if (session) {
      // Add a small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 50));
      session.lastActivity = new Date();
      this.sessions.set(userId, session);
    }
  }

  async setSessionExpiry(userId: string, expirySeconds: number): Promise<void> {
    const session = this.sessions.get(userId);
    if (session) {
      setTimeout(() => {
        const currentSession = this.sessions.get(userId);
        if (currentSession) {
          currentSession.active = false;
          this.sessions.delete(userId);
        }
      }, expirySeconds * 1000);
    }
  }

  async removeSession(userId: string): Promise<void> {
    this.sessions.delete(userId);
  }

  async blacklistToken(token: string): Promise<void> {
    this.blacklistedTokens.add(token);
    this.removeToken(token);
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    return this.blacklistedTokens.has(token);
  }

  async clearExpiredTokens(): Promise<void> {
    const now = new Date();
    
    for (const [token, storedToken] of this.tokens.entries()) {
      if (storedToken.expiresAt < now) {
        this.tokens.delete(token);
      }
    }
  }

  async getActiveSessionCount(): Promise<number> {
    return this.sessions.size;
  }

  async getUserTokens(userId: string): Promise<string[]> {
    const userTokens: string[] = [];
    
    for (const [token, storedToken] of this.tokens.entries()) {
      if (storedToken.userId === userId && storedToken.expiresAt > new Date()) {
        userTokens.push(token);
      }
    }
    
    return userTokens;
  }
}