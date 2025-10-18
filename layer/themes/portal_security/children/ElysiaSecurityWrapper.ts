/**
 * Elysia Security Wrapper
 * Provides authentication and security middleware for Elysia apps
 */

import { Elysia, Context } from 'elysia';
import { SessionManager } from './SessionManager';
import { AuthService } from './AuthService';
import { TokenService } from './TokenService';
import { User } from './User';

export interface ElysiaSecurityConfig {
  requireAuth?: boolean;
  publicPaths?: string[];
  sessionSecret?: string;
  tokenSecret?: string;
  loginPath?: string;
  secureCookies?: boolean;
}

export class ElysiaSecurityWrapper {
  private sessionManager: SessionManager;
  private authService: AuthService;
  private tokenService: TokenService;
  private config: Required<ElysiaSecurityConfig>;

  constructor(config: ElysiaSecurityConfig = {}) {
    this.config = {
      requireAuth: config.requireAuth ?? true,
      publicPaths: config.publicPaths ?? ['/login', '/health', '/api/auth/login'],
      sessionSecret: config.sessionSecret ?? process.env.SESSION_SECRET ?? 'default-session-secret',
      tokenSecret: config.tokenSecret ?? process.env.TOKEN_SECRET ?? 'default-token-secret',
      loginPath: config.loginPath ?? '/login',
      secureCookies: config.secureCookies ?? process.env.NODE_ENV === 'production'
    };

    this.sessionManager = new SessionManager();
    this.tokenService = new TokenService({ secret: this.config.tokenSecret });
    this.authService = new AuthService(this.sessionManager, this.tokenService);
  }

  /**
   * Apply security middleware to Elysia app
   */
  apply(app: Elysia): Elysia {
    return app
      .derive(async ({ request, set, cookie }) => {
        const path = new URL(request.url).pathname;

        // Skip authentication for public paths
        if (this.isPublicPath(path)) {
          return { user: null };
        }

        // Check for session cookie
        const sessionId = cookie.sessionId?.value;
        let user: User | null = null;

        if (sessionId) {
          const session = this.sessionManager.getSession(sessionId);
          if (session?.userId) {
            user = {
              id: session.userId,
              username: session.username || 'unknown',
              email: session.email,
              roles: session.roles || []
            };
          }
        }

        // If authentication is required and user not found, deny access
        if (this.config.requireAuth && !user) {
          set.status = 401;
          set.redirect = this.config.loginPath;
          throw new Error('Authentication required');
        }

        return { user };
      })
      .onError(({ code, error, set }) => {
        if (error.message === 'Authentication required') {
          set.status = 401;
          return {
            error: 'Unauthorized',
            message: 'Please login to access this resource'
          };
        }

        return {
          error: code,
          message: error.message
        };
      });
  }

  /**
   * Check if path is public (doesn't require authentication)
   */
  private isPublicPath(path: string): boolean {
    return this.config.publicPaths.some(publicPath => {
      if (publicPath.endsWith('*')) {
        const prefix = publicPath.slice(0, -1);
        return path.startsWith(prefix);
      }
      return path === publicPath;
    });
  }

  /**
   * Login handler for Elysia
   */
  async login(username: string, password: string): Promise<{ user: User; sessionId: string } | null> {
    const user = await this.authService.authenticate(username, password);
    if (!user) {
      return null;
    }

    const sessionId = this.sessionManager.createSession({
      userId: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles
    });

    return { user, sessionId };
  }

  /**
   * Logout handler
   */
  logout(sessionId: string): void {
    this.sessionManager.destroySession(sessionId);
  }

  /**
   * Get current user from session
   */
  async getCurrentUser(sessionId: string): Promise<User | null> {
    const session = this.sessionManager.getSession(sessionId);
    if (!session?.userId) {
      return null;
    }

    return {
      id: session.userId,
      username: session.username || 'unknown',
      email: session.email,
      roles: session.roles || []
    };
  }
}

/**
 * Convenience function to setup security on Elysia app
 */
export function setupElysiaSecurity(app: Elysia, config?: ElysiaSecurityConfig): ElysiaSecurityWrapper {
  const wrapper = new ElysiaSecurityWrapper(config);
  wrapper.apply(app);
  return wrapper;
}
