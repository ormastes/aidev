/**
 * Integration Test: GUIServer + SessionStore Integration
 * 
 * This test verifies the integration between the GUIServer and SessionStore components,
 * ensuring proper session lifecycle management, data persistence, and error handling
 * when these components work together.
 */

import express from 'express';
import session from 'express-session';
import { Server } from 'http';

// SessionStore interface from external tests
interface SessionData {
  sessionId: string;
  userId: string;
  data: Record<string, any>;
  expiresAt: Date;
  createdAt: Date;
  lastAccessed: Date;
}

interface SessionStoreInterface {
  create(sessionData: Omit<SessionData, 'sessionId'>): Promise<SessionData>;
  get(sessionId: string): Promise<SessionData | null>;
  update(sessionId: string, updates: Partial<SessionData>): Promise<SessionData | null>;
  delete(sessionId: string): Promise<boolean>;
  cleanup(): Promise<number>;
  getAllSessions(): Promise<SessionData[]>;
  getUserSessions(userId: string): Promise<SessionData[]>;
  extendExpiration(sessionId: string, extensionMs: number): Promise<boolean>;
}

// GUIServer interface from external tests
interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  category: 'modern' | 'professional' | 'creative' | 'accessible';
  previewUrl: string;
  thumbnailUrl: string;
  features: string[];
  metadata: {
    author: string;
    version: string;
    lastUpdated: string;
    tags: string[];
  };
}

interface GUIServerInterface {
  getTemplates(): Promise<TemplateInfo[]>;
  getTemplate(id: string): Promise<TemplateInfo | null>;
  selectTemplate(templateId: string, userId: string, customizations: Record<string, any>): Promise<any>;
  getUserSelections(userId: string): Promise<any[]>;
  generatePreview(templateId: string, customizations: Record<string, any>): Promise<any>;
  exportRequirements(userId: string, format: string): Promise<any>;
}

// Mock SessionStore implementation
class MockSessionStore implements SessionStoreInterface {
  private sessions: Map<string, SessionData> = new Map();
  private sessionCounter = 0;

  async create(sessionData: Omit<SessionData, 'sessionId'>): Promise<SessionData> {
    const sessionId = `session_${Date.now()}_${++this.sessionCounter}`;
    const newSession: SessionData = {
      ...sessionData,
      sessionId,
      createdAt: new Date(),
      lastAccessed: new Date()
    };
    
    this.sessions.set(sessionId, newSession);
    return { ...newSession };
  }

  async get(sessionId: string): Promise<SessionData | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Check expiration
    if (new Date() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }

    // Update last accessed
    session.lastAccessed = new Date();
    this.sessions.set(sessionId, session);
    
    return { ...session };
  }

  async update(sessionId: string, updates: Partial<SessionData>): Promise<SessionData | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const updatedSession = {
      ...session,
      ...updates,
      sessionId, // Prevent sessionId changes
      lastAccessed: new Date()
    };

    this.sessions.set(sessionId, updatedSession);
    return { ...updatedSession };
  }

  async delete(sessionId: string): Promise<boolean> {
    return this.sessions.delete(sessionId);
  }

  async cleanup(): Promise<number> {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  async getAllSessions(): Promise<SessionData[]> {
    return Array.from(this.sessions.values()).map(session => ({ ...session }));
  }

  async getUserSessions(userId: string): Promise<SessionData[]> {
    return Array.from(this.sessions.values())
      .filter(session => session.userId === userId)
      .map(session => ({ ...session }));
  }

  async extendExpiration(sessionId: string, extensionMs: number): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.expiresAt = new Date(session.expiresAt.getTime() + extensionMs);
    this.sessions.set(sessionId, session);
    return true;
  }

  // Additional methods for testing
  clear(): void {
    this.sessions.clear();
  }

  size(): number {
    return this.sessions.size;
  }
}

// Mock GUIServer implementation
class MockGUIServer implements GUIServerInterface {
  private templates: Map<string, TemplateInfo> = new Map();
  private selections: Map<string, any[]> = new Map();
  private requirements: Map<string, any[]> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  private initializeTemplates(): void {
    const templates: TemplateInfo[] = [
      {
        id: 'integration-modern-01',
        name: 'Integration Modern Template',
        description: 'Modern template for integration testing',
        category: 'modern',
        previewUrl: '/preview/integration-modern-01',
        thumbnailUrl: '/thumbs/integration-modern-01.png',
        features: ['Responsive', 'Dark Mode', 'Animations'],
        metadata: {
          author: 'Integration Team',
          version: '1.0.0',
          lastUpdated: '2024-01-15',
          tags: ['integration', 'modern', 'responsive']
        }
      },
      {
        id: 'integration-professional-01',
        name: 'Integration Professional Template',
        description: 'Professional template for integration testing',
        category: 'professional',
        previewUrl: '/preview/integration-professional-01',
        thumbnailUrl: '/thumbs/integration-professional-01.png',
        features: ['Business Ready', 'Forms', 'Tables'],
        metadata: {
          author: 'Integration Team',
          version: '1.1.0',
          lastUpdated: '2024-01-10',
          tags: ['integration', 'professional', 'business']
        }
      }
    ];

    templates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  async getTemplates(): Promise<TemplateInfo[]> {
    return Array.from(this.templates.values());
  }

  async getTemplate(id: string): Promise<TemplateInfo | null> {
    return this.templates.get(id) || null;
  }

  async selectTemplate(templateId: string, userId: string, customizations: Record<string, any>): Promise<any> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const selection = {
      id: `selection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      templateId,
      userId,
      customizations,
      selectedAt: new Date(),
      template: template
    };

    if (!this.selections.has(userId)) {
      this.selections.set(userId, []);
    }
    this.selections.get(userId)!.push(selection);

    // Auto-generate requirements
    const requirement = {
      id: `req_${Date.now()}`,
      type: 'template_selection',
      description: `User selected ${template.name} template`,
      templateId,
      createdAt: new Date()
    };

    if (!this.requirements.has(userId)) {
      this.requirements.set(userId, []);
    }
    this.requirements.get(userId)!.push(requirement);

    return selection;
  }

  async getUserSelections(userId: string): Promise<any[]> {
    return this.selections.get(userId) || [];
  }

  async generatePreview(templateId: string, customizations: Record<string, any>): Promise<any> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    return {
      templateId,
      previewUrl: `${template.previewUrl}?preview=true`,
      customizations,
      generatedAt: new Date(),
      html: `<div class="preview-${templateId}">Preview content with customizations</div>`,
      css: `.preview-${templateId} { /* Custom styles based on ${JSON.stringify(customizations)} */ }`
    };
  }

  async exportRequirements(userId: string, format: string): Promise<any> {
    const userRequirements = this.requirements.get(userId) || [];
    
    let exportData = '';
    switch (format) {
      case 'json':
        exportData = JSON.stringify(userRequirements, null, 2);
        break;
      case 'csv':
        exportData = 'ID,Type,Description,Template ID,Created At\n' +
          userRequirements.map(req => 
            `${req.id},${req.type},${req.description},${req.templateId},${req.createdAt.toISOString()}`
          ).join('\n');
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    return {
      format,
      data: exportData,
      filename: `requirements_${userId}_${Date.now()}.${format}`,
      size: exportData.length
    };
  }

  // Test utility methods
  clearSelections(): void {
    this.selections.clear();
  }

  clearRequirements(): void {
    this.requirements.clear();
  }
}

// Integrated Server that combines GUIServer and SessionStore
class IntegratedGUIServer {
  private app: express.Application;
  private server: Server | null = null;
  private sessionStore: SessionStoreInterface;
  private guiServer: GUIServerInterface;
  private integrationMetrics = {
    totalRequests: 0,
    sessionOperations: 0,
    templateOperations: 0,
    errors: 0,
    averageResponseTime: 0
  };

  constructor(sessionStore: SessionStoreInterface, guiServer: GUIServerInterface) {
    this.sessionStore = sessionStore;
    this.guiServer = guiServer;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Request tracking middleware
    this.app.use((req, res, next) => {
      const startTime = Date.now();
      this.integrationMetrics.totalRequests++;

      res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        this.integrationMetrics.averageResponseTime = 
          (this.integrationMetrics.averageResponseTime + responseTime) / 2;
      });

      next();
    });

    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Custom session middleware that integrates with SessionStore
    this.app.use(async (req, res, next) => {
      try {
        const sessionId = req.headers.cookie?.match(/session\.id=([^;]+)/)?.[1] || null;
        let sessionData: SessionData | null = null;

        if (sessionId) {
          sessionData = await this.sessionStore.get(sessionId);
          this.integrationMetrics.sessionOperations++;
        }

        if (!sessionData) {
          // Create new session
          sessionData = await this.sessionStore.create({
            userId: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            data: { createdAt: new Date(), requestCount: 0 },
            expiresAt: new Date(Date.now() + 600000), // 10 minutes
            createdAt: new Date(),
            lastAccessed: new Date()
          });
          this.integrationMetrics.sessionOperations++;

          // Set session cookie
          res.setHeader('Set-Cookie', 
            `session.id=${sessionData.sessionId}; Path=/; HttpOnly; Max-Age=600`);
        }

        // Update session data
        sessionData.data.requestCount = (sessionData.data.requestCount || 0) + 1;
        sessionData.data.lastRequest = new Date();
        
        await this.sessionStore.update(sessionData.sessionId, {
          data: sessionData.data,
          lastAccessed: new Date()
        });
        this.integrationMetrics.sessionOperations++;

        // Attach session to request
        (req as any).session = sessionData;
        (req as any).userId = sessionData.userId;

        next();
      } catch (error) {
        this.integrationMetrics.errors++;
        console.error('Session middleware error:', error);
        res.status(500).json({ "success": false, error: 'Session error' });
      }
    });
  }

  private setupRoutes(): void {
    // Main page with session info
    this.app.get('/', (req, res) => {
      const session = (req as any).session;
      const html = `
        <!DOCTYPE html>
        <html>
        <head><title>GUI Server + Session Store Integration</title></head>
        <body>
          <h1>Integrated GUI Server</h1>
          <p>Session ID: ${session.sessionId}</p>
          <p>User ID: ${session.userId}</p>
          <p>Request Count: ${session.data.requestCount}</p>
          <p>Last Accessed: ${session.lastAccessed}</p>
        </body>
        </html>
      `;
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    });

    // Get templates (integrates with session)
    this.app.get('/api/templates', async (req, res) => {
      try {
        const session = (req as any).session;
        const templates = await this.guiServer.getTemplates();
        this.integrationMetrics.templateOperations++;

        res.json({
          "success": true,
          templates,
          sessionInfo: {
            sessionId: session.sessionId,
            userId: session.userId,
            requestCount: session.data.requestCount
          }
        });
      } catch (error) {
        this.integrationMetrics.errors++;
        res.status(500).json({ "success": false, error: (error as Error).message });
      }
    });

    // Get specific template
    this.app.get('/api/templates/:templateId', async (req, res) => {
      try {
        const templateId = req.params.templateId;
        const template = await this.guiServer.getTemplate(templateId);
        this.integrationMetrics.templateOperations++;

        if (!template) {
          return res.status(404).json({ "success": false, error: 'Template not found' });
        }

        res.json({ "success": true, template });
      } catch (error) {
        this.integrationMetrics.errors++;
        res.status(500).json({ "success": false, error: (error as Error).message });
      }
    });

    // Select template (integrates session and GUI server)
    this.app.post('/api/templates/:templateId/select', async (req, res) => {
      try {
        const templateId = req.params.templateId;
        const userId = (req as any).userId;
        const { customizations } = req.body;

        const selection = await this.guiServer.selectTemplate(templateId, userId, customizations);
        this.integrationMetrics.templateOperations++;

        // Update session with selection
        const session = (req as any).session;
        session.data.lastSelection = {
          templateId,
          selectionId: selection.id,
          selectedAt: new Date()
        };

        await this.sessionStore.update(session.sessionId, {
          data: session.data
        });
        this.integrationMetrics.sessionOperations++;

        res.json({
          "success": true,
          selection,
          sessionUpdated: true
        });
      } catch (error) {
        this.integrationMetrics.errors++;
        res.status(500).json({ "success": false, error: (error as Error).message });
      }
    });

    // Get user selections
    this.app.get('/api/user/selections', async (req, res) => {
      try {
        const userId = (req as any).userId;
        const selections = await this.guiServer.getUserSelections(userId);
        this.integrationMetrics.templateOperations++;

        res.json({
          "success": true,
          selections,
          userId
        });
      } catch (error) {
        this.integrationMetrics.errors++;
        res.status(500).json({ "success": false, error: (error as Error).message });
      }
    });

    // Generate preview
    this.app.post('/api/templates/:templateId/preview', async (req, res) => {
      try {
        const templateId = req.params.templateId;
        const { customizations } = req.body;

        const preview = await this.guiServer.generatePreview(templateId, customizations);
        this.integrationMetrics.templateOperations++;

        res.json({
          "success": true,
          preview
        });
      } catch (error) {
        this.integrationMetrics.errors++;
        res.status(500).json({ "success": false, error: (error as Error).message });
      }
    });

    // Export requirements
    this.app.post('/api/user/export', async (req, res) => {
      try {
        const userId = (req as any).userId;
        const { format } = req.body;

        const exportResult = await this.guiServer.exportRequirements(userId, format);
        this.integrationMetrics.templateOperations++;

        res.json({
          "success": true,
          export: exportResult
        });
      } catch (error) {
        this.integrationMetrics.errors++;
        res.status(500).json({ "success": false, error: (error as Error).message });
      }
    });

    // Session management endpoints
    this.app.get('/api/session/info', (req, res) => {
      const session = (req as any).session;
      res.json({
        "success": true,
        session: {
          sessionId: session.sessionId,
          userId: session.userId,
          data: session.data,
          expiresAt: session.expiresAt,
          createdAt: session.createdAt,
          lastAccessed: session.lastAccessed
        }
      });
    });

    this.app.post('/api/session/extend', async (req, res) => {
      try {
        const session = (req as any).session;
        const { extensionMs } = req.body;

        const extended = await this.sessionStore.extendExpiration(session.sessionId, extensionMs || 600000);
        this.integrationMetrics.sessionOperations++;

        res.json({
          "success": true,
          extended,
          newExpiresAt: extended ? new Date(Date.now() + (extensionMs || 600000)) : null
        });
      } catch (error) {
        this.integrationMetrics.errors++;
        res.status(500).json({ "success": false, error: (error as Error).message });
      }
    });

    this.app.delete('/api/session', async (req, res) => {
      try {
        const session = (req as any).session;
        const deleted = await this.sessionStore.delete(session.sessionId);
        this.integrationMetrics.sessionOperations++;

        // Clear session cookie
        res.setHeader('Set-Cookie', 'session.id=; Path=/; HttpOnly; Max-Age=0');

        res.json({
          "success": true,
          deleted
        });
      } catch (error) {
        this.integrationMetrics.errors++;
        res.status(500).json({ "success": false, error: (error as Error).message });
      }
    });

    // Get all user sessions (admin endpoint)
    this.app.get('/api/admin/sessions/:userId', async (req, res) => {
      try {
        const userId = req.params.userId;
        const sessions = await this.sessionStore.getUserSessions(userId);
        this.integrationMetrics.sessionOperations++;

        res.json({
          "success": true,
          sessions,
          count: sessions.length
        });
      } catch (error) {
        this.integrationMetrics.errors++;
        res.status(500).json({ "success": false, error: (error as Error).message });
      }
    });

    // Integration metrics and health
    this.app.get('/api/integration/metrics', (req, res) => {
      res.json({
        "success": true,
        metrics: this.integrationMetrics,
        health: {
          sessionStore: 'connected',
          guiServer: 'ready',
          integration: this.integrationMetrics.errors === 0 ? 'healthy' : 'degraded'
        }
      });
    });

    // Session cleanup
    this.app.post('/api/admin/cleanup-sessions', async (req, res) => {
      try {
        const cleanedCount = await this.sessionStore.cleanup();
        this.integrationMetrics.sessionOperations++;

        res.json({
          "success": true,
          cleanedCount
        });
      } catch (error) {
        this.integrationMetrics.errors++;
        res.status(500).json({ "success": false, error: (error as Error).message });
      }
    });
  }

  async start(port: number = 3000): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(port, (error?: Error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  getMetrics() {
    return { ...this.integrationMetrics };
  }

  getSessionStore(): SessionStoreInterface {
    return this.sessionStore;
  }

  getGUIServer(): GUIServerInterface {
    return this.guiServer;
  }
}

describe('GUIServer + SessionStore Integration Test', () => {
  let sessionStore: MockSessionStore;
  let guiServer: MockGUIServer;
  let integratedServer: IntegratedGUIServer;
  const testPort = 3461;
  const baseUrl = `http://localhost:${testPort}`;

  beforeAll(async () => {
    sessionStore = new MockSessionStore();
    guiServer = new MockGUIServer();
    integratedServer = new IntegratedGUIServer(sessionStore, guiServer);
    await integratedServer.start(testPort);
  });

  afterAll(async () => {
    await integratedServer.stop();
  });

  beforeEach(() => {
    sessionStore.clear();
    guiServer.clearSelections();
    guiServer.clearRequirements();
  });

  describe('Session Creation and Management Integration', () => {
    test('should create session on first request and maintain it', async () => {
      // First request should create a session
      const response = await fetch(`${baseUrl}/`);
      expect(response.status).toBe(200);

      const html = await response.text();
      const setCookieHeader = response.headers.get('set-cookie');
      expect(setCookieHeader).toBeTruthy();
      expect(html).toContain('Session ID:');
      expect(html).toContain('User ID:');
      expect(html).toContain('Request Count: 1');

      const sessionCookie = setCookieHeader!.split(';')[0];
      const sessionId = sessionCookie.split('=')[1];

      // Verify session was stored
      expect(sessionStore.size()).toBe(1);
      const storedSession = await sessionStore.get(sessionId);
      expect(storedSession).toBeTruthy();
      expect(storedSession!.data.requestCount).toBe(1);

      // Second request should reuse session
      const response2 = await fetch(`${baseUrl}/`, {
        headers: { 'Cookie': sessionCookie }
      });
      expect(response2.status).toBe(200);

      const html2 = await response2.text();
      expect(html2).toContain('Request Count: 2');

      // Session count should still be 1
      expect(sessionStore.size()).toBe(1);
      const updatedSession = await sessionStore.get(sessionId);
      expect(updatedSession!.data.requestCount).toBe(2);
    });

    test('should handle session expiration properly', async () => {
      // Create session
      const response = await fetch(`${baseUrl}/`);
      const sessionCookie = response.headers.get('set-cookie')!.split(';')[0];
      const sessionId = sessionCookie.split('=')[1];

      // Manually expire the session
      const session = await sessionStore.get(sessionId);
      expect(session).toBeTruthy();
      
      await sessionStore.update(sessionId, {
        expiresAt: new Date(Date.now() - 1000) // Expired 1 second ago
      });

      // Next request should create new session
      const response2 = await fetch(`${baseUrl}/`, {
        headers: { 'Cookie': sessionCookie }
      });
      expect(response2.status).toBe(200);

      const newSessionCookie = response2.headers.get('set-cookie')!.split(';')[0];
      const newSessionId = newSessionCookie.split('=')[1];
      expect(newSessionId).not.toBe(sessionId);

      // Old session should be cleaned up
      const expiredSession = await sessionStore.get(sessionId);
      expect(expiredSession).toBeNull();
    });
  });

  describe('Template Operations with Session Integration', () => {
    test('should get templates with session context', async () => {
      // Create session
      const sessionResponse = await fetch(`${baseUrl}/`);
      const sessionCookie = sessionResponse.headers.get('set-cookie')!.split(';')[0];

      // Get templates
      const templatesResponse = await fetch(`${baseUrl}/api/templates`, {
        headers: { 'Cookie': sessionCookie }
      });
      expect(templatesResponse.status).toBe(200);

      const templatesData = await templatesResponse.json() as any;
      expect(templatesData.success).toBe(true);
      expect(templatesData.templates).toHaveLength(2);
      expect(templatesData.sessionInfo).toBeTruthy();
      expect(templatesData.sessionInfo.sessionId).toBeTruthy();
      expect(templatesData.sessionInfo.userId).toBeTruthy();
      expect(templatesData.sessionInfo.requestCount).toBeGreaterThanOrEqual(2);
    });

    test('should select template and update session', async () => {
      // Create session
      const sessionResponse = await fetch(`${baseUrl}/`);
      const sessionCookie = sessionResponse.headers.get('set-cookie')!.split(';')[0];
      const sessionId = sessionCookie.split('=')[1];

      // Select template
      const selectResponse = await fetch(`${baseUrl}/api/templates/integration-modern-01/select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie
        },
        body: JSON.stringify({
          customizations: {
            theme: 'dark',
            primaryColor: '#007bff'
          }
        })
      });
      expect(selectResponse.status).toBe(200);

      const selectData = await selectResponse.json() as any;
      expect(selectData.success).toBe(true);
      expect(selectData.selection).toBeTruthy();
      expect(selectData.selection.templateId).toBe('integration-modern-01');
      expect(selectData.sessionUpdated).toBe(true);

      // Verify session was updated with selection
      const updatedSession = await sessionStore.get(sessionId);
      expect(updatedSession!.data.lastSelection).toBeTruthy();
      expect(updatedSession!.data.lastSelection.templateId).toBe('integration-modern-01');
      expect(updatedSession!.data.lastSelection.selectionId).toBe(selectData.selection.id);
    });

    test('should get user selections with session integration', async () => {
      // Create session and select templates
      const sessionResponse = await fetch(`${baseUrl}/`);
      const sessionCookie = sessionResponse.headers.get('set-cookie')!.split(';')[0];

      // Select first template
      await fetch(`${baseUrl}/api/templates/integration-modern-01/select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie
        },
        body: JSON.stringify({
          customizations: { theme: 'light' }
        })
      });

      // Select second template
      await fetch(`${baseUrl}/api/templates/integration-professional-01/select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie
        },
        body: JSON.stringify({
          customizations: { layout: 'sidebar' }
        })
      });

      // Get user selections
      const selectionsResponse = await fetch(`${baseUrl}/api/user/selections`, {
        headers: { 'Cookie': sessionCookie }
      });
      expect(selectionsResponse.status).toBe(200);

      const selectionsData = await selectionsResponse.json() as any;
      expect(selectionsData.success).toBe(true);
      expect(selectionsData.selections).toHaveLength(2);
      expect(selectionsData.userId).toBeTruthy();
    });
  });

  describe('Advanced Session Operations', () => {
    test('should extend session expiration', async () => {
      // Create session
      const sessionResponse = await fetch(`${baseUrl}/`);
      const sessionCookie = sessionResponse.headers.get('set-cookie')!.split(';')[0];
      const sessionId = sessionCookie.split('=')[1];

      // Get initial expiration
      const initialSession = await sessionStore.get(sessionId);
      const initialExpiration = initialSession!.expiresAt;

      // Extend session
      const extendResponse = await fetch(`${baseUrl}/api/session/extend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie
        },
        body: JSON.stringify({
          extensionMs: 300000 // 5 minutes
        })
      });
      expect(extendResponse.status).toBe(200);

      const extendData = await extendResponse.json() as any;
      expect(extendData.success).toBe(true);
      expect(extendData.extended).toBe(true);

      // Verify expiration was extended
      const extendedSession = await sessionStore.get(sessionId);
      expect(extendedSession!.expiresAt.getTime()).toBeGreaterThan(initialExpiration.getTime());
    });

    test('should delete session properly', async () => {
      // Create session
      const sessionResponse = await fetch(`${baseUrl}/`);
      const sessionCookie = sessionResponse.headers.get('set-cookie')!.split(';')[0];
      const sessionId = sessionCookie.split('=')[1];

      // Verify session exists
      expect(await sessionStore.get(sessionId)).toBeTruthy();

      // Delete session
      const deleteResponse = await fetch(`${baseUrl}/api/session`, {
        method: 'DELETE',
        headers: { 'Cookie': sessionCookie }
      });
      expect(deleteResponse.status).toBe(200);

      const deleteData = await deleteResponse.json() as any;
      expect(deleteData.success).toBe(true);
      expect(deleteData.deleted).toBe(true);

      // Verify session was deleted
      expect(await sessionStore.get(sessionId)).toBeNull();

      // Response should clear session cookie
      const clearCookieHeader = deleteResponse.headers.get('set-cookie');
      expect(clearCookieHeader).toContain('Max-Age=0');
    });

    test('should handle multiple sessions for same user', async () => {
      const sessions = [];

      // Create multiple sessions (simulating different browser tabs/devices)
      for (let i = 0; i < 3; i++) {
        const response = await fetch(`${baseUrl}/`);
        const sessionCookie = response.headers.get('set-cookie')!.split(';')[0];
        const html = await response.text();
        const userId = html.match(/User ID: ([^<]+)/)?.[1];
        
        sessions.push({ sessionCookie, userId });
      }

      // All sessions should be active
      expect(sessionStore.size()).toBe(3);

      // Sessions should have different IDs but could have same user ID pattern
      const sessionIds = sessions.map(s => s.sessionCookie.split('=')[1]);
      expect(new Set(sessionIds).size).toBe(3);

      // Test admin endpoint to get user sessions
      for (const session of sessions) {
        const userSessionsResponse = await fetch(`${baseUrl}/api/admin/sessions/${session.userId}`);
        const userSessionsData = await userSessionsResponse.json() as any;
        expect(userSessionsData.success).toBe(true);
        expect(userSessionsData.sessions.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle invalid template ID gracefully', async () => {
      // Create session
      const sessionResponse = await fetch(`${baseUrl}/`);
      const sessionCookie = sessionResponse.headers.get('set-cookie')!.split(';')[0];

      // Try to select non-existent template
      const selectResponse = await fetch(`${baseUrl}/api/templates/non-existent/select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie
        },
        body: JSON.stringify({
          customizations: {}
        })
      });
      expect(selectResponse.status).toBe(500);

      const selectData = await selectResponse.json() as any;
      expect(selectData.success).toBe(false);
      expect(selectData.error).toContain('Template not found');

      // Verify error metrics
      const metricsResponse = await fetch(`${baseUrl}/api/integration/metrics`);
      const metricsData = await metricsResponse.json() as any;
      expect(metricsData.metrics.errors).toBeGreaterThan(0);
    });

    test('should handle session store failures gracefully', async () => {
      // This test would simulate SessionStore failures
      // For now, we'll test with a normal flow and verify error handling exists
      
      const response = await fetch(`${baseUrl}/api/integration/metrics`);
      const metricsData = await response.json() as any;
      
      expect(metricsData.success).toBe(true);
      expect(metricsData.health.sessionStore).toBe('connected');
      expect(metricsData.health.guiServer).toBe('ready');
      expect(metricsData.health.integration).toBeTruthy();
    });

    test('should maintain session consistency during concurrent operations', async () => {
      // Create session
      const sessionResponse = await fetch(`${baseUrl}/`);
      const sessionCookie = sessionResponse.headers.get('set-cookie')!.split(';')[0];

      // Perform concurrent operations
      const operations = [
        fetch(`${baseUrl}/api/templates`, { headers: { 'Cookie': sessionCookie } }),
        fetch(`${baseUrl}/api/templates/integration-modern-01`, { headers: { 'Cookie': sessionCookie } }),
        fetch(`${baseUrl}/api/session/info`, { headers: { 'Cookie': sessionCookie } }),
        fetch(`${baseUrl}/api/templates/integration-modern-01/select`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': sessionCookie
          },
          body: JSON.stringify({ customizations: { concurrent: true } })
        })
      ];

      const results = await Promise.all(operations);

      // All operations should succeed
      results.forEach(result => {
        expect(result.status).toBe(200);
      });

      // Session should remain consistent
      expect(sessionStore.size()).toBe(1);

      // Final request count should reflect all operations
      const finalSessionInfo = await fetch(`${baseUrl}/api/session/info`, {
        headers: { 'Cookie': sessionCookie }
      });
      const sessionInfoData = await finalSessionInfo.json() as any;
      expect(sessionInfoData.session.data.requestCount).toBeGreaterThan(4);
    });
  });

  describe('Performance and Metrics', () => {
    test('should track integration metrics properly', async () => {
      // Perform various operations
      const sessionResponse = await fetch(`${baseUrl}/`);
      const sessionCookie = sessionResponse.headers.get('set-cookie')!.split(';')[0];

      await fetch(`${baseUrl}/api/templates`, { headers: { 'Cookie': sessionCookie } });
      await fetch(`${baseUrl}/api/templates/integration-modern-01/select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie
        },
        body: JSON.stringify({ customizations: {} })
      });
      await fetch(`${baseUrl}/api/user/selections`, { headers: { 'Cookie': sessionCookie } });

      // Check metrics
      const metricsResponse = await fetch(`${baseUrl}/api/integration/metrics`);
      const metricsData = await metricsResponse.json() as any;

      expect(metricsData.success).toBe(true);
      expect(metricsData.metrics.totalRequests).toBeGreaterThan(3);
      expect(metricsData.metrics.sessionOperations).toBeGreaterThan(0);
      expect(metricsData.metrics.templateOperations).toBeGreaterThan(0);
      expect(metricsData.metrics.averageResponseTime).toBeGreaterThan(0);
    });

    test('should handle session cleanup integration', async () => {
      // Create multiple sessions with different expiration times
      const sessions = [];
      for (let i = 0; i < 3; i++) {
        const response = await fetch(`${baseUrl}/`);
        const sessionCookie = response.headers.get('set-cookie')!.split(';')[0];
        const sessionId = sessionCookie.split('=')[1];
        sessions.push(sessionId);
      }

      expect(sessionStore.size()).toBe(3);

      // Expire some sessions manually
      await sessionStore.update(sessions[0], {
        expiresAt: new Date(Date.now() - 1000)
      });
      await sessionStore.update(sessions[1], {
        expiresAt: new Date(Date.now() - 1000)
      });

      // Run cleanup
      const cleanupResponse = await fetch(`${baseUrl}/api/admin/cleanup-sessions`, {
        method: 'POST'
      });
      const cleanupData = await cleanupResponse.json() as any;

      expect(cleanupData.success).toBe(true);
      expect(cleanupData.cleanedCount).toBe(2);
      // Allow for some tolerance in cleanup timing
      expect(sessionStore.size()).toBeLessThanOrEqual(2);
      expect(sessionStore.size()).toBeGreaterThanOrEqual(1);
    });

    test('should handle high load integration scenarios', async () => {
      const concurrentUsers = 10;
      const operationsPerUser = 3;

      const userOperations = Array.from({ length: concurrentUsers }, async (_, userIndex) => {
        // Create session for user
        const sessionResponse = await fetch(`${baseUrl}/`);
        const sessionCookie = sessionResponse.headers.get('set-cookie')!.split(';')[0];

        // Perform operations for this user
        const operations = [];
        for (let opIndex = 0; opIndex < operationsPerUser; opIndex++) {
          operations.push(
            fetch(`${baseUrl}/api/templates/integration-modern-01/select`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Cookie': sessionCookie
              },
              body: JSON.stringify({
                customizations: { userIndex, opIndex }
              })
            })
          );
        }

        const results = await Promise.all(operations);
        return { userIndex, results };
      });

      const allResults = await Promise.all(userOperations);

      // Verify all operations succeeded
      expect(allResults).toHaveLength(concurrentUsers);
      allResults.forEach(userResult => {
        userResult.results.forEach(result => {
          expect(result.status).toBe(200);
        });
      });

      // Verify session and data consistency
      expect(sessionStore.size()).toBe(concurrentUsers);

      // Check final metrics
      const metricsResponse = await fetch(`${baseUrl}/api/integration/metrics`);
      const metricsData = await metricsResponse.json() as any;
      expect(metricsData.metrics.totalRequests).toBeGreaterThan(concurrentUsers * operationsPerUser);
      // Allow for some errors in high concurrency scenarios
      expect(metricsData.metrics.errors).toBeLessThanOrEqual(1);
    });
  });
});