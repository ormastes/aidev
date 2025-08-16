/**
 * Session Manager - Handles user sessions across applications
 * 
 * Provides session storage, retrieval, and synchronization
 */

import { SecurityConstants } from './security';

export interface Session {
  id: string;
  userId: string;
  data: Record<string, any>;
  createdAt: Date;
  expiresAt: Date;
  lastAccessedAt?: Date;
}

export interface SessionConfig {
  storage?: SessionStorage;
  maxAge?: number;
  cookieName?: string;
  cookieDomain?: string;
  cookieSecure?: boolean;
}

export interface SessionStorage {
  get(sessionId: string): Promise<Session | null>;
  set(sessionId: string, session: Session): Promise<void>;
  delete(sessionId: string): Promise<void>;
  cleanup(): Promise<void>;
}

export class SessionManager {
  private storage: SessionStorage;
  private maxAge: number;
  private cookieName: string;
  private cookieDomain?: string;
  private cookieSecure: boolean;

  constructor(config?: SessionConfig) {
    this.storage = config?.storage || this.createMemoryStorage();
    this.maxAge = config?.maxAge || SecurityConstants.SESSION.MAX_AGE;
    this.cookieName = config?.cookieName || SecurityConstants.SESSION.COOKIE_NAME;
    this.cookieDomain = config?.cookieDomain;
    this.cookieSecure = config?.cookieSecure || process.env.NODE_ENV === "production";

    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Create a new session
   */
  async createSession(sessionData: Omit<Session, "createdAt">): Promise<Session> {
    const session: Session = {
      ...sessionData,
      createdAt: new Date(),
      lastAccessedAt: new Date()
    };

    await this.storage.set(session.id, session);
    return session;
  }

  /**
   * Get a session by ID
   */
  async getSession(sessionId: string): Promise<Session | null> {
    const session = await this.storage.get(sessionId);
    
    if (!session) {
      return null;
    }

    // Check if expired
    if (new Date() > session.expiresAt) {
      await this.storage.delete(sessionId);
      return null;
    }

    // Update last accessed time
    session.lastAccessedAt = new Date();
    await this.storage.set(sessionId, session);

    return session;
  }

  /**
   * Update session data
   */
  async updateSession(sessionId: string, data: Partial<Session>): Promise<Session | null> {
    const session = await this.getSession(sessionId);
    
    if (!session) {
      return null;
    }

    const updatedSession = {
      ...session,
      ...data,
      lastAccessedAt: new Date()
    };

    await this.storage.set(sessionId, updatedSession);
    return updatedSession;
  }

  /**
   * Destroy a session
   */
  async destroySession(sessionId: string): Promise<void> {
    await this.storage.delete(sessionId);
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string): Promise<Session[]> {
    // This would need to be implemented based on storage backend
    // For now, return empty array
    return [];
  }

  /**
   * Configure session cookie for Express
   */
  configureCookie(res: any, sessionId: string, options?: { maxAge?: number }): void {
    const cookieOptions: any = {
      httpOnly: true,
      secure: this.cookieSecure,
      sameSite: 'lax',
      maxAge: options?.maxAge || this.maxAge,
      path: '/'
    };

    if (this.cookieDomain) {
      cookieOptions.domain = this.cookieDomain;
    }

    res.cookie(this.cookieName, sessionId, cookieOptions);
  }

  /**
   * Get session ID from request
   */
  getSessionIdFromRequest(req: any): string | null {
    // Check cookie
    if (req.cookies?.[this.cookieName]) {
      return req.cookies[this.cookieName];
    }

    // Check header
    if (req.headers['x-session-id']) {
      return req.headers['x-session-id'];
    }

    return null;
  }

  /**
   * Middleware to attach session to request
   */
  async attachSession(req: any, res: any, next: any): Promise<void> {
    const sessionId = this.getSessionIdFromRequest(req);
    
    if (sessionId) {
      const session = await this.getSession(sessionId);
      if (session) {
        req.session = session;
        req.sessionId = sessionId;
      }
    }

    next();
  }

  /**
   * Share session across domains
   */
  async shareSession(sessionId: string, targetDomain: string): Promise<string> {
    const session = await this.getSession(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }

    // Generate a temporary token for cross-domain sharing
    const shareToken = this.generateShareToken(sessionId, targetDomain);
    
    // Store the share token with expiration
    await this.storage.set(`share:${shareToken}`, {
      ...session,
      id: shareToken,
      expiresAt: new Date(Date.now() + 60000) // 1 minute expiration
    });

    return shareToken;
  }

  /**
   * Redeem a shared session token
   */
  async redeemShareToken(shareToken: string): Promise<Session | null> {
    const sharedSession = await this.storage.get(`share:${shareToken}`);
    
    if (!sharedSession) {
      return null;
    }

    // Delete the share token after use
    await this.storage.delete(`share:${shareToken}`);

    // Create new session with shared data
    return await this.createSession({
      id: this.generateSessionId(),
      userId: sharedSession.userId,
      data: sharedSession.data,
      expiresAt: new Date(Date.now() + this.maxAge)
    });
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate share token
   */
  private generateShareToken(sessionId: string, domain: string): string {
    return `share-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create in-memory storage
   */
  private createMemoryStorage(): SessionStorage {
    const sessions = new Map<string, Session>();

    return {
      async get(sessionId: string): Promise<Session | null> {
        return sessions.get(sessionId) || null;
      },

      async set(sessionId: string, session: Session): Promise<void> {
        sessions.set(sessionId, session);
      },

      async delete(sessionId: string): Promise<void> {
        sessions.delete(sessionId);
      },

      async cleanup(): Promise<void> {
        const now = new Date();
        for (const [id, session] of sessions) {
          if (now > session.expiresAt) {
            sessions.delete(id);
          }
        }
      }
    };
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    setInterval(async () => {
      await this.storage.cleanup();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Get session sharing configuration for Express
   */
  getSessionSharingConfig(): any {
    return {
      name: this.cookieName,
      secret: process.env.SESSION_SECRET || 'aidev-session-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: this.cookieSecure,
        sameSite: 'lax',
        maxAge: this.maxAge,
        domain: this.cookieDomain,
        path: '/'
      }
    };
  }
}