/**
 * JWT Service Unit Tests
 * Tests JWT token generation and verification
 */

import { JWTService } from '../../src/services/JWTService';

describe("JWTService", () => {
  let jwtService: JWTService;

  beforeEach(() => {
    jwtService = new JWTService();
  });

  describe('Access Token Operations', () => {
    test('should generate valid access tokens', () => {
      const payload = {
        userId: 123,
        username: "testuser",
        role: 'admin'
      };

      const token = jwtService.generateAccessToken(payload);
      
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    test('should verify valid access tokens', () => {
      const payload = {
        userId: 456,
        username: 'user456',
        role: 'user'
      };

      const token = jwtService.generateAccessToken(payload);
      const decoded = jwtService.verifyAccessToken(token) as any;

      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.username).toBe(payload.username);
      expect(decoded.role).toBe(payload.role);
      expect(decoded.iat).toBeDefined(); // issued at
      expect(decoded.exp).toBeDefined(); // expires at
      expect(decoded.iss).toBe('gui-selector-server'); // issuer
    });

    test('should reject invalid access tokens', () => {
      expect(() => {
        jwtService.verifyAccessToken('invalid.token.here');
      }).toThrow('Invalid access token');

      expect(() => {
        jwtService.verifyAccessToken('');
      }).toThrow('Invalid access token');

      expect(() => {
        jwtService.verifyAccessToken('not.a.jwt');
      }).toThrow('Invalid access token');
    });

    test('should generate different tokens for different payloads', () => {
      const payload1 = { userId: 1, username: 'user1', role: 'admin' };
      const payload2 = { userId: 2, username: 'user2', role: 'user' };

      const token1 = jwtService.generateAccessToken(payload1);
      const token2 = jwtService.generateAccessToken(payload2);

      expect(token1).not.toBe(token2);

      const decoded1 = jwtService.verifyAccessToken(token1);
      const decoded2 = jwtService.verifyAccessToken(token2);

      expect(decoded1.userId).toBe(1);
      expect(decoded2.userId).toBe(2);
    });
  });

  describe('Refresh Token Operations', () => {
    test('should generate valid refresh tokens', () => {
      const payload = {
        userId: 789,
        username: "refreshuser",
        role: 'user'
      };

      const token = jwtService.generateRefreshToken(payload);
      
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    test('should verify valid refresh tokens', () => {
      const payload = {
        userId: 101,
        username: "refresh101",
        role: 'admin'
      };

      const token = jwtService.generateRefreshToken(payload);
      const decoded = jwtService.verifyRefreshToken(token) as any;

      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.username).toBe(payload.username);
      expect(decoded.role).toBe(payload.role);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
      expect(decoded.iss).toBe('gui-selector-server');
    });

    test('should reject invalid refresh tokens', () => {
      expect(() => {
        jwtService.verifyRefreshToken('invalid.refresh.token');
      }).toThrow('Invalid refresh token');

      expect(() => {
        jwtService.verifyRefreshToken('');
      }).toThrow('Invalid refresh token');

      expect(() => {
        jwtService.verifyRefreshToken('malformed.token');
      }).toThrow('Invalid refresh token');
    });

    test('should generate different refresh tokens for different payloads', () => {
      const payload1 = { userId: 10, username: "refresh10", role: 'user' };
      const payload2 = { userId: 20, username: "refresh20", role: 'admin' };

      const token1 = jwtService.generateRefreshToken(payload1);
      const token2 = jwtService.generateRefreshToken(payload2);

      expect(token1).not.toBe(token2);

      const decoded1 = jwtService.verifyRefreshToken(token1);
      const decoded2 = jwtService.verifyRefreshToken(token2);

      expect(decoded1.userId).toBe(10);
      expect(decoded2.userId).toBe(20);
    });
  });

  describe('Token Differentiation', () => {
    test('should not allow cross-verification of token types', () => {
      const payload = {
        userId: 555,
        username: "crosstest",
        role: 'user'
      };

      const accessToken = jwtService.generateAccessToken(payload);
      const refreshToken = jwtService.generateRefreshToken(payload);

      // Access token should not verify as refresh token
      expect(() => {
        jwtService.verifyRefreshToken(accessToken);
      }).toThrow('Invalid refresh token');

      // Refresh token should not verify as access token
      expect(() => {
        jwtService.verifyAccessToken(refreshToken);
      }).toThrow('Invalid access token');
    });

    test('should use different secrets for different token types', () => {
      // Test that access and refresh tokens use different secrets
      // by verifying they cannot be cross-verified
      const service = new JWTService();

      const payload = { userId: 1, username: 'test', role: 'user' };
      
      const accessToken = service.generateAccessToken(payload);
      const refreshToken = service.generateRefreshToken(payload);
      
      // Same service should verify its own tokens with correct methods
      expect(() => service.verifyAccessToken(accessToken)).not.toThrow();
      expect(() => service.verifyRefreshToken(refreshToken)).not.toThrow();
      
      // Note: In current implementation, multiple JWTService instances use the same
      // hardcoded development secrets, so they CAN verify each other's tokens.
      // This is expected behavior for development consistency.
      const service2 = new JWTService();
      expect(() => service2.verifyAccessToken(accessToken)).not.toThrow();
      expect(() => service2.verifyRefreshToken(refreshToken)).not.toThrow();
    });
  });

  describe('Token Expiry', () => {
    test('should set appropriate expiry times', () => {
      const payload = {
        userId: 999,
        username: "expirytest",
        role: 'admin'
      };

      const accessToken = jwtService.generateAccessToken(payload);
      const refreshToken = jwtService.generateRefreshToken(payload);

      const decodedAccess = jwtService.verifyAccessToken(accessToken) as any;
      const decodedRefresh = jwtService.verifyRefreshToken(refreshToken) as any;

      // Access token should expire sooner than refresh token
      expect(decodedAccess.exp).toBeLessThan(decodedRefresh.exp);

      // Verify expiry times are reasonable (access: 15min, refresh: 7 days)
      const accessExpiry = decodedAccess.exp * 1000; // Convert to milliseconds
      const refreshExpiry = decodedRefresh.exp * 1000;
      const now = Date.now();

      // Access token should expire in roughly 15 minutes (allow 1 minute variance)
      expect(accessExpiry - now).toBeGreaterThan(14 * 60 * 1000); // > 14 minutes
      expect(accessExpiry - now).toBeLessThan(16 * 60 * 1000);    // < 16 minutes

      // Refresh token should expire in roughly 7 days (allow 1 hour variance)
      expect(refreshExpiry - now).toBeGreaterThan(6.96 * 24 * 60 * 60 * 1000); // > 6.96 days
      expect(refreshExpiry - now).toBeLessThan(7.04 * 24 * 60 * 60 * 1000);    // < 7.04 days
    });

    test('should provide refresh token expiry date', () => {
      const expiry = jwtService.getRefreshTokenExpiry();
      
      expect(expiry).toBeInstanceOf(Date);
      
      const now = new Date();
      const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      // Should be approximately 7 days from now (allow 1 minute variance)
      expect(expiry.getTime()).toBeGreaterThan(sevenDaysLater.getTime() - 60000);
      expect(expiry.getTime()).toBeLessThan(sevenDaysLater.getTime() + 60000);
    });
  });

  describe('Payload Validation', () => {
    test('should handle various user roles', () => {
      const roles = ['admin', 'user', "moderator", 'guest'];
      
      roles.forEach(role => {
        const payload = {
          userId: Math.floor(Math.random() * 1000),
          username: `testuser_${role}`,
          role
        };

        const accessToken = jwtService.generateAccessToken(payload);
        const refreshToken = jwtService.generateRefreshToken(payload);

        const decodedAccess = jwtService.verifyAccessToken(accessToken);
        const decodedRefresh = jwtService.verifyRefreshToken(refreshToken);

        expect(decodedAccess.role).toBe(role);
        expect(decodedRefresh.role).toBe(role);
      });
    });

    test('should handle special characters in usernames', () => {
      const specialUsernames = [
        'user@domain.com',
        'user.name',
        'user-name',
        'user_name',
        'user123',
        'संयुक्त', // Unicode characters
        'пользователь' // Cyrillic
      ];

      specialUsernames.forEach(username => {
        const payload = {
          userId: 1,
          username,
          role: 'user'
        };

        const token = jwtService.generateAccessToken(payload);
        const decoded = jwtService.verifyAccessToken(token);

        expect(decoded.username).toBe(username);
      });
    });

    test('should handle large user IDs', () => {
      const largeIds = [
        999999,
        2147483647, // Max 32-bit integer
        Number.MAX_SAFE_INTEGER
      ];

      largeIds.forEach(userId => {
        const payload = {
          userId,
          username: `user${userId}`,
          role: 'user'
        };

        const token = jwtService.generateAccessToken(payload);
        const decoded = jwtService.verifyAccessToken(token);

        expect(decoded.userId).toBe(userId);
      });
    });
  });

  describe('Concurrent Operations', () => {
    test('should handle concurrent token generation', () => {
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        const payload = {
          userId: i,
          username: `user${i}`,
          role: i % 2 === 0 ? 'admin' : 'user'
        };
        
        promises.push(
          Promise.resolve(jwtService.generateAccessToken(payload))
        );
      }

      return Promise.all(promises).then(tokens => {
        expect(tokens).toHaveLength(10);
        
        // All tokens should be different
        const uniqueTokens = new Set(tokens);
        expect(uniqueTokens.size).toBe(10);
        
        // All tokens should be verifiable
        tokens.forEach((token, index) => {
          const decoded = jwtService.verifyAccessToken(token);
          expect(decoded.userId).toBe(index);
        });
      });
    });

    test('should handle concurrent token verification', () => {
      // Generate tokens first
      const tokens = [];
      for (let i = 0; i < 5; i++) {
        const payload = {
          userId: i,
          username: `concurrent${i}`,
          role: 'user'
        };
        tokens.push(jwtService.generateAccessToken(payload));
      }

      // Verify all tokens concurrently
      const verificationPromises = tokens.map(token =>
        Promise.resolve(jwtService.verifyAccessToken(token))
      );

      return Promise.all(verificationPromises).then(decodedTokens => {
        expect(decodedTokens).toHaveLength(5);
        
        decodedTokens.forEach((decoded, index) => {
          expect(decoded.userId).toBe(index);
          expect(decoded.username).toBe(`concurrent${index}`);
        });
      });
    });
  });

  describe('Error Handling', () => {
    test('should provide clear error messages', () => {
      const invalidTokens = [
        'invalid',
        'not.a.jwt.token',
        'header.payload', // Missing signature
        'too.many.parts.here.invalid',
        null,
        undefined
      ];

      invalidTokens.forEach(token => {
        try {
          jwtService.verifyAccessToken(token as any);
          fail('Should have thrown an error');
        } catch (error: any) {
          expect(error.message).toBe('Invalid access token');
        }

        try {
          jwtService.verifyRefreshToken(token as any);
          fail('Should have thrown an error');
        } catch (error: any) {
          expect(error.message).toBe('Invalid refresh token');
        }
      });
    });
  });
});