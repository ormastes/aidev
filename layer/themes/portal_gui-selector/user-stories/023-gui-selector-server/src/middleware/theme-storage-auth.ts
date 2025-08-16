import { Request, Response, NextFunction } from 'express';
import { ThemeStorageService } from '../services/ThemeStorageService';

export const initThemeStorageAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const themeStorage = (req as any).themeStorage as ThemeStorageService;
    
    // Check for JWT token in Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      await themeStorage.initializeSecurityContext(authHeader.substring(7));
    } 
    // Check for session-based authentication
    else if ((req as any).session?.userId) {
      await themeStorage.initializeSecurityContext('session-' + (req as any).session.userId);
    }
    // Default to anonymous access
    else {
      await themeStorage.initializeSecurityContext('session-anonymous');
    }
    
    next();
  } catch (error) {
    // Log error but don't fail the request
    console.error('Failed to initialize theme storage auth:', error);
    next();
  }
};