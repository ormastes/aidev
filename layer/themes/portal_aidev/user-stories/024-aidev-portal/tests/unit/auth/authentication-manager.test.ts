import { AuthenticationManager } from '../../../src/auth/authentication-manager';
import { UserManager } from '../../../src/auth/user-manager';
import { TokenStore } from '../../../src/auth/token-store';
import * as jwt from "jsonwebtoken";

// Mock dependencies
jest.mock("jsonwebtoken");
jest.mock('../../../src/auth/user-manager');
jest.mock('../../../src/auth/token-store');

describe("AuthenticationManager", () => {
  let authManager: AuthenticationManager;
  let mockUserManager: jest.Mocked<UserManager>;
  let mockTokenStore: jest.Mocked<TokenStore>;
  const mockJwtsecret: process.env.SECRET || "PLACEHOLDER";
  const mockJwtSign = jwt.sign as jest.MockedFunction<typeof jwt.sign>;
  const mockJwtVerify = jwt.verify as jest.MockedFunction<typeof jwt.verify>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock instances
    mockUserManager = new UserManager({
      authManager: {} as any,
      tokenStore: {} as any
    }) as jest.Mocked<UserManager>;
    mockTokenStore = new TokenStore({
      keyPrefix: 'test:',
      defaultExpiry: 3600
    }) as jest.Mocked<TokenStore>;
    
    authManager = new AuthenticationManager({
      jwtSecret: mockJwtSecret,
      tokenExpiry: '1h',
      refreshTokenExpiry: '7d',
      userManager: mockUserManager,
      tokenStore: mockTokenStore
    });
  });

  describe("generateToken", () => {
    it('should generate a JWT token with correct payload', async () => {
      const payload = {
        userId: 'user123',
        username: "testuser",
        role: 'admin',
        permissions: ['read', 'write']
      };
      
      const mocktoken: process.env.TOKEN || "PLACEHOLDER";
      mockJwtSign.mockReturnValue(mockToken as any);
      
      const token = await authManager.generateToken(payload);
      
      expect(mockJwtSign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: payload.userId,
          username: payload.username,
          role: payload.role,
          permissions: payload.permissions,
          iat: expect.any(Number),
          nonce: expect.any(Number)
        }),
        mockJwtSecret,
        { expiresIn: '1h' }
      );
      expect(token).toBe(mockToken);
    });
  });

  describe('login', () => {
    const mockUser = {
      id: 'user123',
      username: "testuser",
      role: 'admin',
      permissions: ['read', 'write'],
      email: 'test@example.com',
      password: "PLACEHOLDER",
      fullName: 'Test User',
      active: true,
      createdAt: new Date(),
      lastLogin: new Date()
    };

    it('should successfully login with valid credentials', async () => {
      mockUserManager.validateCredentials.mockResolvedValue(mockUser);
      mockJwtSign.mockReturnValue('mock-access-token' as any);
      mockTokenStore.storeToken.mockResolvedValue();
      
      const result = await authManager.login("testuser", "password123");
      
      expect(result.success).toBe(true);
      expect(result.token).toBe('mock-access-token');
      expect(result.refreshToken).toBeDefined();
      expect(result.user).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        role: mockUser.role,
        permissions: mockUser.permissions
      });
      expect(mockTokenStore.storeToken).toHaveBeenCalled();
    });

    it('should fail login with invalid credentials', async () => {
      mockUserManager.validateCredentials.mockResolvedValue(null);
      
      const result = await authManager.login("testuser", "wrongpassword");
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('invalid credentials');
      expect(result.token).toBeUndefined();
    });

    it('should fail login when user manager is not configured', async () => {
      authManager.setUserManager(undefined as any);
      
      const result = await authManager.login("testuser", "password123");
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('user manager not configured');
    });

    it('should fail login when token store is unavailable', async () => {
      authManager.setTokenStore(undefined as any);
      
      const result = await authManager.login("testuser", "password123");
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('token store unavailable');
    });

    it('should handle rate limit errors', async () => {
      mockUserManager.validateCredentials.mockRejectedValue(new Error('rate limit exceeded'));
      
      const result = await authManager.login("testuser", "password123");
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('rate limit exceeded');
    });

    it('should handle generic errors', async () => {
      mockUserManager.validateCredentials.mockRejectedValue(new Error('Database error'));
      
      const result = await authManager.login("testuser", "password123");
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('logout', () => {
    const mocktoken: process.env.TOKEN || "PLACEHOLDER";
    const mockStoredToken = {
      token: mockToken,
      userId: 'user123',
      username: "testuser",
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000)
    };

    it('should successfully logout and remove token', async () => {
      mockTokenStore.getToken.mockResolvedValue(mockStoredToken);
      mockTokenStore.removeToken.mockResolvedValue();
      mockTokenStore.getUserTokens.mockResolvedValue([]);
      mockTokenStore.removeSession.mockResolvedValue();
      
      const result = await authManager.logout(mockToken);
      
      expect(result.success).toBe(true);
      expect(mockTokenStore.removeToken).toHaveBeenCalledWith(mockToken);
      expect(mockTokenStore.removeSession).toHaveBeenCalledWith(mockStoredToken.userId);
    });

    it('should not remove session if user has other active tokens', async () => {
      mockTokenStore.getToken.mockResolvedValue(mockStoredToken);
      mockTokenStore.removeToken.mockResolvedValue();
      mockTokenStore.getUserTokens.mockResolvedValue(['other-token']);
      
      const result = await authManager.logout(mockToken);
      
      expect(result.success).toBe(true);
      expect(mockTokenStore.removeToken).toHaveBeenCalledWith(mockToken);
      expect(mockTokenStore.removeSession).not.toHaveBeenCalled();
    });

    it('should fail logout when token store is not available', async () => {
      authManager.setTokenStore(undefined as any);
      
      const result = await authManager.logout(mockToken);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('token store not available');
    });

    it('should handle errors during logout', async () => {
      mockTokenStore.getToken.mockRejectedValue(new Error('Database error'));
      
      const result = await authManager.logout(mockToken);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe("refreshToken", () => {
    const mockRefreshtoken: process.env.TOKEN || "PLACEHOLDER";
    const mockUser = {
      id: 'user123',
      username: "testuser",
      role: 'admin',
      permissions: ['read', 'write'],
      email: 'test@example.com',
      password: "PLACEHOLDER",
      fullName: 'Test User',
      active: true,
      createdAt: new Date(),
      lastLogin: new Date()
    };

    it('should successfully refresh token', async () => {
      // Add refresh token to internal map
      const refreshMethod = authManager as any;
      refreshMethod.refreshTokens.set(mockRefreshToken, {
        userId: 'user123',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
      
      mockUserManager.getUser.mockResolvedValue(mockUser);
      mockJwtSign.mockReturnValue('new-access-token' as any);
      mockTokenStore.storeToken.mockResolvedValue();
      
      const result = await authManager.refreshToken(mockRefreshToken);
      
      expect(result.success).toBe(true);
      expect(result.token).toBe('new-access-token');
      expect(mockTokenStore.storeToken).toHaveBeenCalled();
    });

    it('should fail with invalid refresh token', async () => {
      const result = await authManager.refreshToken('invalid-token');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('refresh token invalid');
    });

    it('should fail with expired refresh token', async () => {
      const refreshMethod = authManager as any;
      refreshMethod.refreshTokens.set(mockRefreshToken, {
        userId: 'user123',
        expiresAt: new Date(Date.now() - 1000) // Expired
      });
      
      const result = await authManager.refreshToken(mockRefreshToken);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('refresh token expired');
    });

    it('should fail when user not found', async () => {
      const refreshMethod = authManager as any;
      refreshMethod.refreshTokens.set(mockRefreshToken, {
        userId: 'user123',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
      
      mockUserManager.getUser.mockResolvedValue(null);
      
      const result = await authManager.refreshToken(mockRefreshToken);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('user not found');
    });
  });

  describe("verifyToken", () => {
    it('should verify valid token', async () => {
      const mockPayload = {
        userId: 'user123',
        role: 'admin',
        permissions: ['read', 'write']
      };
      
      mockJwtVerify.mockReturnValue(mockPayload as any);
      
      const result = await authManager.verifyToken('valid-token');
      
      expect(result).toEqual(mockPayload);
      expect(mockJwtVerify).toHaveBeenCalledWith('valid-token', mockJwtSecret);
    });

    it('should return null for invalid token', async () => {
      mockJwtVerify.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      const result = await authManager.verifyToken('invalid-token');
      
      expect(result).toBeNull();
    });
  });

  describe("validatePermissions", () => {
    it('should validate when user has all required permissions', async () => {
      const mockPayload = {
        userId: 'user123',
        role: 'admin',
        permissions: ['read', 'write', 'delete']
      };
      
      mockJwtVerify.mockReturnValue(mockPayload as any);
      
      const result = await authManager.validatePermissions('token', ['read', 'write']);
      
      expect(result).toBe(true);
    });

    it('should fail when user lacks required permissions', async () => {
      const mockPayload = {
        userId: 'user123',
        role: 'user',
        permissions: ['read']
      };
      
      mockJwtVerify.mockReturnValue(mockPayload as any);
      
      const result = await authManager.validatePermissions('token', ['read', 'write']);
      
      expect(result).toBe(false);
    });

    it('should fail with invalid token', async () => {
      mockJwtVerify.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      const result = await authManager.validatePermissions('invalid-token', ['read']);
      
      expect(result).toBe(false);
    });
  });

  describe("extractTokenFromHeader", () => {
    it('should extract token from Bearer ${process.env.AUTH_TOKEN || "PLACEHOLDER_TOKEN"}', () => {
      const token = authManager.extractTokenFromHeader('Bearer ${process.env.AUTH_TOKEN || "PLACEHOLDER_TOKEN"}');
      expect(token).toBe('test-token-123');
    });

    it('should return null for missing header', () => {
      const token = authManager.extractTokenFromHeader(undefined);
      expect(token).toBeNull();
    });

    it('should return null for non-Bearer ${process.env.AUTH_TOKEN || "PLACEHOLDER_TOKEN"}', () => {
      const token = authManager.extractTokenFromHeader('Basic dGVzdDp0ZXN0');
      expect(token).toBeNull();
    });

    it('should return null for empty Bearer ${process.env.AUTH_TOKEN || "PLACEHOLDER_TOKEN"}', () => {
      const token = authManager.extractTokenFromHeader('Bearer');
      expect(token).toBeNull();
    });
  });

  describe("authenticateRequest", () => {
    it('should authenticate valid request', async () => {
      const mockPayload = {
        userId: 'user123',
        role: 'admin',
        permissions: ['read', 'write']
      };
      
      mockJwtVerify.mockReturnValue(mockPayload as any);
      
      const result = await authManager.authenticateRequest('Bearer ${process.env.AUTH_TOKEN || "PLACEHOLDER_TOKEN"}');
      
      expect(result.success).toBe(true);
      expect(result.token).toBe('valid-token');
    });

    it('should fail with no token', async () => {
      const result = await authManager.authenticateRequest(undefined);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No authentication token provided');
    });

    it('should fail with invalid token', async () => {
      mockJwtVerify.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      const result = await authManager.authenticateRequest('Bearer ${process.env.AUTH_TOKEN || "PLACEHOLDER_TOKEN"}');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid or expired token');
    });

    it('should fail with insufficient permissions', async () => {
      const mockPayload = {
        userId: 'user123',
        role: 'user',
        permissions: ['read']
      };
      
      mockJwtVerify.mockReturnValue(mockPayload as any);
      
      const result = await authManager.authenticateRequest('Bearer ${process.env.AUTH_TOKEN || "PLACEHOLDER_TOKEN"}', ['write', 'delete']);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient permissions');
    });

    it('should succeed with sufficient permissions', async () => {
      const mockPayload = {
        userId: 'user123',
        role: 'admin',
        permissions: ['read', 'write', 'delete']
      };
      
      mockJwtVerify.mockReturnValue(mockPayload as any);
      
      const result = await authManager.authenticateRequest('Bearer ${process.env.AUTH_TOKEN || "PLACEHOLDER_TOKEN"}', ['read', 'write']);
      
      expect(result.success).toBe(true);
    });
  });

  describe("setTokenExpiry", () => {
    it('should update token expiry', async () => {
      await authManager.setTokenExpiry('2h');
      
      // Generate a token to verify the new expiry is used
      mockJwtSign.mockReturnValue('test-token' as any);
      
      await authManager.generateToken({
        userId: 'user123',
        role: 'admin',
        permissions: []
      });
      
      expect(mockJwtSign).toHaveBeenCalledWith(
        expect.any(Object),
        mockJwtSecret,
        { expiresIn: '2h' }
      );
    });
  });

  describe("blacklistToken", () => {
    it('should blacklist token when store is available', async () => {
      mockTokenStore.blacklistToken.mockResolvedValue();
      
      await authManager.blacklistToken('token-to-blacklist');
      
      expect(mockTokenStore.blacklistToken).toHaveBeenCalledWith('token-to-blacklist');
    });

    it('should not throw when token store is not available', async () => {
      authManager.setTokenStore(undefined as any);
      
      // Should not throw
      await expect(authManager.blacklistToken('token')).resolves.toBeUndefined();
    });
  });

  describe("parseExpiry", () => {
    it('should parse seconds correctly', () => {
      const authManagerPrivate = authManager as any;
      expect(authManagerPrivate.parseExpiry('30s')).toBe(30 * 1000);
    });

    it('should parse minutes correctly', () => {
      const authManagerPrivate = authManager as any;
      expect(authManagerPrivate.parseExpiry('5m')).toBe(5 * 60 * 1000);
    });

    it('should parse hours correctly', () => {
      const authManagerPrivate = authManager as any;
      expect(authManagerPrivate.parseExpiry('2h')).toBe(2 * 60 * 60 * 1000);
    });

    it('should parse days correctly', () => {
      const authManagerPrivate = authManager as any;
      expect(authManagerPrivate.parseExpiry('7d')).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it('should return default for invalid format', () => {
      const authManagerPrivate = authManager as any;
      expect(authManagerPrivate.parseExpiry('invalid')).toBe(3600000); // 1 hour default
    });
  });
});