/**
 * Cross-Domain Session Manager
 * 
 * Enables session sharing between applications running on different ports/domains
 */

import { SessionManager, Session, SessionStorage } from './SessionManager';
import { TokenService } from './TokenService';
import { crypto } from '../../infra_external-log-lib/src';
import { EventEmitter } from 'node:events';

export interface CrossDomainConfig {
  domains: string[];
  ports: number[];
  sharedSecret: string;
  sessionStorage?: SessionStorage;
  tokenService?: TokenService;
  syncInterval?: number;
  cookieDomain?: string;
}

export interface SharedSession extends Session {
  domains: string[];
  syncToken?: string;
  lastSyncedAt?: Date;
}

export interface SessionSyncMessage {
  action: 'create' | 'update' | 'destroy' | 'sync';
  session: SharedSession;
  domain: string;
  timestamp: Date;
  signature: string;
}

/**
 * Redis-compatible session storage
 */
export class RedisSessionStorage implements SessionStorage {
  private sessions: Map<string, Session>;
  private subscribers: Set<(message: SessionSyncMessage) => void>;

  constructor() {
    this.sessions = new Map();
    this.subscribers = new Set();
  }

  async get(sessionId: string): Promise<Session | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Check expiration
    if (session.expiresAt < new Date()) {
      this.sessions.delete(sessionId);
      return null;
    }

    return session;
  }

  async set(sessionId: string, session: Session): Promise<void> {
    this.sessions.set(sessionId, session);
    
    // Notify subscribers
    this.publish({
      action: 'update',
      session: session as SharedSession,
      domain: 'local',
      timestamp: new Date(),
      signature: ''
    });
  }

  async delete(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessions.delete(sessionId);
      
      // Notify subscribers
      this.publish({
        action: 'destroy',
        session: session as SharedSession,
        domain: 'local',
        timestamp: new Date(),
        signature: ''
      });
    }
  }

  async cleanup(): Promise<void> {
    const now = new Date();
    for (const [id, session] of this.sessions) {
      if (session.expiresAt < now) {
        this.sessions.delete(id);
      }
    }
  }

  // Pub/Sub for session synchronization
  subscribe(callback: (message: SessionSyncMessage) => void): void {
    this.subscribers.add(callback);
  }

  unsubscribe(callback: (message: SessionSyncMessage) => void): void {
    this.subscribers.delete(callback);
  }

  private publish(message: SessionSyncMessage): void {
    this.subscribers.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('Subscriber error:', error);
      }
    });
  }
}

export class CrossDomainSessionManager extends EventEmitter {
  private sessionManager: SessionManager;
  private tokenService: TokenService;
  private storage: RedisSessionStorage;
  private domains: string[];
  private ports: number[];
  private sharedSecret: string;
  private syncInterval: number;
  private cookieDomain?: string;
  private syncTimer?: NodeJS.Timer;
  private sessionMap: Map<string, Set<string>>; // userId -> sessionIds

  constructor(config: CrossDomainConfig) {
    super();

    this.domains = config.domains;
    this.ports = config.ports;
    this.sharedSecret = config.sharedSecret;
    this.syncInterval = config.syncInterval || 30000; // 30 seconds
    this.cookieDomain = config.cookieDomain;
    
    // Use provided storage or create new Redis-compatible storage
    this.storage = (config.sessionStorage as RedisSessionStorage) || new RedisSessionStorage();
    
    this.sessionManager = new SessionManager({
      storage: this.storage
    });
    
    this.tokenService = config.tokenService || new TokenService();
    this.sessionMap = new Map();

    this.initialize();
  }

  /**
   * Initialize cross-domain session management
   */
  private initialize(): void {
    // Subscribe to session changes
    this.storage.subscribe(this.handleSessionSync.bind(this));

    // Start sync timer
    this.startSyncTimer();

    // Clean up on exit
    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
  }

  /**
   * Create a cross-domain session
   */
  async createCrossDomainSession(sessionData: Omit<SharedSession, "createdAt" | 'domains'>): Promise<SharedSession> {
    const session: SharedSession = {
      ...sessionData,
      domains: this.domains,
      syncToken: this.generateSyncToken(),
      createdAt: new Date(),
      lastSyncedAt: new Date()
    };

    // Create session in storage
    await this.sessionManager.createSession(session);

    // Track session for user
    this.trackUserSession(session.userId, session.id);

    // Broadcast to other domains
    await this.broadcastSessionUpdate('create', session);

    this.emit("sessionCreated", session);

    return session;
  }

  /**
   * Get session with cross-domain validation
   */
  async getSession(sessionId: string, domain?: string): Promise<SharedSession | null> {
    const session = await this.sessionManager.getSession(sessionId) as SharedSession;
    
    if (!session) return null;

    // Validate domain access
    if (domain && !this.isValidDomain(domain)) {
      this.emit("invalidDomainAccess", { sessionId, domain });
      return null;
    }

    // Update last accessed
    session.lastAccessedAt = new Date();
    await this.storage.set(sessionId, session);

    return session;
  }

  /**
   * Update session across domains
   */
  async updateSession(sessionId: string, updates: Partial<SharedSession>): Promise<SharedSession | null> {
    const session = await this.getSession(sessionId);
    if (!session) return null;

    const updated: SharedSession = {
      ...session,
      ...updates,
      lastSyncedAt: new Date()
    };

    await this.storage.set(sessionId, updated);
    await this.broadcastSessionUpdate('update', updated);

    return updated;
  }

  /**
   * Destroy session across all domains
   */
  async destroySession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    // Remove from tracking
    this.untrackUserSession(session.userId, sessionId);

    // Destroy in storage
    await this.sessionManager.destroySession(sessionId);

    // Broadcast destruction
    await this.broadcastSessionUpdate('destroy', session);

    this.emit("sessionDestroyed", sessionId);
  }

  /**
   * Get all sessions for a user across domains
   */
  async getUserSessions(userId: string): Promise<SharedSession[]> {
    const sessionIds = this.sessionMap.get(userId);
    if (!sessionIds) return [];

    const sessions: SharedSession[] = [];
    for (const sessionId of sessionIds) {
      const session = await this.getSession(sessionId);
      if (session) {
        sessions.push(session);
      } else {
        // Clean up invalid session
        sessionIds.delete(sessionId);
      }
    }

    return sessions;
  }

  /**
   * Validate session token for cross-domain requests
   */
  async validateCrossDomainToken(token: string): Promise<SharedSession | null> {
    try {
      const payload = await this.tokenService.verifyToken(token);
      if (!payload?.sessionId) return null;

      return await this.getSession(payload.sessionId);
    } catch (error) {
      console.error('Token validation error:', error);
      return null;
    }
  }

  /**
   * Generate token for cross-domain authentication
   */
  async generateCrossDomainToken(session: SharedSession): Promise<string> {
    return await this.tokenService.generateToken({
      sessionId: session.id,
      userId: session.userId,
      domains: session.domains,
      roles: []
    }, {
      expiresIn: '1h'
    });
  }

  /**
   * Synchronize sessions across domains
   */
  private async synchronizeSessions(): Promise<void> {
    const now = new Date();
    const syncThreshold = new Date(now.getTime() - this.syncInterval);

    // Get all sessions needing sync
    for (const [userId, sessionIds] of this.sessionMap) {
      for (const sessionId of sessionIds) {
        const session = await this.getSession(sessionId);
        if (session && (!session.lastSyncedAt || session.lastSyncedAt < syncThreshold)) {
          await this.broadcastSessionUpdate('sync', session);
          session.lastSyncedAt = now;
          await this.storage.set(sessionId, session);
        }
      }
    }
  }

  /**
   * Handle incoming session sync messages
   */
  private async handleSessionSync(message: SessionSyncMessage): Promise<void> {
    // Verify message signature
    if (!this.verifyMessageSignature(message)) {
      this.emit("invalidSyncMessage", message);
      return;
    }

    switch (message.action) {
      case 'create':
        await this.handleRemoteSessionCreate(message.session);
        break;
      case 'update':
        await this.handleRemoteSessionUpdate(message.session);
        break;
      case 'destroy':
        await this.handleRemoteSessionDestroy(message.session.id);
        break;
      case 'sync':
        await this.handleRemoteSessionSync(message.session);
        break;
    }
  }

  /**
   * Handle remote session creation
   */
  private async handleRemoteSessionCreate(session: SharedSession): Promise<void> {
    // Check if session already exists
    const existing = await this.storage.get(session.id);
    if (existing) return;

    // Store session locally
    await this.storage.set(session.id, session);
    this.trackUserSession(session.userId, session.id);

    this.emit("remoteSessionCreated", session);
  }

  /**
   * Handle remote session update
   */
  private async handleRemoteSessionUpdate(session: SharedSession): Promise<void> {
    const existing = await this.storage.get(session.id);
    if (!existing) {
      // Session doesn't exist locally, create it
      await this.handleRemoteSessionCreate(session);
      return;
    }

    // Update session
    await this.storage.set(session.id, session);
    this.emit("remoteSessionUpdated", session);
  }

  /**
   * Handle remote session destruction
   */
  private async handleRemoteSessionDestroy(sessionId: string): Promise<void> {
    const session = await this.storage.get(sessionId);
    if (!session) return;

    this.untrackUserSession(session.userId, sessionId);
    await this.storage.delete(sessionId);

    this.emit("remoteSessionDestroyed", sessionId);
  }

  /**
   * Handle remote session sync
   */
  private async handleRemoteSessionSync(session: SharedSession): Promise<void> {
    const existing = await this.storage.get(session.id);
    if (!existing) {
      await this.handleRemoteSessionCreate(session);
    } else if (session.lastSyncedAt && existing.lastAccessedAt) {
      // Update if remote is newer
      if (session.lastSyncedAt > existing.lastAccessedAt) {
        await this.storage.set(session.id, session);
      }
    }
  }

  /**
   * Broadcast session update to other domains
   */
  private async broadcastSessionUpdate(action: SessionSyncMessage['action'], session: SharedSession): Promise<void> {
    const message: SessionSyncMessage = {
      action,
      session,
      domain: this.getCurrentDomain(),
      timestamp: new Date(),
      signature: ''
    };

    // Sign message
    message.signature = this.signMessage(message);

    // In production, this would send to Redis pub/sub or message queue
    // For now, emit event for local handling
    this.emit("broadcast", message);
  }

  /**
   * Track user session mapping
   */
  private trackUserSession(userId: string, sessionId: string): void {
    if (!this.sessionMap.has(userId)) {
      this.sessionMap.set(userId, new Set());
    }
    this.sessionMap.get(userId)!.add(sessionId);
  }

  /**
   * Untrack user session mapping
   */
  private untrackUserSession(userId: string, sessionId: string): void {
    const sessions = this.sessionMap.get(userId);
    if (sessions) {
      sessions.delete(sessionId);
      if (sessions.size === 0) {
        this.sessionMap.delete(userId);
      }
    }
  }

  /**
   * Generate sync token
   */
  private generateSyncToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Sign message for verification
   */
  private signMessage(message: Omit<SessionSyncMessage, "signature">): string {
    const data = JSON.stringify({
      action: message.action,
      sessionId: message.session.id,
      domain: message.domain,
      timestamp: message.timestamp
    });

    return crypto
      .createHmac('sha256', this.sharedSecret)
      .update(data)
      .digest('hex');
  }

  /**
   * Verify message signature
   */
  private verifyMessageSignature(message: SessionSyncMessage): boolean {
    const expectedSignature = this.signMessage(message);
    return message.signature === expectedSignature;
  }

  /**
   * Check if domain is valid
   */
  private isValidDomain(domain: string): boolean {
    return this.domains.includes(domain);
  }

  /**
   * Get current domain
   */
  private getCurrentDomain(): string {
    return this.domains[0] || "localhost";
  }

  /**
   * Start synchronization timer
   */
  private startSyncTimer(): void {
    this.syncTimer = setInterval(() => {
      this.synchronizeSessions().catch(console.error);
    }, this.syncInterval);
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    this.removeAllListeners();
  }

  /**
   * Express middleware for cross-domain sessions
   */
  middleware() {
    return async (req: any, res: any, next: any) => {
      // Check for cross-domain token
      const token = req.headers['x-session-token'] || req.cookies?.sessionToken;
      
      if (token) {
        const session = await this.validateCrossDomainToken(token);
        if (session) {
          req.session = session;
          req.sessionId = session.id;
        }
      }

      // Set CORS headers for session sharing
      const origin = req.headers.origin;
      if (origin && this.domains.some(d => origin.includes(d))) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Headers', 'X-Session-Token, Content-Type');
      }

      next();
    };
  }
}