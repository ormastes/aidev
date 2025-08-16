/**
 * User Service
 * Manages user authentication and authorization
 */

import { DatabaseAdapter, User, UserSession } from '../../external/database';
import { crypto } from '../../../../../../infra_external-log-lib/src';

export interface CreateUserRequest {
  username: string;
  email: string;
  role: 'admin' | 'tester' | 'viewer';
}

export interface LoginRequest {
  username: string;
  password?: string; // For future password implementation
}

export interface AuthSession {
  sessionId: string;
  token: string;
  user: User;
  expiresAt: Date;
}

export class UserService {
  private readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private readonly TOKEN_LENGTH = 32;

  constructor(private database: DatabaseAdapter) {}

  /**
   * Create a new user
   */
  async createUser(userData: CreateUserRequest): Promise<User> {
    // Check if username or email already exists
    const existingUser = await this.database.getUserByUsername(userData.username);
    if (existingUser) {
      throw new Error('Username already exists');
    }

    return await this.database.createUser(userData);
  }

  /**
   * Get user by ID
   */
  async getUser(userId: string): Promise<User | null> {
    return await this.database.getUser(userId);
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<User | null> {
    return await this.database.getUserByUsername(username);
  }

  /**
   * Update user information
   */
  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    return await this.database.updateUser(userId, updates);
  }

  /**
   * Delete a user
   */
  async deleteUser(userId: string): Promise<void> {
    // First, invalidate all user sessions
    const userSessions = await this.getUserSessions(userId);
    for (const session of userSessions) {
      await this.database.deleteSession(session.id);
    }

    // Then delete the user
    await this.database.deleteUser(userId);
  }

  /**
   * Authenticate user and create session
   */
  async login(loginData: LoginRequest): Promise<AuthSession> {
    const user = await this.database.getUserByUsername(loginData.username);
    if (!user) {
      throw new Error('User not found');
    }

    // Update last login time
    await this.database.updateUser(user.id, {
      lastLoginAt: new Date()
    });

    // Generate session token
    const token = this.generateSecureToken();
    const expiresAt = new Date(Date.now() + this.SESSION_DURATION);

    // Create session
    const session = await this.database.createSession({
      userId: user.id,
      token,
      expiresAt,
      metadata: {
        loginTime: new Date().toISOString(),
        ipAddress: 'unknown', // Would be populated by middleware
        userAgent: 'unknown'  // Would be populated by middleware
      }
    });

    return {
      sessionId: session.id,
      token: session.token,
      user,
      expiresAt: session.expiresAt
    };
  }

  /**
   * Logout user (invalidate session)
   */
  async logout(token: string): Promise<void> {
    const session = await this.database.getSession(token);
    if (session) {
      await this.database.deleteSession(session.id);
    }
  }

  /**
   * Validate session token
   */
  async validateSession(token: string): Promise<AuthSession | null> {
    const session = await this.database.getSession(token);
    if (!session) {
      return null;
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      await this.database.deleteSession(session.id);
      return null;
    }

    // Get user data
    const user = await this.database.getUser(session.userId);
    if (!user) {
      await this.database.deleteSession(session.id);
      return null;
    }

    return {
      sessionId: session.id,
      token: session.token,
      user,
      expiresAt: session.expiresAt
    };
  }

  /**
   * Refresh session (extend expiration)
   */
  async refreshSession(token: string): Promise<AuthSession | null> {
    const currentSession = await this.validateSession(token);
    if (!currentSession) {
      return null;
    }

    const newExpiresAt = new Date(Date.now() + this.SESSION_DURATION);
    
    const updatedSession = await this.database.updateSession(currentSession.sessionId, {
      expiresAt: newExpiresAt
    });

    return {
      sessionId: updatedSession.id,
      token: updatedSession.token,
      user: currentSession.user,
      expiresAt: updatedSession.expiresAt
    };
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<UserSession[]> {
    // Note: This would require implementing a query method in the database adapter
    // For now, we'll simulate by getting all sessions and filtering
    // In production, this should be implemented as a database query
    throw new Error('getUserSessions not implemented - requires database query enhancement');
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    return await this.database.cleanExpiredSessions();
  }

  /**
   * Check user permissions
   */
  hasPermission(user: User, action: string, resource?: string): boolean {
    switch (user.role) {
      case 'admin':
        return true; // Admin can do everything

      case 'tester':
        switch (action) {
          case 'read':
          case 'create':
          case 'update':
          case 'execute':
            return true;
          case 'delete':
          case 'manage_users':
            return false;
          default:
            return false;
        }

      case 'viewer':
        switch (action) {
          case 'read':
            return true;
          case 'create':
          case 'update':
          case 'delete':
          case 'execute':
          case 'manage_users':
            return false;
          default:
            return false;
        }

      default:
        return false;
    }
  }

  /**
   * Get user activity summary
   */
  async getUserActivity(userId: string): Promise<{
    totalExecutions: number;
    successRate: number;
    lastActivity: Date | null;
    favoriteSuites: string[];
    avgExecutionTime: number;
  }> {
    const statistics = await this.database.getTestStatistics(userId);
    const executions = await this.database.getExecutionsByUser(userId, 1);
    
    return {
      totalExecutions: statistics.totalExecutions,
      successRate: statistics.successRate,
      lastActivity: executions.length > 0 ? executions[0].startedAt : null,
      favoriteSuites: [], // Would need to implement favorite tracking
      avgExecutionTime: statistics.avgExecutionTime
    };
  }

  /**
   * Generate secure random token
   */
  private generateSecureToken(): string {
    return crypto.randomBytes(this.TOKEN_LENGTH).toString('hex');
  }

  /**
   * Create default admin user if none exists
   */
  async createDefaultAdmin(): Promise<User | null> {
    // Check if any admin user exists
    const existingAdmin = await this.database.getUserByUsername('admin');
    if (existingAdmin) {
      return null; // Admin already exists
    }

    return await this.createUser({
      username: 'admin',
      email: 'admin@example.com',
      role: 'admin'
    });
  }

  /**
   * Get user statistics
   */
  async getAllUsersStatistics(): Promise<{
    totalUsers: number;
    usersByRole: Record<string, number>;
    activeUsers: number; // Users with sessions in last 30 days
    newUsersThisMonth: number;
  }> {
    // Note: This would require implementing aggregate queries in the database adapter
    // For now, we'll return a placeholder structure
    return {
      totalUsers: 0,
      usersByRole: {
        admin: 0,
        tester: 0,
        viewer: 0
      },
      activeUsers: 0,
      newUsersThisMonth: 0
    };
  }

  /**
   * Middleware helper for route protection
   */
  createAuthMiddleware() {
    return async (req: any, res: any, next: any) => {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const session = await this.validateSession(token);
      if (!session) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      // Attach user and session to request
      req.user = session.user;
      req.session = session;
      
      next();
    };
  }

  /**
   * Permission middleware
   */
  requirePermission(action: string, resource?: string) {
    return (req: any, res: any, next: any) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!this.hasPermission(req.user, action, resource)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    };
  }
}