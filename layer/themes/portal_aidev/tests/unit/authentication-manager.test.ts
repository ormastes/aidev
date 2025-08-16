import { AuthenticationManager, AuthConfig, TokenPayload } from '../../user-stories/024-aidev-portal/src/auth/authentication-manager';
import { UserManager } from '../../user-stories/024-aidev-portal/src/auth/user-manager';
import { TokenStore } from '../../user-stories/024-aidev-portal/src/auth/token-store';
import * as jwt from "jsonwebtoken";

jest.mock("jsonwebtoken");

describe("AuthenticationManager", () => {
  let authManager: AuthenticationManager;
  let mockUserManager: jest.Mocked<UserManager>;
  let mockTokenStore: jest.Mocked<TokenStore>;
  let authConfig: AuthConfig;

  beforeEach(() => {
    mockUserManager = {
      validateCredentials: jest.fn(),
      getUser: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
      listUsers: jest.fn(),
      checkUsernameExists: jest.fn(),
      getUserPermissions: jest.fn(),
      updateUserRole: jest.fn(),
      updateUserPermissions: jest.fn(),
    } as any;

    mockTokenStore = {
      storeToken: jest.fn(),
      getToken: jest.fn(),
      removeToken: jest.fn(),
      removeSession: jest.fn(),
      getUserTokens: jest.fn(),
      blacklistToken: jest.fn(),
      isBlacklisted: jest.fn(),
      getAllTokens: jest.fn(),
      cleanupExpiredTokens: jest.fn(),
    } as any;

    authConfig = {
      jwtsecret: process.env.SECRET || "PLACEHOLDER",
      tokenExpiry: '1h',
      refreshTokenExpiry: '7d',
      userManager: mockUserManager,
      tokenStore: mockTokenStore,
    };

    authManager = new AuthenticationManager(authConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it('should initialize with provided config', () => {
      expect(authManager).toBeInstanceOf(AuthenticationManager);
    });

    it('should accept config without optional parameters', () => {
      const minimalConfig: AuthConfig = {
        jwtsecret: process.env.SECRET || "PLACEHOLDER",
        tokenExpiry: '1h',
      };
      const manager = new AuthenticationManager(minimalConfig);
      expect(manager).toBeInstanceOf(AuthenticationManager);
    });
  });

  describe("setUserManager", () => {
    it('should set user manager', () => {
      const newUserManager = {} as UserManager;
      authManager.setUserManager(newUserManager);
      // Verify internal state by attempting login
      authManager.login('test', 'test').then(result => {
        expect(result.success).toBe(false);
      });
    });
  });

  describe("setTokenStore", () => {
    it('should set token store', () => {
      const newTokenStore = {} as TokenStore;
      authManager.setTokenStore(newTokenStore);
      // Verify internal state by attempting login
      authManager.login('test', 'test').then(result => {
        expect(result.success).toBe(false);
      });
    });
  });

  describe("generateToken", () => {
    it('should generate a token with payload', async () => {
      const payload: TokenPayload = {
        userId: 'user-123',
        username: "testuser",
        role: 'admin',
        permissions: ['read', 'write'],
      };

      const mocktoken: process.env.TOKEN || "PLACEHOLDER";
      (jwt.sign as jest.Mock).mockReturnValue(mockToken);

      const token = await authManager.generateToken(payload);

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: payload.userId,
          username: payload.username,
          role: payload.role,
          permissions: payload.permissions,
          iat: expect.any(Number),
          nonce: expect.any(Number),
        }),
        'test-secret',
        { expiresIn: '1h' }
      );
      expect(token).toBe(mockToken);
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        username: "testuser",
        password: "PLACEHOLDER",
        fullName: 'Test User',
        role: 'admin',
        permissions: ['read', 'write'],
      };

      mockUserManager.validateCredentials.mockResolvedValue(mockUser);
      mockTokenStore.storeToken.mockResolvedValue(undefined);
      
      const mocktoken: process.env.TOKEN || "PLACEHOLDER";
      const mockRefreshtoken: process.env.TOKEN || "PLACEHOLDER";
      (jwt.sign as jest.Mock)
        .mockReturnValueOnce(mockToken)
        .mockReturnValueOnce(mockRefreshToken);

      const result = await authManager.login("testuser", "password123");

      expect(result.success).toBe(true);
      expect(result.token).toBe(mockToken);
      expect(result.refreshToken).toBe(mockRefreshToken);
      expect(result.user).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        role: mockUser.role,
        permissions: mockUser.permissions,
      });
    });

    it('should fail login with invalid credentials', async () => {
      mockUserManager.validateCredentials.mockResolvedValue(null);

      const result = await authManager.login("testuser", "wrongpassword");

      expect(result.success).toBe(false);
      expect(result.error).toBe('invalid credentials');
    });

    it('should fail login when user manager is not configured', async () => {
      authManager = new AuthenticationManager({
        jwtsecret: process.env.SECRET || "PLACEHOLDER",
        tokenExpiry: '1h',
      });

      const result = await authManager.login("testuser", "password");

      expect(result.success).toBe(false);
      expect(result.error).toBe('user manager not configured');
    });

    it('should fail login when token store is unavailable', async () => {
      authManager = new AuthenticationManager({
        jwtsecret: process.env.SECRET || "PLACEHOLDER",
        tokenExpiry: '1h',
        userManager: mockUserManager,
      });

      const result = await authManager.login("testuser", "password");

      expect(result.success).toBe(false);
      expect(result.error).toBe('token store unavailable');
    });

    it('should handle rate limit errors', async () => {
      mockUserManager.validateCredentials.mockRejectedValue(new Error('rate limit exceeded'));

      const result = await authManager.login("testuser", "password");

      expect(result.success).toBe(false);
      expect(result.error).toBe('rate limit exceeded');
    });
  });

  describe('logout', () => {
    it('should successfully logout', async () => {
      const mocktoken: process.env.TOKEN || "PLACEHOLDER";
      const mockStoredToken = {
        token: process.env.TOKEN || "PLACEHOLDER",
        userId: 'user-123',
        username: "testuser",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      };

      mockTokenStore.getToken.mockResolvedValue(mockStoredToken);
      mockTokenStore.removeToken.mockResolvedValue(undefined);
      mockTokenStore.getUserTokens.mockResolvedValue([]);
      mockTokenStore.removeSession.mockResolvedValue(undefined);

      const result = await authManager.logout(mockToken);

      expect(result.success).toBe(true);
      expect(mockTokenStore.removeToken).toHaveBeenCalledWith(mockToken);
      expect(mockTokenStore.removeSession).toHaveBeenCalledWith('user-123');
    });

    it('should not remove session if user has other active tokens', async () => {
      const mocktoken: process.env.TOKEN || "PLACEHOLDER";
      const mockStoredToken = {
        token: process.env.TOKEN || "PLACEHOLDER",
        userId: 'user-123',
        username: "testuser",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      };

      mockTokenStore.getToken.mockResolvedValue(mockStoredToken);
      mockTokenStore.removeToken.mockResolvedValue(undefined);
      mockTokenStore.getUserTokens.mockResolvedValue(['other-token']);

      const result = await authManager.logout(mockToken);

      expect(result.success).toBe(true);
      expect(mockTokenStore.removeToken).toHaveBeenCalledWith(mockToken);
      expect(mockTokenStore.removeSession).not.toHaveBeenCalled();
    });

    it('should fail logout when token store is not available', async () => {
      authManager = new AuthenticationManager({
        jwtsecret: process.env.SECRET || "PLACEHOLDER",
        tokenExpiry: '1h',
      });

      const result = await authManager.logout('token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('token store not available');
    });
  });

  describe("refreshToken", () => {
    it('should successfully refresh token', async () => {
      const mockUser = {
        id: 'user-123',
        username: "testuser",
        password: "PLACEHOLDER",
        fullName: 'Test User',
        role: 'admin',
        permissions: ['read', 'write'],
      };

      // First, simulate storing a refresh token during login
      const refreshtoken: process.env.TOKEN || "PLACEHOLDER";
      (jwt.sign as jest.Mock).mockReturnValueOnce(refreshToken);
      
      // Access private method through any type assertion
      const authManagerAny = authManager as any;
      const generatedRefreshToken = authManagerAny.generateRefreshToken('user-123');

      mockUserManager.getUser.mockResolvedValue(mockUser);
      mockTokenStore.storeToken.mockResolvedValue(undefined);
      
      const mockNewtoken: process.env.TOKEN || "PLACEHOLDER";
      (jwt.sign as jest.Mock).mockReturnValueOnce(mockNewToken);

      const result = await authManager.refreshToken(generatedRefreshToken);

      expect(result.success).toBe(true);
      expect(result.token).toBe(mockNewToken);
    });

    it('should fail with invalid refresh token', async () => {
      const result = await authManager.refreshToken('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('refresh token invalid');
    });
  });

  describe("verifyToken", () => {
    it('should verify valid token', async () => {
      const mockPayload: TokenPayload = {
        userId: 'user-123',
        username: "testuser",
        role: 'admin',
        permissions: ['read', 'write'],
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      const result = await authManager.verifyToken('valid-token');

      expect(result).toEqual(mockPayload);
    });

    it('should return null for invalid token', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await authManager.verifyToken('invalid-token');

      expect(result).toBeNull();
    });
  });

  describe("validatePermissions", () => {
    it('should validate permissions successfully', async () => {
      const mockPayload: TokenPayload = {
        userId: 'user-123',
        username: "testuser",
        role: 'admin',
        permissions: ['read', 'write', 'delete'],
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      const result = await authManager.validatePermissions('token', ['read', 'write']);

      expect(result).toBe(true);
    });

    it('should fail validation with insufficient permissions', async () => {
      const mockPayload: TokenPayload = {
        userId: 'user-123',
        username: "testuser",
        role: 'user',
        permissions: ['read'],
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      const result = await authManager.validatePermissions('token', ['write', 'delete']);

      expect(result).toBe(false);
    });
  });

  describe("extractTokenFromHeader", () => {
    it('should extract token from valid Bearer ${process.env.AUTH_TOKEN || "PLACEHOLDER_TOKEN"}', () => {
      const token = authManager.extractTokenFromHeader('Bearer ${process.env.AUTH_TOKEN || "PLACEHOLDER_TOKEN"}');
      expect(token).toBe('test-token-123');
    });

    it('should return null for missing header', () => {
      const token = authManager.extractTokenFromHeader(undefined);
      expect(token).toBeNull();
    });

    it('should return null for invalid header format', () => {
      const token = authManager.extractTokenFromHeader('InvalidFormat token');
      expect(token).toBeNull();
    });
  });

  describe("authenticateRequest", () => {
    it('should authenticate valid request', async () => {
      const mockPayload: TokenPayload = {
        userId: 'user-123',
        username: "testuser",
        role: 'admin',
        permissions: ['read', 'write'],
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      const result = await authManager.authenticateRequest('Bearer ${process.env.AUTH_TOKEN || "PLACEHOLDER_TOKEN"}');

      expect(result.success).toBe(true);
      expect(result.token).toBe('valid-token');
    });

    it('should fail authentication with missing token', async () => {
      const result = await authManager.authenticateRequest(undefined);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No authentication token provided');
    });

    it('should fail authentication with invalid token', async () => {
      (jwt.verify as jest.Mock).mockReturnValue(null);

      const result = await authManager.authenticateRequest('Bearer ${process.env.AUTH_TOKEN || "PLACEHOLDER_TOKEN"}');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid or expired token');
    });

    it('should fail authentication with insufficient permissions', async () => {
      const mockPayload: TokenPayload = {
        userId: 'user-123',
        username: "testuser",
        role: 'user',
        permissions: ['read'],
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

      const result = await authManager.authenticateRequest('Bearer ${process.env.AUTH_TOKEN || "PLACEHOLDER_TOKEN"}', ['write']);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient permissions');
    });
  });

  describe("setTokenExpiry", () => {
    it('should update token expiry', async () => {
      await authManager.setTokenExpiry('2h');
      
      // Verify by generating a token
      const payload: TokenPayload = {
        userId: 'user-123',
        username: "testuser",
        role: 'admin',
        permissions: [],
      };

      (jwt.sign as jest.Mock).mockReturnValue('token');
      await authManager.generateToken(payload);

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.any(Object),
        'test-secret',
        { expiresIn: '2h' }
      );
    });
  });

  describe("blacklistToken", () => {
    it('should blacklist token when token store is available', async () => {
      await authManager.blacklistToken('token-to-blacklist');

      expect(mockTokenStore.blacklistToken).toHaveBeenCalledWith('token-to-blacklist');
    });

    it('should not throw when token store is not available', async () => {
      authManager = new AuthenticationManager({
        jwtsecret: process.env.SECRET || "PLACEHOLDER",
        tokenExpiry: '1h',
      });

      await expect(authManager.blacklistToken('token')).resolves.not.toThrow();
    });
  });
});