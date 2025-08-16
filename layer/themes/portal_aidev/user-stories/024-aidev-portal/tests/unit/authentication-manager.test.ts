import { AuthenticationManager, AuthConfig, TokenPayload } from '../../src/auth/authentication-manager';
import { UserManager } from '../../src/auth/user-manager';
import { TokenStore } from '../../src/auth/token-store';
import * as jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');

describe('AuthenticationManager', () => {
  let authManager: AuthenticationManager;
  let mockUserManager: jest.Mocked<UserManager>;
  let mockTokenStore: jest.Mocked<TokenStore>;
  const mockJwtSecret = 'test-secret';
  const mockTokenExpiry = '1h';

  beforeEach(() => {
    mockUserManager = {
      validateCredentials: jest.fn(),
      getUser: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
      checkRateLimit: jest.fn(),
      hasPermission: jest.fn()
    } as any;

    mockTokenStore = {
      storeToken: jest.fn(),
      getToken: jest.fn(),
      removeToken: jest.fn(),
      getUserTokens: jest.fn(),
      removeSession: jest.fn(),
      blacklistToken: jest.fn(),
      isBlacklisted: jest.fn(),
      clearExpiredTokens: jest.fn()
    } as any;

    const config: AuthConfig = {
      jwtSecret: mockJwtSecret,
      tokenExpiry: mockTokenExpiry,
      refreshTokenExpiry: '7d',
      userManager: mockUserManager,
      tokenStore: mockTokenStore
    };

    authManager = new AuthenticationManager(config);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with provided configuration', () => {
      const config: AuthConfig = {
        jwtSecret: 'secret',
        tokenExpiry: '2h'
      };
      const manager = new AuthenticationManager(config);
      expect(manager).toBeDefined();
    });

    it('should set default refresh token expiry if not provided', () => {
      const config: AuthConfig = {
        jwtSecret: 'secret',
        tokenExpiry: '1h'
      };
      const manager = new AuthenticationManager(config);
      expect(manager).toBeDefined();
    });
  });

  describe('setUserManager', () => {
    it('should set the user manager', () => {
      const newUserManager = {} as UserManager;
      authManager.setUserManager(newUserManager);
      expect(authManager['userManager']).toBe(newUserManager);
    });
  });

  describe('setTokenStore', () => {
    it('should set the token store', () => {
      const newTokenStore = {} as TokenStore;
      authManager.setTokenStore(newTokenStore);
      expect(authManager['tokenStore']).toBe(newTokenStore);
    });
  });

  describe('generateToken', () => {
    it('should generate a JWT token with provided payload', async () => {
      const payload: TokenPayload = {
        userId: 'user123',
        username: 'testuser',
        role: 'user',
        permissions: ['read', 'write']
      };

      const mockToken = 'mock.jwt.token';
      (jwt.sign as jest.Mock).mockReturnValue(mockToken);

      const token = await authManager.generateToken(payload);

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: payload.userId,
          username: payload.username,
          role: payload.role,
          permissions: payload.permissions,
          iat: expect.any(Number),
          nonce: expect.any(Number)
        }),
        mockJwtSecret,
        { expiresIn: mockTokenExpiry }
      );
      expect(token).toBe(mockToken);
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const mockUser = {
        id: 'user123',
        username: 'testuser',
        password: 'hashedpassword',
        fullName: 'Test User',
        role: 'user',
        permissions: ['read']
      };

      mockUserManager.validateCredentials.mockResolvedValue(mockUser);
      mockTokenStore.storeToken.mockResolvedValue(undefined);
      (jwt.sign as jest.Mock).mockReturnValue('mock.token');

      const result = await authManager.login('testuser', 'password');

      expect(result.success).toBe(true);
      expect(result.token).toBe('mock.token');
      expect(result.refreshToken).toBe('mock.token');
      expect(result.user).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        role: mockUser.role,
        permissions: mockUser.permissions
      });
      expect(mockUserManager.validateCredentials).toHaveBeenCalledWith('testuser', 'password');
      expect(mockTokenStore.storeToken).toHaveBeenCalled();
    });

    it('should fail login with invalid credentials', async () => {
      mockUserManager.validateCredentials.mockResolvedValue(null);

      const result = await authManager.login('testuser', 'wrongpassword');

      expect(result.success).toBe(false);
      expect(result.error).toBe('invalid credentials');
      expect(result.token).toBeUndefined();
    });

    it('should fail if user manager not configured', async () => {
      authManager.setUserManager(undefined as any);

      const result = await authManager.login('testuser', 'password');

      expect(result.success).toBe(false);
      expect(result.error).toBe('user manager not configured');
    });

    it('should fail if token store not available', async () => {
      authManager.setTokenStore(undefined as any);

      const result = await authManager.login('testuser', 'password');

      expect(result.success).toBe(false);
      expect(result.error).toBe('token store unavailable');
    });

    it('should handle rate limit exceeded error', async () => {
      mockUserManager.validateCredentials.mockRejectedValue(new Error('rate limit exceeded'));

      const result = await authManager.login('testuser', 'password');

      expect(result.success).toBe(false);
      expect(result.error).toBe('rate limit exceeded');
    });

    it('should handle generic errors', async () => {
      mockUserManager.validateCredentials.mockRejectedValue(new Error('database error'));

      const result = await authManager.login('testuser', 'password');

      expect(result.success).toBe(false);
      expect(result.error).toBe('database error');
    });
  });

  describe('logout', () => {
    it('should successfully logout', async () => {
      const mockStoredToken = {
        token: 'mock.token',
        userId: 'user123',
        username: 'testuser',
        createdAt: new Date(),
        expiresAt: new Date()
      };

      mockTokenStore.getToken.mockResolvedValue(mockStoredToken);
      mockTokenStore.removeToken.mockResolvedValue(undefined);
      mockTokenStore.getUserTokens.mockResolvedValue([]);
      mockTokenStore.removeSession.mockResolvedValue(undefined);

      const result = await authManager.logout('mock.token');

      expect(result.success).toBe(true);
      expect(mockTokenStore.removeToken).toHaveBeenCalledWith('mock.token');
      expect(mockTokenStore.removeSession).toHaveBeenCalledWith('user123');
    });

    it('should not remove session if user has other active tokens', async () => {
      const mockStoredToken = {
        token: 'mock.token',
        userId: 'user123',
        username: 'testuser',
        createdAt: new Date(),
        expiresAt: new Date()
      };

      mockTokenStore.getToken.mockResolvedValue(mockStoredToken);
      mockTokenStore.removeToken.mockResolvedValue(undefined);
      mockTokenStore.getUserTokens.mockResolvedValue(['other.token']);

      const result = await authManager.logout('mock.token');

      expect(result.success).toBe(true);
      expect(mockTokenStore.removeToken).toHaveBeenCalledWith('mock.token');
      expect(mockTokenStore.removeSession).not.toHaveBeenCalled();
    });

    it('should fail if token store not available', async () => {
      authManager.setTokenStore(undefined as any);

      const result = await authManager.logout('mock.token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('token store not available');
    });

    it('should handle errors during logout', async () => {
      mockTokenStore.getToken.mockRejectedValue(new Error('database error'));

      const result = await authManager.logout('mock.token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('database error');
    });
  });

  describe('refreshToken', () => {
    beforeEach(() => {
      (jwt.sign as jest.Mock).mockReturnValue('new.mock.token');
    });

    it('should successfully refresh token', async () => {
      const mockUser = {
        id: 'user123',
        username: 'testuser',
        password: 'hashedpassword',
        fullName: 'Test User',
        role: 'user',
        permissions: ['read']
      };

      // Generate a refresh token first
      const refreshToken = authManager['generateRefreshToken']('user123');
      
      mockUserManager.getUser.mockResolvedValue(mockUser);
      mockTokenStore.storeToken.mockResolvedValue(undefined);

      const result = await authManager.refreshToken(refreshToken);

      expect(result.success).toBe(true);
      expect(result.token).toBe('new.mock.token');
      expect(mockUserManager.getUser).toHaveBeenCalledWith('user123');
    });

    it('should fail with invalid refresh token', async () => {
      const result = await authManager.refreshToken('invalid.refresh.token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('refresh token invalid');
    });

    it('should fail with expired refresh token', async () => {
      // Create an expired refresh token
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);
      
      authManager['refreshTokens'].set('expired.token', {
        userId: 'user123',
        expiresAt: expiredDate
      });

      const result = await authManager.refreshToken('expired.token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('refresh token expired');
    });

    it('should fail if user manager not configured', async () => {
      const refreshToken = authManager['generateRefreshToken']('user123');
      authManager.setUserManager(undefined as any);

      const result = await authManager.refreshToken(refreshToken);

      expect(result.success).toBe(false);
      expect(result.error).toBe('user manager not configured');
    });

    it('should fail if user not found', async () => {
      const refreshToken = authManager['generateRefreshToken']('user123');
      mockUserManager.getUser.mockResolvedValue(null);

      const result = await authManager.refreshToken(refreshToken);

      expect(result.success).toBe(false);
      expect(result.error).toBe('user not found');
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', async () => {
      const mockPayload: TokenPayload = {
        userId: 'user123',
        role: 'user',
        permissions: ['read']
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      const result = await authManager.verifyToken('valid.token');

      expect(result).toEqual(mockPayload);
      expect(jwt.verify).toHaveBeenCalledWith('valid.token', mockJwtSecret);
    });

    it('should return null for invalid token', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('invalid token');
      });

      const result = await authManager.verifyToken('invalid.token');

      expect(result).toBeNull();
    });
  });

  describe('validatePermissions', () => {
    it('should validate permissions successfully', async () => {
      const mockPayload: TokenPayload = {
        userId: 'user123',
        role: 'user',
        permissions: ['read', 'write', 'delete']
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      const result = await authManager.validatePermissions('valid.token', ['read', 'write']);

      expect(result).toBe(true);
    });

    it('should fail validation when missing permissions', async () => {
      const mockPayload: TokenPayload = {
        userId: 'user123',
        role: 'user',
        permissions: ['read']
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      const result = await authManager.validatePermissions('valid.token', ['read', 'write']);

      expect(result).toBe(false);
    });

    it('should fail validation with invalid token', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('invalid token');
      });

      const result = await authManager.validatePermissions('invalid.token', ['read']);

      expect(result).toBe(false);
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Bearer header', () => {
      const token = authManager.extractTokenFromHeader('Bearer valid.token');
      expect(token).toBe('valid.token');
    });

    it('should return null for missing header', () => {
      const token = authManager.extractTokenFromHeader(undefined);
      expect(token).toBeNull();
    });

    it('should return null for non-Bearer header', () => {
      const token = authManager.extractTokenFromHeader('Basic credentials');
      expect(token).toBeNull();
    });

    it('should return null for malformed Bearer header', () => {
      const token = authManager.extractTokenFromHeader('Bearer');
      expect(token).toBeNull();
    });
  });

  describe('authenticateRequest', () => {
    it('should authenticate valid request', async () => {
      const mockPayload: TokenPayload = {
        userId: 'user123',
        role: 'user',
        permissions: ['read', 'write']
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      const result = await authManager.authenticateRequest('Bearer valid.token', ['read']);

      expect(result.success).toBe(true);
      expect(result.token).toBe('valid.token');
    });

    it('should fail with missing token', async () => {
      const result = await authManager.authenticateRequest(undefined);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No authentication token provided');
    });

    it('should fail with invalid token', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('invalid token');
      });

      const result = await authManager.authenticateRequest('Bearer invalid.token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid or expired token');
    });

    it('should fail with insufficient permissions', async () => {
      const mockPayload: TokenPayload = {
        userId: 'user123',
        role: 'user',
        permissions: ['read']
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      const result = await authManager.authenticateRequest('Bearer valid.token', ['write', 'delete']);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient permissions');
    });
  });

  describe('setTokenExpiry', () => {
    it('should update token expiry', async () => {
      await authManager.setTokenExpiry('2h');
      expect(authManager['tokenExpiry']).toBe('2h');
    });
  });

  describe('blacklistToken', () => {
    it('should blacklist token when token store is available', async () => {
      mockTokenStore.blacklistToken.mockResolvedValue(undefined);

      await authManager.blacklistToken('token.to.blacklist');

      expect(mockTokenStore.blacklistToken).toHaveBeenCalledWith('token.to.blacklist');
    });

    it('should handle missing token store gracefully', async () => {
      authManager.setTokenStore(undefined as any);

      await expect(authManager.blacklistToken('token')).resolves.not.toThrow();
    });
  });

  describe('parseExpiry', () => {
    it('should parse seconds correctly', () => {
      const result = authManager['parseExpiry']('30s');
      expect(result).toBe(30 * 1000);
    });

    it('should parse minutes correctly', () => {
      const result = authManager['parseExpiry']('5m');
      expect(result).toBe(5 * 60 * 1000);
    });

    it('should parse hours correctly', () => {
      const result = authManager['parseExpiry']('2h');
      expect(result).toBe(2 * 60 * 60 * 1000);
    });

    it('should parse days correctly', () => {
      const result = authManager['parseExpiry']('7d');
      expect(result).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it('should return default for invalid format', () => {
      const result = authManager['parseExpiry']('invalid');
      expect(result).toBe(3600000); // 1 hour default
    });
  });
});