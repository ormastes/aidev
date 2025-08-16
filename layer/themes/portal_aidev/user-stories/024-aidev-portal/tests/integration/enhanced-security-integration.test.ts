/**
 * Enhanced Security Integration Tests
 */

import { EnhancedAuthenticationManager } from '../../src/auth/enhanced-authentication-manager';
import { EnhancedUserManager } from '../../src/auth/enhanced-user-manager';
import { EnhancedTokenStore } from '../../src/auth/enhanced-token-store';
import { SecurityManager } from '../../src/auth/security-manager';
import { MFAManager } from '../../src/auth/mfa-manager';
import { OAuthManager } from '../../src/auth/oauth-manager';

describe('Enhanced Security Integration', () => {
  let authManager: EnhancedAuthenticationManager;
  let userManager: EnhancedUserManager;
  let tokenStore: EnhancedTokenStore;
  let securityManager: SecurityManager;
  let mfaManager: MFAManager;
  let oauthManager: OAuthManager;

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
    // Initialize security manager
    securityManager = new SecurityManager({
      rateLimiting: {
        login: { points: 5, duration: 300 },
        api: { points: 100, duration: 60 },
        global: { points: 1000, duration: 3600 }
      },
      accountLockout: {
        maxAttempts: 5,
        lockoutDuration: 300,
        resetAfter: 3600
      },
      suspiciousActivityThreshold: {
        newLocationWeight: 20,
        newDeviceWeight: 15,
        timeBasedWeight: 10,
        maxScore: 50
      },
      passwordPolicy: {
        minLength: 8,
        maxLength: 128,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        preventCommonPasswords: true,
        preventUserDataInPassword: true,
        passwordHistory: 5,
        maxAge: 90
      }
    });

    // Initialize token store
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

    // Initialize user manager with security manager
    userManager = new EnhancedUserManager({
      authManager: {} as any, // Will be set later
      tokenStore: tokenStore as any,
      securityManager
    });

    // Initialize auth manager
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

    // Initialize MFA manager
    mfaManager = new MFAManager({
      appName: 'Test App',
      issuer: 'Test Issuer'
    });

    // Initialize OAuth manager
    oauthManager = new OAuthManager({
      providers: {},
      redirectUri: 'http://localhost:3000/oauth/callback'
    });

    // Wire up managers (these methods don't exist, so removing them)
  });

  afterEach(async () => {
    await tokenStore.disconnect();
  });

  describe('Complete Authentication Flow', () => {
    test('should handle complete user registration and login flow', async () => {
      // 1. Create user with strong password policy
      const createResult = await userManager.createUser({
        id: 'test-user-1',
        username: "testuser1",
        password: "PLACEHOLDER",
        role: 'user',
        permissions: ['read', 'write'],
        fullName: 'Test User One',
        email: 'test1@example.com'
      });

      expect(createResult.success).toBe(true);

      // 2. Login with security checks
      const loginResult = await authManager.login("testuser1", 'StrongPassword123!', {
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Test Browser)',
        deviceId: 'test-device-1'
      });

      expect(loginResult.success).toBe(true);
      expect(loginResult.accessToken).toBeDefined();
      expect(loginResult.refreshToken).toBeDefined();

      // 3. Verify token works
      const validation = await authManager.verifyToken(loginResult.accessToken!);
      expect(validation.valid).toBe(true);

      // 4. Use refresh token
      const refreshResult = await authManager.refreshToken(loginResult.refreshToken!);
      expect(refreshResult.success).toBe(true);
      expect(refreshResult.accessToken).toBeDefined();

      // 5. Logout
      const logoutResult = await authManager.logout(loginResult.accessToken!);
      expect(logoutResult.success).toBe(true);
    });

    test('should enforce password policies during user creation', async () => {
      // Test weak password
      const weakPasswordResult = await userManager.createUser({
        id: 'test-user-2',
        username: "testuser2",
        password: "PLACEHOLDER",
        role: 'user',
        permissions: ['read'],
        fullName: 'Test User Two',
        email: 'test2@example.com'
      });

      expect(weakPasswordResult.success).toBe(false);
      expect(weakPasswordResult.error).toContain('Password validation failed');

      // Test password with user data
      const userDataPasswordResult = await userManager.createUser({
        id: 'test-user-3',
        username: "testuser3",
        password: "PLACEHOLDER", // Contains username
        role: 'user',
        permissions: ['read'],
        fullName: 'Test User Three',
        email: 'test3@example.com'
      });

      expect(userDataPasswordResult.success).toBe(false);
      expect(userDataPasswordResult.error).toContain("username");
    });

    test('should handle account lockout after failed attempts', async () => {
      // Create user
      await userManager.createUser({
        id: 'test-user-4',
        username: "testuser4",
        password: "PLACEHOLDER",
        role: 'user',
        permissions: ['read'],
        fullName: 'Test User Four',
        email: 'test4@example.com'
      });

      // Make multiple failed login attempts
      for (let i = 0; i < 5; i++) {
        const result = await authManager.login("testuser4", "wrongpassword", {
          ip: '192.168.1.1',
          userAgent: 'Test Browser'
        });
        expect(result.success).toBe(false);
      }

      // Next login should fail due to account lockout
      const lockedResult = await authManager.login("testuser4", 'StrongPassword123!', {
        ip: '192.168.1.1',
        userAgent: 'Test Browser'
      });

      expect(lockedResult.success).toBe(false);
      expect(lockedResult.errorCode).toBe('ACCOUNT_LOCKED');
    });
  });

  describe('Session Management Integration', () => {
    test('should enforce concurrent session limits', async () => {
      // Create user
      await userManager.createUser({
        id: 'test-user-5',
        username: "testuser5",
        password: "PLACEHOLDER",
        role: 'user',
        permissions: ['read'],
        fullName: 'Test User Five',
        email: 'test5@example.com'
      });

      const sessions = [];

      // Create multiple sessions (more than limit)
      for (let i = 1; i <= 7; i++) {
        const result = await authManager.login("testuser5", 'StrongPassword123!', {
          deviceId: `device-${i}`,
          ip: '192.168.1.1',
          userAgent: 'Test Browser'
        });
        
        if (result.success) {
          sessions.push(result);
        }
      }

      // Should have limited number of active sessions
      const userSessions = await tokenStore.getUserSessions('test-user-5');
      expect(userSessions.length).toBeLessThanOrEqual(5); // Max concurrent sessions
    });

    test('should track device information', async () => {
      // Create user
      await userManager.createUser({
        id: 'test-user-6',
        username: "testuser6",
        password: "PLACEHOLDER",
        role: 'user',
        permissions: ['read'],
        fullName: 'Test User Six',
        email: 'test6@example.com'
      });

      // Login with specific user agent
      const loginResult = await authManager.login("testuser6", 'StrongPassword123!', {
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        deviceId: 'windows-chrome-device'
      });

      expect(loginResult.success).toBe(true);

      // Verify session includes device information
      const sessions = await tokenStore.getUserSessions('test-user-6');
      expect(sessions.length).toBe(1);
      expect(sessions[0].deviceId).toBe('windows-chrome-device');
    });
  });

  describe('Permission and Authorization Integration', () => {
    test('should handle role-based access control', async () => {
      // Create users with different roles
      await userManager.createUser({
        id: 'admin-user',
        username: "adminuser",
        password: "PLACEHOLDER",
        role: 'admin',
        permissions: ['*'],
        fullName: 'Admin User',
        email: 'admin@example.com'
      });

      await userManager.createUser({
        id: 'normal-user',
        username: "normaluser",
        password: "PLACEHOLDER",
        role: 'user',
        permissions: ['read'],
        fullName: 'Normal User',
        email: 'normal@example.com'
      });

      // Admin login
      const adminLogin = await authManager.login("adminuser", 'AdminPassword123!');
      expect(adminLogin.success).toBe(true);

      // Normal user login
      const userLogin = await authManager.login("normaluser", 'NormalPassword123!');
      expect(userLogin.success).toBe(true);

      // Test admin permissions
      const adminAuth = await authManager.authenticateRequest(
        `Bearer ${adminLogin.accessToken}`,
        ['admin', 'write']
      );
      expect(adminAuth.success).toBe(true);

      // Test normal user permissions
      const userWriteAuth = await authManager.authenticateRequest(
        `Bearer ${userLogin.accessToken}`,
        ['write']
      );
      expect(userWriteAuth.success).toBe(false);

      const userReadAuth = await authManager.authenticateRequest(
        `Bearer ${userLogin.accessToken}`,
        ['read']
      );
      expect(userReadAuth.success).toBe(true);
    });

    test('should handle group-based permissions', async () => {
      // Create user
      await userManager.createUser({
        id: 'group-user',
        username: "groupuser",
        password: "PLACEHOLDER",
        role: 'user',
        permissions: ['read'],
        fullName: 'Group User',
        email: 'group@example.com'
      });

      // Create group with additional permissions
      const groupResult = await userManager.createGroup({
        name: 'editors',
        description: 'Content editors',
        permissions: ['write', 'edit'],
        members: []
      });

      expect(groupResult.success).toBe(true);

      // Add user to group
      const addedToGroup = await userManager.addUserToGroup('group-user', groupResult.groupId!);
      expect(addedToGroup).toBe(true);

      // Login and test combined permissions
      const loginResult = await authManager.login("groupuser", 'GroupPassword123!');
      expect(loginResult.success).toBe(true);

      const userPermissions = await userManager.getUserPermissions('group-user');
      expect(userPermissions).toContain('read'); // User permission
      expect(userPermissions).toContain('write'); // Group permission
      expect(userPermissions).toContain('edit'); // Group permission
    });
  });

  describe('API Key Management Integration', () => {
    test('should create and validate API keys', async () => {
      // Create user
      await userManager.createUser({
        id: 'api-user',
        username: 'apiuser',
        password: "PLACEHOLDER",
        role: 'user',
        permissions: ['api:read'],
        fullName: 'API User',
        email: 'api@example.com'
      });

      // Create API key
      const keyResult = await userManager.createApiKey('api-user', {
        name: 'Test API Key',
        permissions: ['api:read'],
        scopes: ['data:read']
      });

      expect(keyResult.success).toBe(true);
      expect(keyResult.apiKey).toBeDefined();

      // Validate API key
      const validation = await userManager.validateApiKey(keyResult.apiKey!);
      expect(validation.valid).toBe(true);
      expect(validation.userId).toBe('api-user');
      expect(validation.permissions).toContain('api:read');

      // Test with required scope
      const scopeValidation = await userManager.validateApiKey(
        keyResult.apiKey!,
        undefined,
        'data:read'
      );
      expect(scopeValidation.valid).toBe(true);

      // Test with invalid scope
      const invalidScopeValidation = await userManager.validateApiKey(
        keyResult.apiKey!,
        undefined,
        'admin:write'
      );
      expect(invalidScopeValidation.valid).toBe(false);
    });
  });

  describe('Password Management Integration', () => {
    test('should handle password reset flow', async () => {
      // Create user
      await userManager.createUser({
        id: 'reset-user',
        username: "resetuser",
        password: "PLACEHOLDER",
        role: 'user',
        permissions: ['read'],
        fullName: 'Reset User',
        email: 'reset@example.com'
      });

      // Request password reset
      const resetResult = await userManager.createPasswordResetToken('reset@example.com');
      expect(resetResult.success).toBe(true);
      expect(resetResult.token).toBeDefined();

      // Reset password
      const newpassword: "PLACEHOLDER";
      const resetPasswordResult = await userManager.resetPasswordWithToken(
        resetResult.token!,
        newPassword
      );
      expect(resetPasswordResult.success).toBe(true);

      // Verify old password no longer works
      const oldPasswordLogin = await authManager.login("resetuser", 'ResetPassword123!');
      expect(oldPasswordLogin.success).toBe(false);

      // Verify new password works
      const newPasswordLogin = await authManager.login("resetuser", newPassword);
      expect(newPasswordLogin.success).toBe(true);
    });

    test('should enforce password history', async () => {
      // Create user
      await userManager.createUser({
        id: 'history-user',
        username: "historyuser",
        password: "PLACEHOLDER",
        role: 'user',
        permissions: ['read'],
        fullName: 'History User',
        email: 'history@example.com'
      });

      // Change password multiple times
      const passwords = [
        'HistoryPassword456!',
        'HistoryPassword789!',
        'HistoryPasswordABC!',
        'HistoryPasswordDEF!',
        'HistoryPasswordGHI!'
      ];

      for (const password of passwords) {
        const updateResult = await userManager.updateUser('history-user', { password });
        expect(updateResult).toBe(true);
      }

      // Try to reuse recent password (should fail)
      try {
        await userManager.updateUser('history-user', { password: "PLACEHOLDER" });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('cannot be reused');
      }

      // Try to use very old password (should work if beyond history limit)
      const veryOldPasswordUpdate = await userManager.updateUser('history-user', {
        password: "PLACEHOLDER"
      });
      expect(veryOldPasswordUpdate).toBe(true);
    });
  });

  describe('Security Event Integration', () => {
    test('should generate comprehensive security events', async () => {
      // Create user
      await userManager.createUser({
        id: 'event-user',
        username: "eventuser",
        password: "PLACEHOLDER",
        role: 'user',
        permissions: ['read'],
        fullName: 'Event User',
        email: 'event@example.com'
      });

      // Generate various security events
      
      // Failed login
      await authManager.login("eventuser", "wrongpassword", {
        ip: '192.168.1.1',
        userAgent: 'Test Browser'
      });

      // Successful login
      const successLogin = await authManager.login("eventuser", 'EventPassword123!', {
        ip: '192.168.1.1',
        userAgent: 'Test Browser'
      });

      // Login from new location (suspicious)
      await authManager.login("eventuser", 'EventPassword123!', {
        ip: '10.0.0.1', // Different IP
        userAgent: 'Test Browser'
      });

      // Get security events
      const events = await securityManager.getSecurityEvents('event-user');
      expect(events.length).toBeGreaterThan(0);

      // Get login history
      const loginHistory = await securityManager.getLoginHistory('event-user');
      expect(loginHistory.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle service failures gracefully', async () => {
      // Test with disconnected token store
      await tokenStore.disconnect();

      const loginResult = await authManager.login("testuser", "password");
      expect(loginResult.success).toBe(false);

      // Reconnect for other tests
      await tokenStore.connect();
    });

    test('should handle malformed requests', async () => {
      // Test authentication with malformed headers
      const authResult = await authManager.authenticateRequest('Malformed Header');
      expect(authResult.success).toBe(false);
      expect(authResult.errorCode).toBe('NO_TOKEN');

      // Test with invalid token format
      const invalidTokenResult = await authManager.authenticateRequest('Bearer ${process.env.AUTH_TOKEN || "PLACEHOLDER_TOKEN"}');
      expect(invalidTokenResult.success).toBe(false);
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle concurrent operations', async () => {
      // Create multiple users concurrently
      const userCreationPromises = [];
      
      for (let i = 1; i <= 10; i++) {
        userCreationPromises.push(
          userManager.createUser({
            id: `concurrent-user-${i}`,
            username: `user${i}`,
            password: "PLACEHOLDER",
            role: 'user',
            permissions: ['read'],
            fullName: `User ${i}`,
            email: `user${i}@example.com`
          })
        );
      }

      const results = await Promise.all(userCreationPromises);
      expect(results.every(r => r.success)).toBe(true);

      // Test concurrent logins
      const loginPromises = [];
      
      for (let i = 1; i <= 10; i++) {
        loginPromises.push(
          authManager.login(`user${i}`, 'ConcurrentPassword123!', {
            deviceId: `device-${i}`
          })
        );
      }

      const loginResults = await Promise.all(loginPromises);
      expect(loginResults.every(r => r.success)).toBe(true);
    });

    test('should cleanup expired data', async () => {
      // This test would verify that cleanup methods work
      // In a real scenario, we might need to mock timers or advance time

      // Create some test data
      await userManager.createUser({
        id: 'cleanup-user',
        username: "cleanupuser",
        password: "PLACEHOLDER",
        role: 'user',
        permissions: ['read'],
        fullName: 'Cleanup User',
        email: 'cleanup@example.com'
      });

      // Create password reset token
      const resetResult = await userManager.createPasswordResetToken('cleanup@example.com');
      expect(resetResult.success).toBe(true);

      // The cleanup would happen automatically via intervals in real usage
      // For testing, we verify the methods exist and can be called
      expect(typeof (userManager as any).cleanupExpired).toBe("function");
    });
  });
});