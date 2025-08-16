import { AuthService } from '../../children/src/infrastructure/auth-service';
import { 
  User, 
  Credentials, 
  AuthResult 
} from '../../children/xlib/interfaces/infrastructure.interfaces';
import * as crypto from 'crypto';

// Mock crypto module
let mockTokenCounter = 0;
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomBytes: jest.fn(() => ({
    toString: jest.fn(() => `mock-token-string-${mockTokenCounter++}`)
  }))
}));

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should authenticate admin user with password', async () => {
      const credentials: Credentials = {
        type: 'password',
        username: 'admin',
        password: 'admin123'
      };

      const result = await authService.authenticate(credentials);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn');
      expect(result.user.username).toBe('admin');
      expect(result.user.roles).toContain('admin');
    });

    it('should fail authentication with wrong password', async () => {
      const credentials: Credentials = {
        type: 'password',
        username: 'admin',
        password: 'wrongpassword'
      };

      await expect(authService.authenticate(credentials))
        .rejects.toThrow('Authentication failed');
    });

    it('should fail authentication with missing username', async () => {
      const credentials: Credentials = {
        type: 'password',
        password: 'admin123'
      };

      await expect(authService.authenticate(credentials))
        .rejects.toThrow('Username and password required');
    });

    it('should fail authentication with missing password', async () => {
      const credentials: Credentials = {
        type: 'password',
        username: 'admin'
      };

      await expect(authService.authenticate(credentials))
        .rejects.toThrow('Username and password required');
    });

    it('should authenticate developer user', async () => {
      const credentials: Credentials = {
        type: 'password',
        username: 'developer',
        password: 'dev123'
      };

      const result = await authService.authenticate(credentials);

      expect(result.user.username).toBe('developer');
      expect(result.user.roles).toContain('developer');
    });

    it('should fail OAuth authentication (not implemented)', async () => {
      const credentials: Credentials = {
        type: 'oauth'
      };

      await expect(authService.authenticate(credentials))
        .rejects.toThrow('OAuth authentication not implemented');
    });
  });

  describe('validateToken', () => {
    it('should validate a valid token', async () => {
      const credentials: Credentials = {
        type: 'password',
        username: 'admin',
        password: 'admin123'
      };

      const authResult = await authService.authenticate(credentials);
      const tokenInfo = await authService.validateToken(authResult.token);

      expect(tokenInfo.valid).toBe(true);
      expect(tokenInfo.user.username).toBe('admin');
      expect(tokenInfo.permissions).toContain('*');
    });

    it('should invalidate an unknown token', async () => {
      const tokenInfo = await authService.validateToken('invalid-token');

      expect(tokenInfo.valid).toBe(false);
      expect(tokenInfo.user.username).toBe('anonymous');
    });
  });

  describe('refresh', () => {
    it('should refresh token with valid refresh token', async () => {
      const credentials: Credentials = {
        type: 'password',
        username: 'admin',
        password: 'admin123'
      };

      const authResult = await authService.authenticate(credentials);
      const refreshResult = await authService.refresh(authResult.refreshToken);

      expect(refreshResult).toHaveProperty('token');
      expect(refreshResult).toHaveProperty('refreshToken');
      expect(refreshResult.user.username).toBe('admin');
    });

    it('should fail to refresh with invalid refresh token', async () => {
      await expect(authService.refresh('invalid-refresh-token'))
        .rejects.toThrow('Invalid refresh token');
    });
  });

  describe('logout', () => {
    it('should logout and invalidate token', async () => {
      const credentials: Credentials = {
        type: 'password',
        username: 'admin',
        password: 'admin123'
      };

      const authResult = await authService.authenticate(credentials);
      await authService.logout(authResult.token);

      const tokenInfo = await authService.validateToken(authResult.token);
      expect(tokenInfo.valid).toBe(false);
    });
  });

  describe('hasPermission', () => {
    it('should return true for admin with any permission', async () => {
      const credentials: Credentials = {
        type: 'password',
        username: 'admin',
        password: 'admin123'
      };

      const authResult = await authService.authenticate(credentials);
      const hasPermission = await authService.hasPermission(authResult.token, 'any.permission');

      expect(hasPermission).toBe(true);
    });

    it('should return false for invalid token', async () => {
      const hasPermission = await authService.hasPermission('invalid-token', 'any.permission');

      expect(hasPermission).toBe(false);
    });

    it('should check specific permissions for developer', async () => {
      const credentials: Credentials = {
        type: 'password',
        username: 'developer',
        password: 'dev123'
      };

      const authResult = await authService.authenticate(credentials);
      
      expect(await authService.hasPermission(authResult.token, 'agent:read')).toBe(true);
      expect(await authService.hasPermission(authResult.token, 'agent:update')).toBe(true);
      expect(await authService.hasPermission(authResult.token, 'admin:delete')).toBe(false);
    });
  });

  describe('getUser', () => {
    it('should get user info with valid token', async () => {
      const credentials: Credentials = {
        type: 'password',
        username: 'admin',
        password: 'admin123'
      };

      const authResult = await authService.authenticate(credentials);
      const user = await authService.getUser(authResult.token);

      expect(user.username).toBe('admin');
      expect(user.email).toBe('admin@llm-agent.local');
      expect(user.roles).toContain('admin');
    });

    it('should throw error for invalid token', async () => {
      await expect(authService.getUser('invalid-token'))
        .rejects.toThrow('Invalid token');
    });
  });

  describe('updateUser', () => {
    it('should update user email', async () => {
      const credentials: Credentials = {
        type: 'password',
        username: 'developer',
        password: 'dev123'
      };

      const authResult = await authService.authenticate(credentials);
      const updatedUser = await authService.updateUser(authResult.token, {
        email: 'newemail@example.com'
      });

      expect(updatedUser.email).toBe('newemail@example.com');
      expect(updatedUser.username).toBe('developer');
    });

    it('should update user metadata', async () => {
      const credentials: Credentials = {
        type: 'password',
        username: 'developer',
        password: 'dev123'
      };

      const authResult = await authService.authenticate(credentials);
      const updatedUser = await authService.updateUser(authResult.token, {
        metadata: { theme: 'dark', language: 'en' }
      });

      expect(updatedUser.metadata).toEqual({ theme: 'dark', language: 'en' });
    });

    it('should throw error for invalid token', async () => {
      await expect(authService.updateUser('invalid-token', { email: 'test@example.com' }))
        .rejects.toThrow('Invalid token');
    });
  });

  describe('API key authentication', () => {
    it('should fail with missing API key', async () => {
      const credentials: Credentials = {
        type: 'apiKey'
      };

      await expect(authService.authenticate(credentials))
        .rejects.toThrow('API key required');
    });

    it('should fail with invalid API key', async () => {
      const credentials: Credentials = {
        type: 'apiKey',
        apiKey: 'invalid-api-key'
      };

      await expect(authService.authenticate(credentials))
        .rejects.toThrow('Authentication failed');
    });
  });

  describe('createUser', () => {
    it('should create a new user with default role', async () => {
      const user = await authService.createUser('testuser', 'password123', 'test@example.com');

      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.roles).toEqual(['user']);
      expect(user).not.toHaveProperty('passwordHash');
      expect(user).not.toHaveProperty('apiKeys');
    });

    it('should create a user with custom roles', async () => {
      const user = await authService.createUser('adminuser', 'pass123', 'admin@example.com', ['admin', 'developer']);

      expect(user.username).toBe('adminuser');
      expect(user.roles).toEqual(['admin', 'developer']);
      expect(user.permissions).toContain('*');  // Admin has wildcard permissions
      expect(user.permissions).toContain('agent:create');
    });

    it('should authenticate created user', async () => {
      await authService.createUser('newuser', 'mypassword', 'new@example.com');

      const credentials: Credentials = {
        type: 'password',
        username: 'newuser',
        password: 'mypassword'
      };

      const result = await authService.authenticate(credentials);
      expect(result.user.username).toBe('newuser');
      expect(result.user.email).toBe('new@example.com');
    });
  });

  describe('createApiKey', () => {
    it('should create API key for existing user', async () => {
      const user = await authService.createUser('apiuser', 'pass123', 'api@example.com');
      const apiKey = await authService.createApiKey(user.id);

      expect(apiKey).toMatch(/^ak_/);
      expect(apiKey.length).toBeGreaterThan(10);
    });

    it('should authenticate with created API key', async () => {
      const user = await authService.createUser('apiuser2', 'pass123', 'api2@example.com');
      const apiKey = await authService.createApiKey(user.id);

      const credentials: Credentials = {
        type: 'apiKey',
        apiKey
      };

      const result = await authService.authenticate(credentials);
      expect(result.user.username).toBe('apiuser2');
    });

    it('should throw error for non-existent user', async () => {
      await expect(authService.createApiKey('non-existent-id'))
        .rejects.toThrow('User not found');
    });

    it('should handle multiple API keys for same user', async () => {
      const user = await authService.createUser('multikey', 'pass123', 'multi@example.com');
      const apiKey1 = await authService.createApiKey(user.id);
      const apiKey2 = await authService.createApiKey(user.id);

      expect(apiKey1).not.toBe(apiKey2);
      
      // Both keys should work
      const result1 = await authService.authenticate({ type: 'apiKey', apiKey: apiKey1 });
      const result2 = await authService.authenticate({ type: 'apiKey', apiKey: apiKey2 });
      
      expect(result1.user.username).toBe('multikey');
      expect(result2.user.username).toBe('multikey');
    });
  });
});