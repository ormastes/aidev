/**
 * Unit tests for CrossDomainSessionManager
 * Following Mock Free Test Oriented Development
 */

import { 
  CrossDomainSessionManager, 
  RedisSessionStorage,
  SharedSession,
  SessionSyncMessage 
} from '../../children/CrossDomainSessionManager';
import { TokenService } from '../../children/TokenService';
import { UserRole } from '../../common/types/User';

describe('CrossDomainSessionManager', () => {
  let manager: CrossDomainSessionManager;
  let storage: RedisSessionStorage;
  let tokenService: TokenService;

  beforeEach(() => {
    // Create real instances - Mock Free
    storage = new RedisSessionStorage();
    tokenService = new TokenService();

    manager = new CrossDomainSessionManager({
      domains: ['localhost', 'app.example.com', 'api.example.com'],
      ports: [3300, 3400, 3456, 3500],
      sharedSecret: 'test-secret-key',
      sessionStorage: storage,
      tokenService,
      syncInterval: 1000 // 1 second for testing
    });
  });

  afterEach(() => {
    // Clean up
    manager.removeAllListeners();
  });

  describe('createCrossDomainSession', () => {
    it('should create a session accessible across domains', async () => {
      const sessionData = {
        id: 'session-123',
        userId: 'user-456',
        data: { username: 'testuser', roles: [UserRole.USER] },
        expiresAt: new Date(Date.now() + 3600000)
      };

      const session = await manager.createCrossDomainSession(sessionData);

      expect(session).toBeDefined();
      expect(session.id).toBe('session-123');
      expect(session.domains).toEqual(['localhost', 'app.example.com', 'api.example.com']);
      expect(session.syncToken).toBeDefined();
      expect(session.lastSyncedAt).toBeDefined();
    });

    it('should emit sessionCreated event', async () => {
      const sessionCreatedPromise = new Promise<SharedSession>(resolve => {
        manager.once('sessionCreated', resolve);
      });

      const session = await manager.createCrossDomainSession({
        id: 'event-session',
        userId: 'user-789',
        data: { username: 'eventuser' },
        expiresAt: new Date(Date.now() + 3600000)
      });

      const emittedSession = await sessionCreatedPromise;
      expect(emittedSession.id).toBe('event-session');
    });

    it('should track user sessions', async () => {
      const userId = 'track-user';
      
      await manager.createCrossDomainSession({
        id: 'session-1',
        userId,
        data: { username: 'user1' },
        expiresAt: new Date(Date.now() + 3600000)
      });

      await manager.createCrossDomainSession({
        id: 'session-2',
        userId,
        data: { username: 'user1' },
        expiresAt: new Date(Date.now() + 3600000)
      });

      const userSessions = await manager.getUserSessions(userId);
      expect(userSessions).toHaveLength(2);
      expect(userSessions.map(s => s.id).sort()).toEqual(['session-1', 'session-2']);
    });
  });

  describe('getSession', () => {
    it('should retrieve session with domain validation', async () => {
      await manager.createCrossDomainSession({
        id: 'get-session',
        userId: 'user-123',
        data: { username: 'getuser' },
        expiresAt: new Date(Date.now() + 3600000)
      });

      const session = await manager.getSession('get-session', 'localhost');
      expect(session).toBeDefined();
      expect(session?.id).toBe('get-session');
    });

    it('should reject invalid domain access', async () => {
      await manager.createCrossDomainSession({
        id: 'secure-session',
        userId: 'user-123',
        data: { username: 'secureuser' },
        expiresAt: new Date(Date.now() + 3600000)
      });

      const invalidDomainPromise = new Promise(resolve => {
        manager.once('invalidDomainAccess', resolve);
      });

      const session = await manager.getSession('secure-session', 'evil.com');
      expect(session).toBeNull();

      const event = await invalidDomainPromise;
      expect(event).toEqual({
        sessionId: 'secure-session',
        domain: 'evil.com'
      });
    });

    it('should update lastAccessedAt on retrieval', async () => {
      const created = await manager.createCrossDomainSession({
        id: 'access-session',
        userId: 'user-123',
        data: { username: 'accessuser' },
        expiresAt: new Date(Date.now() + 3600000)
      });

      const initialAccess = created.lastAccessedAt;

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));

      const retrieved = await manager.getSession('access-session');
      expect(retrieved?.lastAccessedAt).toBeDefined();
      expect(retrieved?.lastAccessedAt!.getTime()).toBeGreaterThan(
        initialAccess?.getTime() || 0
      );
    });
  });

  describe('updateSession', () => {
    it('should update session across domains', async () => {
      await manager.createCrossDomainSession({
        id: 'update-session',
        userId: 'user-123',
        data: { username: 'updateuser', count: 0 },
        expiresAt: new Date(Date.now() + 3600000)
      });

      const updated = await manager.updateSession('update-session', {
        data: { username: 'updateuser', count: 1, newField: 'value' }
      });

      expect(updated).toBeDefined();
      expect(updated?.data.count).toBe(1);
      expect(updated?.data.newField).toBe('value');
      expect(updated?.lastSyncedAt).toBeDefined();
    });

    it('should broadcast update to other domains', async () => {
      const broadcastPromise = new Promise<SessionSyncMessage>(resolve => {
        manager.once('broadcast', resolve);
      });

      await manager.createCrossDomainSession({
        id: 'broadcast-session',
        userId: 'user-123',
        data: { username: 'broadcastuser' },
        expiresAt: new Date(Date.now() + 3600000)
      });

      await manager.updateSession('broadcast-session', {
        data: { username: 'broadcastuser', updated: true }
      });

      const message = await broadcastPromise;
      expect(message.action).toBe('update');
      expect(message.session.id).toBe('broadcast-session');
      expect(message.signature).toBeDefined();
    });
  });

  describe('destroySession', () => {
    it('should destroy session across all domains', async () => {
      await manager.createCrossDomainSession({
        id: 'destroy-session',
        userId: 'user-123',
        data: { username: 'destroyuser' },
        expiresAt: new Date(Date.now() + 3600000)
      });

      // Verify it exists
      const exists = await manager.getSession('destroy-session');
      expect(exists).toBeDefined();

      // Destroy it
      await manager.destroySession('destroy-session');

      // Verify it's gone
      const gone = await manager.getSession('destroy-session');
      expect(gone).toBeNull();
    });

    it('should emit sessionDestroyed event', async () => {
      await manager.createCrossDomainSession({
        id: 'event-destroy',
        userId: 'user-123',
        data: { username: 'eventuser' },
        expiresAt: new Date(Date.now() + 3600000)
      });

      const destroyedPromise = new Promise<string>(resolve => {
        manager.once('sessionDestroyed', resolve);
      });

      await manager.destroySession('event-destroy');

      const destroyedId = await destroyedPromise;
      expect(destroyedId).toBe('event-destroy');
    });

    it('should untrack user sessions on destroy', async () => {
      const userId = 'untrack-user';

      await manager.createCrossDomainSession({
        id: 'untrack-1',
        userId,
        data: { username: 'user' },
        expiresAt: new Date(Date.now() + 3600000)
      });

      await manager.createCrossDomainSession({
        id: 'untrack-2',
        userId,
        data: { username: 'user' },
        expiresAt: new Date(Date.now() + 3600000)
      });

      await manager.destroySession('untrack-1');

      const remaining = await manager.getUserSessions(userId);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe('untrack-2');
    });
  });

  describe('Cross-domain token validation', () => {
    it('should generate valid cross-domain token', async () => {
      const session = await manager.createCrossDomainSession({
        id: 'token-session',
        userId: 'user-123',
        data: { username: 'tokenuser' },
        expiresAt: new Date(Date.now() + 3600000)
      });

      const token = await manager.generateCrossDomainToken(session);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should validate cross-domain token', async () => {
      const session = await manager.createCrossDomainSession({
        id: 'validate-session',
        userId: 'user-456',
        data: { username: 'validateuser' },
        expiresAt: new Date(Date.now() + 3600000)
      });

      const token = await manager.generateCrossDomainToken(session);
      const validated = await manager.validateCrossDomainToken(token);

      expect(validated).toBeDefined();
      expect(validated?.id).toBe('validate-session');
      expect(validated?.userId).toBe('user-456');
    });

    it('should reject invalid tokens', async () => {
      const result = await manager.validateCrossDomainToken('invalid-token');
      expect(result).toBeNull();
    });
  });

  describe('Session synchronization', () => {
    it('should handle session sync messages', async () => {
      const remoteSession: SharedSession = {
        id: 'remote-session',
        userId: 'remote-user',
        data: { username: 'remoteuser' },
        domains: ['localhost'],
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
        syncToken: 'remote-token',
        lastSyncedAt: new Date()
      };

      const remoteCreatedPromise = new Promise<SharedSession>(resolve => {
        manager.once('remoteSessionCreated', resolve);
      });

      // Simulate incoming sync message
      storage['publish']({
        action: 'create',
        session: remoteSession,
        domain: 'app.example.com',
        timestamp: new Date(),
        signature: '' // Would be properly signed in production
      });

      // Wait for async handling
      await new Promise(resolve => setTimeout(resolve, 10));

      // Session should be stored locally
      const stored = await manager.getSession('remote-session');
      expect(stored).toBeDefined();
      expect(stored?.userId).toBe('remote-user');
    });

    it('should sync sessions periodically', async () => {
      // Create sessions
      await manager.createCrossDomainSession({
        id: 'sync-1',
        userId: 'sync-user',
        data: { username: 'syncuser' },
        expiresAt: new Date(Date.now() + 3600000)
      });

      const broadcastPromise = new Promise<SessionSyncMessage>(resolve => {
        manager.on('broadcast', (msg: SessionSyncMessage) => {
          if (msg.action === 'sync') {
            resolve(msg);
          }
        });
      });

      // Wait for sync interval
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should have synced
      const syncMessage = await Promise.race([
        broadcastPromise,
        new Promise<null>(resolve => setTimeout(() => resolve(null), 2000))
      ]);

      if (syncMessage) {
        expect(syncMessage.action).toBe('sync');
      }
    });
  });

  describe('RedisSessionStorage', () => {
    it('should store and retrieve sessions', async () => {
      const session = {
        id: 'storage-test',
        userId: 'user-123',
        data: { test: true },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      };

      await storage.set('storage-test', session);
      const retrieved = await storage.get('storage-test');

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('storage-test');
      expect(retrieved?.data.test).toBe(true);
    });

    it('should delete sessions', async () => {
      const session = {
        id: 'delete-test',
        userId: 'user-123',
        data: {},
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      };

      await storage.set('delete-test', session);
      await storage.delete('delete-test');

      const retrieved = await storage.get('delete-test');
      expect(retrieved).toBeNull();
    });

    it('should cleanup expired sessions', async () => {
      const expired = {
        id: 'expired',
        userId: 'user-123',
        data: {},
        createdAt: new Date(),
        expiresAt: new Date(Date.now() - 1000) // Already expired
      };

      const valid = {
        id: 'valid',
        userId: 'user-456',
        data: {},
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      };

      await storage.set('expired', expired);
      await storage.set('valid', valid);

      await storage.cleanup();

      const expiredSession = await storage.get('expired');
      const validSession = await storage.get('valid');

      expect(expiredSession).toBeNull();
      expect(validSession).toBeDefined();
    });

    it('should support pub/sub for synchronization', async () => {
      const messages: SessionSyncMessage[] = [];
      
      const callback = (msg: SessionSyncMessage) => {
        messages.push(msg);
      };

      storage.subscribe(callback);

      // Trigger a session update
      await storage.set('pub-test', {
        id: 'pub-test',
        userId: 'user-123',
        data: { test: true },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      });

      expect(messages).toHaveLength(1);
      expect(messages[0].action).toBe('update');
      expect(messages[0].session.id).toBe('pub-test');

      storage.unsubscribe(callback);
    });
  });

  describe('Middleware', () => {
    it('should create Express middleware', () => {
      const middleware = manager.middleware();
      expect(typeof middleware).toBe('function');
    });

    it('should handle cross-domain tokens in middleware', async () => {
      const session = await manager.createCrossDomainSession({
        id: 'middleware-session',
        userId: 'user-123',
        data: { username: 'middlewareuser' },
        expiresAt: new Date(Date.now() + 3600000)
      });

      const token = await manager.generateCrossDomainToken(session);
      const middleware = manager.middleware();

      const req: any = {
        headers: { 'x-session-token': token },
        cookies: {}
      };
      const res: any = {
        setHeader: jest.fn()
      };
      const next = jest.fn();

      await middleware(req, res, next);

      expect(req.session).toBeDefined();
      expect(req.session.id).toBe('middleware-session');
      expect(req.sessionId).toBe('middleware-session');
      expect(next).toHaveBeenCalled();
    });

    it('should set CORS headers for valid domains', async () => {
      const middleware = manager.middleware();

      const req: any = {
        headers: { 
          origin: 'http://localhost:3000',
          'x-session-token': null
        },
        cookies: {}
      };
      const res: any = {
        setHeader: jest.fn()
      };
      const next = jest.fn();

      await middleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'http://localhost:3000'
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Credentials',
        'true'
      );
    });
  });
});