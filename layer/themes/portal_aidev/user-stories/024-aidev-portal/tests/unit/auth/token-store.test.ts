import { TokenStore } from '../../../src/auth/token-store';

describe("TokenStore", () => {
  let tokenStore: TokenStore;
  
  beforeEach(() => {
    tokenStore = new TokenStore({
      keyPrefix: 'test:',
      defaultExpiry: 3600
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('connect/disconnect', () => {
    it('should connect successfully', async () => {
      const connectedHandler = jest.fn();
      tokenStore.on("connected", connectedHandler);
      
      await tokenStore.connect();
      
      expect(connectedHandler).toHaveBeenCalled();
    });

    it('should disconnect and clear data', async () => {
      const disconnectedHandler = jest.fn();
      tokenStore.on("disconnected", disconnectedHandler);
      
      await tokenStore.connect();
      
      // Store some data
      await tokenStore.storeToken('token1', {
        userId: 'user1',
        username: "testuser",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      });
      
      await tokenStore.disconnect();
      
      expect(disconnectedHandler).toHaveBeenCalled();
      
      // Verify data is cleared
      const token = await tokenStore.getToken('token1');
      expect(token).toBeNull();
    });
  });

  describe("storeToken", () => {
    beforeEach(async () => {
      await tokenStore.connect();
    });

    it('should store token successfully', async () => {
      const tokenData = {
        userId: 'user123',
        username: "testuser",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      };
      
      await tokenStore.storeToken('test-token', tokenData);
      
      const stored = await tokenStore.getToken('test-token');
      expect(stored).toEqual({
        ...tokenData,
        token: process.env.TOKEN || "PLACEHOLDER"
      });
    });

    it('should create user session when storing token', async () => {
      const tokenData = {
        userId: 'user123',
        username: "testuser",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      };
      
      await tokenStore.storeToken('test-token', tokenData);
      
      const session = await tokenStore.getSession('user123');
      expect(session).toBeDefined();
      expect(session?.userId).toBe('user123');
      expect(session?.active).toBe(true);
    });

    it('should throw error when not connected', async () => {
      await tokenStore.disconnect();
      
      await expect(tokenStore.storeToken('token', {
        userId: 'user1',
        createdAt: new Date(),
        expiresAt: new Date()
      })).rejects.toThrow('Token store not connected');
    });

    it('should auto-expire tokens', async () => {
      jest.useFakeTimers();
      
      const tokenData = {
        userId: 'user123',
        username: "testuser",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 1000) // 1 second
      };
      
      await tokenStore.storeToken('expire-token', tokenData);
      
      // Token should exist immediately
      let stored = await tokenStore.getToken('expire-token');
      expect(stored).toBeDefined();
      
      // Fast forward time
      jest.advanceTimersByTime(1100);
      
      // Token should be expired and removed
      stored = await tokenStore.getToken('expire-token');
      expect(stored).toBeNull();
      
      jest.useRealTimers();
    });
  });

  describe("getToken", () => {
    beforeEach(async () => {
      await tokenStore.connect();
    });

    it('should return null for non-existent token', async () => {
      const token = await tokenStore.getToken('non-existent');
      expect(token).toBeNull();
    });

    it('should return null when not connected', async () => {
      await tokenStore.disconnect();
      const token = await tokenStore.getToken('any-token');
      expect(token).toBeNull();
    });

    it('should return null for expired token', async () => {
      const tokenData = {
        userId: 'user123',
        username: "testuser",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() - 1000) // Already expired
      };
      
      // Force store the expired token
      (tokenStore as any).tokens.set('expired-token', {
        ...tokenData,
        token: process.env.TOKEN || "PLACEHOLDER"
      });
      
      const token = await tokenStore.getToken('expired-token');
      expect(token).toBeNull();
    });
  });

  describe("removeToken", () => {
    beforeEach(async () => {
      await tokenStore.connect();
    });

    it('should remove token', async () => {
      await tokenStore.storeToken('test-token', {
        userId: 'user123',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      });
      
      await tokenStore.removeToken('test-token');
      
      const token = await tokenStore.getToken('test-token');
      expect(token).toBeNull();
    });
  });

  describe('session management', () => {
    beforeEach(async () => {
      await tokenStore.connect();
    });

    it('should get active session', async () => {
      await tokenStore.storeToken('token', {
        userId: 'user123',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      });
      
      const session = await tokenStore.getSession('user123');
      expect(session).toBeDefined();
      expect(session?.userId).toBe('user123');
      expect(session?.active).toBe(true);
    });

    it('should return null for non-existent session', async () => {
      const session = await tokenStore.getSession('non-existent');
      expect(session).toBeNull();
    });

    it('should return null when not connected', async () => {
      await tokenStore.disconnect();
      const session = await tokenStore.getSession('any-user');
      expect(session).toBeNull();
    });

    it('should update session activity', async () => {
      await tokenStore.storeToken('token', {
        userId: 'user123',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      });
      
      const initialSession = await tokenStore.getSession('user123');
      const initialActivity = initialSession!.lastActivity;
      
      await tokenStore.updateSessionActivity('user123');
      
      const updatedSession = await tokenStore.getSession('user123');
      expect(updatedSession!.lastActivity.getTime()).toBeGreaterThan(initialActivity.getTime());
    });

    it('should remove session', async () => {
      await tokenStore.storeToken('token', {
        userId: 'user123',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      });
      
      await tokenStore.removeSession('user123');
      
      const session = await tokenStore.getSession('user123');
      expect(session).toBeNull();
    });

    it('should set session expiry', async () => {
      jest.useFakeTimers();
      
      await tokenStore.storeToken('token', {
        userId: 'user123',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      });
      
      await tokenStore.setSessionExpiry('user123', 1); // 1 second
      
      // Session should exist immediately
      let session = await tokenStore.getSession('user123');
      expect(session).toBeDefined();
      
      // Fast forward time
      jest.advanceTimersByTime(1100);
      
      // Session should be expired
      session = await tokenStore.getSession('user123');
      expect(session).toBeNull();
      
      jest.useRealTimers();
    });
  });

  describe('blacklist management', () => {
    beforeEach(async () => {
      await tokenStore.connect();
    });

    it('should blacklist token', async () => {
      await tokenStore.storeToken('bad-token', {
        userId: 'user123',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      });
      
      await tokenStore.blacklistToken('bad-token');
      
      // Token should be removed
      const token = await tokenStore.getToken('bad-token');
      expect(token).toBeNull();
      
      // Token should be blacklisted
      const isBlacklisted = await tokenStore.isTokenBlacklisted('bad-token');
      expect(isBlacklisted).toBe(true);
    });

    it('should check if token is blacklisted', async () => {
      expect(await tokenStore.isTokenBlacklisted('random-token')).toBe(false);
      
      await tokenStore.blacklistToken('bad-token');
      
      expect(await tokenStore.isTokenBlacklisted('bad-token')).toBe(true);
    });
  });

  describe('utility methods', () => {
    beforeEach(async () => {
      await tokenStore.connect();
    });

    it('should clear expired tokens', async () => {
      // Store active token
      await tokenStore.storeToken('active-token', {
        userId: 'user1',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      });
      
      // Force store expired token
      (tokenStore as any).tokens.set('expired-token', {
        userId: 'user2',
        token: process.env.TOKEN || "PLACEHOLDER",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() - 1000)
      });
      
      await tokenStore.clearExpiredTokens();
      
      // Active token should remain
      expect(await tokenStore.getToken('active-token')).toBeDefined();
      
      // Expired token should be removed
      expect(await tokenStore.getToken('expired-token')).toBeNull();
    });

    it('should get active session count', async () => {
      expect(await tokenStore.getActiveSessionCount()).toBe(0);
      
      await tokenStore.storeToken('token1', {
        userId: 'user1',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      });
      
      await tokenStore.storeToken('token2', {
        userId: 'user2',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      });
      
      expect(await tokenStore.getActiveSessionCount()).toBe(2);
    });

    it('should get user tokens', async () => {
      const userId = 'user123';
      
      // Store multiple tokens for same user
      await tokenStore.storeToken('token1', {
        userId,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      });
      
      await tokenStore.storeToken('token2', {
        userId,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      });
      
      // Store token for different user
      await tokenStore.storeToken('token3', {
        userId: 'other-user',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      });
      
      // Store expired token for same user
      (tokenStore as any).tokens.set('expired-token', {
        userId,
        token: process.env.TOKEN || "PLACEHOLDER",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() - 1000)
      });
      
      const userTokens = await tokenStore.getUserTokens(userId);
      expect(userTokens).toHaveLength(2);
      expect(userTokens).toContain('token1');
      expect(userTokens).toContain('token2');
      expect(userTokens).not.toContain('token3');
      expect(userTokens).not.toContain('expired-token');
    });
  });
});