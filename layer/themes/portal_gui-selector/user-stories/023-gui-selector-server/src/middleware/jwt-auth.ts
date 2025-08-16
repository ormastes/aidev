import { Request, Response, NextFunction } from 'express';
import { JWTService } from '../services/JWTService';
import { logger } from '../utils/logger';

const jwtService = new JWTService();

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        username: string;
        role: string;
      };
    }
  }
}

export function authenticateJWT(req: Request, res: Response, next: NextFunction): Response | void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  const token = authHeader.split(' ')[1]; // Bearer <token>
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const payload = jwtService.verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    logger.error('JWT authentication failed:', error);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

export function authorizeRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): Response | void => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

// Optional JWT middleware that continues even if authentication fails
export function optionalJWT(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    try {
      const payload = jwtService.verifyAccessToken(token);
      req.user = payload;
    } catch (error) {
      // Continue without authentication
      logger.warn('Optional JWT authentication failed, continuing without auth');
    }
  }
  
  next();
}