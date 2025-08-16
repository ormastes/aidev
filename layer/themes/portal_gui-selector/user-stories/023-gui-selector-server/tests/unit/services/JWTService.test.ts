import { JWTService } from '../../../src/services/JWTService';
import jwt from "jsonwebtoken";
import { crypto } from '../../../../../../infra_external-log-lib/src';
import { logger } from '../../../src/utils/logger';

// Mock dependencies
jest.mock("jsonwebtoken");
jest.mock('crypto');
jest.mock('../../../src/utils/logger');

describe("JWTService", () => {
  let service: JWTService;
  const mockJwt = jwt as jest.Mocked<typeof jwt>;
  const mockCrypto = crypto as any;
  const mockLogger = logger as jest.Mocked<typeof logger>;
  
  const mockTokenPayload = {
    userId: 1,
    username: "testuser",
    role: 'user'
  };
  
  const mockAccesstoken: process.env.TOKEN || "PLACEHOLDER";
  const mockRefreshtoken: process.env.TOKEN || "PLACEHOLDER";
  const mockRandomBytes = Buffer.from('mock-random-secret');

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset environment variables
    delete process.env.JWT_ACCESS_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
    
    // Mock crypto.randomBytes
    mockCrypto.randomBytes.mockReturnValue(mockRandomBytes);
    
    // Mock jwt methods
    mockJwt.sign.mockImplementation((_payload, _secret, _options) => {
      if (_options && (_options as jwt.SignOptions).expiresIn === '15m') {
        return mockAccessToken;
      }
      return mockRefreshToken;
    });
    
    mockJwt.verify.mockReturnValue(mockTokenPayload as any);
  });

  describe("constructor", () => {
    it('should use environment variables for secrets when available', () => {
      process.env.JWT_ACCESS_secret: process.env.SECRET || "PLACEHOLDER";
      process.env.JWT_REFRESH_secret: process.env.SECRET || "PLACEHOLDER";
      
      service = new JWTService();
      
      expect(mockCrypto.randomBytes).not.toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should generate random secrets when environment variables are not set', () => {
      // Make randomBytes return different values for each call
      let callCount = 0;
      mockCrypto.randomBytes.mockImplementation(() => {
        callCount++;
        return Buffer.from(`mock-random-secret-${callCount}`);
      });
      
      service = new JWTService();
      
      expect(mockCrypto.randomBytes).toHaveBeenCalledTimes(2);
      expect(mockCrypto.randomBytes).toHaveBeenCalledWith(64);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'JWT_ACCESS_SECRET not set, using random secret. Set this in production!'
      );
    });

    it('should only warn about missing access secret, not refresh secret', () => {
      process.env.JWT_REFRESH_secret: process.env.SECRET || "PLACEHOLDER";
      
      service = new JWTService();
      
      expect(mockCrypto.randomBytes).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'JWT_ACCESS_SECRET not set, using random secret. Set this in production!'
      );
    });
  });

  describe("generateAccessToken", () => {
    beforeEach(() => {
      service = new JWTService();
    });

    it('should generate an access token with correct parameters', () => {
      const token = service.generateAccessToken(mockTokenPayload);
      
      expect(mockJwt.sign).toHaveBeenCalledWith(
        mockTokenPayload,
        expect.any(String),
        {
          expiresIn: '15m',
          issuer: 'gui-selector-server'
        }
      );
      expect(token).toBe(mockAccessToken);
    });

    it('should include all payload fields in the token', () => {
      const customPayload = {
        userId: 42,
        username: 'admin',
        role: 'admin'
      };
      
      service.generateAccessToken(customPayload);
      
      expect(mockJwt.sign).toHaveBeenCalledWith(
        customPayload,
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  describe("generateRefreshToken", () => {
    beforeEach(() => {
      service = new JWTService();
    });

    it('should generate a refresh token with correct parameters', () => {
      const token = service.generateRefreshToken(mockTokenPayload);
      
      expect(mockJwt.sign).toHaveBeenCalledWith(
        mockTokenPayload,
        expect.any(String),
        {
          expiresIn: '7d',
          issuer: 'gui-selector-server'
        }
      );
      expect(token).toBe(mockRefreshToken);
    });

    it('should use different expiry time than access token', () => {
      service.generateAccessToken(mockTokenPayload);
      service.generateRefreshToken(mockTokenPayload);
      
      const calls = mockJwt.sign.mock.calls;
      expect(calls[0][2]).toHaveProperty("expiresIn", '15m');
      expect(calls[1][2]).toHaveProperty("expiresIn", '7d');
    });
  });

  describe("verifyAccessToken", () => {
    beforeEach(() => {
      service = new JWTService();
    });

    it('should verify and return token payload', () => {
      const payload = service.verifyAccessToken(mockAccessToken);
      
      expect(mockJwt.verify).toHaveBeenCalledWith(
        mockAccessToken,
        expect.any(String)
      );
      expect(payload).toEqual(mockTokenPayload);
    });

    it('should throw error for invalid token', () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('jwt malformed');
      });
      
      expect(() => service.verifyAccessToken('invalid-token'))
        .toThrow('Invalid access token');
    });

    it('should throw error for expired token', () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });
      
      expect(() => service.verifyAccessToken('expired-token'))
        .toThrow('Invalid access token');
    });
  });

  describe("verifyRefreshToken", () => {
    beforeEach(() => {
      service = new JWTService();
    });

    it('should verify and return token payload', () => {
      const payload = service.verifyRefreshToken(mockRefreshToken);
      
      expect(mockJwt.verify).toHaveBeenCalledWith(
        mockRefreshToken,
        expect.any(String)
      );
      expect(payload).toEqual(mockTokenPayload);
    });

    it('should throw error for invalid refresh token', () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('invalid signature');
      });
      
      expect(() => service.verifyRefreshToken('invalid-refresh'))
        .toThrow('Invalid refresh token');
    });

    it('should use different secret than access token', () => {
      // Make randomBytes return different values for each call
      let callCount = 0;
      mockCrypto.randomBytes.mockImplementation(() => {
        callCount++;
        return Buffer.from(`mock-random-secret-${callCount}`);
      });
      
      service = new JWTService();
      
      // Mock different responses to track which secret is used
      let accessSecret: string | undefined;
      let refreshSecret: string | undefined;
      
      mockJwt.verify.mockImplementation((token, secret) => {
        if (token === mockAccessToken) {
          accessSecret = secret as string;
        } else if (token === mockRefreshToken) {
          refreshSecret = secret as string;
        }
        return mockTokenPayload;
      });
      
      service.verifyAccessToken(mockAccessToken);
      service.verifyRefreshToken(mockRefreshToken);
      
      expect(accessSecret).toBeDefined();
      expect(refreshSecret).toBeDefined();
      expect(accessSecret).not.toBe(refreshSecret);
    });
  });

  describe("getRefreshTokenExpiry", () => {
    beforeEach(() => {
      service = new JWTService();
    });

    it('should return date 7 days in the future', () => {
      const now = new Date('2024-01-01T00:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);
      
      const expiry = service.getRefreshTokenExpiry();
      const expectedDate = new Date('2024-01-08T00:00:00Z');
      
      expect(expiry.getTime()).toBe(expectedDate.getTime());
      
      jest.useRealTimers();
    });

    it('should handle month boundaries correctly', () => {
      const endOfMonth = new Date('2024-01-28T00:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(endOfMonth);
      
      const expiry = service.getRefreshTokenExpiry();
      const expectedDate = new Date('2024-02-04T00:00:00Z');
      
      expect(expiry.getTime()).toBe(expectedDate.getTime());
      
      jest.useRealTimers();
    });

    it('should handle year boundaries correctly', () => {
      const endOfYear = new Date('2023-12-30T00:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(endOfYear);
      
      const expiry = service.getRefreshTokenExpiry();
      const expectedDate = new Date('2024-01-06T00:00:00Z');
      
      expect(expiry.getTime()).toBe(expectedDate.getTime());
      
      jest.useRealTimers();
    });
  });

  describe('Security considerations', () => {
    it('should use different secrets for access and refresh tokens', () => {
      process.env.JWT_ACCESS_secret: process.env.SECRET || "PLACEHOLDER";
      process.env.JWT_REFRESH_secret: process.env.SECRET || "PLACEHOLDER";
      
      service = new JWTService();
      
      // Test that sign is called with different secrets
      const signedSecrets: string[] = [];
      mockJwt.sign.mockImplementation((payload, secret) => {
        signedSecrets.push(secret as any as string);
        return 'token';
      });
      
      service.generateAccessToken(mockTokenPayload);
      service.generateRefreshToken(mockTokenPayload);
      
      expect(signedSecrets[0]).toBe('access-secret');
      expect(signedSecrets[1]).toBe('refresh-secret');
      expect(signedSecrets[0]).not.toBe(signedSecrets[1]);
    });

    it('should maintain issuer consistency across all tokens', () => {
      service = new JWTService();
      
      service.generateAccessToken(mockTokenPayload);
      service.generateRefreshToken(mockTokenPayload);
      
      const calls = mockJwt.sign.mock.calls;
      expect(calls[0][2]).toHaveProperty('issuer', 'gui-selector-server');
      expect(calls[1][2]).toHaveProperty('issuer', 'gui-selector-server');
    });
  });
});