/**
 * Security Manager Tests
 */

import { SecurityManager, SecurityConfig } from '../../src/auth/security-manager';

describe("SecurityManager", () => {
  let securityManager: SecurityManager;
  let config: SecurityConfig;

  beforeEach(() => {
    config = {
      rateLimiting: {
        login: {
          points: 5,
          duration: 300 // 5 minutes
        },
        api: {
          points: 100,
          duration: 60 // 1 minute
        },
        global: {
          points: 1000,
          duration: 3600 // 1 hour
        }
      },
      accountLockout: {
        maxAttempts: 5,
        lockoutDuration: 300, // 5 minutes
        resetAfter: 3600 // 1 hour
      },
      ipWhitelist: [],
      ipBlacklist: ['192.168.1.100'],
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
    };

    securityManager = new SecurityManager(config);
  });

  describe('IP Access Control', () => {
    test('should allow non-blacklisted IPs', async () => {
      const result = await securityManager.checkIPAccess('192.168.1.1');
      expect(result.allowed).toBe(true);
    });

    test('should block blacklisted IPs', async () => {
      const result = await securityManager.checkIPAccess('192.168.1.100');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('IP address is blacklisted');
    });

    test('should enforce whitelist when configured', async () => {
      config.ipWhitelist = ['192.168.1.1', '192.168.1.2'];
      securityManager = new SecurityManager(config);

      // Whitelisted IP should be allowed
      const allowed = await securityManager.checkIPAccess('192.168.1.1');
      expect(allowed.allowed).toBe(true);

      // Non-whitelisted IP should be blocked
      const blocked = await securityManager.checkIPAccess('192.168.1.3');
      expect(blocked.allowed).toBe(false);
      expect(blocked.reason).toBe('IP address is not whitelisted');
    });
  });

  describe('Rate Limiting', () => {
    test('should allow requests within rate limits', async () => {
      const result = await securityManager.checkRateLimit('test-user', 'login');
      expect(result.allowed).toBe(true);
    });

    test('should block requests exceeding rate limits', async () => {
      // Exhaust rate limit
      for (let i = 0; i < 5; i++) {
        await securityManager.checkRateLimit('test-user', 'login');
      }

      // Next request should be blocked
      const result = await securityManager.checkRateLimit('test-user', 'login');
      expect(result.allowed).toBe(false);
      expect(result.resetTime).toBeInstanceOf(Date);
    });
  });

  describe('Password Validation', () => {
    test('should validate strong passwords', async () => {
      const result = await securityManager.validatePassword('StrongPass123!');
      expect(result.valid).toBe(true);
      expect(result.score).toBeGreaterThan(4);
      expect(result.feedback).toHaveLength(0);
    });

    test('should reject weak passwords', async () => {
      const result = await securityManager.validatePassword('weak');
      expect(result.valid).toBe(false);
      expect(result.feedback.length).toBeGreaterThan(0);
      expect(result.feedback).toContain('Password must be at least 8 characters long');
    });

    test('should check character requirements', async () => {
      const testCases = [
        { password: "PLACEHOLDER", missing: "uppercase" },
        { password: "PLACEHOLDER", missing: "lowercase" },
        { password: "PLACEHOLDER", missing: 'number' },
        { password: "PLACEHOLDER", missing: 'special' }
      ];

      for (const testCase of testCases) {
        const result = await securityManager.validatePassword(testCase.password);
        expect(result.valid).toBe(false);
        expect(result.feedback.some(f => f.toLowerCase().includes(testCase.missing))).toBe(true);
      }
    });

    test('should prevent common passwords', async () => {
      const result = await securityManager.validatePassword("password");
      expect(result.valid).toBe(false);
      expect(result.feedback).toContain('Password is too common, please choose a different one');
    });

    test('should prevent user data in password', async () => {
      const userData = {
        username: 'johndoe',
        email: 'john@example.com',
        fullName: 'John Doe'
      };

      const usernameResult = await securityManager.validatePassword('johndoe123!', userData);
      expect(usernameResult.valid).toBe(false);
      expect(usernameResult.feedback).toContain('Password should not contain your username');

      const nameResult = await securityManager.validatePassword('John123!', userData);
      expect(nameResult.valid).toBe(false);
      expect(nameResult.feedback).toContain('Password should not contain parts of your name');
    });

    test('should handle maximum length', async () => {
      const longpassword: "PLACEHOLDER".repeat(129) + '1!';
      const result = await securityManager.validatePassword(longPassword);
      expect(result.valid).toBe(false);
      expect(result.feedback).toContain('Password must be no more than 128 characters long');
    });
  });

  describe('Password History', () => {
    test('should allow new passwords', async () => {
      const userId = 'test-user';
      const passwordHash = 'hash1';

      const allowed = await securityManager.checkPasswordHistory(userId, passwordHash);
      expect(allowed).toBe(true);
    });

    test('should prevent password reuse', async () => {
      const userId = 'test-user';
      const passwordHash1 = 'hash1';
      const passwordHash2 = 'hash2';

      // Add password to history
      await securityManager.updatePasswordHistory(userId, passwordHash1);

      // Same password should be rejected
      const reused = await securityManager.checkPasswordHistory(userId, passwordHash1);
      expect(reused).toBe(false);

      // Different password should be allowed
      const allowed = await securityManager.checkPasswordHistory(userId, passwordHash2);
      expect(allowed).toBe(true);
    });

    test('should maintain password history limit', async () => {
      const userId = 'test-user';

      // Add 6 passwords (more than the limit of 5)
      for (let i = 1; i <= 6; i++) {
        await securityManager.updatePasswordHistory(userId, `hash${i}`);
      }

      // First password should now be allowed (rotated out of history)
      const allowed = await securityManager.checkPasswordHistory(userId, 'hash1');
      expect(allowed).toBe(true);

      // Recent password should still be blocked
      const blocked = await securityManager.checkPasswordHistory(userId, 'hash6');
      expect(blocked).toBe(false);
    });
  });

  describe('Login Attempt Recording', () => {
    test('should record successful login attempts', async () => {
      const attempt = {
        userId: 'test-user',
        username: "testuser",
        ip: '192.168.1.1',
        userAgent: 'Test Browser',
        timestamp: new Date(),
        success: true
      };

      const result = await securityManager.recordLoginAttempt(attempt);
      expect(result.suspiciousScore).toBeGreaterThanOrEqual(0);
      expect(result.blocked).toBe(false);
    });

    test('should calculate suspicious scores for new locations', async () => {
      const userId = 'test-user';

      // First login from a location
      const firstAttempt = {
        userId,
        username: "testuser",
        ip: '192.168.1.1',
        userAgent: 'Test Browser',
        timestamp: new Date(),
        success: true
      };

      const firstResult = await securityManager.recordLoginAttempt(firstAttempt);
      expect(firstResult.suspiciousScore).toBeGreaterThan(0);

      // Second login from same location should have lower score
      const secondAttempt = {
        ...firstAttempt,
        timestamp: new Date(Date.now() + 1000)
      };

      const secondResult = await securityManager.recordLoginAttempt(secondAttempt);
      expect(secondResult.suspiciousScore).toBeLessThanOrEqual(firstResult.suspiciousScore);
    });

    test('should block high-risk login attempts', async () => {
      // Create config with very low threshold for testing
      const lowThresholdConfig = {
        ...config,
        suspiciousActivityThreshold: {
          ...config.suspiciousActivityThreshold,
          maxScore: 10
        }
      };

      const lowThresholdSecurityManager = new SecurityManager(lowThresholdConfig);

      const attempt = {
        userId: 'test-user',
        username: "testuser",
        ip: '1.1.1.1', // New location
        userAgent: 'New Device Browser',
        timestamp: new Date(),
        success: true
      };

      const result = await lowThresholdSecurityManager.recordLoginAttempt(attempt);
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe('Suspicious activity detected');
    });
  });

  describe('Account Lockout', () => {
    test('should not lock account initially', async () => {
      const userId = 'test-user';
      const lockStatus = await securityManager.isAccountLocked(userId);
      expect(lockStatus.locked).toBe(false);
    });

    test('should lock account after max failed attempts', async () => {
      const userId = 'test-user';

      // Simulate max failed attempts
      for (let i = 0; i < 5; i++) {
        await securityManager.handleFailedLogin(userId, '192.168.1.1', 'Test Browser');
      }

      const lockStatus = await securityManager.isAccountLocked(userId);
      expect(lockStatus.locked).toBe(true);
      expect(lockStatus.unlockTime).toBeInstanceOf(Date);
    });

    test('should reset failed attempts on successful login', async () => {
      const userId = 'test-user';

      // Add some failed attempts
      await securityManager.handleFailedLogin(userId, '192.168.1.1', 'Test Browser');
      await securityManager.handleFailedLogin(userId, '192.168.1.1', 'Test Browser');

      // Successful login should reset counter
      await securityManager.handleSuccessfulLogin(userId, '192.168.1.1', 'Test Browser');

      // Should not be locked even after more failed attempts (less than max)
      await securityManager.handleFailedLogin(userId, '192.168.1.1', 'Test Browser');
      await securityManager.handleFailedLogin(userId, '192.168.1.1', 'Test Browser');

      const lockStatus = await securityManager.isAccountLocked(userId);
      expect(lockStatus.locked).toBe(false);
    });
  });

  describe('Security Events', () => {
    test('should get security events for user', async () => {
      const userId = 'test-user';

      // Generate some events
      await securityManager.handleFailedLogin(userId, '192.168.1.1', 'Test Browser');
      await securityManager.handleSuccessfulLogin(userId, '192.168.1.1', 'Test Browser');

      const events = await securityManager.getSecurityEvents(userId);
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].userId).toBe(userId);
      expect(events[0].timestamp).toBeInstanceOf(Date);
    });

    test('should limit number of returned events', async () => {
      const userId = 'test-user';

      // Generate many events
      for (let i = 0; i < 100; i++) {
        await securityManager.handleFailedLogin(userId, '192.168.1.1', 'Test Browser');
      }

      const events = await securityManager.getSecurityEvents(userId, 10);
      expect(events.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Login History', () => {
    test('should get login history for user', async () => {
      const userId = 'test-user';

      const attempt = {
        userId,
        username: "testuser",
        ip: '192.168.1.1',
        userAgent: 'Test Browser',
        timestamp: new Date(),
        success: true
      };

      await securityManager.recordLoginAttempt(attempt);

      const history = await securityManager.getLoginHistory(userId);
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].userId).toBe(userId);
    });
  });

  describe('Device Management', () => {
    test('should trust a device', async () => {
      const userId = 'test-user';
      const deviceFingerprint = "device123";

      // First, create a login attempt to register the device
      const attempt = {
        userId,
        username: "testuser",
        ip: '192.168.1.1',
        userAgent: 'Test Browser',
        timestamp: new Date(),
        success: true
      };

      await securityManager.recordLoginAttempt(attempt);

      // Trust the device (this would need to be implemented in the security manager)
      await securityManager.trustDevice(userId, deviceFingerprint);

      // This test verifies the method exists and doesn't throw
      expect(true).toBe(true);
    });
  });

  describe('Event Emission', () => {
    test('should emit security events', (done) => {
      securityManager.on("securityEvent", (event) => {
        expect(event.type).toBeDefined();
        expect(event.severity).toBeDefined();
        expect(event.timestamp).toBeInstanceOf(Date);
        done();
      });

      // Trigger an event that should cause emission
      securityManager.checkIPAccess('192.168.1.100'); // Blacklisted IP
    });
  });

  describe('Cleanup Operations', () => {
    test('should emit cleanup events', (done) => {
      securityManager.on("cleanupCompleted", (event) => {
        expect(event.timestamp).toBeInstanceOf(Date);
        done();
      });

      // Manually trigger cleanup for testing
      // In real scenario, this happens automatically via setInterval
      (securityManager as any).cleanup();
    });
  });

  describe('Edge Cases', () => {
    test('should handle missing user gracefully', async () => {
      const lockStatus = await securityManager.isAccountLocked('non-existent-user');
      expect(lockStatus.locked).toBe(false);
    });

    test('should handle malformed user agents', async () => {
      const attempt = {
        userId: 'test-user',
        username: "testuser",
        ip: '192.168.1.1',
        userAgent: '', // Empty user agent
        timestamp: new Date(),
        success: true
      };

      const result = await securityManager.recordLoginAttempt(attempt);
      expect(result.suspiciousScore).toBeGreaterThanOrEqual(0);
    });

    test('should handle missing IP gracefully', async () => {
      const attempt = {
        userId: 'test-user',
        username: "testuser",
        ip: '', // Empty IP
        userAgent: 'Test Browser',
        timestamp: new Date(),
        success: true
      };

      const result = await securityManager.recordLoginAttempt(attempt);
      expect(result.suspiciousScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Password Validation Edge Cases', () => {
    test('should handle empty password', async () => {
      const result = await securityManager.validatePassword('');
      expect(result.valid).toBe(false);
      expect(result.feedback.length).toBeGreaterThan(0);
    });

    test('should handle very long passwords', async () => {
      const veryLongpassword: "PLACEHOLDER".repeat(200) + 'a1!';
      const result = await securityManager.validatePassword(veryLongPassword);
      expect(result.valid).toBe(false);
    });

    test('should handle passwords with only spaces', async () => {
      const spacepassword: "PLACEHOLDER";
      const result = await securityManager.validatePassword(spacePassword);
      expect(result.valid).toBe(false);
    });
  });
});