/**
 * Unit tests for SecurityMiddlewareSuite
 * Following Mock Free Test Oriented Development
 */

import { SecurityMiddlewareSuite } from '../../children/SecurityMiddlewareSuite';
import { AuthService } from '../../children/AuthService';
import { SessionManager } from '../../children/SessionManager';
import { AuditLogger } from '../../children/AuditLogger';
import { UserRole } from '../../common/types/User';
import * as express from 'express';
import * as request from 'supertest';
import { path } from '../../../infra_external-log-lib/src';
import { os } from '../../../infra_external-log-lib/src';

describe('SecurityMiddlewareSuite', () => {
  let app: express.Application;
  let authService: AuthService;
  let sessionManager: SessionManager;
  let auditLogger: AuditLogger;
  let securitySuite: SecurityMiddlewareSuite;
  let testDir: string;

  beforeEach(async () => {
    // Create temp directory for testing
    testDir = path.join(os.tmpdir(), `security-test-${Date.now()}`);

    // Create real instances - Mock Free
    authService = new AuthService();
    sessionManager = new SessionManager();
    auditLogger = new AuditLogger({
      logPath: path.join(testDir, 'audit'),
      realTimeAlerts: false
    });

    securitySuite = new SecurityMiddlewareSuite({
      authService,
      sessionManager,
      auditLogger,
      publicPaths: ['/public', '/health', '/login'],
      loginPath: '/login'
    });

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Add session middleware
    const session = require('express-session');
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false
    }));
  });

  describe('requireAuth middleware', () => {
    beforeEach(() => {
      app.get('/protected', securitySuite.requireAuth(), (req, res) => {
        res.json({ message: 'Protected resource', user: (req as any).user });
      });

      app.get('/public', securitySuite.requireAuth(), (req, res) => {
        res.json({ message: 'Public resource' });
      });
    });

    it('should block unauthenticated access to protected routes', async () => {
      const response = await request(app)
        .get('/protected')
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
    });

    it('should allow access to public paths', async () => {
      const response = await request(app)
        .get('/public')
        .expect(200);

      expect(response.body.message).toBe('Public resource');
    });

    it('should allow authenticated users', async () => {
      // Create and login user
      const user = await authService.createUser({
        username: 'testuser',
        password: 'testpass'
      });

      const loginResult = await authService.login({
        username: 'testuser',
        password: 'testpass'
      });

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${loginResult.token}`)
        .expect(200);

      expect(response.body.message).toBe('Protected resource');
      expect(response.body.user.username).toBe('testuser');
    });

    it('should redirect to login path for HTML requests', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Accept', 'text/html')
        .expect(302);

      expect(response.headers.location).toBe('/login');
    });
  });

  describe('requireRole middleware', () => {
    beforeEach(() => {
      app.get('/admin', 
        securitySuite.requireAuth(),
        securitySuite.requireRole(UserRole.ADMIN),
        (req, res) => {
          res.json({ message: 'Admin resource' });
        }
      );
    });

    it('should block users without required role', async () => {
      const user = await authService.createUser({
        username: 'regularuser',
        password: 'pass',
        roles: [UserRole.USER]
      });

      const loginResult = await authService.login({
        username: 'regularuser',
        password: 'pass'
      });

      const response = await request(app)
        .get('/admin')
        .set('Authorization', `Bearer ${loginResult.token}`)
        .expect(403);

      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should allow users with required role', async () => {
      const admin = await authService.createUser({
        username: 'adminuser',
        password: 'pass',
        roles: [UserRole.ADMIN]
      });

      const loginResult = await authService.login({
        username: 'adminuser',
        password: 'pass'
      });

      const response = await request(app)
        .get('/admin')
        .set('Authorization', `Bearer ${loginResult.token}`)
        .expect(200);

      expect(response.body.message).toBe('Admin resource');
    });
  });

  describe('rateLimit middleware', () => {
    beforeEach(() => {
      const rateLimiter = securitySuite.rateLimit({
        windowMs: 1000, // 1 second
        maxRequests: 3
      });

      app.get('/rate-limited', rateLimiter, (req, res) => {
        res.json({ message: 'Success' });
      });
    });

    it('should allow requests within limit', async () => {
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .get('/rate-limited')
          .expect(200);

        expect(response.body.message).toBe('Success');
        expect(response.headers['x-ratelimit-limit']).toBe('3');
        expect(response.headers['x-ratelimit-remaining']).toBe(String(2 - i));
      }
    });

    it('should block requests exceeding limit', async () => {
      // Make 3 successful requests
      for (let i = 0; i < 3; i++) {
        await request(app).get('/rate-limited').expect(200);
      }

      // 4th request should be blocked
      const response = await request(app)
        .get('/rate-limited')
        .expect(429);

      expect(response.body.error).toBe('Too many requests');
      expect(response.headers['x-ratelimit-remaining']).toBe('0');
    });

    it('should reset after window expires', async () => {
      // Exhaust rate limit
      for (let i = 0; i < 4; i++) {
        await request(app).get('/rate-limited');
      }

      // Wait for window to reset
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should be able to make requests again
      const response = await request(app)
        .get('/rate-limited')
        .expect(200);

      expect(response.body.message).toBe('Success');
    });
  });

  describe('cors middleware', () => {
    beforeEach(() => {
      const cors = securitySuite.cors({
        origins: ['http://localhost:3000', 'http://example.com'],
        credentials: true
      });

      app.use(cors);
      app.get('/api/data', (req, res) => {
        res.json({ data: 'test' });
      });
    });

    it('should add CORS headers for allowed origins', async () => {
      const response = await request(app)
        .get('/api/data')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should not add CORS headers for disallowed origins', async () => {
      const response = await request(app)
        .get('/api/data')
        .set('Origin', 'http://evil.com')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should handle preflight requests', async () => {
      const response = await request(app)
        .options('/api/data')
        .set('Origin', 'http://localhost:3000')
        .expect(204);

      expect(response.headers['access-control-allow-methods']).toContain('GET');
      expect(response.headers['access-control-allow-methods']).toContain('POST');
    });
  });

  describe('csrfProtection middleware', () => {
    beforeEach(() => {
      app.use(securitySuite.csrfProtection());
      
      app.get('/form', (req, res) => {
        res.json({ csrfToken: res.locals.csrfToken });
      });

      app.post('/submit', (req, res) => {
        res.json({ message: 'Form submitted' });
      });
    });

    it('should generate CSRF token on GET request', async () => {
      const response = await request(app)
        .get('/form')
        .expect(200);

      expect(response.body.csrfToken).toBeDefined();
      expect(response.body.csrfToken).toHaveLength(64);
    });

    it('should block POST without CSRF token', async () => {
      const response = await request(app)
        .post('/submit')
        .send({ data: 'test' })
        .expect(403);

      expect(response.body.error).toBe('Invalid CSRF token');
    });

    it('should allow POST with valid CSRF token', async () => {
      // Get CSRF token
      const agent = request.agent(app);
      const tokenResponse = await agent
        .get('/form')
        .expect(200);

      const csrfToken = tokenResponse.body.csrfToken;

      // Submit with token
      const submitResponse = await agent
        .post('/submit')
        .set('X-CSRF-Token', csrfToken)
        .send({ data: 'test' })
        .expect(200);

      expect(submitResponse.body.message).toBe('Form submitted');
    });
  });

  describe('xssProtection middleware', () => {
    beforeEach(() => {
      app.use(securitySuite.xssProtection());
      
      app.post('/data', (req, res) => {
        res.json({ received: req.body });
      });
    });

    it('should sanitize XSS attempts in request body', async () => {
      const response = await request(app)
        .post('/data')
        .send({
          name: 'Test',
          script: '<script>alert("XSS")</script>',
          safe: 'Normal text'
        })
        .expect(200);

      expect(response.body.received.script).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
      expect(response.body.received.safe).toBe('Normal text');
    });

    it('should add XSS protection headers', async () => {
      const response = await request(app)
        .post('/data')
        .send({ test: 'data' })
        .expect(200);

      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });
  });

  describe('sqlInjectionProtection middleware', () => {
    beforeEach(() => {
      app.use(securitySuite.sqlInjectionProtection());
      
      app.get('/search', (req, res) => {
        res.json({ query: req.query.q });
      });
    });

    it('should block SQL injection attempts', async () => {
      const response = await request(app)
        .get('/search')
        .query({ q: "'; DROP TABLE users; --" })
        .expect(400);

      expect(response.body.error).toBe('Invalid request');
      expect(response.body.message).toContain('malicious content');
    });

    it('should allow normal queries', async () => {
      const response = await request(app)
        .get('/search')
        .query({ q: 'normal search term' })
        .expect(200);

      expect(response.body.query).toBe('normal search term');
    });

    it('should detect UNION attacks', async () => {
      const response = await request(app)
        .get('/search')
        .query({ q: '1 UNION SELECT * FROM passwords' })
        .expect(400);

      expect(response.body.error).toBe('Invalid request');
    });
  });

  describe('auditLog middleware', () => {
    beforeEach(() => {
      app.use(securitySuite.auditLog());
      
      app.get('/test', (req, res) => {
        res.json({ message: 'Test' });
      });

      app.post('/login', (req, res) => {
        if (req.body.username === 'valid') {
          res.json({ success: true });
        } else {
          res.status(401).json({ error: 'Invalid credentials' });
        }
      });
    });

    it('should log successful requests', async () => {
      await request(app)
        .get('/test')
        .expect(200);

      // Give audit logger time to write
      await new Promise(resolve => setTimeout(resolve, 100));

      const logs = await auditLogger.getLogs({ limit: 1 });
      expect(logs[0].action).toBe('HTTP_REQUEST');
      expect(logs[0].details.method).toBe('GET');
      expect(logs[0].details.statusCode).toBe(200);
    });

    it('should log authentication failures', async () => {
      await request(app)
        .post('/login')
        .send({ username: 'invalid', password: 'wrong' })
        .expect(401);

      await new Promise(resolve => setTimeout(resolve, 100));

      const logs = await auditLogger.getLogs({ 
        action: 'AUTHENTICATION_FAILED',
        limit: 1 
      });
      
      expect(logs).toHaveLength(1);
      expect(logs[0].severity).toBe('MEDIUM');
    });

    it('should sanitize sensitive data in logs', async () => {
      await request(app)
        .post('/login')
        .send({ 
          username: 'test',
          password: 'secret123',
          apiKey: 'key-12345'
        })
        .expect(401);

      await new Promise(resolve => setTimeout(resolve, 100));

      const logs = await auditLogger.getLogs({ limit: 1 });
      expect(logs[0].details.body.password).toBe('[REDACTED]');
      expect(logs[0].details.body.apiKey).toBe('[REDACTED]');
      expect(logs[0].details.body.username).toBe('test');
    });
  });

  describe('getAllMiddleware integration', () => {
    it('should return all configured middleware', () => {
      const middleware = securitySuite.getAllMiddleware();
      
      expect(Array.isArray(middleware)).toBe(true);
      expect(middleware.length).toBeGreaterThan(0);
      
      // Each middleware should be a function
      middleware.forEach(mw => {
        expect(typeof mw).toBe('function');
      });
    });

    it('should apply all middleware to Express app', async () => {
      const testApp = express();
      testApp.use(express.json());
      
      // Apply all security middleware
      const middleware = securitySuite.getAllMiddleware();
      middleware.forEach(mw => testApp.use(mw));
      
      testApp.get('/secure', (req, res) => {
        res.json({ secure: true });
      });

      const response = await request(testApp)
        .get('/secure')
        .expect(200);

      // Check that security headers are present
      expect(response.headers['x-content-type-options']).toBeDefined();
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
    });
  });
});