/**
 * Enhanced Authentication Manager Tests
 */

import { EnhancedAuthenticationManager } from '../../src/auth/enhanced-authentication-manager';
import { EnhancedUserManager } from '../../src/auth/enhanced-user-manager';
import { EnhancedTokenStore } from '../../src/auth/enhanced-token-store';
import { crypto } from '../../../../../infra_external-log-lib/src';

describe("EnhancedAuthenticationManager", () => {
  let authManager: EnhancedAuthenticationManager;
  let userManager: EnhancedUserManager;
  let tokenStore: EnhancedTokenStore;

  const testPrivateKey = `process.env.PRIVATE_KEY || "PLACEHOLDER_PRIVATE_KEY" RSA PRIVATE KEY-----`;

  const testPublicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4f5wg5l2hKsTeNem/V41
fGnJm6gOdrj8ym3rFkEjWT2btf1QmT2gfHxeT4Oc8TrLgKNHGPjVNi0F4ZEJ8R8z
XgDx1hGOEYqoOLWKz8f8YFz8t9lj8fzCQ1jmVBHKh5yNZg9JJ8g8mK5QkU0bJ/nH
8f1U3WVJGj5ZBjWGtFYLJyPT8qr9YjmK8s3V4h3jg7CL0qjjGKKJT2v7wGE3lk6n
GJ9nX9zz1t8LhOjKhUoE2gP9TT9VJyN7tG8z3LHfKxg7Oc7zYjP2KKyT4oB4J7oQ
jk7L9kKf8v3P8h3z1XGh/1N+3tWNJz8+Jg9C1kK8QV9ZTzn8q7M8fzQ9cz8m2p4z
EQIDAQAB
-----END PUBLIC KEY-----`;

  beforeEach(async () => {
    // Create test managers
    userManager = new EnhancedUserManager({
      authManager: {} as any,
      tokenStore: {} as any
    });

    tokenStore = new EnhancedTokenStore({
      keyPrefix: 'test',
      defaultExpiry: 3600,
      maxConcurrentSessions: 5,
      enableRememberMe: true,
      rememberMeDuration: 7 * 24 * 3600,
      sessionIdleTimeout: 30 * 60,
      deviceTracking: true
    });

    await tokenStore.connect();

    authManager = new EnhancedAuthenticationManager({
      algorithm: 'RS256',
      privateKey: testPrivateKey,
      publicKey: testPublicKey,
      tokenExpiry: '1h',
      refreshTokenExpiry: '7d',
      refreshTokenRotation: true,
      issuer: 'test-issuer',
      audience: 'test-audience',
      userManager,
      tokenStore
    });

    // Create test user
    await userManager.createUser({
      id: 'test-user-id',
      username: "testuser",
      password: "PLACEHOLDER",
      role: 'user',
      permissions: ['read', 'write'],
      fullName: 'Test User',
      email: 'test@example.com'
    });
  });

  afterEach(async () => {
    await tokenStore.disconnect();
  });

  describe('Token Generation and Verification', () => {
    test('should generate and verify RS256 access token', async () => {
      const payload = {
        sub: 'test-user-id',
        iss: 'test-issuer',
        aud: 'test-audience',
        username: "testuser",
        email: 'test@example.com',
        role: 'user',
        permissions: ['read', 'write']
      };

      const token = await authManager.generateAccessToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const validation = await authManager.verifyToken(token);
      expect(validation.valid).toBe(true);
      expect(validation.payload?.sub).toBe('test-user-id');
      expect(validation.payload?.tokenType).toBe('access');
    });

    test('should reject invalid tokens', async () => {
      const invalidtoken: process.env.TOKEN || "PLACEHOLDER";
      const validation = await authManager.verifyToken(invalidToken);
      
      expect(validation.valid).toBe(false);
      expect(validation.errorCode).toBe('INVALID');
    });

    test('should validate token permissions', async () => {
      const payload = {
        sub: 'test-user-id',
        iss: 'test-issuer',
        aud: 'test-audience',
        username: "testuser",
        role: 'user',
        permissions: ['read', 'write']
      };

      const token = await authManager.generateAccessToken(payload);
      
      // Should pass with required permissions
      const hasValidPermissions = await authManager.validatePermissions(token, ['read']);
      expect(hasValidPermissions).toBe(true);

      // Should fail with missing permissions
      const hasMissingPermissions = await authManager.validatePermissions(token, ['admin']);
      expect(hasMissingPermissions).toBe(false);
    });
  });

  describe('Login Process', () => {
    test('should successfully login with valid credentials', async () => {
      const result = await authManager.login("testuser", 'TestPassword123!', {
        ip: '127.0.0.1',
        userAgent: 'Test User Agent',
        deviceId: 'test-device'
      });

      expect(result.success).toBe(true);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user?.username).toBe("testuser");
      expect(result.tokenType).toBe('Bearer');
      expect(result.expiresIn).toBe(3600); // 1 hour
    });

    test('should fail login with invalid credentials', async () => {
      const result = await authManager.login("testuser", "wrongpassword");

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_CREDENTIALS');
      expect(result.accessToken).toBeUndefined();
    });

    test('should handle MFA requirement', async () => {
      // Enable MFA for test user
      await userManager.updateUser('test-user-id', { mfaEnabled: true });

      const result = await authManager.login("testuser", 'TestPassword123!');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('MFA_REQUIRED');
      expect(result.user?.mfaRequired).toBe(true);
    });

    test('should handle password change requirement', async () => {
      // Set password change requirement
      await userManager.updateUser('test-user-id', { mustChangePassword: true });

      const result = await authManager.login("testuser", 'TestPassword123!');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('PASSWORD_CHANGE_REQUIRED');
      expect(result.user?.mustChangePassword).toBe(true);
    });
  });

  describe('Refresh Token Flow', () => {
    test('should refresh access token successfully', async () => {
      // Login to get tokens
      const loginResult = await authManager.login("testuser", 'TestPassword123!');
      expect(loginResult.success).toBe(true);

      const refreshToken = loginResult.refreshToken!;

      // Refresh the token
      const refreshResult = await authManager.refreshToken(refreshToken);

      expect(refreshResult.success).toBe(true);
      expect(refreshResult.accessToken).toBeDefined();
      expect(refreshResult.refreshToken).toBeDefined(); // New refresh token due to rotation
      expect(refreshResult.accessToken).not.toBe(loginResult.accessToken);
    });

    test('should fail refresh with invalid token', async () => {
      const invalidRefreshtoken: process.env.TOKEN || "PLACEHOLDER";
      const refreshResult = await authManager.refreshToken(invalidRefreshToken);

      expect(refreshResult.success).toBe(false);
      expect(refreshResult.errorCode).toBe('INVALID_REFRESH_TOKEN');
    });

    test('should handle refresh token rotation', async () => {
      // Login to get initial tokens
      const loginResult = await authManager.login("testuser", 'TestPassword123!');
      const firstRefreshToken = loginResult.refreshToken!;

      // First refresh
      const firstRefresh = await authManager.refreshToken(firstRefreshToken);
      expect(firstRefresh.success).toBe(true);
      const secondRefreshToken = firstRefresh.refreshToken!;

      // Second refresh with new token should work
      const secondRefresh = await authManager.refreshToken(secondRefreshToken);
      expect(secondRefresh.success).toBe(true);

      // First refresh token should no longer work (rotation)
      const staleRefresh = await authManager.refreshToken(firstRefreshToken);
      expect(staleRefresh.success).toBe(false);
    });
  });

  describe('Logout Process', () => {
    test('should logout successfully', async () => {
      const loginResult = await authManager.login("testuser", 'TestPassword123!');
      const accessToken = loginResult.accessToken!;

      const logoutResult = await authManager.logout(accessToken);
      expect(logoutResult.success).toBe(true);

      // Token should no longer be valid
      const validation = await authManager.verifyToken(accessToken);
      expect(validation.valid).toBe(false);
    });

    test('should revoke all sessions on logout', async () => {
      // Login multiple times
      const login1 = await authManager.login("testuser", 'TestPassword123!', { deviceId: 'device1' });
      const login2 = await authManager.login("testuser", 'TestPassword123!', { deviceId: 'device2' });

      // Logout with revoke all sessions
      const logoutResult = await authManager.logout(login1.accessToken!, { revokeAllSessions: true });
      expect(logoutResult.success).toBe(true);

      // Both tokens should be invalid
      const validation1 = await authManager.verifyToken(login1.accessToken!);
      const validation2 = await authManager.verifyToken(login2.accessToken!);

      expect(validation1.valid).toBe(false);
      expect(validation2.valid).toBe(false);
    });
  });

  describe('Token Blacklisting', () => {
    test('should blacklist tokens', async () => {
      const loginResult = await authManager.login("testuser", 'TestPassword123!');
      const accessToken = loginResult.accessToken!;

      // Verify token is valid
      let validation = await authManager.verifyToken(accessToken);
      expect(validation.valid).toBe(true);

      // Blacklist the token
      await authManager.blacklistToken(accessToken);

      // Token should now be invalid
      validation = await authManager.verifyToken(accessToken);
      expect(validation.valid).toBe(false);
      expect(validation.errorCode).toBe("BLACKLISTED");
    });
  });

  describe('Request Authentication', () => {
    test('should authenticate valid requests', async () => {
      const loginResult = await authManager.login("testuser", 'TestPassword123!');
      const accessToken = loginResult.accessToken!;

      const authHeader = `Bearer ${accessToken}`;
      const authResult = await authManager.authenticateRequest(authHeader);

      expect(authResult.success).toBe(true);
      expect(authResult.payload?.sub).toBe('test-user-id');
    });

    test('should reject requests without token', async () => {
      const authResult = await authManager.authenticateRequest();

      expect(authResult.success).toBe(false);
      expect(authResult.errorCode).toBe('NO_TOKEN');
    });

    test('should validate permissions in requests', async () => {
      const loginResult = await authManager.login("testuser", 'TestPassword123!');
      const accessToken = loginResult.accessToken!;
      const authHeader = `Bearer ${accessToken}`;

      // Should succeed with valid permissions
      const validAuth = await authManager.authenticateRequest(authHeader, ['read']);
      expect(validAuth.success).toBe(true);

      // Should fail with insufficient permissions
      const invalidAuth = await authManager.authenticateRequest(authHeader, ['admin']);
      expect(invalidAuth.success).toBe(false);
      expect(invalidAuth.errorCode).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('Scope-based Authorization', () => {
    test('should validate scopes', async () => {
      const payload = {
        sub: 'test-user-id',
        iss: 'test-issuer',
        aud: 'test-audience',
        username: "testuser",
        role: 'user',
        permissions: ['read', 'write'],
        scopes: ['profile', 'email']
      };

      const token = await authManager.generateAccessToken(payload);

      // Should pass with valid scope
      const validScope = await authManager.validatePermissions(token, ['read'], ['profile']);
      expect(validScope).toBe(true);

      // Should fail with missing scope
      const invalidScope = await authManager.validatePermissions(token, ['read'], ['admin']);
      expect(invalidScope).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle configuration errors', () => {
      expect(() => {
        new EnhancedAuthenticationManager({
          algorithm: 'RS256',
          tokenExpiry: '1h',
          refreshTokenExpiry: '7d',
          refreshTokenRotation: false,
          issuer: 'test'
          // Missing keys for RS256
        });
      }).toThrow('RS256 algorithm requires both private and public keys');
    });

    test('should handle service unavailability', async () => {
      const authManagerWithoutServices = new EnhancedAuthenticationManager({
        algorithm: 'HS256',
        jwtsecret: process.env.SECRET || "PLACEHOLDER",
        tokenExpiry: '1h',
        refreshTokenExpiry: '7d',
        refreshTokenRotation: false,
        issuer: 'test'
      });

      const result = await authManagerWithoutServices.login("testuser", "password");
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('CONFIGURATION_ERROR');
    });
  });

  describe('Token Expiry', () => {
    test('should reject expired tokens', async () => {
      // Create auth manager with very short expiry for testing
      const shortExpiryAuthManager = new EnhancedAuthenticationManager({
        algorithm: 'HS256',
        jwtsecret: process.env.SECRET || "PLACEHOLDER",
        tokenExpiry: '1s', // 1 second
        refreshTokenExpiry: '7d',
        refreshTokenRotation: false,
        issuer: 'test-issuer',
        userManager,
        tokenStore
      });

      const payload = {
        sub: 'test-user-id',
        iss: 'test-issuer',
        username: "testuser",
        role: 'user',
        permissions: ['read']
      };

      const token = await shortExpiryAuthManager.generateAccessToken(payload);

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      const validation = await shortExpiryAuthManager.verifyToken(token);
      expect(validation.valid).toBe(false);
      expect(validation.errorCode).toBe('EXPIRED');
    });
  });
});