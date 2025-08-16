// Mock JWTService before importing jwt-auth
const mockJWTService = {
  verifyAccessToken: jest.fn(),
  verifyRefreshToken: jest.fn(),
  generateAccessToken: jest.fn(),
  generateRefreshToken: jest.fn(),
  getRefreshTokenExpiry: jest.fn()
};

jest.mock('../../../src/services/JWTService', () => ({
  JWTService: jest.fn(() => mockJWTService)
}));
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  }
}));

import { Request, Response, NextFunction } from 'express';
import { authenticateJWT, authorizeRole, optionalJWT } from '../../../src/middleware/jwt-auth';
import { logger } from '../../../src/utils/logger';

describe('jwt-auth middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      headers: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
  });

  describe('authenticateJWT', () => {
    it('should authenticate valid JWT token', () => {
      const mockPayload = {
        userId: 1,
        username: 'testuser',
        role: 'user'
      };
      
      mockReq.headers = { authorization: 'Bearer valid-token' };
      mockJWTService.verifyAccessToken.mockReturnValue(mockPayload);

      authenticateJWT(mockReq as Request, mockRes as Response, mockNext);

      expect(mockJWTService.verifyAccessToken).toHaveBeenCalledWith('valid-token');
      expect(mockReq.user).toEqual(mockPayload);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 401 when no authorization header', () => {
      mockReq.headers = {};

      authenticateJWT(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'No authorization header' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when no token after Bearer', () => {
      mockReq.headers = { authorization: 'Bearer ' };

      authenticateJWT(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'No token provided' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header has wrong format', () => {
      mockReq.headers = { authorization: 'InvalidFormat' };

      authenticateJWT(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'No token provided' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when token verification fails', () => {
      const error = new Error('Invalid token');
      mockReq.headers = { authorization: 'Bearer invalid-token' };
      mockJWTService.verifyAccessToken.mockImplementation(() => {
        throw error;
      });

      authenticateJWT(mockReq as Request, mockRes as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith('JWT authentication failed:', error);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle different token formats', () => {
      const tokens = ['short', 'very-long-token-with-many-characters', 'token.with.dots'];
      const mockPayload = { userId: 1, username: 'test', role: 'user' };
      
      tokens.forEach(token => {
        mockReq.headers = { authorization: `Bearer ${token}` };
        mockJWTService.verifyAccessToken.mockReturnValue(mockPayload);
        jest.clearAllMocks();

        authenticateJWT(mockReq as Request, mockRes as Response, mockNext);

        expect(mockJWTService.verifyAccessToken).toHaveBeenCalledWith(token);
        expect(mockNext).toHaveBeenCalled();
      });
    });
  });

  describe('optionalJWT', () => {
    it('should authenticate valid JWT token and set user', () => {
      const mockPayload = {
        userId: 1,
        username: 'testuser',
        role: 'user'
      };
      
      mockReq.headers = { authorization: 'Bearer valid-token' };
      mockJWTService.verifyAccessToken.mockReturnValue(mockPayload);

      optionalJWT(mockReq as Request, mockRes as Response, mockNext);

      expect(mockJWTService.verifyAccessToken).toHaveBeenCalledWith('valid-token');
      expect(mockReq.user).toEqual(mockPayload);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should continue without error when no authorization header', () => {
      mockReq.headers = {};

      optionalJWT(mockReq as Request, mockRes as Response, mockNext);

      expect(mockJWTService.verifyAccessToken).not.toHaveBeenCalled();
      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should continue without setting user when token is invalid', () => {
      const error = new Error('Invalid token');
      mockReq.headers = { authorization: 'Bearer invalid-token' };
      mockJWTService.verifyAccessToken.mockImplementation(() => {
        throw error;
      });

      optionalJWT(mockReq as Request, mockRes as Response, mockNext);

      expect(mockJWTService.verifyAccessToken).toHaveBeenCalledWith('invalid-token');
      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith('Optional JWT authentication failed, continuing without auth');
    });

    it('should continue when authorization header has wrong format', () => {
      mockReq.headers = { authorization: 'InvalidFormat' };

      optionalJWT(mockReq as Request, mockRes as Response, mockNext);

      expect(mockJWTService.verifyAccessToken).not.toHaveBeenCalled();
      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should continue when no token after Bearer', () => {
      mockReq.headers = { authorization: 'Bearer ' };
      const error = new Error('Token verification failed');
      mockJWTService.verifyAccessToken.mockImplementation(() => {
        throw error;
      });

      optionalJWT(mockReq as Request, mockRes as Response, mockNext);

      expect(mockJWTService.verifyAccessToken).toHaveBeenCalledWith('');
      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith('Optional JWT authentication failed, continuing without auth');
    });

    it('should handle malformed authorization headers gracefully', () => {
      const malformedHeaders = [
        'Bearer',
        'Bearer  ',
        'Token abc123',
        'Basic dXNlcjpwYXNz',
        ''
      ];

      malformedHeaders.forEach(header => {
        mockReq.headers = { authorization: header };
        jest.clearAllMocks();

        optionalJWT(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockReq.user).toBeUndefined();
        expect(mockRes.status).not.toHaveBeenCalled();
      });
    });

    it('should preserve existing req.user if already set', () => {
      const existingUser = { userId: 999, username: 'existing', role: 'admin' };
      mockReq.user = existingUser;
      mockReq.headers = {};

      optionalJWT(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual(existingUser);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('authorizeRole', () => {
    it('should authorize user with correct role', () => {
      mockReq.user = { userId: 1, username: 'testuser', role: 'admin' };
      
      const middleware = authorizeRole('admin', 'superadmin');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', () => {
      mockReq.user = undefined;
      
      const middleware = authorizeRole('admin');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Not authenticated' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when user has insufficient permissions', () => {
      mockReq.user = { userId: 1, username: 'testuser', role: 'user' };
      
      const middleware = authorizeRole('admin', 'superadmin');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle single role authorization', () => {
      mockReq.user = { userId: 1, username: 'testuser', role: 'editor' };
      
      const middleware = authorizeRole('editor');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle multiple role authorization', () => {
      mockReq.user = { userId: 1, username: 'testuser', role: 'moderator' };
      
      const middleware = authorizeRole('user', 'editor', 'moderator', 'admin');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should be case sensitive for roles', () => {
      mockReq.user = { userId: 1, username: 'testuser', role: 'Admin' };
      
      const middleware = authorizeRole('admin');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle empty roles array', () => {
      mockReq.user = { userId: 1, username: 'testuser', role: 'user' };
      
      const middleware = authorizeRole();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
    });
  });
});