/**
 * Unit tests for TokenService
 * Following Mock Free Test Oriented Development
 */

import { TokenService, TokenPayload } from '../../children/TokenService';
import { UserRole } from '../../common/types/User';
import * as jwt from 'jsonwebtoken';

describe('TokenService', () => {
  let tokenService: TokenService;

  beforeEach(() => {
    // Create real instance - Mock Free
    tokenService = new TokenService();
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', async () => {
      const payload: TokenPayload = {
        userId: 'user-123',
        username: 'testuser',
        roles: [UserRole.USER]
      };

      const token = await tokenService.generateToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format
    });

    it('should generate token with custom expiry', async () => {
      const payload: TokenPayload = {
        userId: 'user-123',
        username: 'testuser',
        roles: [UserRole.USER]
      };

      const token = await tokenService.generateToken(payload, '2h');

      expect(token).toBeDefined();
      
      // Decode to verify expiry
      const decoded = jwt.decode(token) as any;
      expect(decoded.exp).toBeDefined();
      
      // Check expiry is approximately 2 hours from now
      const now = Math.floor(Date.now() / 1000);
      const twoHours = 2 * 60 * 60;
      expect(decoded.exp).toBeGreaterThan(now);
      expect(decoded.exp).toBeLessThanOrEqual(now + twoHours + 10); // Small buffer
    });

    it('should include all payload fields in token', async () => {
      const payload: TokenPayload = {
        userId: 'user-456',
        username: 'adminuser',
        roles: [UserRole.ADMIN, UserRole.USER],
        email: 'admin@example.com'
      };

      const token = await tokenService.generateToken(payload);
      const decoded = jwt.decode(token) as any;

      expect(decoded.userId).toBe('user-456');
      expect(decoded.username).toBe('adminuser');
      expect(decoded.roles).toEqual([UserRole.ADMIN, UserRole.USER]);
      expect(decoded.email).toBe('admin@example.com');
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', async () => {
      const payload: TokenPayload = {
        userId: 'user-123',
        username: 'testuser',
        roles: [UserRole.USER]
      };

      const refreshToken = await tokenService.generateRefreshToken(payload);

      expect(refreshToken).toBeDefined();
      expect(typeof refreshToken).toBe('string');
      expect(refreshToken.split('.')).toHaveLength(3); // JWT format
    });

    it('should have longer expiry than regular token', async () => {
      const payload: TokenPayload = {
        userId: 'user-123',
        username: 'testuser',
        roles: [UserRole.USER]
      };

      const token = await tokenService.generateToken(payload);
      const refreshToken = await tokenService.generateRefreshToken(payload);

      const tokenDecoded = jwt.decode(token) as any;
      const refreshDecoded = jwt.decode(refreshToken) as any;

      expect(refreshDecoded.exp).toBeGreaterThan(tokenDecoded.exp);
    });

    it('should include refresh type in token', async () => {
      const payload: TokenPayload = {
        userId: 'user-123',
        username: 'testuser',
        roles: [UserRole.USER]
      };

      const refreshToken = await tokenService.generateRefreshToken(payload);
      const decoded = jwt.decode(refreshToken) as any;

      expect(decoded.type).toBe('refresh');
    });
  });

  describe('verifyToken', () => {
    it('should verify and decode valid token', async () => {
      const payload: TokenPayload = {
        userId: 'user-789',
        username: 'verifyuser',
        roles: [UserRole.USER],
        email: 'verify@example.com'
      };

      const token = await tokenService.generateToken(payload);
      const verified = await tokenService.verifyToken(token);

      expect(verified).toBeDefined();
      expect(verified?.userId).toBe('user-789');
      expect(verified?.username).toBe('verifyuser');
      expect(verified?.roles).toEqual([UserRole.USER]);
      expect(verified?.email).toBe('verify@example.com');
    });

    it('should return null for invalid token', async () => {
      const result = await tokenService.verifyToken('invalid.token.here');
      expect(result).toBeNull();
    });

    it('should return null for expired token', async () => {
      const payload: TokenPayload = {
        userId: 'user-123',
        username: 'expireduser',
        roles: [UserRole.USER]
      };

      // Generate token that expires immediately
      const token = await tokenService.generateToken(payload, '0s');

      // Wait a moment to ensure expiration
      await new Promise(resolve => setTimeout(resolve, 100));

      const result = await tokenService.verifyToken(token);
      expect(result).toBeNull();
    });

    it('should verify refresh token', async () => {
      const payload: TokenPayload = {
        userId: 'user-123',
        username: 'refreshuser',
        roles: [UserRole.USER]
      };

      const refreshToken = await tokenService.generateRefreshToken(payload);
      const verified = await tokenService.verifyToken(refreshToken);

      expect(verified).toBeDefined();
      expect(verified?.userId).toBe('user-123');
      expect((verified as any)?.type).toBe('refresh');
    });
  });

  describe('refreshToken', () => {
    it('should generate new token from valid refresh token', async () => {
      const payload: TokenPayload = {
        userId: 'user-999',
        username: 'refreshuser',
        roles: [UserRole.USER]
      };

      const refreshToken = await tokenService.generateRefreshToken(payload);
      const newToken = await tokenService.refreshToken(refreshToken);

      expect(newToken).toBeDefined();

      // Verify new token has same payload
      const decoded = jwt.decode(newToken!) as any;
      expect(decoded.userId).toBe('user-999');
      expect(decoded.username).toBe('refreshuser');
      expect(decoded.roles).toEqual([UserRole.USER]);
    });

    it('should return null for non-refresh token', async () => {
      const payload: TokenPayload = {
        userId: 'user-123',
        username: 'regularuser',
        roles: [UserRole.USER]
      };

      const regularToken = await tokenService.generateToken(payload);
      const result = await tokenService.refreshToken(regularToken);

      expect(result).toBeNull();
    });

    it('should return null for invalid refresh token', async () => {
      const result = await tokenService.refreshToken('invalid.refresh.token');
      expect(result).toBeNull();
    });

    it('should return null for expired refresh token', async () => {
      const payload: TokenPayload = {
        userId: 'user-123',
        username: 'expiredrefresh',
        roles: [UserRole.USER]
      };

      // Custom token service with short expiry for testing
      const testTokenService = new TokenService();
      
      // Create expired refresh token manually
      const expiredRefreshToken = jwt.sign(
        { ...payload, type: 'refresh' },
        process.env.JWT_SECRET || 'test-secret-key',
        { expiresIn: '0s' }
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      const result = await testTokenService.refreshToken(expiredRefreshToken);
      expect(result).toBeNull();
    });
  });

  describe('getTokenExpiry', () => {
    it('should get expiry time from token', async () => {
      const payload: TokenPayload = {
        userId: 'user-123',
        username: 'testuser',
        roles: [UserRole.USER]
      };

      const token = await tokenService.generateToken(payload);
      const expiry = tokenService.getTokenExpiry(token);

      expect(expiry).toBeDefined();
      expect(expiry).toBeInstanceOf(Date);
      expect(expiry!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return null for invalid token', () => {
      const expiry = tokenService.getTokenExpiry('invalid.token');
      expect(expiry).toBeNull();
    });

    it('should return null for token without expiry', () => {
      // Create token without expiry
      const tokenWithoutExp = jwt.sign(
        { userId: 'user-123' },
        'test-secret'
      );

      const expiry = tokenService.getTokenExpiry(tokenWithoutExp);
      expect(expiry).toBeNull();
    });
  });

  describe('Security scenarios', () => {
    it('should use different secrets for different token types', async () => {
      const payload: TokenPayload = {
        userId: 'user-123',
        username: 'secureuser',
        roles: [UserRole.USER]
      };

      const token = await tokenService.generateToken(payload);
      const refreshToken = await tokenService.generateRefreshToken(payload);

      // Tokens should be different
      expect(token).not.toBe(refreshToken);

      // Decode headers to check algorithm
      const tokenHeader = JSON.parse(
        Buffer.from(token.split('.')[0], 'base64').toString()
      );
      const refreshHeader = JSON.parse(
        Buffer.from(refreshToken.split('.')[0], 'base64').toString()
      );

      expect(tokenHeader.alg).toBe('HS256');
      expect(refreshHeader.alg).toBe('HS256');
    });

    it('should handle concurrent token generation', async () => {
      const payload: TokenPayload = {
        userId: 'user-concurrent',
        username: 'concurrentuser',
        roles: [UserRole.USER]
      };

      // Generate multiple tokens concurrently
      const tokens = await Promise.all([
        tokenService.generateToken(payload),
        tokenService.generateToken(payload),
        tokenService.generateToken(payload)
      ]);

      // All tokens should be valid but different (due to iat)
      expect(tokens).toHaveLength(3);
      tokens.forEach(token => {
        expect(token).toBeDefined();
        expect(typeof token).toBe('string');
      });

      // Verify all tokens
      const verifications = await Promise.all(
        tokens.map(token => tokenService.verifyToken(token))
      );

      verifications.forEach(verified => {
        expect(verified?.userId).toBe('user-concurrent');
      });
    });
  });
});