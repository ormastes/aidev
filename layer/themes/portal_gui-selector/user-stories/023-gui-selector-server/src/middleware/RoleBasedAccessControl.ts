/**
 * Role-Based Access Control Middleware
 * Enforces role-based permissions for GUI Selector portal
 */

import { Request, Response, NextFunction } from 'express';
import { UserManagementService, UserRole } from '../services/UserManagementService';
import { JWTService } from '../services/JWTService';
import { ExternalLogService } from '../services/ExternalLogService';

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        username: string;
        roles: UserRole[];
      };
      session?: {
        userId?: string;
        roles?: UserRole[];
      };
    }
  }
}

export interface PermissionRule {
  resource: string;
  actions: string[];
  roles: UserRole[];
  condition?: (req: Request) => boolean;
}

export interface RBACConfig {
  defaultRole?: UserRole;
  requireAuth?: boolean;
  permissionDeniedMessage?: string;
  logAccess?: boolean;
}

export class RoleBasedAccessControl {
  private userService: UserManagementService;
  private jwtService: JWTService;
  private logger: ExternalLogService;
  private permissionRules: Map<string, PermissionRule[]>;
  private config: RBACConfig;

  constructor(config?: RBACConfig) {
    this.userService = new UserManagementService();
    this.jwtService = new JWTService();
    this.logger = new ExternalLogService();
    this.permissionRules = new Map();
    this.config = {
      defaultRole: UserRole.GUEST,
      requireAuth: true,
      permissionDeniedMessage: 'Access denied: Insufficient permissions',
      logAccess: true,
      ...config
    };
    
    this.initializeDefaultRules();
  }

  /**
   * Initialize default permission rules
   */
  private initializeDefaultRules(): void {
    // Admin routes
    this.addRule({
      resource: '/api/admin/*',
      actions: ['*'],
      roles: [UserRole.ADMIN]
    });

    // User management routes
    this.addRule({
      resource: '/api/users',
      actions: ['GET'],
      roles: [UserRole.ADMIN, UserRole.DESIGNER]
    });

    this.addRule({
      resource: '/api/users/:id',
      actions: ['PUT', 'DELETE'],
      roles: [UserRole.ADMIN]
    });

    this.addRule({
      resource: '/api/users/:id',
      actions: ['GET'],
      roles: [UserRole.ADMIN, UserRole.DESIGNER, UserRole.VIEWER],
      condition: (req) => {
        // Users can view their own profile
        return req.user?.userId === req.params.id;
      }
    });

    // GUI selection routes
    this.addRule({
      resource: '/api/selections',
      actions: ['GET'],
      roles: [UserRole.ADMIN, UserRole.DESIGNER, UserRole.VIEWER]
    });

    this.addRule({
      resource: '/api/selections',
      actions: ['POST', 'PUT', 'DELETE'],
      roles: [UserRole.ADMIN, UserRole.DESIGNER]
    });

    // Design candidate routes
    this.addRule({
      resource: '/api/candidates',
      actions: ['GET'],
      roles: [UserRole.ADMIN, UserRole.DESIGNER, UserRole.VIEWER]
    });

    this.addRule({
      resource: '/api/candidates',
      actions: ['POST', 'PUT'],
      roles: [UserRole.ADMIN, UserRole.DESIGNER]
    });

    this.addRule({
      resource: '/api/candidates/:id',
      actions: ['DELETE'],
      roles: [UserRole.ADMIN]
    });

    // Public routes (accessible to all including guests)
    this.addRule({
      resource: '/api/public/*',
      actions: ['GET'],
      roles: [UserRole.ADMIN, UserRole.DESIGNER, UserRole.VIEWER, UserRole.GUEST]
    });

    // Health check routes
    this.addRule({
      resource: '/api/health',
      actions: ['GET'],
      roles: [UserRole.ADMIN, UserRole.DESIGNER, UserRole.VIEWER, UserRole.GUEST]
    });
  }

  /**
   * Add a permission rule
   */
  addRule(rule: PermissionRule): void {
    const key = `${rule.resource}:${rule.actions.join(',')}`;
    if (!this.permissionRules.has(key)) {
      this.permissionRules.set(key, []);
    }
    this.permissionRules.get(key)!.push(rule);
  }

  /**
   * Main authentication middleware
   */
  authenticate() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Extract token from header or session
        const token = this.extractToken(req);
        
        if (token) {
          // Verify JWT token
          const decoded = this.jwtService.verifyToken(token);
          if (decoded) {
            req.user = {
              userId: decoded.userId,
              username: decoded.username,
              roles: decoded.roles || [this.config.defaultRole!]
            };
            
            // Update session if exists
            if (req.session) {
              req.session.userId = decoded.userId;
              req.session.roles = decoded.roles;
            }
          }
        } else if (req.session?.userId) {
          // Fallback to session-based auth
          const user = await this.userService.getUserById(req.session.userId);
          if (user) {
            req.user = {
              userId: user.id,
              username: user.username,
              roles: user.roles
            };
          }
        }

        // If no auth and auth is required, return 401
        if (!req.user && this.config.requireAuth) {
          return res.status(401).json({
            error: 'Authentication required'
          });
        }

        // Set default guest role if no user
        if (!req.user) {
          req.user = {
            userId: 'guest',
            username: 'guest',
            roles: [this.config.defaultRole!]
          };
        }

        next();
      } catch (error: any) {
        this.logger.error(`Authentication error: ${error.message}`);
        return res.status(401).json({
          error: 'Invalid authentication'
        });
      }
    };
  }

  /**
   * Authorization middleware for specific roles
   */
  authorize(...allowedRoles: UserRole[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required'
        });
      }

      const hasRole = req.user.roles.some(role => allowedRoles.includes(role));
      
      if (!hasRole) {
        if (this.config.logAccess) {
          this.logger.warn(
            `Access denied for user ${req.user.username} to ${req.path}. Required roles: ${allowedRoles.join(', ')}`
          );
        }
        
        return res.status(403).json({
          error: this.config.permissionDeniedMessage
        });
      }

      if (this.config.logAccess) {
        this.logger.info(
          `Access granted for user ${req.user.username} to ${req.path}`
        );
      }

      next();
    };
  }

  /**
   * Check specific permission
   */
  hasPermission(resource: string, action: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required'
        });
      }

      // Check if user has permission for this resource and action
      const allowed = this.checkPermission(req, resource, action);
      
      if (!allowed) {
        if (this.config.logAccess) {
          this.logger.warn(
            `Permission denied for user ${req.user.username}: ${action} on ${resource}`
          );
        }
        
        return res.status(403).json({
          error: this.config.permissionDeniedMessage
        });
      }

      if (this.config.logAccess) {
        this.logger.info(
          `Permission granted for user ${req.user.username}: ${action} on ${resource}`
        );
      }

      next();
    };
  }

  /**
   * Check if user can perform action on resource
   */
  canAccess(req: Request, resource: string, action: string): boolean {
    if (!req.user) return false;
    return this.checkPermission(req, resource, action);
  }

  /**
   * Middleware to require specific role for route
   */
  requireRole(role: UserRole) {
    return this.authorize(role);
  }

  /**
   * Middleware to require any of the specified roles
   */
  requireAnyRole(...roles: UserRole[]) {
    return this.authorize(...roles);
  }

  /**
   * Middleware to require all of the specified roles
   */
  requireAllRoles(...roles: UserRole[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required'
        });
      }

      const hasAllRoles = roles.every(role => req.user!.roles.includes(role));
      
      if (!hasAllRoles) {
        return res.status(403).json({
          error: this.config.permissionDeniedMessage
        });
      }

      next();
    };
  }

  /**
   * Check if user is admin
   */
  isAdmin() {
    return this.requireRole(UserRole.ADMIN);
  }

  /**
   * Check if user is designer or admin
   */
  isDesigner() {
    return this.requireAnyRole(UserRole.ADMIN, UserRole.DESIGNER);
  }

  /**
   * Check if user can view (viewer, designer, or admin)
   */
  canView() {
    return this.requireAnyRole(UserRole.ADMIN, UserRole.DESIGNER, UserRole.VIEWER);
  }

  /**
   * Check if user can edit (designer or admin)
   */
  canEdit() {
    return this.requireAnyRole(UserRole.ADMIN, UserRole.DESIGNER);
  }

  /**
   * Check if user can delete (admin only)
   */
  canDelete() {
    return this.requireRole(UserRole.ADMIN);
  }

  /**
   * Owner-only access middleware
   */
  ownerOnly(userIdParam: string = 'id') {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required'
        });
      }

      const resourceUserId = req.params[userIdParam] || req.body.userId;
      const isOwner = req.user.userId === resourceUserId;
      const isAdmin = req.user.roles.includes(UserRole.ADMIN);

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          error: 'Access denied: You can only access your own resources'
        });
      }

      next();
    };
  }

  /**
   * Rate limit by role
   */
  getRateLimitByRole(role: UserRole): number {
    const limits: Record<UserRole, number> = {
      [UserRole.ADMIN]: 1000,
      [UserRole.DESIGNER]: 500,
      [UserRole.VIEWER]: 200,
      [UserRole.GUEST]: 50
    };
    return limits[role] || 50;
  }

  /**
   * Get user permissions
   */
  getUserPermissions(user: { roles: UserRole[] }): string[] {
    const permissions: Set<string> = new Set();

    for (const [key, rules] of this.permissionRules.entries()) {
      for (const rule of rules) {
        if (user.roles.some(role => rule.roles.includes(role))) {
          permissions.add(key);
        }
      }
    }

    return Array.from(permissions);
  }

  /**
   * Helper: Extract token from request
   */
  private extractToken(req: Request): string | null {
    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check cookie
    if (req.cookies && req.cookies.token) {
      return req.cookies.token;
    }

    // Check query parameter (for WebSocket connections)
    if (req.query.token) {
      return req.query.token as string;
    }

    return null;
  }

  /**
   * Helper: Check if user has permission
   */
  private checkPermission(req: Request, resource: string, action: string): boolean {
    if (!req.user) return false;

    // Admin has all permissions
    if (req.user.roles.includes(UserRole.ADMIN)) {
      return true;
    }

    // Find matching rules
    const matchingRules = this.findMatchingRules(resource, action);

    for (const rule of matchingRules) {
      // Check if user has required role
      const hasRole = req.user.roles.some(role => rule.roles.includes(role));
      
      if (hasRole) {
        // Check additional condition if exists
        if (rule.condition) {
          if (rule.condition(req)) {
            return true;
          }
        } else {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Helper: Find matching permission rules
   */
  private findMatchingRules(resource: string, action: string): PermissionRule[] {
    const matches: PermissionRule[] = [];

    for (const [, rules] of this.permissionRules.entries()) {
      for (const rule of rules) {
        // Check if resource matches (support wildcards)
        const resourcePattern = rule.resource.replace(/\*/g, '.*');
        const resourceRegex = new RegExp(`^${resourcePattern}$`);
        
        if (resourceRegex.test(resource)) {
          // Check if action is allowed
          if (rule.actions.includes('*') || rule.actions.includes(action)) {
            matches.push(rule);
          }
        }
      }
    }

    return matches;
  }

  /**
   * Audit log middleware
   */
  auditLog() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (this.config.logAccess) {
        const user = req.user?.username || "anonymous";
        const method = req.method;
        const path = req.path;
        const ip = req.ip;

        this.logger.info(`Audit: ${user} ${method} ${path} from ${ip}`);

        // Log response status on finish
        res.on('finish', () => {
          const status = res.statusCode;
          const level = status >= 400 ? 'warn' : 'info';
          (this.logger as any)[level](
            `Audit Result: ${user} ${method} ${path} - Status: ${status}`
          );
        });
      }
      next();
    };
  }
}

// Export singleton instance for easy use
export const rbac = new RoleBasedAccessControl();

// Export middleware functions
export const authenticate = rbac.authenticate.bind(rbac);
export const authorize = rbac.authorize.bind(rbac);
export const isAdmin = rbac.isAdmin.bind(rbac);
export const isDesigner = rbac.isDesigner.bind(rbac);
export const canView = rbac.canView.bind(rbac);
export const canEdit = rbac.canEdit.bind(rbac);
export const canDelete = rbac.canDelete.bind(rbac);
export const ownerOnly = rbac.ownerOnly.bind(rbac);
export const auditLog = rbac.auditLog.bind(rbac);