/**
 * Enhanced Authentication Manager Tests
 */

import { EnhancedAuthenticationManager } from '../../src/auth/enhanced-authentication-manager';
import { EnhancedUserManager } from '../../src/auth/enhanced-user-manager';
import { EnhancedTokenStore } from '../../src/auth/enhanced-token-store';
import { crypto } from '../../../../../infra_external-log-lib/src';

describe('EnhancedAuthenticationManager', () => {
  let authManager: EnhancedAuthenticationManager;
  let userManager: EnhancedUserManager;
  let tokenStore: EnhancedTokenStore;

  const testPrivateKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA4f5wg5l2hKsTeNem/V41fGnJm6gOdrj8ym3rFkEjWT2btf1Q
mT2gfHxeT4Oc8TrLgKNHGPjVNi0F4ZEJ8R8zXgDx1hGOEYqoOLWKz8f8YFz8t9lj
8fzCQ1jmVBHKh5yNZg9JJ8g8mK5QkU0bJ/nH8f1U3WVJGj5ZBjWGtFYLJyPT8qr9
YjmK8s3V4h3jg7CL0qjjGKKJT2v7wGE3lk6nGJ9nX9zz1t8LhOjKhUoE2gP9TT9V
JyN7tG8z3LHfKxg7Oc7zYjP2KKyT4oB4J7oQjk7L9kKf8v3P8h3z1XGh/1N+3tWN
Jz8+Jg9C1kK8QV9ZTzn8q7M8fzQ9cz8m2p4zEQIDAQABAoIBAHJq8QnJ0ybKZ4Zn
9z8uJ1sCo8QoLhXOCkMOF5i7/e4YIjN5jO5Y+q6rKlN8V2XhE9tZ8+Q9Y5mK4qJ9
qo8iZ4dBfN3oLzqGr5h2Hs5LGhFnVsQb3HzHcZqOT1xCg3Q5Z9q3FnN1qG4g5J5n
nFzN4J1YQJ4X2HVn2V1wYxJzQr3sV8fN8qoYpHoA0sK9A4gzrC7Eq4l4Q2BzV3Nk
QFqS6o3B3Y4V4XqfHnFq4kX5Hj2w7Q6uN4+lk1q1BqH3J9JXz9WDPzJ9h4sV8A7M
6tNQ4e7A5gB8KqJ2GJ2P5qJ7M1mB4zOq3B7Z8f4Z5E7p8H4gBzKQ5mE8N4z6t9rA
OzQJ4SECgYEA+k6t8vFkLs3Y4q1cFhE7RfTq7zJ5vCg2A4LG2LNqJ4LpZGJ0g2Vz
8xLs4C6nWbX8E8NvNk1V9n4Zl+yV8Z4RwGaZrUq4lmczHtZsO5u9y4B9W6BNg8+k
5fJ4pXyN5dYVfZ6KBVm8Qb9dCWm8rOsn5P1A5JUvV0r4tGdLKmZ0r9kCgYEA56Jn
wGh1ZL4s+mFo8wnKhJNZ8o2YGj5VY7sH4mQ8nQOOjG8sGqPm6S9J7R+J0vZ8n7EJ
5K7OZP4d0F8v4dK3xV7rP0J9n5YQ7fF4v8h9N5aZ9E8q3F7V0Z4L5k8j7dQ+hQ3t
+qP6n8qB4G4sP4A8a9zR7O5t4j8V8f4o0n2H6zkCgYEA2xqV8k+L0oJ4YR5d8Z4g
8f4qQ7aW6v8c+2v1G5X3Z+3fH7Q2+gR9QJzQ9d1W+3L7E4f0J3o2Q7E9i4f8y9M7
X5xJgV1rH4r8+v+6g9z+f3c3h4J5r8+g4G3k8+F0Y5w8+2b1E4S+Qf9L2N6d4r7J
9Q7aO5uV1dV8e2F0q0t8h5kCgYEAhHaJzNKcF6g9w2gP8A4zG2z6J+Yb8vJ3x6L7
Mf9+F2r0v8R8N1j1U5o2v4Y0f+h1R7V9T3+L6H8j5vC6h1e3J9R4e1s3A3n1q8B4
5T7Q2v4z9+7T3T1v5N7w1v4Y3a4Y0P7n5V+5J5Q+Z8e0W8t1E9E8G3G4V3o0f1mJ
8hOyY9ECgYBkC6H2Q8U3X+KkB4jY9Y1pJx8F4gd2ZzV0j5f9v4Q8r7R5Y3e+9Q1j
4r8E9J8r4V9k3+F2T3q4zP1B5W8L0o2+U4j8h2+r7Q2S4c9X5G4n1D2F8H2Z3C1+
R8h4Q6k3Q8C0k2t9J1L5o1X6V5h9O9t5k0V8P2Z6a9Q8r5k3R5v7L3v2g4W1Q==
-----END RSA PRIVATE KEY-----`;

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
      username: 'testuser',
      password: 'TestPassword123!',
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
        username: 'testuser',
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
      const invalidToken = 'invalid.token.here';
      const validation = await authManager.verifyToken(invalidToken);
      
      expect(validation.valid).toBe(false);
      expect(validation.errorCode).toBe('INVALID');
    });

    test('should validate token permissions', async () => {
      const payload = {
        sub: 'test-user-id',
        iss: 'test-issuer',
        aud: 'test-audience',
        username: 'testuser',
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
      const result = await authManager.login('testuser', 'TestPassword123!', {
        ip: '127.0.0.1',
        userAgent: 'Test User Agent',
        deviceId: 'test-device'
      });

      expect(result.success).toBe(true);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user?.username).toBe('testuser');
      expect(result.tokenType).toBe('Bearer');
      expect(result.expiresIn).toBe(3600); // 1 hour
    });

    test('should fail login with invalid credentials', async () => {
      const result = await authManager.login('testuser', 'wrongpassword');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_CREDENTIALS');
      expect(result.accessToken).toBeUndefined();
    });

    test('should handle MFA requirement', async () => {
      // Enable MFA for test user
      await userManager.updateUser('test-user-id', { mfaEnabled: true });

      const result = await authManager.login('testuser', 'TestPassword123!');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('MFA_REQUIRED');
      expect(result.user?.mfaRequired).toBe(true);
    });

    test('should handle password change requirement', async () => {
      // Set password change requirement
      await userManager.updateUser('test-user-id', { mustChangePassword: true });

      const result = await authManager.login('testuser', 'TestPassword123!');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('PASSWORD_CHANGE_REQUIRED');
      expect(result.user?.mustChangePassword).toBe(true);
    });
  });

  describe('Refresh Token Flow', () => {
    test('should refresh access token successfully', async () => {
      // Login to get tokens
      const loginResult = await authManager.login('testuser', 'TestPassword123!');
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
      const invalidRefreshToken = 'invalid.refresh.token';
      const refreshResult = await authManager.refreshToken(invalidRefreshToken);

      expect(refreshResult.success).toBe(false);
      expect(refreshResult.errorCode).toBe('INVALID_REFRESH_TOKEN');
    });

    test('should handle refresh token rotation', async () => {
      // Login to get initial tokens
      const loginResult = await authManager.login('testuser', 'TestPassword123!');
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
      const loginResult = await authManager.login('testuser', 'TestPassword123!');
      const accessToken = loginResult.accessToken!;

      const logoutResult = await authManager.logout(accessToken);
      expect(logoutResult.success).toBe(true);

      // Token should no longer be valid
      const validation = await authManager.verifyToken(accessToken);
      expect(validation.valid).toBe(false);
    });

    test('should revoke all sessions on logout', async () => {
      // Login multiple times
      const login1 = await authManager.login('testuser', 'TestPassword123!', { deviceId: 'device1' });
      const login2 = await authManager.login('testuser', 'TestPassword123!', { deviceId: 'device2' });

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
      const loginResult = await authManager.login('testuser', 'TestPassword123!');
      const accessToken = loginResult.accessToken!;

      // Verify token is valid
      let validation = await authManager.verifyToken(accessToken);
      expect(validation.valid).toBe(true);

      // Blacklist the token
      await authManager.blacklistToken(accessToken);

      // Token should now be invalid
      validation = await authManager.verifyToken(accessToken);
      expect(validation.valid).toBe(false);
      expect(validation.errorCode).toBe('BLACKLISTED');
    });
  });

  describe('Request Authentication', () => {
    test('should authenticate valid requests', async () => {
      const loginResult = await authManager.login('testuser', 'TestPassword123!');
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
      const loginResult = await authManager.login('testuser', 'TestPassword123!');
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
        username: 'testuser',
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
        jwtSecret: 'test-secret',
        tokenExpiry: '1h',
        refreshTokenExpiry: '7d',
        refreshTokenRotation: false,
        issuer: 'test'
      });

      const result = await authManagerWithoutServices.login('testuser', 'password');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('CONFIGURATION_ERROR');
    });
  });

  describe('Token Expiry', () => {
    test('should reject expired tokens', async () => {
      // Create auth manager with very short expiry for testing
      const shortExpiryAuthManager = new EnhancedAuthenticationManager({
        algorithm: 'HS256',
        jwtSecret: 'test-secret',
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
        username: 'testuser',
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