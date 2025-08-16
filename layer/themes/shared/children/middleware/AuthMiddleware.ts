import { Request, Response, NextFunction } from 'express';
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
  };
}

export class AuthMiddleware {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'aidev-secret-key';
  
  static authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }
    
    try {
      const decoded = jwt.verify(token, AuthMiddleware.JWT_SECRET) as any;
      req.user = {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role
      };
      next();
    } catch (error) {
      res.status(403).json({ error: 'Invalid token' });
    }
  }
  
  static authorize(roles: string[]) {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      
      if (!roles.includes(req.user.role)) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }
      
      next();
    };
  }
  
  static generateToken(user: { id: string; username: string; role: string }): string {
    return jwt.sign(user, AuthMiddleware.JWT_SECRET, { expiresIn: '24h' });
  }
}