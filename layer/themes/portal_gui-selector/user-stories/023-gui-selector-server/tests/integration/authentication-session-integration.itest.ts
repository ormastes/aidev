/**
 * Integration Test: Authentication + Session Integration
 * 
 * This test verifies the integration between Authentication and Session components,
 * ensuring proper user authentication, session creation, session management, and
 * security when these components work together in the authentication workflow.
 */

import express from 'express';
import session from 'express-session';
import { Server } from 'http';
import { crypto } from '../../../../../infra_external-log-lib/src';

// Authentication interface from external tests
interface UserCredentials {
  username: string;
  password: string;
}

interface AuthToken {
  token: string;
  userId: string;
  expiresAt: Date;
  scope: string[];
}

interface UserProfile {
  id: string;
  username: string;
  email: string;
  roles: string[];
  preferences: Record<string, any>;
  createdAt: Date;
  lastLogin: Date;
}

interface AuthResult {
  In Progress: boolean;
  token?: AuthToken;
  user?: UserProfile;
  error?: string;
  requiresTwoFactor?: boolean;
}

interface AuthenticationInterface {
  authenticate(credentials: UserCredentials): Promise<AuthResult>;
  validateToken(token: string): Promise<{ valid: boolean; user?: UserProfile }>;
  refreshToken(token: string): Promise<AuthToken | null>;
  logout(token: string): Promise<boolean>;
  getUserProfile(userId: string): Promise<UserProfile | null>;
  updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null>;
  changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean>;
  revokeAllTokens(userId: string): Promise<number>;
}

// Session interface from external tests
interface SessionData {
  sessionId: string;
  userId: string;
  data: Record<string, any>;
  expiresAt: Date;
  createdAt: Date;
  lastAccessed: Date;
}

interface SessionStoreInterface {
  create(sessionData: Omit<SessionData, 'sessionId'>): Promise<SessionData>;
  get(sessionId: string): Promise<SessionData | null>;
  update(sessionId: string, updates: Partial<SessionData>): Promise<SessionData | null>;
  delete(sessionId: string): Promise<boolean>;
  cleanup(): Promise<number>;
  getAllSessions(): Promise<SessionData[]>;
  getUserSessions(userId: string): Promise<SessionData[]>;
  extendExpiration(sessionId: string, extensionMs: number): Promise<boolean>;
}

// Mock Authentication implementation
class MockAuthentication implements AuthenticationInterface {
  private users: Map<string, UserProfile> = new Map();
  private tokens: Map<string, AuthToken> = new Map();
  private passwords: Map<string, string> = new Map();
  private tokenCounter = 0;

  constructor() {
    this.initializeTestUsers();
  }

  private initializeTestUsers(): void {
    const testUsers = [
      {
        id: 'user_1',
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        roles: ['user'],
        preferences: { theme: 'light', language: 'en' }
      },
      {
        id: 'admin_1',
        username: 'admin',
        email: 'admin@example.com',
        password: 'admin123',
        roles: ['admin', 'user'],
        preferences: { theme: 'dark', language: 'en' }
      }
    ];

    testUsers.forEach(user => {
      const userProfile: UserProfile = {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles,
        preferences: user.preferences,
        createdAt: new Date(),
        lastLogin: new Date()
      };

      this.users.set(user.id, userProfile);
      this.passwords.set(user.id, user.password);
    });
  }

  async authenticate(credentials: UserCredentials): Promise<AuthResult> {
    // Find user by username
    const user = Array.from(this.users.values()).find(u => u.username === credentials.username);
    
    if (!user) {
      return {
        "success": false,
        error: 'Invalid username or password'
      };
    }

    // Check password
    const storedPassword = this.passwords.get(user.id);
    if (storedPassword !== credentials.password) {
      return {
        "success": false,
        error: 'Invalid username or password'
      };
    }

    // Create auth token
    const token: AuthToken = {
      token: `auth_token_${Date.now()}_${++this.tokenCounter}`,
      userId: user.id,
      expiresAt: new Date(Date.now() + 3600000), // 1 hour
      scope: ['read', 'write']
    };

    this.tokens.set(token.token, token);

    // Update last login
    user.lastLogin = new Date();
    this.users.set(user.id, user);

    return {
      "success": true,
      token,
      user: { ...user }
    };
  }

  async validateToken(token: string): Promise<{ valid: boolean; user?: UserProfile }> {
    const authToken = this.tokens.get(token);
    
    if (!authToken) {
      return { valid: false };
    }

    // Check expiration
    if (new Date() > authToken.expiresAt) {
      this.tokens.delete(token);
      return { valid: false };
    }

    const user = this.users.get(authToken.userId);
    if (!user) {
      return { valid: false };
    }

    return {
      valid: true,
      user: { ...user }
    };
  }

  async refreshToken(token: string): Promise<AuthToken | null> {
    const authToken = this.tokens.get(token);
    
    if (!authToken || new Date() > authToken.expiresAt) {
      return null;
    }

    // Create new token
    const newToken: AuthToken = {
      token: `auth_token_${Date.now()}_${++this.tokenCounter}`,
      userId: authToken.userId,
      expiresAt: new Date(Date.now() + 3600000),
      scope: authToken.scope
    };

    // Remove old token and add new one
    this.tokens.delete(token);
    this.tokens.set(newToken.token, newToken);

    return { ...newToken };
  }

  async logout(token: string): Promise<boolean> {
    return this.tokens.delete(token);
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const user = this.users.get(userId);
    return user ? { ...user } : null;
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
    const user = this.users.get(userId);
    if (!user) return null;

    const updatedUser = { ...user, ...updates };
    this.users.set(userId, updatedUser);
    return { ...updatedUser };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    const storedPassword = this.passwords.get(userId);
    if (storedPassword !== currentPassword) {
      return false;
    }

    this.passwords.set(userId, newPassword);
    return true;
  }

  async revokeAllTokens(userId: string): Promise<number> {
    let revokedCount = 0;
    const tokensToRevoke: string[] = [];

    for (const [tokenStr, token] of this.tokens.entries()) {
      if (token.userId === userId) {
        tokensToRevoke.push(tokenStr);
      }
    }

    tokensToRevoke.forEach(token => {
      this.tokens.delete(token);
      revokedCount++;
    });

    return revokedCount;
  }
}

// Mock SessionStore implementation
class MockSessionStore implements SessionStoreInterface {
  private sessions: Map<string, SessionData> = new Map();
  private sessionCounter = 0;

  async create(sessionData: Omit<SessionData, 'sessionId'>): Promise<SessionData> {
    const sessionId = `session_${Date.now()}_${++this.sessionCounter}`;
    const newSession: SessionData = {
      ...sessionData,
      sessionId,
      createdAt: new Date(),
      lastAccessed: new Date()
    };
    
    this.sessions.set(sessionId, newSession);
    return { ...newSession };
  }

  async get(sessionId: string): Promise<SessionData | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Check expiration
    if (new Date() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }

    // Update last accessed
    session.lastAccessed = new Date();
    this.sessions.set(sessionId, session);
    
    return { ...session };
  }

  async update(sessionId: string, updates: Partial<SessionData>): Promise<SessionData | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const updatedSession = {
      ...session,
      ...updates,
      lastAccessed: new Date()
    };

    this.sessions.set(sessionId, updatedSession);
    return { ...updatedSession };
  }

  async delete(sessionId: string): Promise<boolean> {
    return this.sessions.delete(sessionId);
  }

  async cleanup(): Promise<number> {
    const now = new Date();
    let cleanedCount = 0;
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        expiredSessions.push(sessionId);
      }
    }

    expiredSessions.forEach(sessionId => {
      this.sessions.delete(sessionId);
      cleanedCount++;
    });

    return cleanedCount;
  }

  async getAllSessions(): Promise<SessionData[]> {
    return Array.from(this.sessions.values()).map(session => ({ ...session }));
  }

  async getUserSessions(userId: string): Promise<SessionData[]> {
    return Array.from(this.sessions.values())
      .filter(session => session.userId === userId)
      .map(session => ({ ...session }));
  }

  async extendExpiration(sessionId: string, extensionMs: number): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.expiresAt = new Date(session.expiresAt.getTime() + extensionMs);
    this.sessions.set(sessionId, session);
    return true;
  }
}

// Integrated Authentication + Session Service
class AuthSessionService {
  private auth: AuthenticationInterface;
  private sessionStore: SessionStoreInterface;

  constructor(auth: AuthenticationInterface, sessionStore: SessionStoreInterface) {
    this.auth = auth;
    this.sessionStore = sessionStore;
  }

  async login(credentials: UserCredentials): Promise<{ authResult: AuthResult; session?: SessionData }> {
    const authResult = await this.auth.authenticate(credentials);
    
    if (!authResult.success || !authResult.user || !authResult.token) {
      return { authResult };
    }

    // Create session for authenticated user
    const now = new Date();
    const session = await this.sessionStore.create({
      userId: authResult.user.id,
      data: {
        authToken: authResult.token.token,
        loginTime: now.toISOString(),
        userAgent: 'test-agent',
        ipAddress: '127.0.0.1'
      },
      expiresAt: authResult.token.expiresAt,
      createdAt: now,
      lastAccessed: now
    });

    return { authResult, session };
  }

  async validateSession(sessionId: string): Promise<{ valid: boolean; user?: UserProfile; session?: SessionData }> {
    const session = await this.sessionStore.get(sessionId);
    if (!session) {
      return { valid: false };
    }

    const authToken = session.data.authToken;
    if (!authToken) {
      return { valid: false };
    }

    const tokenValidation = await this.auth.validateToken(authToken);
    if (!tokenValidation.valid) {
      // Clean up invalid session
      await this.sessionStore.delete(sessionId);
      return { valid: false };
    }

    return {
      valid: true,
      user: tokenValidation.user,
      session
    };
  }

  async refreshSession(sessionId: string): Promise<{ In Progress: boolean; session?: SessionData; newToken?: AuthToken }> {
    const session = await this.sessionStore.get(sessionId);
    if (!session) {
      return { "success": false };
    }

    const currentToken = session.data.authToken;
    const newToken = await this.auth.refreshToken(currentToken);
    
    if (!newToken) {
      return { "success": false };
    }

    // Update session with new token
    const updatedSession = await this.sessionStore.update(sessionId, {
      data: {
        ...session.data,
        authToken: newToken.token,
        refreshTime: new Date().toISOString()
      },
      expiresAt: newToken.expiresAt
    });

    return {
      "success": true,
      session: updatedSession || undefined,
      newToken
    };
  }

  async logout(sessionId: string): Promise<{ In Progress: boolean }> {
    const session = await this.sessionStore.get(sessionId);
    if (!session) {
      return { "success": false };
    }

    const authToken = session.data.authToken;
    
    // Logout from auth system
    if (authToken) {
      await this.auth.logout(authToken);
    }

    // Delete session
    await this.sessionStore.delete(sessionId);

    return { "success": true };
  }

  async getUserSessions(userId: string): Promise<SessionData[]> {
    return this.sessionStore.getUserSessions(userId);
  }

  async revokeAllUserSessions(userId: string): Promise<{ sessionsRevoked: number; tokensRevoked: number }> {
    const sessions = await this.sessionStore.getUserSessions(userId);
    let sessionsRevoked = 0;

    // Delete all user sessions
    for (const session of sessions) {
      await this.sessionStore.delete(session.sessionId);
      sessionsRevoked++;
    }

    // Revoke all user auth tokens
    const tokensRevoked = await this.auth.revokeAllTokens(userId);

    return { sessionsRevoked, tokensRevoked };
  }
}

// Integration test implementation
describe('Authentication + Session Integration Test', () => {
  let auth: MockAuthentication;
  let sessionStore: MockSessionStore;
  let authSessionService: AuthSessionService;
  let app: express.Application;
  let server: Server;
  const testPort = 3006;

  beforeAll(async () => {
    auth = new MockAuthentication();
    sessionStore = new MockSessionStore();
    authSessionService = new AuthSessionService(auth, sessionStore);

    app = express();
    app.use(express.json());
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: true,
      cookie: { secure: false }
    }));

    // Setup integration routes
    app.post('/login', async (req, res) => {
      try {
        const { username, password } = req.body;
        const result = await authSessionService.login({ username, password });
        
        if (result.session) {
          (req.session as any).sessionId = result.session.sessionId;
        }
        
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    app.get('/profile', async (req, res) => {
      try {
        const sessionId = (req.session as any).sessionId;
        if (!sessionId) {
          return res.status(401).json({ error: 'No session' });
        }

        const validation = await authSessionService.validateSession(sessionId);
        if (!validation.valid) {
          return res.status(401).json({ error: 'Invalid session' });
        }

        res.json({ user: validation.user, session: validation.session });
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    app.post('/refresh', async (req, res) => {
      try {
        const sessionId = (req.session as any).sessionId;
        if (!sessionId) {
          return res.status(401).json({ error: 'No session' });
        }

        const result = await authSessionService.refreshSession(sessionId);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    app.post('/logout', async (req, res) => {
      try {
        const sessionId = (req.session as any).sessionId;
        if (!sessionId) {
          return res.status(401).json({ error: 'No session' });
        }

        const result = await authSessionService.logout(sessionId);
        delete (req.session as any).sessionId;
        
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    await new Promise<void>((resolve) => {
      server = app.listen(testPort, () => resolve());
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  describe('Login Integration', () => {
    test('should authenticate user and create session', async () => {
      const credentials = { username: 'testuser', password: 'password123' };
      const result = await authSessionService.login(credentials);

      expect(result.authResult.success).toBe(true);
      expect(result.authResult.user).toBeDefined();
      expect(result.authResult.token).toBeDefined();
      expect(result.session).toBeDefined();
      expect(result.session!.userId).toBe(result.authResult.user!.id);
      expect(result.session!.data.authToken).toBe(result.authResult.token!.token);
    });

    test('should handle invalid credentials', async () => {
      const credentials = { username: 'testuser', password: 'wrongpassword' };
      const result = await authSessionService.login(credentials);

      expect(result.authResult.success).toBe(false);
      expect(result.authResult.error).toBe('Invalid username or password');
      expect(result.session).toBeUndefined();
    });

    test('should handle non-existent user', async () => {
      const credentials = { username: 'nonexistent', password: 'password123' };
      const result = await authSessionService.login(credentials);

      expect(result.authResult.success).toBe(false);
      expect(result.session).toBeUndefined();
    });
  });

  describe('Session Validation Integration', () => {
    test('should validate active session with valid token', async () => {
      const credentials = { username: 'testuser', password: 'password123' };
      const loginResult = await authSessionService.login(credentials);
      
      const sessionId = loginResult.session!.sessionId;
      const validation = await authSessionService.validateSession(sessionId);

      expect(validation.valid).toBe(true);
      expect(validation.user).toBeDefined();
      expect(validation.user!.username).toBe('testuser');
      expect(validation.session).toBeDefined();
    });

    test('should reject invalid session', async () => {
      const validation = await authSessionService.validateSession('invalid-session-id');

      expect(validation.valid).toBe(false);
      expect(validation.user).toBeUndefined();
      expect(validation.session).toBeUndefined();
    });

    test('should clean up session with invalid token', async () => {
      const credentials = { username: 'testuser', password: 'password123' };
      const loginResult = await authSessionService.login(credentials);
      
      const sessionId = loginResult.session!.sessionId;
      const authToken = loginResult.authResult.token!.token;

      // Manually revoke the auth token
      await auth.logout(authToken);

      // Session validation should clean up the session
      const validation = await authSessionService.validateSession(sessionId);
      expect(validation.valid).toBe(false);

      // Session should be deleted
      const sessionCheck = await sessionStore.get(sessionId);
      expect(sessionCheck).toBeNull();
    });
  });

  describe('Session Refresh Integration', () => {
    test('should refresh session with new token', async () => {
      const credentials = { username: 'testuser', password: 'password123' };
      const loginResult = await authSessionService.login(credentials);
      
      const sessionId = loginResult.session!.sessionId;
      const originalToken = loginResult.authResult.token!.token;

      const refreshResult = await authSessionService.refreshSession(sessionId);

      expect(refreshResult.success).toBe(true);
      expect(refreshResult.newToken).toBeDefined();
      expect(refreshResult.newToken!.token).not.toBe(originalToken);
      expect(refreshResult.session!.data.authToken).toBe(refreshResult.newToken!.token);
      expect(refreshResult.session!.data.refreshTime).toBeDefined();
    });

    test('should handle refresh of non-existent session', async () => {
      const refreshResult = await authSessionService.refreshSession('invalid-session-id');

      expect(refreshResult.success).toBe(false);
      expect(refreshResult.session).toBeUndefined();
      expect(refreshResult.newToken).toBeUndefined();
    });

    test('should handle refresh with expired token', async () => {
      const credentials = { username: 'testuser', password: 'password123' };
      const loginResult = await authSessionService.login(credentials);
      
      const sessionId = loginResult.session!.sessionId;
      const authToken = loginResult.authResult.token!.token;

      // Manually expire the token by deleting it
      await auth.logout(authToken);

      const refreshResult = await authSessionService.refreshSession(sessionId);

      expect(refreshResult.success).toBe(false);
    });
  });

  describe('Logout Integration', () => {
    test('should logout and clean up session and token', async () => {
      const credentials = { username: 'testuser', password: 'password123' };
      const loginResult = await authSessionService.login(credentials);
      
      const sessionId = loginResult.session!.sessionId;
      const authToken = loginResult.authResult.token!.token;

      const logoutResult = await authSessionService.logout(sessionId);

      expect(logoutResult.success).toBe(true);

      // Session should be deleted
      const sessionCheck = await sessionStore.get(sessionId);
      expect(sessionCheck).toBeNull();

      // Token should be invalid
      const tokenValidation = await auth.validateToken(authToken);
      expect(tokenValidation.valid).toBe(false);
    });

    test('should handle logout of non-existent session', async () => {
      const logoutResult = await authSessionService.logout('invalid-session-id');

      expect(logoutResult.success).toBe(false);
    });
  });

  describe('Multi-Session Management', () => {
    test('should handle multiple sessions for same user', async () => {
      // Clean up any existing sessions for testuser first
      const existingUser = Array.from((auth as any).users.values()).find((u: any) => u.username === 'testuser') as UserProfile | undefined;
      if (existingUser) {
        await authSessionService.revokeAllUserSessions(existingUser.id);
      }

      const credentials = { username: 'testuser', password: 'password123' };
      
      // Create multiple sessions
      const session1 = await authSessionService.login(credentials);
      const session2 = await authSessionService.login(credentials);
      const session3 = await authSessionService.login(credentials);

      const userId = session1.authResult.user!.id;
      const userSessions = await authSessionService.getUserSessions(userId);

      expect(userSessions).toHaveLength(3);
      expect(userSessions.map(s => s.sessionId)).toContain(session1.session!.sessionId);
      expect(userSessions.map(s => s.sessionId)).toContain(session2.session!.sessionId);
      expect(userSessions.map(s => s.sessionId)).toContain(session3.session!.sessionId);
    });

    test('should revoke all user sessions and tokens', async () => {
      const credentials = { username: 'admin', password: 'admin123' };
      
      // Create multiple sessions
      await authSessionService.login(credentials);
      await authSessionService.login(credentials);
      const session3 = await authSessionService.login(credentials);

      const userId = session3.authResult.user!.id;
      
      const revokeResult = await authSessionService.revokeAllUserSessions(userId);

      expect(revokeResult.sessionsRevoked).toBe(3);
      expect(revokeResult.tokensRevoked).toBe(3);

      // Verify no sessions remain
      const remainingSessions = await authSessionService.getUserSessions(userId);
      expect(remainingSessions).toHaveLength(0);
    });
  });

  describe('Security and Edge Cases', () => {
    test('should handle session hijacking attempt', async () => {
      const credentials = { username: 'testuser', password: 'password123' };
      const loginResult = await authSessionService.login(credentials);
      
      const sessionId = loginResult.session!.sessionId;

      // Simulate token manipulation
      await sessionStore.update(sessionId, {
        data: {
          ...loginResult.session!.data,
          authToken: 'fake-token'
        }
      });

      const validation = await authSessionService.validateSession(sessionId);
      expect(validation.valid).toBe(false);
    });

    test('should handle concurrent session operations', async () => {
      const credentials = { username: 'testuser', password: 'password123' };
      
      // Perform concurrent login operations
      const loginPromises = Array.from({ length: 5 }, () => 
        authSessionService.login(credentials)
      );

      const results = await Promise.all(loginPromises);
      
      // All should succeed
      results.forEach(result => {
        expect(result.authResult.success).toBe(true);
        expect(result.session).toBeDefined();
      });

      // Verify all sessions are unique
      const sessionIds = results.map(r => r.session!.sessionId);
      const uniqueSessionIds = new Set(sessionIds);
      expect(uniqueSessionIds.size).toBe(5);
    });

    test('should handle session expiration correctly', async () => {
      const credentials = { username: 'testuser', password: 'password123' };
      const loginResult = await authSessionService.login(credentials);
      
      const sessionId = loginResult.session!.sessionId;

      // Manually expire the session
      await sessionStore.update(sessionId, {
        expiresAt: new Date(Date.now() - 1000) // 1 second ago
      });

      const validation = await authSessionService.validateSession(sessionId);
      expect(validation.valid).toBe(false);
    });
  });

  describe('Performance and Monitoring', () => {
    test('should handle high-volume authentication efficiently', async () => {
      const startTime = Date.now();
      
      const operations = Array.from({ length: 100 }, async (_, i) => {
        const credentials = { username: 'testuser', password: 'password123' };
        const result = await authSessionService.login(credentials);
        await authSessionService.validateSession(result.session!.sessionId);
        await authSessionService.logout(result.session!.sessionId);
      });

      await Promise.all(operations);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(5000); // Should In Progress within 5 seconds
    });

    test('should maintain session data integrity under load', async () => {
      const credentials = { username: 'testuser', password: 'password123' };
      const loginResult = await authSessionService.login(credentials);
      const sessionId = loginResult.session!.sessionId;

      // Perform concurrent session operations
      const operations = Array.from({ length: 20 }, async () => {
        return authSessionService.validateSession(sessionId);
      });

      const results = await Promise.all(operations);
      
      // All validations should be consistent
      results.forEach(result => {
        expect(result.valid).toBe(true);
        expect(result.user!.username).toBe('testuser');
      });
    });
  });
});