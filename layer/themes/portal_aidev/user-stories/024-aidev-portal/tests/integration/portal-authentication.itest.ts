/**
 * Integration Test: Portal + Authentication
 * 
 * This test validates the integration between the AI Dev Portal and the Authentication system,
 * focusing on user authentication, token management, SSO integration, and security features.
 * 
 * Test Coverage:
 * 1. User login and token generation
 * 2. Token validation and refresh
 * 3. SSO token propagation to services
 * 4. Role-based access control
 * 5. Session management
 * 6. Logout and token cleanup
 * 7. Authentication middleware integration
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { AuthenticationManager } from '../../src/auth/authentication-manager';
import { PortalAuthMiddleware } from '../../src/portal/auth-middleware';
import { TokenStore } from '../../src/auth/token-store';
import { UserManager } from '../../src/auth/user-manager';
import { ServiceProxy } from '../../src/portal/service-proxy';
import jwt from "jsonwebtoken";

// Test configuration
const TEST_CONFIG = {
  jwtsecret: process.env.SECRET || "PLACEHOLDER",
  tokenExpiry: '1h',
  refreshTokenExpiry: '7d',
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  services: {
    storyReporter: 'http://localhost:3401',
    guiSelector: 'http://localhost:3402'
  }
};

// Test users
const TEST_USERS = {
  developer: {
    id: 'dev-001',
    username: 'developer@aidev.com',
    password: "PLACEHOLDER",
    role: "developer",
    permissions: ['app:create', 'app:read', 'service:access'],
    fullName: 'Test Developer'
  },
  admin: {
    id: 'admin-001',
    username: 'admin@aidev.com',
    password: "PLACEHOLDER",
    role: "administrator",
    permissions: ['app:*', 'service:*', 'user:*', 'system:*'],
    fullName: 'Test Administrator'
  },
  viewer: {
    id: 'viewer-001',
    username: 'viewer@aidev.com',
    password: "PLACEHOLDER",
    role: 'viewer',
    permissions: ['app:read', 'service:read'],
    fullName: 'Test Viewer'
  }
};

interface TestUser {
  id: string;
  username: string;
  password: string;
  role: string;
  permissions: string[];
  fullName: string;
}

describe('Portal + Authentication Integration Tests', () => {
  let authManager: AuthenticationManager;
  let authMiddleware: PortalAuthMiddleware;
  let tokenStore: TokenStore;
  let userManager: UserManager;
  let serviceProxy: ServiceProxy;

  beforeEach(async () => {
    // Initialize token store first
    tokenStore = new TokenStore({
      redisUrl: 'redis://localhost:6379',
      keyPrefix: 'aidev:auth:',
      defaultExpiry: TEST_CONFIG.sessionTimeout
    });

    // Initialize authentication manager
    authManager = new AuthenticationManager({
      jwtSecret: TEST_CONFIG.jwtSecret,
      tokenExpiry: TEST_CONFIG.tokenExpiry,
      refreshTokenExpiry: TEST_CONFIG.refreshTokenExpiry
    });

    // Initialize user manager
    userManager = new UserManager({
      authManager: authManager,
      tokenStore: tokenStore
    });

    // Set dependencies on auth manager
    authManager.setUserManager(userManager);
    authManager.setTokenStore(tokenStore);

    authMiddleware = new PortalAuthMiddleware({
      authManager: authManager,
      tokenStore: tokenStore,
      excludedPaths: ['/login', '/health', '/public']
    });

    serviceProxy = new ServiceProxy({
      authManager: authManager,
      services: TEST_CONFIG.services
    });

    await tokenStore.connect();

    // Setup test users
    for (const user of Object.values(TEST_USERS)) {
      await userManager.createUser(user);
    }
  });

  afterEach(async () => {
    await tokenStore.disconnect();
  });

  test('User Login: Portal authenticates users and generates tokens', async () => {
    console.log('Testing user login and token generation...');

    const user = TEST_USERS.developer;

    // Attempt login with valid credentials
    const loginResult = await authManager.login(user.username, user.password);

    expect(loginResult.success).toBe(true);
    expect(loginResult.token).toBeDefined();
    expect(loginResult.refreshToken).toBeDefined();
    expect(loginResult.user).toBeDefined();

    // Verify token contains correct user information
    const decodedToken = jwt.verify(loginResult.token!, TEST_CONFIG.jwtSecret) as any;
    expect(decodedToken.userId).toBe(user.id);
    expect(decodedToken.username).toBe(user.username);
    expect(decodedToken.role).toBe(user.role);
    expect(decodedToken.permissions).toEqual(user.permissions);

    // Verify token is stored
    const storedToken = await tokenStore.getToken(loginResult.token!);
    expect(storedToken).toBeDefined();
    expect(storedToken!.userId).toBe(user.id);
  });

  test('Token Validation: Portal validates authentication tokens', async () => {
    console.log('Testing token validation...');

    const user = TEST_USERS.developer;
    const loginResult = await authManager.login(user.username, user.password);

    // Validate token through middleware
    const mockRequest = {
      headers: {
        authorization: `Bearer ${loginResult.token}`
      }
    };

    const validationResult = await authMiddleware.validateToken(mockRequest.headers.authorization!);

    expect(validationResult.valid).toBe(true);
    expect(validationResult.user).toBeDefined();
    expect(validationResult.user!.id).toBe(user.id);
    expect(validationResult.user!.role).toBe(user.role);

    // Test invalid token
    const invalidValidation = await authMiddleware.validateToken('Bearer ${process.env.AUTH_TOKEN || "PLACEHOLDER_TOKEN"}');
    expect(invalidValidation.valid).toBe(false);
    expect(invalidValidation.error).toContain('invalid token');

    // Test missing token
    const missingValidation = await authMiddleware.validateToken('');
    expect(missingValidation.valid).toBe(false);
    expect(missingValidation.error).toContain('no token provided');
  });

  test('Token Refresh: Portal refreshes expired tokens', async () => {
    console.log('Testing token refresh...');

    const user = TEST_USERS.developer;
    const loginResult = await authManager.login(user.username, user.password);

    // Store original tokens
    const originalToken = loginResult.token!;
    const refreshToken = loginResult.refreshToken!;

    // Attempt to refresh token
    const refreshResult = await authManager.refreshToken(refreshToken);

    expect(refreshResult.success).toBe(true);
    expect(refreshResult.token).toBeDefined();
    expect(refreshResult.token).not.toBe(originalToken);

    // Verify new token is valid
    const newValidation = await authMiddleware.validateToken(`Bearer ${refreshResult.token}`);
    expect(newValidation.valid).toBe(true);
  });

  test('SSO Token Propagation: Portal propagates tokens to services', async () => {
    console.log('Testing SSO token propagation...');

    const user = TEST_USERS.developer;
    const loginResult = await authManager.login(user.username, user.password);

    // Mock service request through portal proxy
    const serviceRequest = {
      method: 'GET',
      url: '/api/tests',
      headers: {
        authorization: `Bearer ${loginResult.token}`
      }
    };

    // Test Story Reporter service call
    const storyReporterResponse = await serviceProxy.proxyRequest(
      "storyReporter",
      serviceRequest
    );

    expect(storyReporterResponse.success).toBe(true);
    expect(storyReporterResponse.headers['x-forwarded-auth']).toBe(loginResult.token);
    expect(storyReporterResponse.headers['x-user-id']).toBe(user.id);
    expect(storyReporterResponse.headers['x-user-role']).toBe(user.role);

    // Test GUI Selector service call
    const guiSelectorResponse = await serviceProxy.proxyRequest(
      "guiSelector",
      serviceRequest
    );

    expect(guiSelectorResponse.success).toBe(true);
    expect(guiSelectorResponse.headers['x-forwarded-auth']).toBe(loginResult.token);
    expect(guiSelectorResponse.headers['x-user-id']).toBe(user.id);
    expect(guiSelectorResponse.headers['x-user-role']).toBe(user.role);
  });

  test('Role-Based Access Control: Portal enforces permissions', async () => {
    console.log('Testing role-based access control...');

    // Login as different users
    const developerLogin = await authManager.login(TEST_USERS.developer.username, TEST_USERS.developer.password);
    const adminLogin = await authManager.login(TEST_USERS.admin.username, TEST_USERS.admin.password);
    const viewerLogin = await authManager.login(TEST_USERS.viewer.username, TEST_USERS.viewer.password);

    // Test developer permissions
    const developerRequest = {
      headers: { authorization: `Bearer ${developerLogin.token}` },
      user: { permissions: TEST_USERS.developer.permissions }
    };

    expect(await authMiddleware.hasPermission(developerRequest, 'app:create')).toBe(true);
    expect(await authMiddleware.hasPermission(developerRequest, 'app:read')).toBe(true);
    expect(await authMiddleware.hasPermission(developerRequest, 'user:create')).toBe(false);
    expect(await authMiddleware.hasPermission(developerRequest, 'system:admin')).toBe(false);

    // Test admin permissions (wildcard)
    const adminRequest = {
      headers: { authorization: `Bearer ${adminLogin.token}` },
      user: { permissions: TEST_USERS.admin.permissions }
    };

    expect(await authMiddleware.hasPermission(adminRequest, 'app:create')).toBe(true);
    expect(await authMiddleware.hasPermission(adminRequest, 'app:delete')).toBe(true);
    expect(await authMiddleware.hasPermission(adminRequest, 'user:create')).toBe(true);
    expect(await authMiddleware.hasPermission(adminRequest, 'system:admin')).toBe(true);

    // Test viewer permissions (read-only)
    const viewerRequest = {
      headers: { authorization: `Bearer ${viewerLogin.token}` },
      user: { permissions: TEST_USERS.viewer.permissions }
    };

    expect(await authMiddleware.hasPermission(viewerRequest, 'app:read')).toBe(true);
    expect(await authMiddleware.hasPermission(viewerRequest, 'service:read')).toBe(true);
    expect(await authMiddleware.hasPermission(viewerRequest, 'app:create')).toBe(false);
    expect(await authMiddleware.hasPermission(viewerRequest, 'app:delete')).toBe(false);
  });

  test('Session Management: Portal manages user sessions', async () => {
    console.log('Testing session management...');

    const user = TEST_USERS.developer;
    const loginResult = await authManager.login(user.username, user.password);

    // Verify session is created
    const session = await tokenStore.getSession(user.id);
    expect(session).toBeDefined();
    expect(session!.userId).toBe(user.id);
    expect(session!.loginTime).toBeDefined();

    // Update session activity
    const originalTime = session!.lastActivity.getTime();
    await tokenStore.updateSessionActivity(user.id);
    const updatedSession = await tokenStore.getSession(user.id);
    expect(updatedSession!.lastActivity.getTime()).toBeGreaterThan(originalTime);

    // Test session timeout
    await tokenStore.setSessionExpiry(user.id, 1); // 1 second
    await new Promise(resolve => setTimeout(resolve, 1100));

    // Verify session expires after timeout
    const expiredSession = await tokenStore.getSession(user.id);
    expect(expiredSession).toBeNull();
  });

  test('Logout: Portal cleans up authentication state', async () => {
    console.log('Testing logout and cleanup...');

    const user = TEST_USERS.developer;
    const loginResult = await authManager.login(user.username, user.password);

    // Verify initial authentication state
    const initialValidation = await authMiddleware.validateToken(`Bearer ${loginResult.token}`);
    expect(initialValidation.valid).toBe(true);

    const initialSession = await tokenStore.getSession(user.id);
    expect(initialSession).toBeDefined();

    // Perform logout
    const logoutResult = await authManager.logout(loginResult.token!);
    expect(logoutResult.success).toBe(true);

    // Verify token is invalidated
    const postLogoutValidation = await authMiddleware.validateToken(`Bearer ${loginResult.token}`);
    expect(postLogoutValidation.valid).toBe(false);

    // Verify session is removed
    const postLogoutSession = await tokenStore.getSession(user.id);
    expect(postLogoutSession).toBeNull();

    // Verify refresh token is invalidated
    const refreshResult = await authManager.refreshToken(loginResult.refreshToken!);
    expect(refreshResult.success).toBe(false);
    expect(refreshResult.error).toContain('refresh token invalid');
  });

  test('Concurrent Sessions: Portal handles multiple user sessions', async () => {
    console.log('Testing concurrent user sessions...');

    // Login same user from multiple devices/sessions
    const session1 = await authManager.login(TEST_USERS.developer.username, TEST_USERS.developer.password);
    const session2 = await authManager.login(TEST_USERS.developer.username, TEST_USERS.developer.password);

    // Both sessions should be valid
    const validation1 = await authMiddleware.validateToken(`Bearer ${session1.token}`);
    const validation2 = await authMiddleware.validateToken(`Bearer ${session2.token}`);

    expect(validation1.valid).toBe(true);
    expect(validation2.valid).toBe(true);

    // Verify different tokens
    expect(session1.token).not.toBe(session2.token);

    // Test service access from both sessions
    const request1 = {
      method: 'GET',
      url: '/api/tests',
      headers: { authorization: `Bearer ${session1.token}` }
    };

    const request2 = {
      method: 'GET',
      url: '/api/themes',
      headers: { authorization: `Bearer ${session2.token}` }
    };

    const response1 = await serviceProxy.proxyRequest("storyReporter", request1);
    const response2 = await serviceProxy.proxyRequest("guiSelector", request2);

    expect(response1.success).toBe(true);
    expect(response2.success).toBe(true);

    // Logout from one session shouldn't affect the other
    await authManager.logout(session1.token!);

    const postLogoutValidation1 = await authMiddleware.validateToken(`Bearer ${session1.token}`);
    const postLogoutValidation2 = await authMiddleware.validateToken(`Bearer ${session2.token}`);

    expect(postLogoutValidation1.valid).toBe(false);
    expect(postLogoutValidation2.valid).toBe(true);
  });

  test('Authentication Middleware: Portal protects routes', async () => {
    console.log('Testing authentication middleware...');

    // Test protected route without authentication
    const unauthenticatedRequest = {
      url: '/api/apps',
      headers: {}
    };

    const unauthResult = await authMiddleware.authenticateRequest(unauthenticatedRequest);
    expect(unauthResult.authenticated).toBe(false);
    expect(unauthResult.statusCode).toBe(401);

    // Test excluded route (should pass without authentication)
    const publicRequest = {
      url: '/health',
      headers: {}
    };

    const publicResult = await authMiddleware.authenticateRequest(publicRequest);
    expect(publicResult.authenticated).toBe(true);

    // Test protected route with valid authentication
    const user = TEST_USERS.developer;
    const loginResult = await authManager.login(user.username, user.password);

    const authenticatedRequest = {
      url: '/api/apps',
      headers: {
        authorization: `Bearer ${loginResult.token}`
      }
    };

    const authResult = await authMiddleware.authenticateRequest(authenticatedRequest);
    expect(authResult.authenticated).toBe(true);
    expect(authResult.user?.id).toBe(user.id);
  });

  test('Error Handling: Portal handles authentication errors', async () => {
    console.log('Testing authentication error handling...');

    // Test login with invalid credentials
    const invalidLogin = await authManager.login('invalid@user.com', "wrongpassword");
    expect(invalidLogin.success).toBe(false);
    expect(invalidLogin.error).toContain('invalid credentials');

    // Test malformed token
    const malformedValidation = await authMiddleware.validateToken('Bearer ${process.env.AUTH_TOKEN || "PLACEHOLDER_TOKEN"}');
    expect(malformedValidation.valid).toBe(false);
    expect(malformedValidation.error).toContain('malformed token');

    // Test token store connection error
    await tokenStore.disconnect();

    const user = TEST_USERS.developer;
    const connectionErrorLogin = await authManager.login(user.username, user.password);
    expect(connectionErrorLogin.success).toBe(false);
    expect(connectionErrorLogin.error).toContain('Token store not connected');

    // Reconnect for cleanup
    await tokenStore.connect();

    // Test refresh with invalid refresh token
    const invalidRefresh = await authManager.refreshToken('invalid-refresh-token');
    expect(invalidRefresh.success).toBe(false);
    expect(invalidRefresh.error).toContain('refresh token invalid');

    // Test permission check with malformed permissions
    const malformedPermissionRequest = {
      headers: { authorization: 'Bearer ${process.env.AUTH_TOKEN || "PLACEHOLDER_TOKEN"}' },
      user: { permissions: 'not-an-array' }
    };

    const permissionResult = await authMiddleware.hasPermission(malformedPermissionRequest, 'app:read');
    expect(permissionResult).toBe(false);
  });

  test('Security Features: Portal implements security best practices', async () => {
    console.log('Testing security features...');

    const user = TEST_USERS.developer;

    // Test rate limiting for login attempts
    const promises = [];
    for (let i = 0; i < 6; i++) {
      promises.push(authManager.login(user.username, 'wrong-password'));
    }

    const results = await Promise.all(promises);
    const lastResult = results[results.length - 1];
    expect(lastResult.error).toContain('rate limit exceeded');

    // Wait for rate limit reset (5 minutes in real implementation, but reduced for test)
    await new Promise(resolve => setTimeout(resolve, 100));

    // Test In Progress login after rate limit reset
    const validLogin = await authManager.login(user.username, user.password);
    expect(validLogin.success).toBe(true);

    // Test token blacklisting
    await authManager.logout(validLogin.token!);
    await authManager.blacklistToken(validLogin.token!);

    const blacklistedValidation = await authMiddleware.validateToken(`Bearer ${validLogin.token}`);
    expect(blacklistedValidation.valid).toBe(false);
    expect(blacklistedValidation.error).toContain('token blacklisted');

    // Test password policy enforcement
    const weakPasswordUser = {
      ...TEST_USERS.developer,
      password: "PLACEHOLDER"
    };

    const weakPasswordResult = await userManager.createUser(weakPasswordUser);
    expect(weakPasswordResult.success).toBe(false);
    expect(weakPasswordResult.error).toContain('password does not meet policy');
  });
});

/**
 * Portal + Authentication Integration Test Summary:
 * 
 * This integration test validates the critical authentication system integration
 * within the AI Dev Portal. Key areas covered:
 * 
 * 1. **User Authentication**: Login, token generation, and validation
 * 2. **Token Management**: Refresh, expiry, and cleanup mechanisms
 * 3. **SSO Integration**: Token propagation to connected services
 * 4. **Authorization**: Role-based access control and permissions
 * 5. **Session Management**: User session creation, tracking, and expiry
 * 6. **Security Features**: Rate limiting, token blacklisting, password policies
 * 7. **Middleware Integration**: Request authentication and route protection
 * 8. **Error Handling**: Comprehensive error scenarios and graceful degradation
 * 
 * This test ensures that the portal provides secure, reliable authentication
 * and authorization services for users and connected services, maintaining
 * security best practices throughout the system.
 */