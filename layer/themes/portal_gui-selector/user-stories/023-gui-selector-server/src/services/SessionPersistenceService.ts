/**
 * Session Persistence Service
 * Manages persistent sessions with SQLite storage backend
 */

import { DatabaseService } from './DatabaseService';
import { ExternalLogService } from './ExternalLogService';
import { crypto } from '../../../../../infra_external-log-lib/src';

export interface SessionData {
  sessionId: string;
  userId: string;
  username: string;
  roles: string[];
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  data: Record<string, any>;
}

export interface SessionOptions {
  maxAge?: number; // Session lifetime in milliseconds
  rolling?: boolean; // Reset expiry on activity
  secure?: boolean; // Require HTTPS
  httpOnly?: boolean; // HTTP only cookies
  sameSite?: 'strict' | 'lax' | 'none';
  domain?: string; // Cookie domain
  path?: string; // Cookie path
}

export class SessionPersistenceService {
  private dbService: DatabaseService;
  private logger: ExternalLogService;
  private defaultOptions: SessionOptions;
  private cleanupInterval: NodeJS.Timer | null = null;
  private cleanupFrequency: number = 15 * 60 * 1000; // 15 minutes

  constructor(options?: SessionOptions) {
    this.dbService = new DatabaseService();
    this.logger = new ExternalLogService();
    this.defaultOptions = {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      rolling: true,
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      ...options
    };
  }

  /**
   * Initialize the session service
   */
  async initialize(): Promise<void> {
    await this.dbService.init();
    await this.createSessionsTable();
    await this.startCleanupJob();
    this.logger.info('SessionPersistenceService initialized');
  }

  /**
   * Create sessions table if not exists
   */
  private async createSessionsTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        username TEXT NOT NULL,
        roles TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
      CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions(updated_at);
    `;

    await this.dbService.run(sql);
  }

  /**
   * Create a new session
   */
  async createSession(
    userId: string,
    username: string,
    roles: string[],
    ipAddress?: string,
    userAgent?: string,
    additionalData?: Record<string, any>
  ): Promise<SessionData> {
    const sessionId = this.generateSessionId();
    const expiresAt = new Date(Date.now() + this.defaultOptions.maxAge!);
    const data = {
      ...additionalData,
      lastActivity: new Date().toISOString()
    };

    await this.dbService.run(
      `INSERT INTO sessions (session_id, user_id, username, roles, ip_address, user_agent, data, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sessionId,
        userId,
        username,
        JSON.stringify(roles),
        ipAddress || null,
        userAgent || null,
        JSON.stringify(data),
        expiresAt.toISOString()
      ]
    );

    this.logger.info(`Session created for user ${username}: ${sessionId}`);

    return {
      sessionId,
      userId,
      username,
      roles,
      ipAddress,
      userAgent,
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt,
      data
    };
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    const row = await this.dbService.get(
      'SELECT * FROM sessions WHERE session_id = ? AND expires_at > datetime("now")',
      [sessionId]
    );

    if (!row) {
      return null;
    }

    // Update last activity if rolling sessions enabled
    if (this.defaultOptions.rolling) {
      await this.touchSession(sessionId);
    }

    return this.parseSessionRow(row);
  }

  /**
   * Update session data
   */
  async updateSession(
    sessionId: string,
    updates: Partial<SessionData>
  ): Promise<SessionData | null> {
    const session = await this.getSession(sessionId);
    if (!session) {
      return null;
    }

    const allowedUpdates: (keyof SessionData)[] = ['data', 'roles'];
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    for (const field of allowedUpdates) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        const value = typeof updates[field] === 'object' 
          ? JSON.stringify(updates[field])
          : updates[field];
        updateValues.push(value);
      }
    }

    if (updateFields.length > 0) {
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      updateValues.push(sessionId);

      await this.dbService.run(
        `UPDATE sessions SET ${updateFields.join(', ')} WHERE session_id = ?`,
        updateValues
      );

      this.logger.info(`Session updated: ${sessionId}`);
    }

    return this.getSession(sessionId);
  }

  /**
   * Touch session to update activity timestamp
   */
  async touchSession(sessionId: string): Promise<boolean> {
    const newExpiresAt = new Date(Date.now() + this.defaultOptions.maxAge!);
    
    const result = await this.dbService.run(
      `UPDATE sessions 
       SET updated_at = CURRENT_TIMESTAMP, 
           expires_at = ?,
           data = json_set(data, '$.lastActivity', ?)
       WHERE session_id = ? AND expires_at > datetime("now")`,
      [
        newExpiresAt.toISOString(),
        new Date().toISOString(),
        sessionId
      ]
    );

    return result.changes > 0;
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    const result = await this.dbService.run(
      'DELETE FROM sessions WHERE session_id = ?',
      [sessionId]
    );

    if (result.changes > 0) {
      this.logger.info(`Session deleted: ${sessionId}`);
      return true;
    }

    return false;
  }

  /**
   * Delete all sessions for a user
   */
  async deleteUserSessions(userId: string): Promise<number> {
    const result = await this.dbService.run(
      'DELETE FROM sessions WHERE user_id = ?',
      [userId]
    );

    if (result.changes > 0) {
      this.logger.info(`Deleted ${result.changes} sessions for user: ${userId}`);
    }

    return result.changes;
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<SessionData[]> {
    const rows = await this.dbService.all(
      `SELECT * FROM sessions 
       WHERE user_id = ? AND expires_at > datetime("now")
       ORDER BY updated_at DESC`,
      [userId]
    );

    return rows.map(row => this.parseSessionRow(row));
  }

  /**
   * Count active sessions for a user
   */
  async countUserSessions(userId: string): Promise<number> {
    const result = await this.dbService.get(
      'SELECT COUNT(*) as count FROM sessions WHERE user_id = ? AND expires_at > datetime("now")',
      [userId]
    );

    return result.count;
  }

  /**
   * Check if session exists and is valid
   */
  async validateSession(sessionId: string): Promise<boolean> {
    const session = await this.getSession(sessionId);
    return session !== null;
  }

  /**
   * Extend session expiry
   */
  async extendSession(sessionId: string, additionalTime: number): Promise<boolean> {
    const session = await this.getSession(sessionId);
    if (!session) {
      return false;
    }

    const newExpiresAt = new Date(session.expiresAt.getTime() + additionalTime);
    
    const result = await this.dbService.run(
      'UPDATE sessions SET expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE session_id = ?',
      [newExpiresAt.toISOString(), sessionId]
    );

    return result.changes > 0;
  }

  /**
   * Get session statistics
   */
  async getSessionStatistics(): Promise<{
    totalActive: number;
    uniqueUsers: number;
    averageSessionDuration: number;
    sessionsPerUser: Record<string, number>;
  }> {
    const totalActive = await this.dbService.get(
      'SELECT COUNT(*) as count FROM sessions WHERE expires_at > datetime("now")'
    );

    const uniqueUsers = await this.dbService.get(
      'SELECT COUNT(DISTINCT user_id) as count FROM sessions WHERE expires_at > datetime("now")'
    );

    const avgDuration = await this.dbService.get(
      `SELECT AVG(
        (julianday(updated_at) - julianday(created_at)) * 24 * 60 * 60 * 1000
      ) as avg_duration 
      FROM sessions 
      WHERE expires_at > datetime("now")`
    );

    const sessionsPerUser = await this.dbService.all(
      `SELECT user_id, username, COUNT(*) as session_count 
       FROM sessions 
       WHERE expires_at > datetime("now")
       GROUP BY user_id, username`
    );

    const userSessionCounts: Record<string, number> = {};
    for (const row of sessionsPerUser) {
      userSessionCounts[row.username] = row.session_count;
    }

    return {
      totalActive: totalActive.count,
      uniqueUsers: uniqueUsers.count,
      averageSessionDuration: avgDuration.avg_duration || 0,
      sessionsPerUser: userSessionCounts
    };
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.dbService.run(
      'DELETE FROM sessions WHERE expires_at <= datetime("now")'
    );

    if (result.changes > 0) {
      this.logger.info(`Cleaned up ${result.changes} expired sessions`);
    }

    return result.changes;
  }

  /**
   * Start automatic cleanup job
   */
  private async startCleanupJob(): Promise<void> {
    // Run initial cleanup
    await this.cleanupExpiredSessions();

    // Schedule periodic cleanup
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupExpiredSessions();
      } catch (error: any) {
        this.logger.error(`Session cleanup error: ${error.message}`);
      }
    }, this.cleanupFrequency);

    this.logger.info('Session cleanup job started');
  }

  /**
   * Stop cleanup job
   */
  stopCleanupJob(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      this.logger.info('Session cleanup job stopped');
    }
  }

  /**
   * Get sessions by IP address
   */
  async getSessionsByIP(ipAddress: string): Promise<SessionData[]> {
    const rows = await this.dbService.all(
      `SELECT * FROM sessions 
       WHERE ip_address = ? AND expires_at > datetime("now")
       ORDER BY updated_at DESC`,
      [ipAddress]
    );

    return rows.map(row => this.parseSessionRow(row));
  }

  /**
   * Get recent sessions
   */
  async getRecentSessions(limit: number = 10): Promise<SessionData[]> {
    const rows = await this.dbService.all(
      `SELECT * FROM sessions 
       WHERE expires_at > datetime("now")
       ORDER BY created_at DESC
       LIMIT ?`,
      [limit]
    );

    return rows.map(row => this.parseSessionRow(row));
  }

  /**
   * Invalidate sessions by criteria
   */
  async invalidateSessions(criteria: {
    userId?: string;
    ipAddress?: string;
    beforeDate?: Date;
  }): Promise<number> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (criteria.userId) {
      conditions.push('user_id = ?');
      params.push(criteria.userId);
    }

    if (criteria.ipAddress) {
      conditions.push('ip_address = ?');
      params.push(criteria.ipAddress);
    }

    if (criteria.beforeDate) {
      conditions.push('created_at < ?');
      params.push(criteria.beforeDate.toISOString());
    }

    if (conditions.length === 0) {
      throw new Error('At least one criteria must be specified');
    }

    const result = await this.dbService.run(
      `DELETE FROM sessions WHERE ${conditions.join(' AND ')}`,
      params
    );

    if (result.changes > 0) {
      this.logger.info(`Invalidated ${result.changes} sessions`);
    }

    return result.changes;
  }

  /**
   * Store session value
   */
  async setSessionValue(
    sessionId: string,
    key: string,
    value: any
  ): Promise<boolean> {
    const session = await this.getSession(sessionId);
    if (!session) {
      return false;
    }

    const updatedData = {
      ...session.data,
      [key]: value
    };

    await this.updateSession(sessionId, { data: updatedData });
    return true;
  }

  /**
   * Get session value
   */
  async getSessionValue(sessionId: string, key: string): Promise<any> {
    const session = await this.getSession(sessionId);
    if (!session) {
      return null;
    }

    return session.data[key];
  }

  /**
   * Delete session value
   */
  async deleteSessionValue(sessionId: string, key: string): Promise<boolean> {
    const session = await this.getSession(sessionId);
    if (!session) {
      return false;
    }

    const updatedData = { ...session.data };
    delete updatedData[key];

    await this.updateSession(sessionId, { data: updatedData });
    return true;
  }

  /**
   * Helper: Generate secure session ID
   */
  private generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Helper: Parse database row to SessionData
   */
  private parseSessionRow(row: any): SessionData {
    return {
      sessionId: row.session_id,
      userId: row.user_id,
      username: row.username,
      roles: JSON.parse(row.roles),
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      expiresAt: new Date(row.expires_at),
      data: JSON.parse(row.data || '{}')
    };
  }

  /**
   * Middleware: Session management for Express
   */
  middleware() {
    return async (req: any, res: any, next: any) => {
      // Get session ID from cookie or header
      const sessionId = req.cookies?.sessionId || req.headers['x-session-id'];

      if (sessionId) {
        const session = await this.getSession(sessionId);
        if (session) {
          req.session = {
            id: session.sessionId,
            userId: session.userId,
            username: session.username,
            roles: session.roles,
            data: session.data,
            save: async () => {
              await this.updateSession(sessionId, { data: req.session.data });
            },
            destroy: async () => {
              await this.deleteSession(sessionId);
            },
            regenerate: async () => {
              await this.deleteSession(sessionId);
              const newSession = await this.createSession(
                session.userId,
                session.username,
                session.roles,
                req.ip,
                req.headers['user-agent'],
                req.session.data
              );
              req.session.id = newSession.sessionId;
              res.cookie("sessionId", newSession.sessionId, {
                maxAge: this.defaultOptions.maxAge,
                httpOnly: this.defaultOptions.httpOnly,
                secure: this.defaultOptions.secure,
                sameSite: this.defaultOptions.sameSite,
                path: this.defaultOptions.path
              });
            }
          };
        }
      }

      next();
    };
  }
}

// Export singleton instance
export const sessionService = new SessionPersistenceService();