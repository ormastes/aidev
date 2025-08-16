/**
 * Unit tests for SessionManager
 * Following Mock Free Test Oriented Development
 */

import { SessionManager, Session, SessionStore } from '../../children/SessionManager';
import { UserRole } from '.././User';

describe("SessionManager", () => {
  let sessionManager: SessionManager;
  let sessionStore: SessionStore;

  beforeEach(() => {
    // Create real instance with in-memory store - Mock Free
    sessionStore = undefined; // Will use default in-memory store
    sessionManager = new SessionManager(sessionStore);
  });

  describe("createSession", () => {
    it('should create a new session', async () => {
      const session: Session = {
        id: 'session-123',
        userId: 'user-456',
        data: {
          username: "testuser",
          roles: [UserRole.USER]
        },
        expiresAt: new Date(Date.now() + 3600000) // 1 hour
      };

      const created = await sessionManager.createSession(session);

      expect(created).toBeDefined();
      expect(created.id).toBe('session-123');
      expect(created.userId).toBe('user-456');
      expect(created.data.username).toBe("testuser");
      expect(created.createdAt).toBeDefined();
      expect(created.updatedAt).toBeDefined();
    });

    it('should set creation and update timestamps', async () => {
      const session: Session = {
        id: 'session-456',
        userId: 'user-789',
        data: { username: "timeuser", roles: [UserRole.USER] },
        expiresAt: new Date(Date.now() + 3600000)
      };

      const before = Date.now();
      const created = await sessionManager.createSession(session);
      const after = Date.now();

      expect(created.createdAt).toBeDefined();
      expect(created.createdAt!.getTime()).toBeGreaterThanOrEqual(before);
      expect(created.createdAt!.getTime()).toBeLessThanOrEqual(after);
      expect(created.updatedAt).toEqual(created.createdAt);
    });

    it('should store session data correctly', async () => {
      const sessionData = {
        username: "datauser",
        roles: [UserRole.ADMIN, UserRole.USER],
        email: 'data@example.com',
        preferences: { theme: 'dark', language: 'en' }
      };

      const session: Session = {
        id: 'session-data',
        userId: 'user-data',
        data: sessionData,
        expiresAt: new Date(Date.now() + 3600000)
      };

      const created = await sessionManager.createSession(session);

      expect(created.data).toEqual(sessionData);
      expect(created.data.preferences).toEqual({ theme: 'dark', language: 'en' });
    });
  });

  describe("getSession", () => {
    it('should retrieve existing session', async () => {
      const session: Session = {
        id: 'session-get',
        userId: 'user-get',
        data: { username: 'getuser', roles: [UserRole.USER] },
        expiresAt: new Date(Date.now() + 3600000)
      };

      await sessionManager.createSession(session);
      const retrieved = await sessionManager.getSession('session-get');

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('session-get');
      expect(retrieved?.userId).toBe('user-get');
      expect(retrieved?.data.username).toBe('getuser');
    });

    it('should return null for non-existent session', async () => {
      const retrieved = await sessionManager.getSession('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should return null for expired session', async () => {
      const session: Session = {
        id: 'session-expired',
        userId: 'user-expired',
        data: { username: "expireduser", roles: [UserRole.USER] },
        expiresAt: new Date(Date.now() - 1000) // Already expired
      };

      await sessionManager.createSession(session);
      const retrieved = await sessionManager.getSession('session-expired');

      expect(retrieved).toBeNull();
    });

    it('should update lastAccessedAt on retrieval', async () => {
      const session: Session = {
        id: 'session-access',
        userId: 'user-access',
        data: { username: "accessuser", roles: [UserRole.USER] },
        expiresAt: new Date(Date.now() + 3600000)
      };

      const created = await sessionManager.createSession(session);
      const initialAccess = created.lastAccessedAt;

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 10));

      const retrieved = await sessionManager.getSession('session-access');
      
      expect(retrieved?.lastAccessedAt).toBeDefined();
      expect(retrieved?.lastAccessedAt!.getTime()).toBeGreaterThan(
        initialAccess?.getTime() || 0
      );
    });
  });

  describe("updateSession", () => {
    it('should update session data', async () => {
      const session: Session = {
        id: 'session-update',
        userId: 'user-update',
        data: { username: "updateuser", roles: [UserRole.USER] },
        expiresAt: new Date(Date.now() + 3600000)
      };

      await sessionManager.createSession(session);

      const newData = {
        username: "updateuser",
        roles: [UserRole.ADMIN],
        newField: "newValue"
      };

      const updated = await sessionManager.updateSession('session-update', newData);

      expect(updated).toBeDefined();
      expect(updated?.data.roles).toEqual([UserRole.ADMIN]);
      expect(updated?.data.newField).toBe("newValue");
    });

    it('should update updatedAt timestamp', async () => {
      const session: Session = {
        id: 'session-timestamp',
        userId: 'user-timestamp',
        data: { username: "timestampuser", roles: [UserRole.USER] },
        expiresAt: new Date(Date.now() + 3600000)
      };

      const created = await sessionManager.createSession(session);
      const initialUpdatedAt = created.updatedAt;

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 10));

      const updated = await sessionManager.updateSession('session-timestamp', {
        username: "timestampuser",
        roles: [UserRole.USER],
        updated: true
      });

      expect(updated?.updatedAt).toBeDefined();
      expect(updated?.updatedAt!.getTime()).toBeGreaterThan(
        initialUpdatedAt!.getTime()
      );
    });

    it('should return null when updating non-existent session', async () => {
      const result = await sessionManager.updateSession('non-existent', {
        username: 'test'
      });

      expect(result).toBeNull();
    });

    it('should not update expired session', async () => {
      const session: Session = {
        id: 'session-expired-update',
        userId: 'user-expired',
        data: { username: "expireduser", roles: [UserRole.USER] },
        expiresAt: new Date(Date.now() - 1000) // Already expired
      };

      await sessionManager.createSession(session);

      const result = await sessionManager.updateSession('session-expired-update', {
        username: 'newname'
      });

      expect(result).toBeNull();
    });
  });

  describe("destroySession", () => {
    it('should remove session', async () => {
      const session: Session = {
        id: 'session-destroy',
        userId: 'user-destroy',
        data: { username: "destroyuser", roles: [UserRole.USER] },
        expiresAt: new Date(Date.now() + 3600000)
      };

      await sessionManager.createSession(session);
      
      // Verify it exists
      const exists = await sessionManager.getSession('session-destroy');
      expect(exists).toBeDefined();

      // Destroy it
      await sessionManager.destroySession('session-destroy');

      // Verify it's gone
      const gone = await sessionManager.getSession('session-destroy');
      expect(gone).toBeNull();
    });

    it('should handle destroying non-existent session', async () => {
      // Should not throw
      await expect(
        sessionManager.destroySession('non-existent')
      ).resolves.not.toThrow();
    });
  });

  describe("extendSession", () => {
    it('should extend session expiry', async () => {
      const session: Session = {
        id: 'session-extend',
        userId: 'user-extend',
        data: { username: "extenduser", roles: [UserRole.USER] },
        expiresAt: new Date(Date.now() + 3600000) // 1 hour
      };

      const created = await sessionManager.createSession(session);
      const originalExpiry = created.expiresAt.getTime();

      const extended = await sessionManager.extendSession(
        'session-extend',
        7200000 // 2 hours
      );

      expect(extended).toBeDefined();
      expect(extended?.expiresAt.getTime()).toBeGreaterThan(originalExpiry);
      expect(extended?.expiresAt.getTime()).toBeLessThanOrEqual(
        Date.now() + 7200000 + 1000 // Small buffer
      );
    });

    it('should return null when extending non-existent session', async () => {
      const result = await sessionManager.extendSession('non-existent', 3600000);
      expect(result).toBeNull();
    });

    it('should not extend already expired session', async () => {
      const session: Session = {
        id: 'session-expired-extend',
        userId: 'user-expired',
        data: { username: "expireduser", roles: [UserRole.USER] },
        expiresAt: new Date(Date.now() - 1000) // Already expired
      };

      await sessionManager.createSession(session);

      const result = await sessionManager.extendSession(
        'session-expired-extend',
        3600000
      );

      expect(result).toBeNull();
    });
  });

  describe("getUserSessions", () => {
    it('should get all sessions for a user', async () => {
      const userId = 'user-multi';

      // Create multiple sessions for same user
      await sessionManager.createSession({
        id: 'session-multi-1',
        userId,
        data: { username: "multiuser", roles: [UserRole.USER], device: 'desktop' },
        expiresAt: new Date(Date.now() + 3600000)
      });

      await sessionManager.createSession({
        id: 'session-multi-2',
        userId,
        data: { username: "multiuser", roles: [UserRole.USER], device: 'mobile' },
        expiresAt: new Date(Date.now() + 3600000)
      });

      // Create session for different user
      await sessionManager.createSession({
        id: 'session-other',
        userId: 'user-other',
        data: { username: "otheruser", roles: [UserRole.USER] },
        expiresAt: new Date(Date.now() + 3600000)
      });

      const userSessions = await sessionManager.getUserSessions(userId);

      expect(userSessions).toHaveLength(2);
      expect(userSessions.map(s => s.id).sort()).toEqual([
        'session-multi-1',
        'session-multi-2'
      ]);
    });

    it('should not return expired sessions', async () => {
      const userId = 'user-mixed';

      await sessionManager.createSession({
        id: 'session-active',
        userId,
        data: { username: "activeuser", roles: [UserRole.USER] },
        expiresAt: new Date(Date.now() + 3600000)
      });

      await sessionManager.createSession({
        id: 'session-expired',
        userId,
        data: { username: "expireduser", roles: [UserRole.USER] },
        expiresAt: new Date(Date.now() - 1000)
      });

      const userSessions = await sessionManager.getUserSessions(userId);

      expect(userSessions).toHaveLength(1);
      expect(userSessions[0].id).toBe('session-active');
    });

    it('should return empty array for user with no sessions', async () => {
      const sessions = await sessionManager.getUserSessions('user-none');
      expect(sessions).toEqual([]);
    });
  });

  describe("cleanupExpiredSessions", () => {
    it('should remove expired sessions', async () => {
      // Create mix of expired and active sessions
      await sessionManager.createSession({
        id: 'session-cleanup-active',
        userId: 'user-1',
        data: { username: "activeuser", roles: [UserRole.USER] },
        expiresAt: new Date(Date.now() + 3600000)
      });

      await sessionManager.createSession({
        id: 'session-cleanup-expired-1',
        userId: 'user-2',
        data: { username: "expireduser1", roles: [UserRole.USER] },
        expiresAt: new Date(Date.now() - 1000)
      });

      await sessionManager.createSession({
        id: 'session-cleanup-expired-2',
        userId: 'user-3',
        data: { username: "expireduser2", roles: [UserRole.USER] },
        expiresAt: new Date(Date.now() - 2000)
      });

      const cleaned = await sessionManager.cleanupExpiredSessions();

      expect(cleaned).toBe(2); // Two expired sessions removed

      // Verify active session still exists
      const active = await sessionManager.getSession('session-cleanup-active');
      expect(active).toBeDefined();

      // Verify expired sessions are gone
      const expired1 = await sessionManager.getSession('session-cleanup-expired-1');
      const expired2 = await sessionManager.getSession('session-cleanup-expired-2');
      expect(expired1).toBeNull();
      expect(expired2).toBeNull();
    });

    it('should return 0 when no expired sessions', async () => {
      // Create only active sessions
      await sessionManager.createSession({
        id: 'session-active-1',
        userId: 'user-1',
        data: { username: 'user1', roles: [UserRole.USER] },
        expiresAt: new Date(Date.now() + 3600000)
      });

      await sessionManager.createSession({
        id: 'session-active-2',
        userId: 'user-2',
        data: { username: 'user2', roles: [UserRole.USER] },
        expiresAt: new Date(Date.now() + 7200000)
      });

      const cleaned = await sessionManager.cleanupExpiredSessions();
      expect(cleaned).toBe(0);
    });
  });

  describe('Concurrency scenarios', () => {
    it('should handle concurrent session creation', async () => {
      const sessions = await Promise.all([
        sessionManager.createSession({
          id: 'concurrent-1',
          userId: 'user-concurrent',
          data: { username: "concurrent", roles: [UserRole.USER] },
          expiresAt: new Date(Date.now() + 3600000)
        }),
        sessionManager.createSession({
          id: 'concurrent-2',
          userId: 'user-concurrent',
          data: { username: "concurrent", roles: [UserRole.USER] },
          expiresAt: new Date(Date.now() + 3600000)
        }),
        sessionManager.createSession({
          id: 'concurrent-3',
          userId: 'user-concurrent',
          data: { username: "concurrent", roles: [UserRole.USER] },
          expiresAt: new Date(Date.now() + 3600000)
        })
      ]);

      expect(sessions).toHaveLength(3);
      sessions.forEach(session => {
        expect(session).toBeDefined();
        expect(session.userId).toBe('user-concurrent');
      });

      // Verify all sessions exist
      const userSessions = await sessionManager.getUserSessions('user-concurrent');
      expect(userSessions).toHaveLength(3);
    });

    it('should handle concurrent operations on same session', async () => {
      await sessionManager.createSession({
        id: 'concurrent-ops',
        userId: 'user-ops',
        data: { username: 'opsuser', roles: [UserRole.USER], counter: 0 },
        expiresAt: new Date(Date.now() + 3600000)
      });

      // Concurrent updates
      const results = await Promise.all([
        sessionManager.updateSession('concurrent-ops', {
          username: 'opsuser',
          roles: [UserRole.USER],
          counter: 1
        }),
        sessionManager.extendSession('concurrent-ops', 7200000),
        sessionManager.getSession('concurrent-ops')
      ]);

      // All operations should succeed
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });
  });
});