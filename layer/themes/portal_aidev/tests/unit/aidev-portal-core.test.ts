/**
 * Core tests for AI Development Portal Theme
 */

describe('AI Development Portal Theme - Core Functionality', () => {
  describe('pipe gateway', () => {
    it('should export theme functionality through pipe', () => {
      const pipe = require('../../pipe/index');
      expect(pipe).toBeDefined();
    });
  });

  describe('portal initialization', () => {
    it('should initialize portal configuration', () => {
      const initPortal = (config: any) => {
        const defaultConfig = {
          host: "localhost",
          port: 3000,
          apiPrefix: '/api',
          staticPath: 'public',
          sessionTimeout: 3600000,
          maxUploadSize: '10mb'
        };

        return { ...defaultConfig, ...config };
      };

      const config = initPortal({ port: 8080, apiPrefix: '/v1' });
      
      expect(config.port).toBe(8080);
      expect(config.apiPrefix).toBe('/v1');
      expect(config.host).toBe("localhost");
      expect(config.sessionTimeout).toBe(3600000);
    });

    it('should validate required portal settings', () => {
      const validatePortalConfig = (config: any) => {
        const errors: string[] = [];

        if (!config.port || config.port < 1 || config.port > 65535) {
          errors.push('Invalid port number');
        }

        if (!config.apiPrefix || !config.apiPrefix.startsWith('/')) {
          errors.push('API prefix must start with /');
        }

        if (config.sessionTimeout && config.sessionTimeout < 60000) {
          errors.push('Session timeout must be at least 1 minute');
        }

        return { valid: errors.length === 0, errors };
      };

      const validConfig = { port: 3000, apiPrefix: '/api', sessionTimeout: 3600000 };
      const invalidConfig = { port: 0, apiPrefix: 'api', sessionTimeout: 1000 };

      expect(validatePortalConfig(validConfig).valid).toBe(true);
      expect(validatePortalConfig(invalidConfig).errors).toHaveLength(3);
    });
  });

  describe('api routing', () => {
    it('should create API route definitions', () => {
      const createRoutes = (prefix: string) => {
        const routes = {
          auth: {
            login: `${prefix}/auth/login`,
            logout: `${prefix}/auth/logout`,
            refresh: `${prefix}/auth/refresh`,
            profile: `${prefix}/auth/profile`
          },
          projects: {
            list: `${prefix}/projects`,
            create: `${prefix}/projects`,
            get: (id: string) => `${prefix}/projects/${id}`,
            update: (id: string) => `${prefix}/projects/${id}`,
            delete: (id: string) => `${prefix}/projects/${id}`
          },
          agents: {
            list: `${prefix}/agents`,
            status: `${prefix}/agents/status`,
            execute: `${prefix}/agents/execute`
          }
        };

        return routes;
      };

      const routes = createRoutes('/api/v1');
      
      expect(routes.auth.login).toBe('/api/v1/auth/login');
      expect(routes.projects.get('123')).toBe('/api/v1/projects/123');
      expect(routes.agents.status).toBe('/api/v1/agents/status');
    });

    it('should handle route middleware configuration', () => {
      interface Middleware {
        name: string;
        handler: () => boolean;
        order?: number;
      }

      const configureMiddleware = (middlewares: Middleware[]) => {
        return middlewares
          .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
          .map(m => ({ name: m.name, handler: m.handler }));
      };

      const middlewares: Middleware[] = [
        { name: 'auth', handler: () => true, order: 1 },
        { name: "rateLimit", handler: () => true, order: 2 },
        { name: 'cors', handler: () => true, order: 0 },
        { name: 'logging', handler: () => true }
      ];

      const sorted = configureMiddleware(middlewares);
      
      // The sorted array should have 'cors' first (order: 0), then 'auth' (order: 1), 
      // then "rateLimit" (order: 2), then 'logging' (order: 999 default)
      expect(sorted.map(m => m.name)).toEqual(['cors', 'auth', "rateLimit", 'logging']);
    });
  });

  describe('websocket management', () => {
    it('should manage websocket connections', () => {
      class WebSocketManager {
        private connections = new Map<string, any>();
        private rooms = new Map<string, Set<string>>();

        connect(clientId: string, socket: any) {
          this.connections.set(clientId, socket);
        }

        disconnect(clientId: string) {
          this.connections.delete(clientId);
          // Remove from all rooms
          this.rooms.forEach(room => room.delete(clientId));
        }

        joinRoom(clientId: string, roomName: string) {
          if (!this.rooms.has(roomName)) {
            this.rooms.set(roomName, new Set());
          }
          this.rooms.get(roomName)!.add(clientId);
        }

        leaveRoom(clientId: string, roomName: string) {
          this.rooms.get(roomName)?.delete(clientId);
        }

        broadcast(roomName: string, event: string, data: any) {
          const room = this.rooms.get(roomName);
          if (!room) return 0;

          let sent = 0;
          room.forEach(clientId => {
            const socket = this.connections.get(clientId);
            if (socket) {
              // In real implementation, would call socket.emit(event, data)
              sent++;
            }
          });
          return sent;
        }

        getConnectionCount(): number {
          return this.connections.size;
        }

        getRoomMembers(roomName: string): string[] {
          return Array.from(this.rooms.get(roomName) || []);
        }
      }

      const wsManager = new WebSocketManager();
      
      wsManager.connect('client1', { id: 'client1' });
      wsManager.connect('client2', { id: 'client2' });
      expect(wsManager.getConnectionCount()).toBe(2);

      wsManager.joinRoom('client1', 'project-123');
      wsManager.joinRoom('client2', 'project-123');
      expect(wsManager.getRoomMembers('project-123')).toHaveLength(2);

      const broadcasted = wsManager.broadcast('project-123', 'update', { status: 'changed' });
      expect(broadcasted).toBe(2);

      wsManager.disconnect('client1');
      expect(wsManager.getConnectionCount()).toBe(1);
      expect(wsManager.getRoomMembers('project-123')).toHaveLength(1);
    });

    it('should handle websocket events', () => {
      const createEventHandlers = () => {
        const handlers = new Map<string, (data: any) => any>();

        return {
          on: (event: string, handler: (data: any) => any) => {
            handlers.set(event, handler);
          },
          emit: (event: string, data: any) => {
            const handler = handlers.get(event);
            return handler ? handler(data) : null;
          },
          hasHandler: (event: string) => handlers.has(event),
          removeHandler: (event: string) => handlers.delete(event)
        };
      };

      const eventManager = createEventHandlers();
      
      eventManager.on('project:update', (data) => ({ 
        processed: true, 
        projectId: data.id 
      }));

      const result = eventManager.emit('project:update', { id: '123', name: 'Test' });
      
      expect(result).toEqual({ processed: true, projectId: '123' });
      expect(eventManager.hasHandler('project:update')).toBe(true);
    });
  });

  describe('project management', () => {
    it('should handle project CRUD operations', async () => {
      interface Project {
        id: string;
        name: string;
        description: string;
        createdAt: Date;
        updatedAt: Date;
        status: 'active' | "archived";
      }

      class ProjectManager {
        private projects = new Map<string, Project>();

        create(data: Omit<Project, 'id' | "createdAt" | "updatedAt">): Project {
          const project: Project = {
            ...data,
            id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          this.projects.set(project.id, project);
          return project;
        }

        get(id: string): Project | null {
          return this.projects.get(id) || null;
        }

        update(id: string, updates: Partial<Project>): Project | null {
          const project = this.projects.get(id);
          if (!project) return null;

          const updated = {
            ...project,
            ...updates,
            id: project.id, // Prevent ID change
            updatedAt: new Date()
          };

          this.projects.set(id, updated);
          return updated;
        }

        delete(id: string): boolean {
          return this.projects.delete(id);
        }

        list(filter?: { status?: string }): Project[] {
          let projects = Array.from(this.projects.values());
          
          if (filter?.status) {
            projects = projects.filter(p => p.status === filter.status);
          }

          return projects.sort((a, b) => 
            b.createdAt.getTime() - a.createdAt.getTime()
          );
        }
      }

      const manager = new ProjectManager();
      
      const project = manager.create({
        name: 'Test Project',
        description: 'A test project',
        status: 'active'
      });

      expect(project.id).toMatch(/^proj_\d+_[a-z0-9]{9}$/);
      expect(project.name).toBe('Test Project');

      // Add small delay to ensure updatedAt is different from createdAt
      await new Promise(resolve => setTimeout(resolve, 1));

      const updated = manager.update(project.id, { description: 'Updated description' });
      expect(updated?.description).toBe('Updated description');
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(project.createdAt.getTime());

      expect(manager.list()).toHaveLength(1);
      expect(manager.delete(project.id)).toBe(true);
      expect(manager.list()).toHaveLength(0);
    });
  });

  describe('agent coordination', () => {
    it('should coordinate agent execution', async () => {
      interface AgentTask {
        id: string;
        agentType: string;
        payload: any;
        status: 'pending' | 'running' | "completed" | 'failed';
        result?: any;
        error?: string;
      }

      class AgentCoordinator {
        private tasks = new Map<string, AgentTask>();
        private agents = new Map<string, (payload: any) => Promise<any>>();

        registerAgent(type: string, handler: (payload: any) => Promise<any>) {
          this.agents.set(type, handler);
        }

        async executeTask(agentType: string, payload: any): Promise<AgentTask> {
          const task: AgentTask = {
            id: `task_${Date.now()}`,
            agentType,
            payload,
            status: 'pending'
          };

          this.tasks.set(task.id, task);
          
          const agent = this.agents.get(agentType);
          if (!agent) {
            task.status = 'failed';
            task.error = `Agent type ${agentType} not found`;
            return task;
          }

          task.status = 'running';

          try {
            task.result = await agent(payload);
            task.status = "completed";
          } catch (error) {
            task.status = 'failed';
            task.error = (error as Error).message;
          }

          return task;
        }

        getTask(id: string): AgentTask | null {
          return this.tasks.get(id) || null;
        }

        getTasksByStatus(status: AgentTask['status']): AgentTask[] {
          return Array.from(this.tasks.values())
            .filter(task => task.status === status);
        }
      }

      const coordinator = new AgentCoordinator();
      
      // Register test agent
      coordinator.registerAgent('test', async (payload) => {
        if (payload.shouldFail) {
          throw new Error('Test failure');
        }
        return { processed: true, input: payload };
      });

      const successTask = await coordinator.executeTask('test', { data: 'test' });
      expect(successTask.status).toBe("completed");
      expect(successTask.result).toEqual({ processed: true, input: { data: 'test' } });

      const failTask = await coordinator.executeTask('test', { shouldFail: true });
      expect(failTask.status).toBe('failed');
      expect(failTask.error).toBe('Test failure');

      const unknownTask = await coordinator.executeTask('unknown', {});
      expect(unknownTask.status).toBe('failed');
      expect(unknownTask.error).toContain('not found');
    });
  });

  describe('dashboard metrics', () => {
    it('should collect and aggregate metrics', () => {
      interface Metric {
        name: string;
        value: number;
        timestamp: Date;
        tags?: Record<string, string>;
      }

      class MetricsCollector {
        private metrics: Metric[] = [];
        private aggregationInterval = 60000; // 1 minute

        record(name: string, value: number, tags?: Record<string, string>) {
          this.metrics.push({
            name,
            value,
            timestamp: new Date(),
            tags
          });
        }

        getMetrics(name?: string, startTime?: Date): Metric[] {
          let filtered = this.metrics;

          if (name) {
            filtered = filtered.filter(m => m.name === name);
          }

          if (startTime) {
            filtered = filtered.filter(m => m.timestamp >= startTime);
          }

          return filtered;
        }

        aggregate(name: string, type: 'sum' | 'avg' | 'min' | 'max' | 'count'): number {
          const metrics = this.getMetrics(name);
          
          if (metrics.length === 0) return 0;

          switch (type) {
            case 'sum':
              return metrics.reduce((sum, m) => sum + m.value, 0);
            case 'avg':
              return metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
            case 'min':
              return Math.min(...metrics.map(m => m.value));
            case 'max':
              return Math.max(...metrics.map(m => m.value));
            case 'count':
              return metrics.length;
          }
        }

        getRecentMetrics(minutes: number): Record<string, any> {
          const startTime = new Date(Date.now() - minutes * 60000);
          const recent = this.metrics.filter(m => m.timestamp >= startTime);
          
          const grouped = recent.reduce((acc, m) => {
            if (!acc[m.name]) acc[m.name] = [];
            acc[m.name].push(m.value);
            return acc;
          }, {} as Record<string, number[]>);

          const summary: Record<string, any> = {};
          
          Object.entries(grouped).forEach(([name, values]) => {
            summary[name] = {
              count: values.length,
              sum: values.reduce((a, b) => a + b, 0),
              avg: values.reduce((a, b) => a + b, 0) / values.length,
              min: Math.min(...values),
              max: Math.max(...values)
            };
          });

          return summary;
        }
      }

      const collector = new MetricsCollector();
      
      // Record some metrics
      collector.record('api.requests', 1, { endpoint: '/projects' });
      collector.record('api.requests', 1, { endpoint: '/agents' });
      collector.record('api.latency', 125);
      collector.record('api.latency', 87);
      collector.record('api.latency', 203);

      expect(collector.aggregate('api.requests', 'count')).toBe(2);
      expect(collector.aggregate('api.latency', 'avg')).toBeCloseTo(138.33, 2);
      expect(collector.aggregate('api.latency', 'min')).toBe(87);
      expect(collector.aggregate('api.latency', 'max')).toBe(203);

      const recent = collector.getRecentMetrics(5);
      expect(recent['api.requests'].count).toBe(2);
      expect(recent['api.latency'].avg).toBeCloseTo(138.33, 2);
    });
  });

  describe('security features', () => {
    it('should implement rate limiting', () => {
      class RateLimiter {
        private requests = new Map<string, number[]>();
        private windowMs: number;
        private maxRequests: number;

        constructor(windowMs = 60000, maxRequests = 100) {
          this.windowMs = windowMs;
          this.maxRequests = maxRequests;
        }

        isAllowed(identifier: string): boolean {
          const now = Date.now();
          const requests = this.requests.get(identifier) || [];
          
          // Remove old requests outside the window
          const validRequests = requests.filter(time => now - time < this.windowMs);
          
          if (validRequests.length >= this.maxRequests) {
            return false;
          }

          validRequests.push(now);
          this.requests.set(identifier, validRequests);
          
          return true;
        }

        getRemainingRequests(identifier: string): number {
          const now = Date.now();
          const requests = this.requests.get(identifier) || [];
          const validRequests = requests.filter(time => now - time < this.windowMs);
          
          return Math.max(0, this.maxRequests - validRequests.length);
        }

        reset(identifier: string) {
          this.requests.delete(identifier);
        }

        cleanup() {
          const now = Date.now();
          
          this.requests.forEach((times, identifier) => {
            const valid = times.filter(time => now - time < this.windowMs);
            if (valid.length === 0) {
              this.requests.delete(identifier);
            } else {
              this.requests.set(identifier, valid);
            }
          });
        }
      }

      const limiter = new RateLimiter(60000, 3); // 3 requests per minute
      
      expect(limiter.isAllowed('user1')).toBe(true);
      expect(limiter.isAllowed('user1')).toBe(true);
      expect(limiter.isAllowed('user1')).toBe(true);
      expect(limiter.isAllowed('user1')).toBe(false);
      
      expect(limiter.getRemainingRequests('user1')).toBe(0);
      expect(limiter.getRemainingRequests('user2')).toBe(3);
      
      limiter.reset('user1');
      expect(limiter.isAllowed('user1')).toBe(true);
    });
  });
});