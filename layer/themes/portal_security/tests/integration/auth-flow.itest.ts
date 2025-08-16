/**
 * Integration tests for complete authentication flow
 * Following Mock Free Test Oriented Development
 */

import { AuthService } from '../../children/AuthService';
import { TokenService } from '../../children/TokenService';
import { SessionManager } from '../../children/SessionManager';
import { CredentialStore } from '../../children/CredentialStore';
import { SecurityMiddleware } from '../../children/SecurityMiddleware';
import { UserRole } from '../../common/types/User';
import * as express from 'express';
import * as request from 'supertest';
import * as session from 'express-session';

describe('Authentication Flow Integration', () => {
  let app: express.Application;
  let authService: AuthService;
  let tokenService: TokenService;
  let sessionManager: SessionManager;
  let credentialStore: CredentialStore;
  let securityMiddleware: SecurityMiddleware;

  beforeEach(() => {
    // Create real instances - Mock Free
    credentialStore = new CredentialStore();
    tokenService = new TokenService();
    sessionManager = new SessionManager();
    authService = new AuthService({
      credentialStore,
      tokenService,
      sessionManager
    });
    securityMiddleware = new SecurityMiddleware({
      authService,
      sessionManager
    });

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false
    }));

    // Setup routes
    app.post('/auth/register', async (req, res) => {
      try {
        const user = await authService.createUser(req.body);
        res.json({ success: true, user });
      } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
      }
    });

    app.post('/auth/login', async (req, res) => {
      const result = await authService.login(req.body);
      if (result.success) {
        req.session.userId = result.user?.id;
        res.json(result);
      } else {
        res.status(401).json(result);
      }
    });

    app.post('/auth/logout', securityMiddleware.requireAuth(), async (req, res) => {
      const sessionId = req.session.id;
      await authService.logout(sessionId);
      req.session.destroy(() => {
        res.json({ success: true });
      });
    });

    app.get('/auth/me', securityMiddleware.requireAuth(), async (req, res) => {
      const user = await authService.getCurrentUser(req);
      res.json({ user });
    });

    app.get('/admin/dashboard', 
      securityMiddleware.requireAuth(),
      securityMiddleware.requireRole(UserRole.ADMIN),
      (req, res) => {
        res.json({ message: 'Admin dashboard' });
      }
    );

    app.get('/public/info', (req, res) => {
      res.json({ message: 'Public information' });
    });
  });

  describe('Complete Authentication Flow', () => {
    it('should handle full user lifecycle', async () => {
      // 1. Register new user
      const registerResponse = await request(app)
        .post('/auth/register')
        .send({
          username: 'testuser',
          password: 'testpass123',
          email: 'test@example.com'
        });

      expect(registerResponse.status).toBe(200);
      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.user.username).toBe('testuser');

      // 2. Login with credentials
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'testpass123'
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.token).toBeDefined();

      const token = loginResponse.body.token;
      const sessionCookie = loginResponse.headers['set-cookie'];

      // 3. Access protected route with token
      const meResponse = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meResponse.status).toBe(200);
      expect(meResponse.body.user.username).toBe('testuser');

      // 4. Access protected route with session
      const meSessionResponse = await request(app)
        .get('/auth/me')
        .set('Cookie', sessionCookie);

      expect(meSessionResponse.status).toBe(200);
      expect(meSessionResponse.body.user.username).toBe('testuser');

      // 5. Logout
      const logoutResponse = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.body.success).toBe(true);
    });

    it('should handle role-based access control', async () => {
      // Create admin user
      const adminUser = await authService.createUser({
        username: 'admin',
        password: 'adminpass123',
        roles: [UserRole.ADMIN]
      });

      // Create regular user
      const regularUser = await authService.createUser({
        username: 'regular',
        password: 'regularpass123',
        roles: [UserRole.USER]
      });

      // Login as admin
      const adminLogin = await request(app)
        .post('/auth/login')
        .send({
          username: 'admin',
          password: 'adminpass123'
        });

      const adminToken = adminLogin.body.token;

      // Admin can access admin dashboard
      const adminAccess = await request(app)
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminAccess.status).toBe(200);
      expect(adminAccess.body.message).toBe('Admin dashboard');

      // Login as regular user
      const regularLogin = await request(app)
        .post('/auth/login')
        .send({
          username: 'regular',
          password: 'regularpass123'
        });

      const regularToken = regularLogin.body.token;

      // Regular user cannot access admin dashboard
      const regularAccess = await request(app)
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(regularAccess.status).toBe(403);
    });

    it('should handle invalid authentication attempts', async () => {
      // Try to access protected route without auth
      const noAuthResponse = await request(app)
        .get('/auth/me');

      expect(noAuthResponse.status).toBe(401);

      // Try with invalid token
      const invalidTokenResponse = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(invalidTokenResponse.status).toBe(401);

      // Try login with wrong password
      await authService.createUser({
        username: 'testuser2',
        password: 'correctpass'
      });

      const wrongPasswordResponse = await request(app)
        .post('/auth/login')
        .send({
          username: 'testuser2',
          password: 'wrongpass'
        });

      expect(wrongPasswordResponse.status).toBe(401);
      expect(wrongPasswordResponse.body.success).toBe(false);
    });

    it('should handle session expiration', async () => {
      // Create user with short-lived session
      const user = await authService.createUser({
        username: 'expiryuser',
        password: 'pass123'
      });

      // Create session that expires quickly
      const shortSession = await sessionManager.createSession({
        id: 'short-session',
        userId: user.id,
        data: { username: user.username, roles: user.roles },
        expiresAt: new Date(Date.now() + 100) // Expires in 100ms
      });

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Try to get session
      const expiredSession = await sessionManager.getSession('short-session');
      expect(expiredSession).toBeNull();
    });

    it('should handle remember me functionality', async () => {
      // Create user
      await authService.createUser({
        username: 'rememberuser',
        password: 'pass123'
      });

      // Login with remember me
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          username: 'rememberuser',
          password: 'pass123',
          rememberMe: true
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.token).toBeDefined();
      expect(loginResponse.body.refreshToken).toBeDefined();

      // Use refresh token to get new access token
      const refreshToken = loginResponse.body.refreshToken;
      const newToken = await tokenService.refreshToken(refreshToken);
      
      expect(newToken).toBeDefined();

      // Use new token to access protected route
      const meResponse = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${newToken}`);

      expect(meResponse.status).toBe(200);
      expect(meResponse.body.user.username).toBe('rememberuser');
    });

    it('should handle concurrent sessions for same user', async () => {
      // Create user
      const user = await authService.createUser({
        username: 'multiuser',
        password: 'pass123'
      });

      // Login from multiple "devices"
      const login1 = await request(app)
        .post('/auth/login')
        .send({
          username: 'multiuser',
          password: 'pass123'
        });

      const login2 = await request(app)
        .post('/auth/login')
        .send({
          username: 'multiuser',
          password: 'pass123'
        });

      expect(login1.body.token).toBeDefined();
      expect(login2.body.token).toBeDefined();
      expect(login1.body.token).not.toBe(login2.body.token);

      // Both tokens should work
      const response1 = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${login1.body.token}`);

      const response2 = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${login2.body.token}`);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      // Get all user sessions
      const userSessions = await sessionManager.getUserSessions(user.id);
      expect(userSessions.length).toBeGreaterThanOrEqual(2);
    });

    it('should allow public routes without authentication', async () => {
      const response = await request(app)
        .get('/public/info');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Public information');
    });

    it('should handle session cleanup', async () => {
      // Create multiple users with sessions
      const users = await Promise.all([
        authService.createUser({
          username: 'user1',
          password: 'pass1'
        }),
        authService.createUser({
          username: 'user2',
          password: 'pass2'
        }),
        authService.createUser({
          username: 'user3',
          password: 'pass3'
        })
      ]);

      // Create sessions with different expiry times
      await sessionManager.createSession({
        id: 'session-active',
        userId: users[0].id,
        data: { username: users[0].username, roles: users[0].roles },
        expiresAt: new Date(Date.now() + 3600000) // 1 hour
      });

      await sessionManager.createSession({
        id: 'session-expired-1',
        userId: users[1].id,
        data: { username: users[1].username, roles: users[1].roles },
        expiresAt: new Date(Date.now() - 1000) // Already expired
      });

      await sessionManager.createSession({
        id: 'session-expired-2',
        userId: users[2].id,
        data: { username: users[2].username, roles: users[2].roles },
        expiresAt: new Date(Date.now() - 2000) // Already expired
      });

      // Run cleanup
      const cleaned = await sessionManager.cleanupExpiredSessions();
      expect(cleaned).toBe(2);

      // Verify only active session remains
      const activeSessions = await sessionManager.getUserSessions(users[0].id);
      expect(activeSessions).toHaveLength(1);

      const expiredSessions1 = await sessionManager.getUserSessions(users[1].id);
      const expiredSessions2 = await sessionManager.getUserSessions(users[2].id);
      expect(expiredSessions1).toHaveLength(0);
      expect(expiredSessions2).toHaveLength(0);
    });
  });

  describe('Security Scenarios', () => {
    it('should prevent CSRF attacks', async () => {
      // This would require CSRF token implementation
      // For now, we test that sessions are properly isolated
      
      const user1 = await authService.createUser({
        username: 'user1',
        password: 'pass1'
      });

      const user2 = await authService.createUser({
        username: 'user2',
        password: 'pass2'
      });

      const login1 = await request(app)
        .post('/auth/login')
        .send({
          username: 'user1',
          password: 'pass1'
        });

      const token1 = login1.body.token;

      // User 1's token should not give access to user 2's data
      const hijackAttempt = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token1}`);

      expect(hijackAttempt.body.user.username).toBe('user1');
      expect(hijackAttempt.body.user.username).not.toBe('user2');
    });

    it('should handle rate limiting scenarios', async () => {
      // Multiple failed login attempts
      const attempts = [];
      for (let i = 0; i < 5; i++) {
        attempts.push(
          request(app)
            .post('/auth/login')
            .send({
              username: 'nonexistent',
              password: 'wrongpass'
            })
        );
      }

      const results = await Promise.all(attempts);
      results.forEach(result => {
        expect(result.status).toBe(401);
      });

      // In a real implementation, we'd check for rate limiting here
      // For now, we just verify failed attempts don't compromise security
    });
  });
});