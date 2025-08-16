/**
 * Multi-User Authentication System Tests
 * Tests for UserManagementService, RoleBasedAccessControl, and SessionPersistenceService
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { UserManagementService, UserRole, UserCredentials, RegistrationData } from '../src/services/UserManagementService';
import { RoleBasedAccessControl } from '../src/middleware/RoleBasedAccessControl';
import { SessionPersistenceService } from '../src/services/SessionPersistenceService';
import { Request, Response, NextFunction } from 'express';
import * as fs from 'fs/promises';
import { path } from '../../../../infra_external-log-lib/src';

// Mock implementations
const mockDatabaseService = {
  init: jest.fn(),
  run: jest.fn(),
  get: jest.fn(),
  all: jest.fn()
};

const mockJWTService = {
  generateToken: jest.fn(),
  generateRefreshToken: jest.fn(),
  verifyToken: jest.fn()
};

const mockLogService = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Test database path
const TEST_DB_PATH = path.join(__dirname, 'test-auth.db');

describe('Multi-User Authentication System', () => {
  let userService: UserManagementService;
  let rbac: RoleBasedAccessControl;
  let sessionService: SessionPersistenceService;

  beforeEach(async () => {
    // Clean up test database
    try {
      await fs.unlink(TEST_DB_PATH);
    } catch (error) {
      // Ignore if file doesn't exist
    }

    // Initialize services with test database
    process.env.DATABASE_PATH = TEST_DB_PATH;
    
    userService = new UserManagementService();
    rbac = new RoleBasedAccessControl();
    sessionService = new SessionPersistenceService();

    // Initialize services
    await userService.initialize();
    await sessionService.initialize();
  });

  afterEach(async () => {
    // Stop cleanup job
    sessionService.stopCleanupJob();
    
    // Clean up test database
    try {
      await fs.unlink(TEST_DB_PATH);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  });

  describe('UserManagementService', () => {
    describe('User Registration', () => {
      it('should register a new user successfully', async () => {
        const registrationData: RegistrationData = {
          username: 'testuser',
          email: 'test@example.com',
          password: 'TestPassword123',
          roles: [UserRole.VIEWER]
        };

        const user = await userService.registerUser(registrationData);

        expect(user).toBeDefined();
        expect(user.username).toBe('testuser');
        expect(user.email).toBe('test@example.com');
        expect(user.roles).toContain(UserRole.VIEWER);
        expect(user.isActive).toBe(true);
      });

      it('should reject registration with invalid username', async () => {
        const registrationData: RegistrationData = {
          username: 'te', // Too short
          email: 'test@example.com',
          password: 'TestPassword123'
        };

        await expect(userService.registerUser(registrationData))
          .rejects.toThrow('Invalid username format');
      });

      it('should reject registration with invalid email', async () => {
        const registrationData: RegistrationData = {
          username: 'testuser',
          email: 'invalid-email',
          password: 'TestPassword123'
        };

        await expect(userService.registerUser(registrationData))
          .rejects.toThrow('Invalid email format');
      });

      it('should reject weak passwords', async () => {
        const registrationData: RegistrationData = {
          username: 'testuser',
          email: 'test@example.com',
          password: 'weak'
        };

        await expect(userService.registerUser(registrationData))
          .rejects.toThrow('Password must be at least 8 characters');
      });

      it('should prevent duplicate usernames', async () => {
        const registrationData: RegistrationData = {
          username: 'testuser',
          email: 'test1@example.com',
          password: 'TestPassword123'
        };

        await userService.registerUser(registrationData);

        const duplicateData: RegistrationData = {
          username: 'testuser',
          email: 'test2@example.com',
          password: 'TestPassword123'
        };

        await expect(userService.registerUser(duplicateData))
          .rejects.toThrow('Username or email already exists');
      });
    });

    describe('User Authentication', () => {
      beforeEach(async () => {
        // Create test user
        await userService.registerUser({
          username: 'authtest',
          email: 'auth@test.com',
          password: 'AuthTest123'
        });
      });

      it('should authenticate valid credentials', async () => {
        const credentials: UserCredentials = {
          username: 'authtest',
          password: 'AuthTest123'
        };

        const result = await userService.authenticateUser(credentials);

        expect(result.success).toBe(true);
        expect(result.user).toBeDefined();
        expect(result.user?.username).toBe('authtest');
        expect(result.token).toBeDefined();
      });

      it('should reject invalid password', async () => {
        const credentials: UserCredentials = {
          username: 'authtest',
          password: 'WrongPassword123'
        };

        const result = await userService.authenticateUser(credentials);

        expect(result.success).toBe(false);
        expect(result.message).toBe('Invalid username or password');
      });

      it('should reject non-existent user', async () => {
        const credentials: UserCredentials = {
          username: 'nonexistent',
          password: 'TestPassword123'
        };

        const result = await userService.authenticateUser(credentials);

        expect(result.success).toBe(false);
        expect(result.message).toBe('Invalid username or password');
      });

      it('should generate refresh token when remember me is enabled', async () => {
        const credentials: UserCredentials = {
          username: 'authtest',
          password: 'AuthTest123',
          rememberMe: true
        };

        const result = await userService.authenticateUser(credentials);

        expect(result.success).toBe(true);
        expect(result.refreshToken).toBeDefined();
      });
    });

    describe('User Management', () => {
      let testUserId: string;

      beforeEach(async () => {
        const user = await userService.registerUser({
          username: 'manageduser',
          email: 'managed@test.com',
          password: 'ManagedUser123'
        });
        testUserId = user.id;
      });

      it('should get user by ID', async () => {
        const user = await userService.getUserById(testUserId);

        expect(user).toBeDefined();
        expect(user?.username).toBe('manageduser');
      });

      it('should get user by username', async () => {
        const user = await userService.getUserByUsername('manageduser');

        expect(user).toBeDefined();
        expect(user?.email).toBe('managed@test.com');
      });

      it('should update user roles', async () => {
        const updatedUser = await userService.updateUserRoles(
          testUserId,
          [UserRole.DESIGNER, UserRole.VIEWER]
        );

        expect(updatedUser.roles).toContain(UserRole.DESIGNER);
        expect(updatedUser.roles).toContain(UserRole.VIEWER);
      });

      it('should change user password', async () => {
        const success = await userService.changePassword(
          testUserId,
          'ManagedUser123',
          'NewPassword123'
        );

        expect(success).toBe(true);

        // Verify new password works
        const result = await userService.authenticateUser({
          username: 'manageduser',
          password: 'NewPassword123'
        });

        expect(result.success).toBe(true);
      });

      it('should activate and deactivate user', async () => {
        // Deactivate
        let user = await userService.setUserActive(testUserId, false);
        expect(user.isActive).toBe(false);

        // Try to authenticate deactivated user
        const result = await userService.authenticateUser({
          username: 'manageduser',
          password: 'ManagedUser123'
        });
        expect(result.success).toBe(false);
        expect(result.message).toBe('Account is disabled');

        // Reactivate
        user = await userService.setUserActive(testUserId, true);
        expect(user.isActive).toBe(true);
      });

      it('should update user preferences', async () => {
        const preferences = {
          theme: 'dark',
          language: 'en',
          notifications: true
        };

        const user = await userService.updateUserPreferences(testUserId, preferences);

        expect(user.preferences?.theme).toBe('dark');
        expect(user.preferences?.language).toBe('en');
        expect(user.preferences?.notifications).toBe(true);
      });
    });

    describe('Account Lockout', () => {
      beforeEach(async () => {
        await userService.registerUser({
          username: 'locktest',
          email: 'lock@test.com',
          password: 'LockTest123'
        });
      });

      it('should lock account after max failed attempts', async () => {
        const wrongCredentials: UserCredentials = {
          username: 'locktest',
          password: 'WrongPassword'
        };

        // Make max attempts
        for (let i = 0; i < 5; i++) {
          await userService.authenticateUser(wrongCredentials);
        }

        // Next attempt should be locked
        const result = await userService.authenticateUser(wrongCredentials);
        expect(result.success).toBe(false);
        expect(result.message).toContain('temporarily locked');
      });
    });
  });

  describe('RoleBasedAccessControl', () => {
    describe('Authentication Middleware', () => {
      it('should authenticate user with valid JWT token', async () => {
        const mockReq = {
          headers: {
            authorization: 'Bearer valid-token'
          },
          session: {}
        } as any;

        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        } as any;

        const mockNext = jest.fn();

        // Mock JWT verification
        (rbac as any).jwtService.verifyToken = jest.fn().mockReturnValue({
          userId: 'user123',
          username: 'testuser',
          roles: [UserRole.DESIGNER]
        });

        await rbac.authenticate()(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockReq.user).toBeDefined();
        expect(mockReq.user.username).toBe('testuser');
        expect(mockReq.user.roles).toContain(UserRole.DESIGNER);
      });

      it('should reject request without authentication', async () => {
        const mockReq = {
          headers: {},
          session: {}
        } as any;

        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        } as any;

        const mockNext = jest.fn();

        await rbac.authenticate()(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Authentication required'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('Authorization Middleware', () => {
      it('should allow access for authorized roles', () => {
        const mockReq = {
          user: {
            userId: 'user123',
            username: 'designer',
            roles: [UserRole.DESIGNER]
          }
        } as any;

        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        } as any;

        const mockNext = jest.fn();

        rbac.authorize(UserRole.DESIGNER, UserRole.ADMIN)(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
      });

      it('should deny access for unauthorized roles', () => {
        const mockReq = {
          user: {
            userId: 'user123',
            username: 'viewer',
            roles: [UserRole.VIEWER]
          }
        } as any;

        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        } as any;

        const mockNext = jest.fn();

        rbac.authorize(UserRole.ADMIN)(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Access denied: Insufficient permissions'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('Permission Checks', () => {
      it('should check canView permission', () => {
        const mockReqViewer = {
          user: { roles: [UserRole.VIEWER] }
        } as any;

        const mockReqGuest = {
          user: { roles: [UserRole.GUEST] }
        } as any;

        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        } as any;

        const mockNext = jest.fn();

        // Viewer should have access
        rbac.canView()(mockReqViewer, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();

        // Guest should not have access
        mockNext.mockClear();
        mockRes.status.mockClear();
        rbac.canView()(mockReqGuest, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(403);
      });

      it('should check canEdit permission', () => {
        const mockReqDesigner = {
          user: { roles: [UserRole.DESIGNER] }
        } as any;

        const mockReqViewer = {
          user: { roles: [UserRole.VIEWER] }
        } as any;

        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        } as any;

        const mockNext = jest.fn();

        // Designer should have access
        rbac.canEdit()(mockReqDesigner, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();

        // Viewer should not have access
        mockNext.mockClear();
        mockRes.status.mockClear();
        rbac.canEdit()(mockReqViewer, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(403);
      });

      it('should check canDelete permission', () => {
        const mockReqAdmin = {
          user: { roles: [UserRole.ADMIN] }
        } as any;

        const mockReqDesigner = {
          user: { roles: [UserRole.DESIGNER] }
        } as any;

        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        } as any;

        const mockNext = jest.fn();

        // Admin should have access
        rbac.canDelete()(mockReqAdmin, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();

        // Designer should not have access
        mockNext.mockClear();
        mockRes.status.mockClear();
        rbac.canDelete()(mockReqDesigner, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(403);
      });
    });

    describe('Owner-Only Access', () => {
      it('should allow owner access to their resources', () => {
        const mockReq = {
          user: {
            userId: 'user123',
            username: 'owner',
            roles: [UserRole.VIEWER]
          },
          params: {
            id: 'user123'
          }
        } as any;

        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        } as any;

        const mockNext = jest.fn();

        rbac.ownerOnly()(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should allow admin access to any resources', () => {
        const mockReq = {
          user: {
            userId: 'admin123',
            username: 'admin',
            roles: [UserRole.ADMIN]
          },
          params: {
            id: 'user456'
          }
        } as any;

        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        } as any;

        const mockNext = jest.fn();

        rbac.ownerOnly()(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should deny non-owner access to resources', () => {
        const mockReq = {
          user: {
            userId: 'user123',
            username: 'viewer',
            roles: [UserRole.VIEWER]
          },
          params: {
            id: 'user456'
          }
        } as any;

        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        } as any;

        const mockNext = jest.fn();

        rbac.ownerOnly()(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockNext).not.toHaveBeenCalled();
      });
    });
  });

  describe('SessionPersistenceService', () => {
    describe('Session Creation', () => {
      it('should create a new session', async () => {
        const session = await sessionService.createSession(
          'user123',
          'testuser',
          [UserRole.DESIGNER],
          '127.0.0.1',
          'Mozilla/5.0'
        );

        expect(session).toBeDefined();
        expect(session.sessionId).toBeDefined();
        expect(session.userId).toBe('user123');
        expect(session.username).toBe('testuser');
        expect(session.roles).toContain(UserRole.DESIGNER);
      });

      it('should retrieve session by ID', async () => {
        const created = await sessionService.createSession(
          'user123',
          'testuser',
          [UserRole.VIEWER]
        );

        const retrieved = await sessionService.getSession(created.sessionId);

        expect(retrieved).toBeDefined();
        expect(retrieved?.userId).toBe('user123');
      });

      it('should return null for non-existent session', async () => {
        const session = await sessionService.getSession('non-existent-id');
        expect(session).toBeNull();
      });
    });

    describe('Session Management', () => {
      let sessionId: string;

      beforeEach(async () => {
        const session = await sessionService.createSession(
          'user123',
          'testuser',
          [UserRole.VIEWER]
        );
        sessionId = session.sessionId;
      });

      it('should update session data', async () => {
        const updated = await sessionService.updateSession(sessionId, {
          data: { preference: 'dark-mode' }
        });

        expect(updated?.data.preference).toBe('dark-mode');
      });

      it('should touch session to extend expiry', async () => {
        const success = await sessionService.touchSession(sessionId);
        expect(success).toBe(true);
      });

      it('should delete session', async () => {
        const deleted = await sessionService.deleteSession(sessionId);
        expect(deleted).toBe(true);

        const session = await sessionService.getSession(sessionId);
        expect(session).toBeNull();
      });

      it('should validate existing session', async () => {
        const isValid = await sessionService.validateSession(sessionId);
        expect(isValid).toBe(true);
      });

      it('should invalidate non-existent session', async () => {
        const isValid = await sessionService.validateSession('invalid-id');
        expect(isValid).toBe(false);
      });
    });

    describe('User Sessions', () => {
      beforeEach(async () => {
        // Create multiple sessions for a user
        await sessionService.createSession('user123', 'testuser', [UserRole.VIEWER]);
        await sessionService.createSession('user123', 'testuser', [UserRole.VIEWER]);
        await sessionService.createSession('user456', 'otheruser', [UserRole.DESIGNER]);
      });

      it('should get all sessions for a user', async () => {
        const sessions = await sessionService.getUserSessions('user123');
        expect(sessions).toHaveLength(2);
        expect(sessions[0].userId).toBe('user123');
      });

      it('should count user sessions', async () => {
        const count = await sessionService.countUserSessions('user123');
        expect(count).toBe(2);
      });

      it('should delete all sessions for a user', async () => {
        const deleted = await sessionService.deleteUserSessions('user123');
        expect(deleted).toBe(2);

        const remaining = await sessionService.getUserSessions('user123');
        expect(remaining).toHaveLength(0);
      });
    });

    describe('Session Values', () => {
      let sessionId: string;

      beforeEach(async () => {
        const session = await sessionService.createSession(
          'user123',
          'testuser',
          [UserRole.VIEWER]
        );
        sessionId = session.sessionId;
      });

      it('should store and retrieve session values', async () => {
        await sessionService.setSessionValue(sessionId, 'theme', 'dark');
        const value = await sessionService.getSessionValue(sessionId, 'theme');
        expect(value).toBe('dark');
      });

      it('should delete session values', async () => {
        await sessionService.setSessionValue(sessionId, 'temp', 'value');
        await sessionService.deleteSessionValue(sessionId, 'temp');
        const value = await sessionService.getSessionValue(sessionId, 'temp');
        expect(value).toBeUndefined();
      });
    });

    describe('Session Cleanup', () => {
      it('should clean up expired sessions', async () => {
        // Create a session with immediate expiry
        const shortLivedService = new SessionPersistenceService({
          maxAge: 1 // 1ms
        });
        await shortLivedService.initialize();

        const session = await shortLivedService.createSession(
          'user123',
          'testuser',
          [UserRole.VIEWER]
        );

        // Wait for expiry
        await new Promise(resolve => setTimeout(resolve, 10));

        const cleaned = await shortLivedService.cleanupExpiredSessions();
        expect(cleaned).toBeGreaterThan(0);

        const retrieved = await shortLivedService.getSession(session.sessionId);
        expect(retrieved).toBeNull();

        shortLivedService.stopCleanupJob();
      });
    });

    describe('Session Statistics', () => {
      beforeEach(async () => {
        await sessionService.createSession('user1', 'alice', [UserRole.ADMIN]);
        await sessionService.createSession('user2', 'bob', [UserRole.DESIGNER]);
        await sessionService.createSession('user2', 'bob', [UserRole.DESIGNER]);
      });

      it('should get session statistics', async () => {
        const stats = await sessionService.getSessionStatistics();

        expect(stats.totalActive).toBe(3);
        expect(stats.uniqueUsers).toBe(2);
        expect(stats.sessionsPerUser['alice']).toBe(1);
        expect(stats.sessionsPerUser['bob']).toBe(2);
      });
    });
  });

  describe('Integration Tests', () => {
    describe('Complete Authentication Flow', () => {
      it('should handle complete registration and login flow', async () => {
        // Register user
        const user = await userService.registerUser({
          username: 'integrationtest',
          email: 'integration@test.com',
          password: 'Integration123',
          roles: [UserRole.DESIGNER]
        });

        expect(user).toBeDefined();

        // Authenticate user
        const authResult = await userService.authenticateUser({
          username: 'integrationtest',
          password: 'Integration123'
        });

        expect(authResult.success).toBe(true);
        expect(authResult.token).toBeDefined();

        // Create session
        const session = await sessionService.createSession(
          user.id,
          user.username,
          user.roles,
          '127.0.0.1'
        );

        expect(session).toBeDefined();

        // Validate session
        const isValid = await sessionService.validateSession(session.sessionId);
        expect(isValid).toBe(true);

        // Update user preferences
        const updatedUser = await userService.updateUserPreferences(user.id, {
          theme: 'dark',
          notifications: true
        });

        expect(updatedUser.preferences?.theme).toBe('dark');

        // Store preference in session
        await sessionService.setSessionValue(
          session.sessionId,
          'currentTheme',
          'dark'
        );

        const theme = await sessionService.getSessionValue(
          session.sessionId,
          'currentTheme'
        );
        expect(theme).toBe('dark');

        // Logout (delete session)
        await sessionService.deleteSession(session.sessionId);
        const deletedSession = await sessionService.getSession(session.sessionId);
        expect(deletedSession).toBeNull();
      });
    });

    describe('Role-Based Access Flow', () => {
      it('should enforce role-based access control', async () => {
        // Create users with different roles
        const admin = await userService.registerUser({
          username: 'adminuser',
          email: 'admin@test.com',
          password: 'Admin123456',
          roles: [UserRole.ADMIN]
        });

        const designer = await userService.registerUser({
          username: 'designeruser',
          email: 'designer@test.com',
          password: 'Designer123',
          roles: [UserRole.DESIGNER]
        });

        const viewer = await userService.registerUser({
          username: 'vieweruser',
          email: 'viewer@test.com',
          password: 'Viewer123',
          roles: [UserRole.VIEWER]
        });

        // Mock requests for each user
        const adminReq = {
          user: {
            userId: admin.id,
            username: admin.username,
            roles: admin.roles
          }
        } as any;

        const designerReq = {
          user: {
            userId: designer.id,
            username: designer.username,
            roles: designer.roles
          }
        } as any;

        const viewerReq = {
          user: {
            userId: viewer.id,
            username: viewer.username,
            roles: viewer.roles
          }
        } as any;

        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        } as any;

        const mockNext = jest.fn();

        // Test admin access
        rbac.isAdmin()(adminReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();

        // Test designer cannot access admin routes
        mockNext.mockClear();
        mockRes.status.mockClear();
        rbac.isAdmin()(designerReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(403);

        // Test viewer can view
        mockNext.mockClear();
        mockRes.status.mockClear();
        rbac.canView()(viewerReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();

        // Test viewer cannot edit
        mockNext.mockClear();
        mockRes.status.mockClear();
        rbac.canEdit()(viewerReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(403);
      });
    });
  });
});