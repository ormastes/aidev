import { TokenStore, TokenStoreConfig, StoredToken, UserSession } from '../../src/auth/token-store';

describe('TokenStore', () => {
  let tokenStore: TokenStore;
  const mockConfig: TokenStoreConfig = {
    keyPrefix: 'test:',
    defaultExpiry: 3600
  };

  beforeEach(() => {
    tokenStore = new TokenStore(mockConfig);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize with provided configuration', () => {
      const store = new TokenStore(mockConfig);
      expect(store).toBeDefined();
      expect(store['config']).toEqual(mockConfig);
    });
  });

  describe('connect', () => {
    it('should connect successfully', async () => {
      const connectHandler = jest.fn();
      tokenStore.on('connected', connectHandler);

      await tokenStore.connect();

      expect(tokenStore['connected']).toBe(true);
      expect(connectHandler).toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('should disconnect and clear all data', async () => {
      const disconnectHandler = jest.fn();
      tokenStore.on('disconnected', disconnectHandler);

      await tokenStore.connect();
      
      // Add some data
      const tokenData: Omit<StoredToken, 'token'> = {
        userId: 'user123',
        username: 'testuser',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      };
      
      await tokenStore.storeToken('test.token', tokenData);
      await tokenStore.blacklistToken('blacklisted.token');

      await tokenStore.disconnect();

      expect(tokenStore['connected']).toBe(false);
      expect(tokenStore['tokens'].size).toBe(0);
      expect(tokenStore['sessions'].size).toBe(0);
      expect(tokenStore['blacklistedTokens'].size).toBe(0);
      expect(disconnectHandler).toHaveBeenCalled();
    });
  });

  describe('storeToken', () => {
    beforeEach(async () => {
      await tokenStore.connect();
    });

    it('should store token successfully', async () => {
      const tokenData: Omit<StoredToken, 'token'> = {
        userId: 'user123',
        username: 'testuser',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      };

      await tokenStore.storeToken('test.token', tokenData);

      const storedToken = await tokenStore.getToken('test.token');
      expect(storedToken).toEqual({
        ...tokenData,
        token: 'test.token'
      });
    });

    it('should create new session for new user', async () => {
      const tokenData: Omit<StoredToken, 'token'> = {
        userId: 'newuser',
        username: 'newuser',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      };

      await tokenStore.storeToken('new.token', tokenData);

      const session = await tokenStore.getSession('newuser');
      expect(session).toBeDefined();
      expect(session?.userId).toBe('newuser');
      expect(session?.active).toBe(true);
      expect(session?.loginTime).toBeInstanceOf(Date);
      expect(session?.lastActivity).toBeInstanceOf(Date);
    });

    it('should update existing session', async () => {
      const firstTokenData: Omit<StoredToken, 'token'> = {
        userId: 'user123',
        username: 'testuser',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      };

      await tokenStore.storeToken('first.token', firstTokenData);
      const firstSession = await tokenStore.getSession('user123');
      const loginTime = firstSession?.loginTime;

      // Wait a bit to ensure different timestamps
      jest.advanceTimersByTime(1000);

      const secondTokenData: Omit<StoredToken, 'token'> = {
        userId: 'user123',
        username: 'testuser',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      };

      await tokenStore.storeToken('second.token', secondTokenData);
      const secondSession = await tokenStore.getSession('user123');

      expect(secondSession?.loginTime).toEqual(loginTime);
      expect(secondSession?.lastActivity.getTime()).toBeGreaterThan(firstSession!.lastActivity.getTime());
    });

    it('should set expiry timeout for token', async () => {
      const tokenData: Omit<StoredToken, 'token'> = {
        userId: 'user123',
        username: 'testuser',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 5000) // 5 seconds
      };

      await tokenStore.storeToken('expiring.token', tokenData);

      expect(await tokenStore.getToken('expiring.token')).toBeDefined();

      // Fast forward past expiry
      jest.advanceTimersByTime(6000);

      expect(tokenStore['tokens'].has('expiring.token')).toBe(false);
    });

    it('should throw error if not connected', async () => {
      await tokenStore.disconnect();

      const tokenData: Omit<StoredToken, 'token'> = {
        userId: 'user123',
        username: 'testuser',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      };

      await expect(tokenStore.storeToken('test.token', tokenData))
        .rejects.toThrow('Token store not connected');
    });
  });

  describe('getToken', () => {
    beforeEach(async () => {
      await tokenStore.connect();
    });

    it('should retrieve stored token', async () => {
      const tokenData: Omit<StoredToken, 'token'> = {
        userId: 'user123',
        username: 'testuser',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      };

      await tokenStore.storeToken('test.token', tokenData);
      const retrieved = await tokenStore.getToken('test.token');

      expect(retrieved).toEqual({
        ...tokenData,
        token: 'test.token'
      });
    });

    it('should return null for non-existent token', async () => {
      const result = await tokenStore.getToken('non.existent.token');
      expect(result).toBeNull();
    });

    it('should return null for expired token', async () => {
      const tokenData: Omit<StoredToken, 'token'> = {
        userId: 'user123',
        username: 'testuser',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() - 1000) // Already expired
      };

      tokenStore['tokens'].set('expired.token', {
        ...tokenData,
        token: 'expired.token'
      });

      const result = await tokenStore.getToken('expired.token');
      expect(result).toBeNull();
      expect(tokenStore['tokens'].has('expired.token')).toBe(false);
    });

    it('should return null if not connected', async () => {
      await tokenStore.disconnect();
      const result = await tokenStore.getToken('any.token');
      expect(result).toBeNull();
    });
  });

  describe('removeToken', () => {
    beforeEach(async () => {
      await tokenStore.connect();
    });

    it('should remove token successfully', async () => {
      const tokenData: Omit<StoredToken, 'token'> = {
        userId: 'user123',
        username: 'testuser',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      };

      await tokenStore.storeToken('test.token', tokenData);
      await tokenStore.removeToken('test.token');

      const result = await tokenStore.getToken('test.token');
      expect(result).toBeNull();
    });

    it('should handle removing non-existent token', async () => {
      await expect(tokenStore.removeToken('non.existent.token'))
        .resolves.not.toThrow();
    });
  });

  describe('getSession', () => {
    beforeEach(async () => {
      await tokenStore.connect();
    });

    it('should retrieve active session', async () => {
      const tokenData: Omit<StoredToken, 'token'> = {
        userId: 'user123',
        username: 'testuser',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      };

      await tokenStore.storeToken('test.token', tokenData);
      const session = await tokenStore.getSession('user123');

      expect(session).toBeDefined();
      expect(session?.userId).toBe('user123');
      expect(session?.active).toBe(true);
    });

    it('should return null for non-existent session', async () => {
      const result = await tokenStore.getSession('nonexistent');
      expect(result).toBeNull();
    });

    it('should return null for inactive session', async () => {
      const inactiveSession: UserSession = {
        userId: 'inactive',
        loginTime: new Date(),
        lastActivity: new Date(),
        active: false
      };

      tokenStore['sessions'].set('inactive', inactiveSession);

      const result = await tokenStore.getSession('inactive');
      expect(result).toBeNull();
      expect(tokenStore['sessions'].has('inactive')).toBe(false);
    });

    it('should return null if not connected', async () => {
      await tokenStore.disconnect();
      const result = await tokenStore.getSession('any');
      expect(result).toBeNull();
    });
  });

  describe('updateSessionActivity', () => {
    beforeEach(async () => {
      await tokenStore.connect();
    });

    afterEach(async () => {
      await tokenStore.disconnect();
    });

    it('should update session activity timestamp', async () => {
      // Use real timers for this test
      jest.useRealTimers();
      
      const tokenData: Omit<StoredToken, 'token'> = {
        userId: 'user123',
        username: 'testuser',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      };

      await tokenStore.storeToken('test.token', tokenData);
      const sessionBefore = await tokenStore.getSession('user123');
      
      // Small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 1));
      
      await tokenStore.updateSessionActivity('user123');
      
      const sessionAfter = await tokenStore.getSession('user123');
      expect(sessionAfter).toBeDefined();
      
      // Restore fake timers for other tests
      jest.useFakeTimers();
    });

    it('should handle updating non-existent session', async () => {
      await expect(tokenStore.updateSessionActivity('nonexistent'))
        .resolves.not.toThrow();
    });
  });

  describe('setSessionExpiry', () => {
    beforeEach(async () => {
      await tokenStore.connect();
    });

    afterEach(async () => {
      await tokenStore.disconnect();
    });

    it('should expire session after timeout', async () => {
      const tokenData: Omit<StoredToken, 'token'> = {
        userId: 'user123',
        username: 'testuser',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      };

      await tokenStore.storeToken('test.token', tokenData);
      await tokenStore.setSessionExpiry('user123', 5); // 5 seconds

      expect(await tokenStore.getSession('user123')).toBeDefined();

      jest.advanceTimersByTime(6000);

      expect(await tokenStore.getSession('user123')).toBeNull();
    });

    it('should handle setting expiry for non-existent session', async () => {
      await expect(tokenStore.setSessionExpiry('nonexistent', 10))
        .resolves.not.toThrow();
    });
  });

  describe('removeSession', () => {
    beforeEach(async () => {
      await tokenStore.connect();
    });

    it('should remove session successfully', async () => {
      const tokenData: Omit<StoredToken, 'token'> = {
        userId: 'user123',
        username: 'testuser',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      };

      await tokenStore.storeToken('test.token', tokenData);
      await tokenStore.removeSession('user123');

      const result = await tokenStore.getSession('user123');
      expect(result).toBeNull();
    });
  });

  describe('blacklistToken', () => {
    beforeEach(async () => {
      await tokenStore.connect();
    });

    it('should blacklist token and remove it', async () => {
      const tokenData: Omit<StoredToken, 'token'> = {
        userId: 'user123',
        username: 'testuser',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      };

      await tokenStore.storeToken('test.token', tokenData);
      await tokenStore.blacklistToken('test.token');

      expect(await tokenStore.isTokenBlacklisted('test.token')).toBe(true);
      expect(await tokenStore.getToken('test.token')).toBeNull();
    });
  });

  describe('isTokenBlacklisted', () => {
    beforeEach(async () => {
      await tokenStore.connect();
    });

    it('should return true for blacklisted token', async () => {
      await tokenStore.blacklistToken('bad.token');
      expect(await tokenStore.isTokenBlacklisted('bad.token')).toBe(true);
    });

    it('should return false for non-blacklisted token', async () => {
      expect(await tokenStore.isTokenBlacklisted('good.token')).toBe(false);
    });
  });

  describe('clearExpiredTokens', () => {
    beforeEach(async () => {
      await tokenStore.connect();
    });

    it('should remove expired tokens', async () => {
      const expiredToken: StoredToken = {
        userId: 'user1',
        username: 'user1',
        token: 'expired.token',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() - 1000)
      };

      const validToken: StoredToken = {
        userId: 'user2',
        username: 'user2',
        token: 'valid.token',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      };

      tokenStore['tokens'].set('expired.token', expiredToken);
      tokenStore['tokens'].set('valid.token', validToken);

      await tokenStore.clearExpiredTokens();

      expect(tokenStore['tokens'].has('expired.token')).toBe(false);
      expect(tokenStore['tokens'].has('valid.token')).toBe(true);
    });
  });

  describe('getActiveSessionCount', () => {
    beforeEach(async () => {
      await tokenStore.connect();
    });

    it('should return correct session count', async () => {
      const tokenData1: Omit<StoredToken, 'token'> = {
        userId: 'user1',
        username: 'user1',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      };

      const tokenData2: Omit<StoredToken, 'token'> = {
        userId: 'user2',
        username: 'user2',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      };

      await tokenStore.storeToken('token1', tokenData1);
      await tokenStore.storeToken('token2', tokenData2);

      const count = await tokenStore.getActiveSessionCount();
      expect(count).toBe(2);
    });
  });

  describe('getUserTokens', () => {
    beforeEach(async () => {
      await tokenStore.connect();
    });

    it('should return all valid tokens for a user', async () => {
      const tokenData: Omit<StoredToken, 'token'> = {
        userId: 'user123',
        username: 'testuser',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      };

      await tokenStore.storeToken('token1', tokenData);
      await tokenStore.storeToken('token2', tokenData);
      
      // Add expired token
      const expiredToken: StoredToken = {
        ...tokenData,
        token: 'expired',
        expiresAt: new Date(Date.now() - 1000)
      };
      tokenStore['tokens'].set('expired', expiredToken);

      // Add token for different user
      await tokenStore.storeToken('other.token', {
        ...tokenData,
        userId: 'other'
      });

      const userTokens = await tokenStore.getUserTokens('user123');
      expect(userTokens).toHaveLength(2);
      expect(userTokens).toContain('token1');
      expect(userTokens).toContain('token2');
      expect(userTokens).not.toContain('expired');
      expect(userTokens).not.toContain('other.token');
    });

    it('should return empty array for user with no tokens', async () => {
      const tokens = await tokenStore.getUserTokens('nouser');
      expect(tokens).toEqual([]);
    });
  });
});