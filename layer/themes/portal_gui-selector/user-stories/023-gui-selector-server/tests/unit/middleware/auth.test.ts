import '../../types/express-session';
import { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../../src/middleware/auth';

describe('auth middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    mockReq = {
      session: {
        // Mock session properties
        id: 'test-session-id',
        cookie: {} as any,
        regenerate: jest.fn(),
        destroy: jest.fn(),
        reload: jest.fn(),
        save: jest.fn(),
        touch: jest.fn()
      } as any
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
  });

  describe("requireAuth", () => {
    it('should call next() when userId is in session', () => {
      if (mockReq.session) {
        (mockReq.session as any).userId = 123;
      }

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should return 401 when userId is not in session', () => {
      // Session exists but no userId
      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when session is undefined', () => {
      mockReq.session = undefined;

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle different user IDs', () => {
      const userIds = [1, 999, 42];

      userIds.forEach(userId => {
        if (mockReq.session) {
          (mockReq.session as any).userId = userId;
        }
        jest.clearAllMocks();

        requireAuth(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });
    });

    it('should not call next when userId is null', () => {
      if (mockReq.session) {
        (mockReq.session as any).userId = null;
      }

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should not call next when userId is 0', () => {
      if (mockReq.session) {
        (mockReq.session as any).userId = 0;
      }

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});