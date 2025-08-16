/**
 * Unit tests for AuthService
 * Following Mock Free Test Oriented Development
 */

import { AuthService, LoginCredentials, AuthResult, UserRepository } from '../../children/AuthService';
import { CredentialStore } from '../../children/CredentialStore';
import { TokenService } from '../../children/TokenService';
import { SessionManager } from '../../children/SessionManager';
import { User, UserRole } from '../../common/types/User';
import { SecurityConstants } from '../../common/constants/security';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let authService: AuthService;
  let credentialStore: CredentialStore;
  let tokenService: TokenService;
  let sessionManager: SessionManager;
  let userRepository: UserRepository;

  beforeEach(() => {
    // Create real instances - Mock Free
    credentialStore = new CredentialStore();
    tokenService = new TokenService();
    sessionManager = new SessionManager();
    
    // Create in-memory user repository
    const users = new Map<string, User>();
    userRepository = {
      async findByUsername(username: string): Promise<User | null> {
        for (const user of users.values()) {
          if (user.username === username) {
            return user;
          }
        }
        return null;
      },
      async findById(id: string): Promise<User | null> {
        return users.get(id) || null;
      },
      async create(userData: Partial<User>): Promise<User> {
        const user: User = {
          id: `user-${Date.now()}-${Math.random()}`,
          username: userData.username!,
          email: userData.email,
          roles: userData.roles || [UserRole.USER],
          createdAt: userData.createdAt || new Date(),
          updatedAt: userData.updatedAt || new Date()
        };
        users.set(user.id, user);
        return user;
      },
      async update(id: string, userData: Partial<User>): Promise<User> {
        const user = users.get(id);
        if (!user) {
          throw new Error('User not found');
        }
        const updatedUser = { ...user, ...userData, updatedAt: new Date() };
        users.set(id, updatedUser);
        return updatedUser;
      }
    };

    authService = new AuthService({
      credentialStore,
      tokenService,
      sessionManager,
      userRepository
    });
  });

  describe('login', () => {
    it('should successfully authenticate valid user', async () => {
      // Create a test user
      const testUser = await authService.createUser({
        username: 'testuser',
        password: 'testpass123',
        email: 'test@example.com'
      });

      // Attempt login
      const credentials: LoginCredentials = {
        username: 'testuser',
        password: 'testpass123'
      };

      const result = await authService.login(credentials);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.username).toBe('testuser');
      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeUndefined(); // No remember me
    });

    it('should fail with invalid password', async () => {
      // Create a test user
      await authService.createUser({
        username: 'testuser',
        password: 'correctpass',
        email: 'test@example.com'
      });

      // Attempt login with wrong password
      const credentials: LoginCredentials = {
        username: 'testuser',
        password: 'wrongpass'
      };

      const result = await authService.login(credentials);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid username or password');
      expect(result.user).toBeUndefined();
      expect(result.token).toBeUndefined();
    });

    it('should fail with non-existent user', async () => {
      const credentials: LoginCredentials = {
        username: 'nonexistent',
        password: 'anypass'
      };

      const result = await authService.login(credentials);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid username or password');
    });

    it('should fail with missing credentials', async () => {
      const result1 = await authService.login({
        username: '',
        password: 'pass'
      });

      expect(result1.success).toBe(false);
      expect(result1.message).toContain('Username and password are required');

      const result2 = await authService.login({
        username: 'user',
        password: ''
      });

      expect(result2.success).toBe(false);
      expect(result2.message).toContain('Username and password are required');
    });

    it('should generate refresh token when remember me is enabled', async () => {
      // Create a test user
      await authService.createUser({
        username: 'testuser',
        password: 'testpass123'
      });

      const credentials: LoginCredentials = {
        username: 'testuser',
        password: 'testpass123',
        rememberMe: true
      };

      const result = await authService.login(credentials);

      expect(result.success).toBe(true);
      expect(result.refreshToken).toBeDefined();
    });

    it('should create default admin in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const credentials: LoginCredentials = {
        username: SecurityConstants.DEFAULT_CREDENTIALS.USERNAME,
        password: SecurityConstants.DEFAULT_CREDENTIALS.PASSWORD
      };

      const result = await authService.login(credentials);

      expect(result.success).toBe(true);
      expect(result.user?.roles).toContain(UserRole.ADMIN);

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('logout', () => {
    it('should destroy session on logout', async () => {
      const sessionId = 'test-session-123';
      
      // Create a session
      await sessionManager.createSession({
        id: sessionId,
        userId: 'user-123',
        data: { username: 'testuser', roles: [UserRole.USER] },
        expiresAt: new Date(Date.now() + 3600000)
      });

      // Verify session exists
      const sessionBefore = await sessionManager.getSession(sessionId);
      expect(sessionBefore).toBeDefined();

      // Logout
      await authService.logout(sessionId);

      // Verify session is destroyed
      const sessionAfter = await sessionManager.getSession(sessionId);
      expect(sessionAfter).toBeNull();
    });
  });

  describe('validateToken', () => {
    it('should validate and return user for valid token', async () => {
      // Create a test user
      const testUser = await authService.createUser({
        username: 'tokenuser',
        password: 'pass123'
      });

      // Generate a token
      const token = await tokenService.generateToken({
        userId: testUser.id,
        username: testUser.username,
        roles: testUser.roles
      });

      // Validate token
      const user = await authService.validateToken(token);

      expect(user).toBeDefined();
      expect(user?.id).toBe(testUser.id);
      expect(user?.username).toBe('tokenuser');
    });

    it('should return null for invalid token', async () => {
      const user = await authService.validateToken('invalid-token');
      expect(user).toBeNull();
    });

    it('should return null for expired token', async () => {
      // Create expired token
      const expiredToken = await tokenService.generateToken(
        { userId: 'user-123', username: 'test', roles: [UserRole.USER] },
        '0s' // Expire immediately
      );

      // Wait a moment to ensure expiration
      await new Promise(resolve => setTimeout(resolve, 100));

      const user = await authService.validateToken(expiredToken);
      expect(user).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('should get user from session', async () => {
      // Create a test user
      const testUser = await authService.createUser({
        username: 'sessionuser',
        password: 'pass123'
      });

      // Create mock request with session
      const req = {
        session: {
          userId: testUser.id
        },
        headers: {}
      };

      const user = await authService.getCurrentUser(req);

      expect(user).toBeDefined();
      expect(user?.id).toBe(testUser.id);
      expect(user?.username).toBe('sessionuser');
    });

    it('should get user from Bearer token', async () => {
      // Create a test user
      const testUser = await authService.createUser({
        username: 'beareruser',
        password: 'pass123'
      });

      // Generate token
      const token = await tokenService.generateToken({
        userId: testUser.id,
        username: testUser.username,
        roles: testUser.roles
      });

      // Create mock request with Authorization header
      const req = {
        session: null,
        headers: {
          authorization: `Bearer ${token}`
        }
      };

      const user = await authService.getCurrentUser(req);

      expect(user).toBeDefined();
      expect(user?.id).toBe(testUser.id);
      expect(user?.username).toBe('beareruser');
    });

    it('should return null when no auth is present', async () => {
      const req = {
        session: null,
        headers: {}
      };

      const user = await authService.getCurrentUser(req);
      expect(user).toBeNull();
    });
  });

  describe('createUser', () => {
    it('should create user with hashed password', async () => {
      const userData = {
        username: 'newuser',
        password: 'newpass123',
        email: 'new@example.com'
      };

      const user = await authService.createUser(userData);

      expect(user.id).toBeDefined();
      expect(user.username).toBe('newuser');
      expect(user.email).toBe('new@example.com');
      expect(user.roles).toEqual([UserRole.USER]);

      // Verify password is hashed in credential store
      const credential = await credentialStore.getCredential(user.id);
      expect(credential?.passwordHash).toBeDefined();
      expect(credential?.passwordHash).not.toBe('newpass123');

      // Verify hashed password works
      const isValid = await bcrypt.compare('newpass123', credential?.passwordHash || '');
      expect(isValid).toBe(true);
    });

    it('should create user with specified roles', async () => {
      const userData = {
        username: 'adminuser',
        password: 'adminpass123',
        roles: [UserRole.ADMIN, UserRole.USER]
      };

      const user = await authService.createUser(userData);

      expect(user.roles).toEqual([UserRole.ADMIN, UserRole.USER]);
    });

    it('should create user without email', async () => {
      const userData = {
        username: 'noemailuser',
        password: 'pass123'
      };

      const user = await authService.createUser(userData);

      expect(user.username).toBe('noemailuser');
      expect(user.email).toBeUndefined();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete authentication flow', async () => {
      // 1. Create user
      const userData = {
        username: 'flowuser',
        password: 'flowpass123',
        email: 'flow@example.com'
      };
      const createdUser = await authService.createUser(userData);

      // 2. Login
      const loginResult = await authService.login({
        username: 'flowuser',
        password: 'flowpass123',
        rememberMe: true
      });

      expect(loginResult.success).toBe(true);
      expect(loginResult.token).toBeDefined();
      expect(loginResult.refreshToken).toBeDefined();

      // 3. Validate token
      const validatedUser = await authService.validateToken(loginResult.token!);
      expect(validatedUser?.id).toBe(createdUser.id);

      // 4. Get current user from token
      const req = {
        session: null,
        headers: {
          authorization: `Bearer ${loginResult.token}`
        }
      };
      const currentUser = await authService.getCurrentUser(req);
      expect(currentUser?.id).toBe(createdUser.id);

      // 5. Logout
      const sessionId = `session-${createdUser.id}-${Date.now()}`;
      await authService.logout(sessionId);
    });

    it('should update last login timestamp', async () => {
      // Create user
      await authService.createUser({
        username: 'timestampuser',
        password: 'pass123'
      });

      // Login
      const result = await authService.login({
        username: 'timestampuser',
        password: 'pass123'
      });

      expect(result.success).toBe(true);
      expect(result.user?.lastLoginAt).toBeDefined();
      expect(result.user?.lastLoginAt).toBeInstanceOf(Date);
    });
  });
});