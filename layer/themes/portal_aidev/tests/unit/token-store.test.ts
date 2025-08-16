import { TokenStore, TokenStoreConfig, StoredToken } from '../../user-stories/024-aidev-portal/src/auth/token-store';

describe("TokenStore", () => {
  let tokenStore: TokenStore;
  let config: TokenStoreConfig;

  beforeEach(() => {
    config = {
      keyPrefix: 'test:',
      defaultExpiry: 3600,
    };
    tokenStore = new TokenStore(config);
  });

  afterEach(async () => {
    await tokenStore.disconnect();
  });

  describe("constructor", () => {
    it('should create instance with config', () => {
      expect(tokenStore).toBeInstanceOf(TokenStore);
    });
  });

  describe('connect', () => {
    it('should connect successfully', async () => {
      const connectedPromise = new Promise(resolve => {
        tokenStore.once("connected", resolve);
      });

      await tokenStore.connect();
      await connectedPromise;

      // Verify connected by trying to store a token
      const tokenData = {
        userId: 'user-123',
        username: "testuser",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      };

      await expect(tokenStore.storeToken('test-token', tokenData)).resolves.not.toThrow();
    });
  });

  describe("disconnect", () => {
    it('should disconnect and clear all data', async () => {
      await tokenStore.connect();

      const tokenData = {
        userId: 'user-123',
        username: "testuser",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      };

      await tokenStore.storeToken('test-token', tokenData);

      const disconnectedPromise = new Promise(resolve => {
        tokenStore.once("disconnected", resolve);
      });

      await tokenStore.disconnect();
      await disconnectedPromise;

      // Verify data is cleared
      const token = await tokenStore.getToken('test-token');
      expect(token).toBeNull();
    });
  });

  describe("storeToken", () => {
    beforeEach(async () => {
      await tokenStore.connect();
    });

    it('should store token successfully', async () => {
      const tokenData = {
        userId: 'user-123',
        username: "testuser",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      };

      await tokenStore.storeToken('test-token', tokenData);

      const storedToken = await tokenStore.getToken('test-token');
      expect(storedToken).toMatchObject({
        ...tokenData,
        token: process.env.TOKEN || "PLACEHOLDER",
      });
    });

    it('should create user session when storing token', async () => {
      const tokenData = {
        userId: 'user-123',
        username: "testuser",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      };

      await tokenStore.storeToken('test-token', tokenData);

      const session = await tokenStore.getSession('user-123');
      expect(session).toMatchObject({
        userId: 'user-123',
        active: true,
      });
    });

    it('should throw error when not connected', async () => {
      await tokenStore.disconnect();

      const tokenData = {
        userId: 'user-123',
        username: "testuser",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      };

      await expect(tokenStore.storeToken('test-token', tokenData)).rejects.toThrow('Token store not connected');
    });

    it('should auto-expire tokens', async () => {
      const tokenData = {
        userId: 'user-123',
        username: "testuser",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 100), // Expires in 100ms
      };

      await tokenStore.storeToken('test-token', tokenData);

      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 150));

      const storedToken = await tokenStore.getToken('test-token');
      expect(storedToken).toBeNull();
    });
  });

  describe("getToken", () => {
    beforeEach(async () => {
      await tokenStore.connect();
    });

    it('should return stored token', async () => {
      const tokenData = {
        userId: 'user-123',
        username: "testuser",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      };

      await tokenStore.storeToken('test-token', tokenData);

      const storedToken = await tokenStore.getToken('test-token');
      expect(storedToken?.token).toBe('test-token');
    });

    it('should return null for non-existent token', async () => {
      const token = await tokenStore.getToken('non-existent');
      expect(token).toBeNull();
    });

    it('should return null for expired token', async () => {
      const tokenData = {
        userId: 'user-123',
        username: "testuser",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() - 1000), // Already expired
      };

      await tokenStore.storeToken('expired-token', tokenData);

      const token = await tokenStore.getToken('expired-token');
      expect(token).toBeNull();
    });

    it('should return null when not connected', async () => {
      await tokenStore.disconnect();
      const token = await tokenStore.getToken('test-token');
      expect(token).toBeNull();
    });
  });

  describe("removeToken", () => {
    beforeEach(async () => {
      await tokenStore.connect();
    });

    it('should remove token', async () => {
      const tokenData = {
        userId: 'user-123',
        username: "testuser",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      };

      await tokenStore.storeToken('test-token', tokenData);
      await tokenStore.removeToken('test-token');

      const token = await tokenStore.getToken('test-token');
      expect(token).toBeNull();
    });
  });

  describe("getSession", () => {
    beforeEach(async () => {
      await tokenStore.connect();
    });

    it('should return active session', async () => {
      const tokenData = {
        userId: 'user-123',
        username: "testuser",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      };

      await tokenStore.storeToken('test-token', tokenData);

      const session = await tokenStore.getSession('user-123');
      expect(session).toMatchObject({
        userId: 'user-123',
        active: true,
      });
    });

    it('should return null for non-existent session', async () => {
      const session = await tokenStore.getSession('non-existent');
      expect(session).toBeNull();
    });

    it('should return null when not connected', async () => {
      await tokenStore.disconnect();
      const session = await tokenStore.getSession('user-123');
      expect(session).toBeNull();
    });
  });

  describe("updateSessionActivity", () => {
    beforeEach(async () => {
      await tokenStore.connect();
    });

    it('should update session last activity', async () => {
      const tokenData = {
        userId: 'user-123',
        username: "testuser",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      };

      await tokenStore.storeToken('test-token', tokenData);
      
      const sessionBefore = await tokenStore.getSession('user-123');
      const lastActivityBefore = sessionBefore?.lastActivity;

      await tokenStore.updateSessionActivity('user-123');

      const sessionAfter = await tokenStore.getSession('user-123');
      expect(sessionAfter?.lastActivity.getTime()).toBeGreaterThan(lastActivityBefore!.getTime());
    });
  });

  describe("setSessionExpiry", () => {
    beforeEach(async () => {
      await tokenStore.connect();
    });

    it('should expire session after timeout', async () => {
      const tokenData = {
        userId: 'user-123',
        username: "testuser",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      };

      await tokenStore.storeToken('test-token', tokenData);
      await tokenStore.setSessionExpiry('user-123', 0.1); // 100ms

      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 150));

      const session = await tokenStore.getSession('user-123');
      expect(session).toBeNull();
    });
  });

  describe("removeSession", () => {
    beforeEach(async () => {
      await tokenStore.connect();
    });

    it('should remove session', async () => {
      const tokenData = {
        userId: 'user-123',
        username: "testuser",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      };

      await tokenStore.storeToken('test-token', tokenData);
      await tokenStore.removeSession('user-123');

      const session = await tokenStore.getSession('user-123');
      expect(session).toBeNull();
    });
  });

  describe("blacklistToken", () => {
    beforeEach(async () => {
      await tokenStore.connect();
    });

    it('should blacklist token and remove it', async () => {
      const tokenData = {
        userId: 'user-123',
        username: "testuser",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      };

      await tokenStore.storeToken('test-token', tokenData);
      await tokenStore.blacklistToken('test-token');

      const token = await tokenStore.getToken('test-token');
      const isBlacklisted = await tokenStore.isTokenBlacklisted('test-token');

      expect(token).toBeNull();
      expect(isBlacklisted).toBe(true);
    });
  });

  describe("isTokenBlacklisted", () => {
    beforeEach(async () => {
      await tokenStore.connect();
    });

    it('should return true for blacklisted token', async () => {
      await tokenStore.blacklistToken('bad-token');
      const isBlacklisted = await tokenStore.isTokenBlacklisted('bad-token');
      expect(isBlacklisted).toBe(true);
    });

    it('should return false for non-blacklisted token', async () => {
      const isBlacklisted = await tokenStore.isTokenBlacklisted('good-token');
      expect(isBlacklisted).toBe(false);
    });
  });

  describe("clearExpiredTokens", () => {
    beforeEach(async () => {
      await tokenStore.connect();
    });

    it('should clear expired tokens', async () => {
      const validTokenData = {
        userId: 'user-123',
        username: "testuser",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      };

      const expiredTokenData = {
        userId: 'user-456',
        username: "expireduser",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() - 1000),
      };

      await tokenStore.storeToken('valid-token', validTokenData);
      await tokenStore.storeToken('expired-token', expiredTokenData);

      await tokenStore.clearExpiredTokens();

      const validToken = await tokenStore.getToken('valid-token');
      const expiredToken = await tokenStore.getToken('expired-token');

      expect(validToken).not.toBeNull();
      expect(expiredToken).toBeNull();
    });
  });

  describe("getActiveSessionCount", () => {
    beforeEach(async () => {
      await tokenStore.connect();
    });

    it('should return correct session count', async () => {
      const tokenData1 = {
        userId: 'user-123',
        username: 'user1',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      };

      const tokenData2 = {
        userId: 'user-456',
        username: 'user2',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      };

      await tokenStore.storeToken('token1', tokenData1);
      await tokenStore.storeToken('token2', tokenData2);

      const count = await tokenStore.getActiveSessionCount();
      expect(count).toBe(2);
    });
  });

  describe("getUserTokens", () => {
    beforeEach(async () => {
      await tokenStore.connect();
    });

    it('should return all user tokens', async () => {
      const tokenData = {
        userId: 'user-123',
        username: "testuser",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      };

      await tokenStore.storeToken('token1', tokenData);
      await tokenStore.storeToken('token2', tokenData);
      await tokenStore.storeToken('token3', {
        ...tokenData,
        userId: 'user-456',
      });

      const userTokens = await tokenStore.getUserTokens('user-123');
      expect(userTokens).toHaveLength(2);
      expect(userTokens).toContain('token1');
      expect(userTokens).toContain('token2');
    });

    it('should not return expired tokens', async () => {
      const validTokenData = {
        userId: 'user-123',
        username: "testuser",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      };

      const expiredTokenData = {
        userId: 'user-123',
        username: "testuser",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() - 1000),
      };

      await tokenStore.storeToken('valid-token', validTokenData);
      await tokenStore.storeToken('expired-token', expiredTokenData);

      const userTokens = await tokenStore.getUserTokens('user-123');
      expect(userTokens).toHaveLength(1);
      expect(userTokens).toContain('valid-token');
    });
  });
});