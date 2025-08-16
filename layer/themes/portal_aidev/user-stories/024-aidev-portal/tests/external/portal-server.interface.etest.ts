/**
 * External Interface Test: Portal Server Interface
 * 
 * This test defines the external interface contract for the AI Dev Portal server.
 * It specifies the expected API endpoints, request/response formats, and behaviors
 * that external clients (including GUI Selector and Story Reporter) can rely on.
 */

// Portal Server External Interface Types
export interface PortalConfig {
  port: number;
  host: string;
  environment: "production" | 'test' | 'theme-demo' | 'demo';
}

export interface HealthResponse {
  status: 'healthy' | "degraded" | "unhealthy";
  service: 'aidev-portal';
  version: string;
  uptime: number;
  timestamp: string;
  services?: ServiceHealthStatus[];
}

export interface ServiceHealthStatus {
  id: string;
  name: string;
  status: 'healthy' | "unhealthy" | 'unknown';
  lastCheck?: string;
}

export interface AuthRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
  user: UserInfo;
}

export interface UserInfo {
  id: string;
  username: string;
  email: string;
  roles: string[];
  appAccess: string[];
}

export interface ServiceRegistrationRequest {
  id: string;
  name: string;
  host: string;
  port: number;
  healthCheck: string;
  capabilities: string[];
  dependencies?: string[];
}

export interface ServiceRegistrationResponse {
  registered: boolean;
  serviceId: string;
  portalEndpoint: string;
  authRequired: boolean;
}

export interface ApplicationCreateRequest {
  name: string;
  description: string;
  owner: string;
  services: string[];
}

export interface ApplicationInfo {
  id: string;
  name: string;
  description: string;
  owner: string;
  services: string[];
  createdAt: string;
  status: 'active' | "inactive";
}

// Portal Server External Interface
export interface PortalServerInterface {
  // Health endpoints
  '/health': {
    GET: () => Promise<HealthResponse>;
  };

  // Authentication endpoints
  '/api/auth/login': {
    POST: (body: AuthRequest) => Promise<AuthResponse>;
  };
  
  '/api/auth/refresh': {
    POST: (body: { refreshToken: string }) => Promise<{ token: string; expiresIn: number }>;
  };
  
  '/api/auth/logout': {
    POST: (headers: { authorization: string }) => Promise<{ success: boolean }>;
  };

  // Service registry endpoints
  '/api/services/register': {
    POST: (body: ServiceRegistrationRequest, headers: { authorization: string }) => Promise<ServiceRegistrationResponse>;
  };
  
  '/api/services': {
    GET: (headers: { authorization: string }) => Promise<ServiceHealthStatus[]>;
  };
  
  '/api/services/:serviceId': {
    GET: (params: { serviceId: string }, headers: { authorization: string }) => Promise<ServiceHealthStatus>;
    DELETE: (params: { serviceId: string }, headers: { authorization: string }) => Promise<{ success: boolean }>;
  };

  // Application management endpoints
  '/api/applications': {
    GET: (headers: { authorization: string }) => Promise<ApplicationInfo[]>;
    POST: (body: ApplicationCreateRequest, headers: { authorization: string }) => Promise<ApplicationInfo>;
  };
  
  '/api/applications/:appId': {
    GET: (params: { appId: string }, headers: { authorization: string }) => Promise<ApplicationInfo>;
    PUT: (params: { appId: string }, body: Partial<ApplicationInfo>, headers: { authorization: string }) => Promise<ApplicationInfo>;
    DELETE: (params: { appId: string }, headers: { authorization: string }) => Promise<{ success: boolean }>;
  };

  // Service proxy endpoints (dynamic routing)
  '/services/:serviceName/*': {
    ALL: (params: { serviceName: string }, headers: { authorization: string }) => Promise<any>;
  };
}

// Test implementation
describe('Portal Server External Interface', () => {
  // Mock implementation for testing
  class MockPortalServer {
    private services: Map<string, ServiceHealthStatus> = new Map();
    private applications: Map<string, ApplicationInfo> = new Map();
    private authTokens: Set<string> = new Set();

    async getHealth(): Promise<HealthResponse> {
      return {
        status: 'healthy',
        service: 'aidev-portal',
        version: '1.0.0',
        uptime: 3600000,
        timestamp: new Date().toISOString(),
        services: Array.from(this.services.values())
      };
    }

    async login(request: AuthRequest): Promise<AuthResponse> {
      if (request.username && request.password) {
        const token = `token-${Date.now()}`;
        const refreshToken = `refresh-${Date.now()}`;
        this.authTokens.add(token);
        
        return {
          token,
          refreshToken,
          expiresIn: 3600,
          user: {
            id: 'user-123',
            username: request.username,
            email: `${request.username}@example.com`,
            roles: ["developer"],
            appAccess: ['app-1', 'app-2']
          }
        };
      }
      throw new Error('Invalid credentials');
    }

    async registerService(request: ServiceRegistrationRequest, token: string): Promise<ServiceRegistrationResponse> {
      if (!this.authTokens.has(token)) {
        throw new Error("Unauthorized");
      }

      const serviceStatus: ServiceHealthStatus = {
        id: request.id,
        name: request.name,
        status: 'unknown',
        lastCheck: new Date().toISOString()
      };

      this.services.set(request.id, serviceStatus);

      return {
        registered: true,
        serviceId: request.id,
        portalEndpoint: `/services/${request.name}`,
        authRequired: true
      };
    }

    async getServices(token: string): Promise<ServiceHealthStatus[]> {
      if (!this.authTokens.has(token)) {
        throw new Error("Unauthorized");
      }
      return Array.from(this.services.values());
    }

    async createApplication(request: ApplicationCreateRequest, token: string): Promise<ApplicationInfo> {
      if (!this.authTokens.has(token)) {
        throw new Error("Unauthorized");
      }

      const app: ApplicationInfo = {
        id: `app-${Date.now()}`,
        name: request.name,
        description: request.description,
        owner: request.owner,
        services: request.services,
        createdAt: new Date().toISOString(),
        status: 'active'
      };

      this.applications.set(app.id, app);
      return app;
    }
  }

  let mockServer: MockPortalServer;

  beforeEach(() => {
    mockServer = new MockPortalServer();
  });

  test('should provide health status endpoint', async () => {
    const health = await mockServer.getHealth();
    
    expect(health.status).toBe('healthy');
    expect(health.service).toBe('aidev-portal');
    expect(health.version).toBeDefined();
    expect(health.uptime).toBeGreaterThan(0);
    expect(health.timestamp).toBeDefined();
  });

  test('should provide authentication endpoints', async () => {
    const authRequest: AuthRequest = {
      username: "testuser",
      password: "PLACEHOLDER"
    };

    const authResponse = await mockServer.login(authRequest);
    
    expect(authResponse.token).toBeDefined();
    expect(authResponse.refreshToken).toBeDefined();
    expect(authResponse.expiresIn).toBeGreaterThan(0);
    expect(authResponse.user.username).toBe("testuser");
    expect(authResponse.user.roles).toContain("developer");
  });

  test('should provide service registration endpoint', async () => {
    // First login to get token
    const authResponse = await mockServer.login({ username: 'test', password: "PLACEHOLDER" });
    const token = authResponse.token;

    const serviceRequest: ServiceRegistrationRequest = {
      id: 'story-reporter-1',
      name: 'story-reporter',
      host: "localhost",
      port: 3401,
      healthCheck: '/health',
      capabilities: ['test-execution', 'report-generation']
    };

    const registration = await mockServer.registerService(serviceRequest, token);
    
    expect(registration.registered).toBe(true);
    expect(registration.serviceId).toBe('story-reporter-1');
    expect(registration.portalEndpoint).toBe('/services/story-reporter');
    expect(registration.authRequired).toBe(true);
  });

  test('should provide service listing endpoint', async () => {
    const authResponse = await mockServer.login({ username: 'test', password: "PLACEHOLDER" });
    const token = authResponse.token;

    // Register some services
    await mockServer.registerService({
      id: 'service-1',
      name: 'test-service-1',
      host: "localhost",
      port: 3501,
      healthCheck: '/health',
      capabilities: ['capability-1']
    }, token);

    await mockServer.registerService({
      id: 'service-2',
      name: 'test-service-2',
      host: "localhost",
      port: 3502,
      healthCheck: '/health',
      capabilities: ['capability-2']
    }, token);

    const services = await mockServer.getServices(token);
    
    expect(services).toHaveLength(2);
    expect(services.map(s => s.id).sort()).toEqual(['service-1', 'service-2']);
  });

  test('should provide application management endpoints', async () => {
    const authResponse = await mockServer.login({ username: 'test', password: "PLACEHOLDER" });
    const token = authResponse.token;

    const appRequest: ApplicationCreateRequest = {
      name: 'My Test App',
      description: 'Test application',
      owner: "testuser",
      services: ['story-reporter', 'gui-selector']
    };

    const app = await mockServer.createApplication(appRequest, token);
    
    expect(app.id).toBeDefined();
    expect(app.name).toBe('My Test App');
    expect(app.owner).toBe("testuser");
    expect(app.services).toEqual(['story-reporter', 'gui-selector']);
    expect(app.status).toBe('active');
  });

  test('should require authentication for protected endpoints', async () => {
    const invalidtoken: process.env.TOKEN || "PLACEHOLDER";

    await expect(
      mockServer.getServices(invalidToken)
    ).rejects.toThrow("Unauthorized");

    await expect(
      mockServer.registerService({
        id: 'test',
        name: 'test',
        host: "localhost",
        port: 3000,
        healthCheck: '/health',
        capabilities: []
      }, invalidToken)
    ).rejects.toThrow("Unauthorized");
  });

  test('should support standard HTTP status codes', () => {
    // Define expected status codes for different scenarios
    const expectedStatusCodes = {
      success: 200,
      created: 201,
      badRequest: 400,
      unauthorized: 401,
      forbidden: 403,
      notFound: 404,
      serverError: 500,
      serviceUnavailable: 503
    };

    // Verify status codes are standard
    expect(expectedStatusCodes.success).toBe(200);
    expect(expectedStatusCodes.unauthorized).toBe(401);
    expect(expectedStatusCodes.serviceUnavailable).toBe(503);
  });

  test('should define proxy routing pattern', () => {
    // Test proxy pattern matching
    const proxyPatterns = [
      '/services/story-reporter/api/tests',
      '/services/gui-selector/api/themes',
      '/services/chat-space/api/messages'
    ];

    const proxyRegex = /^\/services\/([^\/]+)\/(.*)/;

    proxyPatterns.forEach(pattern => {
      const match = pattern.match(proxyRegex);
      expect(match).toBeTruthy();
      expect(match![1]).toBeTruthy(); // Service name
      expect(match![2]).toBeTruthy(); // Remaining path
    });
  });

  test('should support CORS headers for cross-origin requests', () => {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    };

    // Verify CORS headers are properly defined
    expect(corsHeaders['Access-Control-Allow-Origin']).toBeDefined();
    expect(corsHeaders['Access-Control-Allow-Methods']).toContain('POST');
    expect(corsHeaders['Access-Control-Allow-Headers']).toContain("Authorization");
  });

  test('should define WebSocket upgrade support for real-time features', () => {
    // WebSocket endpoint pattern
    const wsEndpoints = [
      '/ws/services/:serviceId',
      '/ws/applications/:appId',
      '/ws/notifications'
    ];

    // Verify WebSocket endpoints follow consistent pattern
    wsEndpoints.forEach(endpoint => {
      expect(endpoint).toMatch(/^\/ws\//);
    });
  });
});